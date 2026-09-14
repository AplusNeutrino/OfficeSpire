using OfficeSpire.Game;
using OfficeSpire.Protocol;

namespace OfficeSpire.Runtime;

/// <summary>
/// Thread-safe bridge between WebSocket requests and STS2's main thread.
/// Network threads may enqueue protocol requests and inspect status only.
/// STS2 objects are touched exclusively by ProcessQueuedOnGameThread.
/// </summary>
internal sealed class ActionInbox
{
    private const int StatusHistoryLimit = 128;
    private const long NativeActionStartTimeoutMilliseconds = 3000;

    private readonly object _gate = new();
    private readonly Dictionary<string, ActionResponse> _statusByRequestId =
        new(StringComparer.Ordinal);
    private readonly Queue<string> _statusOrder = new();

    private PendingAction? _queued;
    private ActiveAction? _active;
    private bool _dispatching;

    public bool TryQueue(
        ActionRequest request,
        StateEnvelope current,
        out ActionResponse response)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(current);

        lock (_gate)
        {
            if (string.IsNullOrWhiteSpace(request.RequestId))
            {
                response = Reject(
                    request,
                    "bad_request",
                    "request_id is required.",
                    current.StateRevision);
                return false;
            }

            if (_statusByRequestId.ContainsKey(request.RequestId))
            {
                response = Reject(
                    request,
                    "duplicate_request",
                    $"request_id '{request.RequestId}' has already been used.",
                    current.StateRevision);
                return false;
            }

            if (_queued is not null || _active is not null || _dispatching || current.ActionPending)
            {
                response = Reject(
                    request,
                    "action_pending",
                    "Another OfficeSpire/game action is still pending.",
                    current.StateRevision);
                Remember(response);
                return false;
            }

            if (request.ExpectedRevision != current.StateRevision)
            {
                response = Reject(
                    request,
                    "stale_state",
                    $"expected_revision={request.ExpectedRevision}, current={current.StateRevision}.",
                    current.StateRevision);
                Remember(response);
                return false;
            }

            if (!string.Equals(current.Phase, PhaseNames.Combat, StringComparison.Ordinal))
            {
                response = Reject(
                    request,
                    "bad_phase",
                    $"Combat action requested while phase='{current.Phase}'.",
                    current.StateRevision);
                Remember(response);
                return false;
            }

            _queued = new PendingAction(request);
            response = new ActionResponse(
                request.RequestId,
                Accepted: true,
                Code: "queued",
                Message: "Action accepted by transport and queued for the STS2 main thread.",
                StateRevision: current.StateRevision);
            Remember(response);
            return true;
        }
    }

    /// <summary>
    /// Called only from the Godot/STS2 main thread. Performs a second CAS/readiness check
    /// immediately before touching the adapter, then lets the adapter enqueue the native action.
    /// </summary>
    public void ProcessQueuedOnGameThread(
        IGameAdapter adapter,
        StateEnvelope freshState)
    {
        ArgumentNullException.ThrowIfNull(adapter);
        ArgumentNullException.ThrowIfNull(freshState);

        PendingAction? pending;
        lock (_gate)
        {
            if (_queued is null)
            {
                return;
            }

            pending = _queued;
            _queued = null;
            _dispatching = true;
        }

        ActionResponse result;
        ActionRequest request = pending.Request;

        try
        {
            if (request.ExpectedRevision != freshState.StateRevision)
            {
                result = Reject(
                    request,
                    "stale_state",
                    $"State advanced before main-thread dispatch: expected={request.ExpectedRevision}, current={freshState.StateRevision}.",
                    freshState.StateRevision);
            }
            else if (freshState.ActionPending)
            {
                result = Reject(
                    request,
                    "not_ready",
                    "STS2 decision state became pending before main-thread dispatch.",
                    freshState.StateRevision);
            }
            else if (!string.Equals(freshState.Phase, PhaseNames.Combat, StringComparison.Ordinal))
            {
                result = Reject(
                    request,
                    "bad_phase",
                    $"Combat ended or changed phase before dispatch: phase='{freshState.Phase}'.",
                    freshState.StateRevision);
            }
            else
            {
                result = adapter.Dispatch(request);
            }
        }
        catch (Exception ex)
        {
            result = Reject(
                request,
                "dispatch_exception",
                $"{ex.GetType().Name}: {ex.Message}",
                freshState.StateRevision);
        }

        lock (_gate)
        {
            _dispatching = false;

            if (result.Accepted)
            {
                result = result with
                {
                    Code = "accepted",
                    Message = string.IsNullOrWhiteSpace(result.Message)
                        ? "Action accepted by the STS2 dispatcher."
                        : result.Message
                };

                _active = new ActiveAction(
                    request.RequestId,
                    request.ExpectedRevision,
                    Environment.TickCount64,
                    SawGamePending: false);
            }

            Remember(result);
        }
    }

    /// <summary>
    /// Merges inbox lifecycle state into the latest adapter snapshot.
    /// An accepted action remains pending until the adapter publishes a newer, settled
    /// authoritative revision. Silent native no-ops are failed and released rather than
    /// permanently pinning action_pending=true.
    /// </summary>
    public StateEnvelope Observe(StateEnvelope captured)
    {
        ArgumentNullException.ThrowIfNull(captured);

        lock (_gate)
        {
            if (_queued is not null || _dispatching)
            {
                return captured.ActionPending
                    ? captured
                    : captured with { ActionPending = true };
            }

            if (_active is null)
            {
                return captured;
            }

            ActiveAction active = _active;

            if (captured.ActionPending && !active.SawGamePending)
            {
                active = active with { SawGamePending = true };
                _active = active;
            }

            if (captured.StateRevision != active.AcceptedRevision &&
                !captured.ActionPending)
            {
                _active = null;

                Remember(new ActionResponse(
                    active.RequestId,
                    Accepted: true,
                    Code: "completed",
                    Message: "Action reached a newer settled authoritative decision state.",
                    StateRevision: captured.StateRevision));

                return captured;
            }

            // If STS2 was observed busy for this action and then returned to the same settled
            // revision, the native action finished without changing decision state. Treat that
            // as a failed/no-op action rather than leaving OfficeSpire permanently locked.
            if (active.SawGamePending &&
                !captured.ActionPending &&
                captured.StateRevision == active.AcceptedRevision)
            {
                _active = null;

                Remember(new ActionResponse(
                    active.RequestId,
                    Accepted: false,
                    Code: "no_effect",
                    Message: "STS2 returned to a settled state without advancing the decision revision.",
                    StateRevision: captured.StateRevision));

                return captured;
            }

            // Some rejected/silently dropped native submissions may be too short to be sampled as
            // engine-busy at 20 Hz. Release those too if no native progress or revision change is
            // observed within a bounded startup window.
            if (!active.SawGamePending &&
                !captured.ActionPending &&
                captured.StateRevision == active.AcceptedRevision &&
                ElapsedMilliseconds(active.AcceptedAtMs) >= NativeActionStartTimeoutMilliseconds)
            {
                _active = null;

                Remember(new ActionResponse(
                    active.RequestId,
                    Accepted: false,
                    Code: "no_effect",
                    Message: $"No native action progress was observed within {NativeActionStartTimeoutMilliseconds} ms.",
                    StateRevision: captured.StateRevision));

                return captured;
            }

            return captured.ActionPending
                ? captured
                : captured with { ActionPending = true };
        }
    }

    public bool TryGetStatus(string requestId, out ActionResponse response)
    {
        if (string.IsNullOrWhiteSpace(requestId))
        {
            response = default!;
            return false;
        }

        lock (_gate)
        {
            if (_statusByRequestId.TryGetValue(requestId, out ActionResponse? found))
            {
                response = found;
                return true;
            }

            response = default!;
            return false;
        }
    }

    private void Remember(ActionResponse response)
    {
        bool isNew = !_statusByRequestId.ContainsKey(response.RequestId);
        _statusByRequestId[response.RequestId] = response;

        if (isNew)
        {
            _statusOrder.Enqueue(response.RequestId);
        }

        while (_statusOrder.Count > StatusHistoryLimit)
        {
            string evicted = _statusOrder.Dequeue();
            if (_queued?.Request.RequestId == evicted || _active?.RequestId == evicted)
            {
                _statusOrder.Enqueue(evicted);
                break;
            }

            _statusByRequestId.Remove(evicted);
        }
    }

    private static long ElapsedMilliseconds(long sinceMs)
    {
        long now = Environment.TickCount64;
        return now >= sinceMs ? now - sinceMs : long.MaxValue;
    }

    private static ActionResponse Reject(
        ActionRequest request,
        string code,
        string message,
        long currentRevision)
    {
        return new ActionResponse(
            request.RequestId,
            Accepted: false,
            Code: code,
            Message: message,
            StateRevision: currentRevision);
    }

    private sealed record PendingAction(ActionRequest Request);

    private sealed record ActiveAction(
        string RequestId,
        long AcceptedRevision,
        long AcceptedAtMs,
        bool SawGamePending);
}
