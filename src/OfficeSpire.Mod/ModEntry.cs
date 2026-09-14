using System.Reflection;
using Godot.Bridge;
using HarmonyLib;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Modding;
using OfficeSpire.Game;
using OfficeSpire.Runtime;

namespace OfficeSpire;

[ModInitializer(nameof(Initialize))]
public sealed class ModEntry
{
    public const string ModId = "OfficeSpire";
    public const string HarmonyId = "sts2.aplusneutrino.officespire";

    public static void Initialize()
    {
        Assembly assembly = Assembly.GetExecutingAssembly();

        var harmony = new Harmony(HarmonyId);
        harmony.PatchAll(assembly);

        // Required for the runtime-created Godot update node used by the M3 adapter.
        ScriptManagerBridge.LookupScriptsInAssembly(assembly);

        OfficeSpireRuntime.Initialize();

        try
        {
            Sts2RuntimeBridge.Attach();
        }
        catch (Exception ex)
        {
            // Transport remains usable with the NullGameAdapter if STS2 internals changed.
            Log.Info($"[OfficeSpire] M3 adapter attach failed: {ex.GetType().Name}: {ex.Message}");
        }

        int? port = OfficeSpireRuntime.Session?.Port;
        Log.Info(port is null
            ? "[OfficeSpire] v0.6 M3 initialized; transport session unavailable."
            : $"[OfficeSpire] v0.6 M3 initialized; loopback transport listening on 127.0.0.1:{port}.");
    }
}
