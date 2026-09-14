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

        _adapter = new NullGameAdapter();
        _stateStore = new ProtocolStateStore(_adapter.CaptureState());

        _transport = new LoopbackWebSocketServer(_stateStore);
        _transport.Start();
    }

    public static void AttachGameAdapter(IGameAdapter adapter)
    {
        ArgumentNullException.ThrowIfNull(adapter);
        _adapter = adapter;
        StateStore.Publish(_adapter.CaptureState());
    }

    public static void RefreshStateOnGameThread()
    {
        StateStore.Publish(_adapter.CaptureState());
    }

    internal static void SetAdapterForTesting(IGameAdapter adapter)
    {
        AttachGameAdapter(adapter);
    }
}
