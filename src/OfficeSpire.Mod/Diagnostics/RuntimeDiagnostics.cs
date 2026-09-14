using MegaCrit.Sts2.Core.Logging;
using OfficeSpire.Protocol;

namespace OfficeSpire.Diagnostics;

internal static class RuntimeDiagnostics
{
    private static readonly object Gate = new();
    private static long _lastRevision = long.MinValue;
    private static string? _lastPhase;
    private static bool? _lastActionPending;

    private static string LogDirectory => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "SlayTheSpire2",
        "OfficeSpire");

    private static string LogPath => Path.Combine(LogDirectory, "runtime.log");

    public static void Observe(StateEnvelope state)
    {
        ArgumentNullException.ThrowIfNull(state);

        lock (Gate)
        {
            if (state.StateRevision == _lastRevision &&
                string.Equals(state.Phase, _lastPhase, StringComparison.Ordinal) &&
                state.ActionPending == _lastActionPending)
            {
                return;
            }

            _lastRevision = state.StateRevision;
            _lastPhase = state.Phase;
            _lastActionPending = state.ActionPending;
        }

        string detail = BuildSummary(state);
        string line = $"[{DateTimeOffset.Now:O}] [OfficeSpire] state_changed | rev={state.StateRevision} phase={state.Phase} pending={state.ActionPending}" +
                      (string.IsNullOrEmpty(detail) ? string.Empty : $" {detail}");

        try
        {
            Log.Info(line);
        }
        catch
        {
            // Runtime diagnostics must never interfere with gameplay.
        }

        try
        {
            lock (Gate)
            {
                Directory.CreateDirectory(LogDirectory);
                File.AppendAllText(LogPath, line + Environment.NewLine);
            }
        }
        catch
        {
            // File logging is best-effort only.
        }
    }

    private static string BuildSummary(StateEnvelope state)
    {
        if (!string.Equals(state.Phase, PhaseNames.Combat, StringComparison.Ordinal) ||
            state.Screen.ValueKind != System.Text.Json.JsonValueKind.Object)
        {
            return string.Empty;
        }

        try
        {
            var screen = state.Screen;
            int? energy = TryGetInt(screen, "energy");
            int? maxEnergy = TryGetInt(screen, "max_energy");
            int handCount = TryGetArrayLength(screen, "hand");
            int enemyCount = TryGetArrayLength(screen, "enemies");

            int? hp = null;
            int? maxHp = null;
            int? block = null;
            if (screen.TryGetProperty("player", out var player) &&
                player.ValueKind == System.Text.Json.JsonValueKind.Object)
            {
                hp = TryGetInt(player, "current_hp");
                maxHp = TryGetInt(player, "max_hp");
                block = TryGetInt(player, "block");
            }

            return $"hp={FormatPair(hp, maxHp)} block={block?.ToString() ?? "?"} " +
                   $"energy={FormatPair(energy, maxEnergy)} hand={handCount} enemies={enemyCount}";
        }
        catch
        {
            return "summary=unavailable";
        }
    }

    private static int? TryGetInt(System.Text.Json.JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var value) && value.TryGetInt32(out int result)
            ? result
            : null;
    }

    private static int TryGetArrayLength(System.Text.Json.JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var value) &&
               value.ValueKind == System.Text.Json.JsonValueKind.Array
            ? value.GetArrayLength()
            : 0;
    }

    private static string FormatPair(int? current, int? maximum)
    {
        return $"{current?.ToString() ?? "?"}/{maximum?.ToString() ?? "?"}";
    }
}
