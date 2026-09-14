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
    private static readonly ActionInbox _actionInbox = new();

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

        // Keep the runtime-validated M3 reader intact and layer the M4 writer around it.
        _adapter = adapter is Sts2GameAdapter
            ? new M4GameAdapter(adapter)
            : adapter;

        StateEnvelope state = _adapter.CaptureState();
        state = _actionInbox.Observe(state);
        StateStore.Publish(state);
        RuntimeDiagnostics.Observe(state);
    }

    /// <summary>
    /// Called from the WebSocket thread. Performs protocol/state-store checks only;
    /// it never reads or mutates STS2 runtime objects.
    /// </summary>
    public static bool TryQueueAction(ActionRequest request, out ActionResponse response)
    {
        ArgumentNullException.ThrowIfNull(request);

        StateEnvelope current = StateStore.Read();
        bool queued = _actionInbox.TryQueue(request, current, out response);

        if (queued)
        {
            StateEnvelope pending = current.ActionPending
                ? current
                : current with { ActionPending = true };
            StateStore.Publish(pending);
            RuntimeDiagnostics.Observe(pending);
        }

        return queued;
    }

    public static bool TryGetActionResult(string requestId, out ActionResponse response)
    {
        return _actionInbox.TryGetStatus(requestId, out response);
    }

    public static void RefreshStateOnGameThread()
    {
        // Capture exactly once per 20 Hz tick. The same fresh state is used for the
        // second CAS/readiness check before dispatch, so revision stabilization is
        // not accidentally advanced by multiple captures inside one Godot frame.
        StateEnvelope state = _adapter.CaptureState();

        _actionInbox.ProcessQueuedOnGameThread(_adapter, state);
        state = _actionInbox.Observe(state);

        StateStore.Publish(state);
        RuntimeDiagnostics.Observe(state);
    }

    internal static void SetAdapterForTesting(IGameAdapter adapter)
    {
        AttachGameAdapter(adapter);
    }
}
