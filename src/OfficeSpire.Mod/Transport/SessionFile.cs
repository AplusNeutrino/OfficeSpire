using System.Text.Json;
using OfficeSpire.Protocol;

namespace OfficeSpire.Transport;

public static class SessionFile
{
    public static string PathOnDisk
    {
        get
        {
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            return Path.Combine(appData, "SlayTheSpire2", "OfficeSpire", "session.json");
        }
    }

    public static void Write(SessionDescriptor descriptor)
    {
        ArgumentNullException.ThrowIfNull(descriptor);

        string path = PathOnDisk;
        string? directory = Path.GetDirectoryName(path);
        if (string.IsNullOrWhiteSpace(directory))
        {
            throw new InvalidOperationException("Unable to resolve OfficeSpire session directory.");
        }

        Directory.CreateDirectory(directory);

        string tempPath = path + ".tmp";
        string json = JsonSerializer.Serialize(descriptor, ProtocolJson.Options);
        File.WriteAllText(tempPath, json);
        File.Move(tempPath, path, overwrite: true);
    }

    public static void DeleteIfOwned(string token)
    {
        if (string.IsNullOrWhiteSpace(token) || !File.Exists(PathOnDisk))
        {
            return;
        }

        try
        {
            string json = File.ReadAllText(PathOnDisk);
            SessionDescriptor? descriptor = JsonSerializer.Deserialize<SessionDescriptor>(json, ProtocolJson.Options);
            if (descriptor?.Token == token)
            {
                File.Delete(PathOnDisk);
            }
        }
        catch
        {
            // Session cleanup is best-effort and must never break game shutdown.
        }
    }
}
