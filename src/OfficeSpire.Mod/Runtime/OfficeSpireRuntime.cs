using OfficeSpire.Game;

namespace OfficeSpire.Runtime;

public static class OfficeSpireRuntime
{
    private static IGameAdapter _adapter = new NullGameAdapter();

    public static IGameAdapter Adapter => _adapter;

    public static void Initialize()
    {
        // M1 deliberately starts with a non-mutating adapter. M3 replaces this
        // with the first real STS2 state adapter after runtime validation.
        _adapter = new NullGameAdapter();
    }

    internal static void SetAdapterForTesting(IGameAdapter adapter)
    {
        _adapter = adapter ?? throw new ArgumentNullException(nameof(adapter));
    }
}
