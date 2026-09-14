using System.Reflection;
using Godot.Bridge;
using HarmonyLib;
using MegaCrit.Sts2.Core.Modding;
using OfficeSpire.Diagnostics;
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
        StartupDiagnostics.Mark("initializer_enter");

        Assembly assembly = Assembly.GetExecutingAssembly();
        StartupDiagnostics.Mark("assembly_resolved", assembly.FullName);

        try
        {
            var harmony = new Harmony(HarmonyId);
            harmony.PatchAll(assembly);
            StartupDiagnostics.Mark("harmony_ready");
        }
        catch (Exception ex)
        {
            StartupDiagnostics.Failure("harmony", ex);
        }

        try
        {
            ScriptManagerBridge.LookupScriptsInAssembly(assembly);
            StartupDiagnostics.Mark("godot_script_bridge_ready");
        }
        catch (Exception ex)
        {
            StartupDiagnostics.Failure("godot_script_bridge", ex);
        }

        bool runtimeReady = false;
        try
        {
            OfficeSpireRuntime.Initialize();
            runtimeReady = true;
            StartupDiagnostics.Mark(
                "runtime_ready",
                OfficeSpireRuntime.Session is { } session
                    ? $"127.0.0.1:{session.Port}"
                    : "transport_session_unavailable");
        }
        catch (Exception ex)
        {
            StartupDiagnostics.Failure("runtime", ex);
        }

        if (runtimeReady)
        {
            try
            {
                Sts2RuntimeBridge.Attach();
                StartupDiagnostics.Mark("m3_adapter_attached");
            }
            catch (Exception ex)
            {
                // Keep the transport available with NullGameAdapter if STS2 internals changed.
                StartupDiagnostics.Failure("m3_adapter_attach", ex);
            }
        }
        else
        {
            StartupDiagnostics.Mark("m3_adapter_skipped", "runtime_not_ready");
        }

        StartupDiagnostics.Mark(
            "initializer_complete",
            OfficeSpireRuntime.Session is { } active
                ? $"transport=127.0.0.1:{active.Port}"
                : "transport=unavailable");
    }
}
