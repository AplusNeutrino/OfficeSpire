using OfficeSpire.Game;
using OfficeSpire.Protocol;
using OfficeSpire.Transport;

namespace OfficeSpire.Runtime;

public static class OfficeSpireRuntime
{
    private static IGameAdapter _adapter = new NullGameAdapter();
    private static ProtocolStateStore? _stateStore;
    private static LoopbackWebSocketServer? _transport;

    public static IGameAdapter Adapter => _adapter;
    public static ProtocolStateStore StateStore => _stateStore ?? throw new InvalidOperationException("OfficeSpire runtime has not been initialized.");
    public static SessionDescriptor? Session => _transport?.Session;

    public static void Initialize()
    {
        if (_transport is not null)
        {
            return;
        }

        // M2 deliberately starts with a non-mutating adapter. M3 replaces this
        // with the first real STS2 state adapter after runtime validation.
        _adapter = new NullGameAdapter();
        _stateStore = new ProtocolStateStore(_adapter.CaptureState());

        _transport = new LoopbackWebSocketServer(_stateStore);
        _transport.Start();
    }

    internal static void SetAdapterForTesting(IGameAdapter adapter)
    {
        _adapter = adapter ?? throw new ArgumentNullException(nameof(adapter));
        _stateStore?.Publish(_adapter.CaptureState());
    }
}
