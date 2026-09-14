using MegaCrit.Sts2.Core.Logging;

namespace OfficeSpire.Diagnostics;

internal static class StartupDiagnostics
{
    private static readonly object Gate = new();

    private static string LogDirectory => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "SlayTheSpire2",
        "OfficeSpire");

    private static string LogPath => Path.Combine(LogDirectory, "startup.log");

    public static void Mark(string stage, string? detail = null)
    {
        string line = $"[{DateTimeOffset.Now:O}] [OfficeSpire] {stage}" +
                      (string.IsNullOrWhiteSpace(detail) ? string.Empty : $" | {detail}");

        try
        {
            Console.WriteLine(line);
        }
        catch
        {
            // Diagnostics must never abort mod startup.
        }

        try
        {
            Log.Info(line);
        }
        catch
        {
            // The game's logger itself may not be ready yet.
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
            // File diagnostics are best-effort only.
        }
    }

    public static void Failure(string stage, Exception ex)
    {
        Mark($"{stage}:FAIL", $"{ex.GetType().FullName}: {ex.Message} | {ex.StackTrace}");
    }
}
