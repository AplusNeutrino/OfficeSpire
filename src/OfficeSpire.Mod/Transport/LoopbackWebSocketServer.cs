using System.Net;
using System.Net.Sockets;
using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using OfficeSpire.Protocol;
using OfficeSpire.Runtime;

namespace OfficeSpire.Transport;

public sealed class LoopbackWebSocketServer : IAsyncDisposable
{
    private const string WebSocketMagicGuid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    private const int MaxHandshakeBytes = 8 * 1024;

    private readonly ProtocolStateStore _stateStore;
    private readonly CancellationTokenSource _shutdown = new();
    private readonly string _token;

    private TcpListener? _listener;
    private Task? _acceptLoop;

    public LoopbackWebSocketServer(ProtocolStateStore stateStore)
    {
        _stateStore = stateStore ?? throw new ArgumentNullException(nameof(stateStore));
        _token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
    }

    public SessionDescriptor? Session { get; private set; }

    public void Start()
    {
        if (_listener is not null)
        {
            return;
        }

        _listener = new TcpListener(IPAddress.Loopback, 0);
        _listener.Start(backlog: 8);

        int port = ((IPEndPoint)_listener.LocalEndpoint).Port;
        Session = new SessionDescriptor(
            ProtocolConstants.CurrentVersion,
            port,
            _token,
            Environment.ProcessId,
            DateTimeOffset.UtcNow);

        SessionFile.Write(Session);
        _acceptLoop = Task.Run(() => AcceptLoopAsync(_shutdown.Token));
    }

    private async Task AcceptLoopAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            TcpClient client;
            try
            {
                client = await _listener!.AcceptTcpClientAsync(cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                break;
            }
            catch (SocketException) when (cancellationToken.IsCancellationRequested)
            {
                break;
            }

            _ = Task.Run(() => HandleClientAsync(client, cancellationToken), CancellationToken.None);
        }
    }

    private async Task HandleClientAsync(TcpClient client, CancellationToken cancellationToken)
    {
        using (client)
        using (NetworkStream stream = client.GetStream())
        {
            try
            {
                string requestHeader = await ReadHandshakeAsync(stream, cancellationToken).ConfigureAwait(false);
                if (!TryParseHandshake(requestHeader, out string requestTarget, out string webSocketKey))
                {
                    await WriteHttpErrorAsync(stream, "400 Bad Request", cancellationToken).ConfigureAwait(false);
                    return;
                }

                string? token = GetQueryParameter(requestTarget, "token");
                if (!CryptographicOperations.FixedTimeEquals(
                        Encoding.UTF8.GetBytes(token ?? string.Empty),
                        Encoding.UTF8.GetBytes(_token)))
                {
                    await WriteHttpErrorAsync(stream, "401 Unauthorized", cancellationToken).ConfigureAwait(false);
                    return;
                }

                await WriteUpgradeResponseAsync(stream, webSocketKey, cancellationToken).ConfigureAwait(false);

                using WebSocket socket = WebSocket.CreateFromStream(
                    stream,
                    isServer: true,
                    subProtocol: null,
                    keepAliveInterval: TimeSpan.FromSeconds(20));

                await SendAsync(socket, "hello", new
                {
                    server = "OfficeSpire",
                    process_id = Environment.ProcessId,
                    capabilities = new[]
                    {
                        "state",
                        "heartbeat",
                        "combat_actions",
                        "action_status"
                    }
                }, cancellationToken).ConfigureAwait(false);

                await SendAsync(socket, "state", _stateStore.Read(), cancellationToken).ConfigureAwait(false);
                await ReceiveLoopAsync(socket, cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                // Normal shutdown.
            }
            catch
            {
                // A broken overlay connection must never affect the game process.
            }
        }
    }

    private async Task ReceiveLoopAsync(WebSocket socket, CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested && socket.State == WebSocketState.Open)
        {
            string? json = await ReceiveTextAsync(socket, cancellationToken).ConfigureAwait(false);
            if (json is null)
            {
                return;
            }

            WireEnvelope? envelope;
            try
            {
                envelope = JsonSerializer.Deserialize<WireEnvelope>(json, ProtocolJson.Options);
            }
            catch (JsonException)
            {
                await SendErrorAsync(socket, "invalid_json", "Message was not a valid OfficeSpire envelope.", cancellationToken).ConfigureAwait(false);
                continue;
            }

            if (envelope is null)
            {
                await SendErrorAsync(socket, "invalid_message", "Message body was empty.", cancellationToken).ConfigureAwait(false);
                continue;
            }

            if (envelope.ProtocolVersion != ProtocolConstants.CurrentVersion)
            {
                await SendErrorAsync(socket, "protocol_mismatch", $"Server protocol is {ProtocolConstants.CurrentVersion}.", cancellationToken).ConfigureAwait(false);
                continue;
            }

            switch (envelope.Type)
            {
                case "ping":
                    await SendAsync(socket, "pong", new { utc = DateTimeOffset.UtcNow }, cancellationToken).ConfigureAwait(false);
                    break;

                case "get_state":
                    await SendAsync(socket, "state", _stateStore.Read(), cancellationToken).ConfigureAwait(false);
                    break;

                case "action":
                    await HandleActionAsync(socket, envelope.Body, cancellationToken).ConfigureAwait(false);
                    break;

                case "get_action_result":
                    await HandleGetActionResultAsync(socket, envelope.Body, cancellationToken).ConfigureAwait(false);
                    break;

                default:
                    await SendErrorAsync(socket, "unknown_message_type", $"Unknown message type '{envelope.Type}'.", cancellationToken).ConfigureAwait(false);
                    break;
            }
        }
    }

    private static async Task HandleActionAsync(
        WebSocket socket,
        JsonElement body,
        CancellationToken cancellationToken)
    {
        ActionRequest? request;
        try
        {
            request = body.Deserialize<ActionRequest>(ProtocolJson.Options);
        }
        catch (JsonException)
        {
            request = null;
        }

        if (request is null || string.IsNullOrWhiteSpace(request.RequestId))
        {
            await SendErrorAsync(socket, "invalid_action", "Action payload could not be parsed.", cancellationToken).ConfigureAwait(false);
            return;
        }

        OfficeSpireRuntime.TryQueueAction(request, out ActionResponse response);
        await SendAsync(socket, "action_result", response, cancellationToken).ConfigureAwait(false);
    }

    private static async Task HandleGetActionResultAsync(
        WebSocket socket,
        JsonElement body,
        CancellationToken cancellationToken)
    {
        if (body.ValueKind != JsonValueKind.Object ||
            !body.TryGetProperty("request_id", out JsonElement requestIdElement) ||
            requestIdElement.ValueKind != JsonValueKind.String ||
            string.IsNullOrWhiteSpace(requestIdElement.GetString()))
        {
            await SendErrorAsync(
                socket,
                "invalid_action_status_request",
                "get_action_result requires body.request_id.",
                cancellationToken).ConfigureAwait(false);
            return;
        }

        string requestId = requestIdElement.GetString()!;
        if (OfficeSpireRuntime.TryGetActionResult(requestId, out ActionResponse response))
        {
            await SendAsync(socket, "action_result", response, cancellationToken).ConfigureAwait(false);
            return;
        }

        StateEnvelope current = OfficeSpireRuntime.StateStore.Read();
        await SendAsync(
            socket,
            "action_result",
            new ActionResponse(
                requestId,
                Accepted: false,
                Code: "unknown_request",
                Message: "No retained action status exists for this request_id.",
                StateRevision: current.StateRevision),
            cancellationToken).ConfigureAwait(false);
    }

    private static async Task<string> ReadHandshakeAsync(NetworkStream stream, CancellationToken cancellationToken)
    {
        byte[] buffer = new byte[MaxHandshakeBytes];
        int total = 0;

        while (total < buffer.Length)
        {
            int read = await stream.ReadAsync(buffer.AsMemory(total, buffer.Length - total), cancellationToken).ConfigureAwait(false);
            if (read == 0)
            {
                throw new IOException("Connection closed during WebSocket handshake.");
            }

            total += read;
            string text = Encoding.ASCII.GetString(buffer, 0, total);
            if (text.Contains("\r\n\r\n", StringComparison.Ordinal))
            {
                return text;
            }
        }

        throw new InvalidDataException("WebSocket handshake exceeded the size limit.");
    }

    private static bool TryParseHandshake(string headerText, out string requestTarget, out string webSocketKey)
    {
        requestTarget = string.Empty;
        webSocketKey = string.Empty;

        string[] lines = headerText.Split("\r\n", StringSplitOptions.None);
        if (lines.Length == 0)
        {
            return false;
        }

        string[] requestLine = lines[0].Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (requestLine.Length < 3 || requestLine[0] != "GET")
        {
            return false;
        }

        requestTarget = requestLine[1];
        if (!requestTarget.StartsWith("/officespire", StringComparison.Ordinal))
        {
            return false;
        }

        var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        for (int i = 1; i < lines.Length; i++)
        {
            int separator = lines[i].IndexOf(':');
            if (separator <= 0)
            {
                continue;
            }

            string name = lines[i][..separator].Trim();
            string value = lines[i][(separator + 1)..].Trim();
            headers[name] = value;
        }

        if (!headers.TryGetValue("Upgrade", out string? upgrade) ||
            !string.Equals(upgrade, "websocket", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (!headers.TryGetValue("Connection", out string? connection) ||
            connection.IndexOf("upgrade", StringComparison.OrdinalIgnoreCase) < 0)
        {
            return false;
        }

        if (!headers.TryGetValue("Sec-WebSocket-Version", out string? version) || version != "13")
        {
            return false;
        }

        return headers.TryGetValue("Sec-WebSocket-Key", out webSocketKey) && !string.IsNullOrWhiteSpace(webSocketKey);
    }

    private static string? GetQueryParameter(string requestTarget, string name)
    {
        int queryIndex = requestTarget.IndexOf('?');
        if (queryIndex < 0 || queryIndex == requestTarget.Length - 1)
        {
            return null;
        }

        string query = requestTarget[(queryIndex + 1)..];
        foreach (string pair in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            string[] parts = pair.Split('=', 2);
            if (parts.Length == 2 && string.Equals(Uri.UnescapeDataString(parts[0]), name, StringComparison.Ordinal))
            {
                return Uri.UnescapeDataString(parts[1]);
            }
        }

        return null;
    }

    private static async Task WriteUpgradeResponseAsync(NetworkStream stream, string webSocketKey, CancellationToken cancellationToken)
    {
        byte[] acceptBytes = SHA1.HashData(Encoding.ASCII.GetBytes(webSocketKey + WebSocketMagicGuid));
        string accept = Convert.ToBase64String(acceptBytes);
        string response =
            "HTTP/1.1 101 Switching Protocols\r\n" +
            "Upgrade: websocket\r\n" +
            "Connection: Upgrade\r\n" +
            $"Sec-WebSocket-Accept: {accept}\r\n\r\n";

        byte[] bytes = Encoding.ASCII.GetBytes(response);
        await stream.WriteAsync(bytes, cancellationToken).ConfigureAwait(false);
    }

    private static async Task WriteHttpErrorAsync(NetworkStream stream, string status, CancellationToken cancellationToken)
    {
        string response = $"HTTP/1.1 {status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n";
        byte[] bytes = Encoding.ASCII.GetBytes(response);
        await stream.WriteAsync(bytes, cancellationToken).ConfigureAwait(false);
    }

    private static async Task<string?> ReceiveTextAsync(WebSocket socket, CancellationToken cancellationToken)
    {
        byte[] buffer = new byte[4096];
        using var message = new MemoryStream();

        while (true)
        {
            WebSocketReceiveResult result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken).ConfigureAwait(false);

            if (result.MessageType == WebSocketMessageType.Close)
            {
                if (socket.State == WebSocketState.Open || socket.State == WebSocketState.CloseReceived)
                {
                    await socket.CloseOutputAsync(WebSocketCloseStatus.NormalClosure, "bye", cancellationToken).ConfigureAwait(false);
                }
                return null;
            }

            if (result.MessageType != WebSocketMessageType.Text)
            {
                await socket.CloseAsync(WebSocketCloseStatus.InvalidMessageType, "Text messages only.", cancellationToken).ConfigureAwait(false);
                return null;
            }

            message.Write(buffer, 0, result.Count);
            if (message.Length > ProtocolConstants.MaxInboundMessageBytes)
            {
                await socket.CloseAsync(WebSocketCloseStatus.MessageTooBig, "Message too large.", cancellationToken).ConfigureAwait(false);
                return null;
            }

            if (result.EndOfMessage)
            {
                return Encoding.UTF8.GetString(message.ToArray());
            }
        }
    }

    private static Task SendErrorAsync(WebSocket socket, string code, string message, CancellationToken cancellationToken)
    {
        return SendAsync(socket, "error", new { code, message }, cancellationToken);
    }

    private static async Task SendAsync<T>(WebSocket socket, string type, T body, CancellationToken cancellationToken)
    {
        WireEnvelope envelope = ProtocolJson.Wrap(type, body);
        byte[] payload = JsonSerializer.SerializeToUtf8Bytes(envelope, ProtocolJson.Options);

        if (payload.Length > ProtocolConstants.MaxOutboundMessageBytes)
        {
            throw new InvalidDataException("OfficeSpire outbound message exceeded the size limit.");
        }

        await socket.SendAsync(
            new ArraySegment<byte>(payload),
            WebSocketMessageType.Text,
            endOfMessage: true,
            cancellationToken).ConfigureAwait(false);
    }

    public async ValueTask DisposeAsync()
    {
        _shutdown.Cancel();
        _listener?.Stop();

        if (_acceptLoop is not null)
        {
            try
            {
                await _acceptLoop.ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                // Expected during shutdown.
            }
        }

        SessionFile.DeleteIfOwned(_token);
        _shutdown.Dispose();
    }
}
