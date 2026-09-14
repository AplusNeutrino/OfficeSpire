using System.Text.Json;
using System.Text.Json.Serialization;

namespace OfficeSpire.Protocol;

public static class ProtocolConstants
{
    public const int CurrentVersion = 1;
}

public static class PhaseNames
{
    public const string Unknown = "unknown";
    public const string Combat = "combat";
    public const string CardSelection = "card_selection";
    public const string Map = "map";
    public const string Rewards = "rewards";
    public const string Shop = "shop";
    public const string Event = "event";
    public const string Rest = "rest";
    public const string Treasure = "treasure";
    public const string Menu = "menu";
    public const string RunEnd = "run_end";
}

public sealed record StateEnvelope(
    [property: JsonPropertyName("protocol_version")] int ProtocolVersion,
    [property: JsonPropertyName("state_revision")] long StateRevision,
    [property: JsonPropertyName("phase")] string Phase,
    [property: JsonPropertyName("action_pending")] bool ActionPending,
    [property: JsonPropertyName("run")] JsonElement Run,
    [property: JsonPropertyName("screen")] JsonElement Screen);

public sealed record ActionRequest(
    [property: JsonPropertyName("request_id")] string RequestId,
    [property: JsonPropertyName("action")] string Action,
    [property: JsonPropertyName("expected_revision")] long ExpectedRevision,
    [property: JsonPropertyName("payload")] JsonElement Payload);

public sealed record ActionResponse(
    [property: JsonPropertyName("request_id")] string RequestId,
    [property: JsonPropertyName("accepted")] bool Accepted,
    [property: JsonPropertyName("code")] string Code,
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("state_revision")] long StateRevision);

public static class ProtocolJson
{
    public static JsonSerializerOptions Options { get; } = new()
    {
        PropertyNameCaseInsensitive = false,
        WriteIndented = false
    };

    public static JsonElement EmptyObject()
    {
        using JsonDocument document = JsonDocument.Parse("{}");
        return document.RootElement.Clone();
    }
}
