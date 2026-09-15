using System.Runtime.CompilerServices;

namespace OfficeSpire.Mod.Game;

/// <summary>
/// Assigns an opaque, process-local token to a native model instance. The token is
/// only an action binding: it is never persisted or treated as a game identity.
/// </summary>
internal static class NativeActionToken
{
    private sealed record Token(string Value);

    private static readonly ConditionalWeakTable<object, Token> Tokens = new();

    public static string For(object value) =>
        Tokens.GetValue(value, static _ => new Token(Guid.NewGuid().ToString("N"))).Value;
}
