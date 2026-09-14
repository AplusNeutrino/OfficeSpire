param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("play_card", "end_turn", "use_potion")]
    [string]$Action,

    [long]$ExpectedRevision = -1,
    [int]$HandIndex = -1,
    [string]$TargetId = "",
    [int]$SlotIndex = -1,
    [int]$PollMs = 100,
    [int]$TimeoutSeconds = 15
)

$ErrorActionPreference = "Stop"

$sessionPath = Join-Path $env:APPDATA "SlayTheSpire2\OfficeSpire\session.json"
if (-not (Test-Path $sessionPath)) {
    throw "OfficeSpire session file not found: $sessionPath. Start STS2 with OfficeSpire enabled first."
}

$session = Get-Content $sessionPath -Raw | ConvertFrom-Json
$escapedToken = [Uri]::EscapeDataString([string]$session.token)
$uri = [Uri]("ws://127.0.0.1:{0}/officespire?token={1}" -f $session.port, $escapedToken)
$ct = [Threading.CancellationToken]::None
$socket = [System.Net.WebSockets.ClientWebSocket]::new()

function Receive-OfficeSpireMessage {
    param([System.Net.WebSockets.ClientWebSocket]$Socket)

    $buffer = New-Object byte[] 65536
    $segment = [ArraySegment[byte]]::new($buffer)
    $stream = [IO.MemoryStream]::new()

    try {
        do {
            $result = $Socket.ReceiveAsync($segment, $ct).GetAwaiter().GetResult()
            if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
                return $null
            }
            $stream.Write($buffer, 0, $result.Count)
        } while (-not $result.EndOfMessage)

        return [Text.Encoding]::UTF8.GetString($stream.ToArray())
    }
    finally {
        $stream.Dispose()
    }
}

function Send-OfficeSpireMessage {
    param(
        [System.Net.WebSockets.ClientWebSocket]$Socket,
        [hashtable]$Envelope
    )

    $json = $Envelope | ConvertTo-Json -Depth 20 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($json)
    $segment = [ArraySegment[byte]]::new($bytes)

    $Socket.SendAsync(
        $segment,
        [System.Net.WebSockets.WebSocketMessageType]::Text,
        $true,
        $ct
    ).GetAwaiter().GetResult() | Out-Null
}

function Receive-Envelope {
    param([System.Net.WebSockets.ClientWebSocket]$Socket)

    $text = Receive-OfficeSpireMessage -Socket $Socket
    if ($null -eq $text) {
        throw "OfficeSpire WebSocket closed unexpectedly."
    }
    return $text | ConvertFrom-Json
}

try {
    Write-Host "Connecting to $uri"
    $socket.ConnectAsync($uri, $ct).GetAwaiter().GetResult()

    # Server sends hello + initial state.
    $hello = Receive-Envelope -Socket $socket
    $initial = Receive-Envelope -Socket $socket
    if ($initial.type -ne "state") {
        throw "Expected initial state, got '$($initial.type)'."
    }

    $state = $initial.body
    if ($ExpectedRevision -lt 0) {
        $ExpectedRevision = [long]$state.state_revision
    }

    if ($state.action_pending) {
        throw "Current state has action_pending=true. Wait for settlement before sending another action."
    }

    $payload = @{}
    switch ($Action) {
        "play_card" {
            if ($HandIndex -lt 0) {
                throw "play_card requires -HandIndex."
            }
            $payload.hand_index = $HandIndex
            if (-not [string]::IsNullOrWhiteSpace($TargetId)) {
                $payload.target_id = $TargetId
            }
        }
        "use_potion" {
            if ($SlotIndex -lt 0) {
                throw "use_potion requires -SlotIndex."
            }
            $payload.slot_index = $SlotIndex
            if (-not [string]::IsNullOrWhiteSpace($TargetId)) {
                $payload.target_id = $TargetId
            }
        }
        "end_turn" {
            # no payload
        }
    }

    $requestId = [Guid]::NewGuid().ToString()
    $actionRequest = @{
        request_id = $requestId
        action = $Action
        expected_revision = $ExpectedRevision
        payload = $payload
    }

    Send-OfficeSpireMessage -Socket $socket -Envelope @{
        type = "action"
        protocol_version = 1
        body = $actionRequest
    }

    $queued = Receive-Envelope -Socket $socket
    if ($queued.type -ne "action_result") {
        throw "Expected action_result, got '$($queued.type)'."
    }

    Write-Host ("request={0} accepted={1} code={2} rev={3} message={4}" -f
        $requestId,
        $queued.body.accepted,
        $queued.body.code,
        $queued.body.state_revision,
        $queued.body.message)

    if (-not $queued.body.accepted) {
        exit 2
    }

    $deadline = [DateTimeOffset]::UtcNow.AddSeconds($TimeoutSeconds)
    $lastCode = [string]$queued.body.code

    while ([DateTimeOffset]::UtcNow -lt $deadline) {
        Start-Sleep -Milliseconds $PollMs

        Send-OfficeSpireMessage -Socket $socket -Envelope @{
            type = "get_action_result"
            protocol_version = 1
            body = @{ request_id = $requestId }
        }

        $status = Receive-Envelope -Socket $socket
        if ($status.type -ne "action_result") {
            throw "Expected action_result while polling, got '$($status.type)'."
        }

        $code = [string]$status.body.code
        if ($code -ne $lastCode) {
            $lastCode = $code
            Write-Host ("status accepted={0} code={1} rev={2} message={3}" -f
                $status.body.accepted,
                $status.body.code,
                $status.body.state_revision,
                $status.body.message)
        }

        if (-not $status.body.accepted) {
            exit 3
        }

        if ($code -eq "completed") {
            Send-OfficeSpireMessage -Socket $socket -Envelope @{
                type = "get_state"
                protocol_version = 1
                body = @{}
            }
            $final = Receive-Envelope -Socket $socket
            if ($final.type -eq "state") {
                Write-Host ("final state: rev={0} phase={1} pending={2}" -f
                    $final.body.state_revision,
                    $final.body.phase,
                    $final.body.action_pending)
            }
            exit 0
        }
    }

    throw "Timed out after $TimeoutSeconds seconds waiting for action completion."
}
finally {
    if ($socket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        $socket.CloseAsync(
            [System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure,
            "diagnostic client closing",
            $ct
        ).GetAwaiter().GetResult() | Out-Null
    }
    $socket.Dispose()
}
