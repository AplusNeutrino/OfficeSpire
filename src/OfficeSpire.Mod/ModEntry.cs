using System.Reflection;
using HarmonyLib;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Modding;
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

        OfficeSpireRuntime.Initialize();
        Log.Info("[OfficeSpire] v0.6 M1 runtime initialized (adapter: null/unverified).");
    }
}
