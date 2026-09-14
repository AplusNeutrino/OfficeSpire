using OfficeSpire.Diagnostics;
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
        StateEnvelope initialState = _adapter.CaptureState();
        _stateStore = new ProtocolStateStore(initialState);
        RuntimeDiagnostics.Observe(initialState);

        _transport = new LoopbackWebSocketServer(_stateStore);
        _transport.Start();
    }

    public static void AttachGameAdapter(IGameAdapter adapter)
    {
        ArgumentNullException.ThrowIfNull(adapter);
        _adapter = adapter;

        StateEnvelope state = _adapter.CaptureState();
        StateStore.Publish(state);
        RuntimeDiagnostics.Observe(state);
    }

    public static void RefreshStateOnGameThread()
    {
        StateEnvelope state = _adapter.CaptureState();
        StateStore.Publish(state);
        RuntimeDiagnostics.Observe(state);
    }

    internal static void SetAdapterForTesting(IGameAdapter adapter)
    {
        AttachGameAdapter(adapter);
    }
}
