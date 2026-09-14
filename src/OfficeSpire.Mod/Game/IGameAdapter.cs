using OfficeSpire.Protocol;

namespace OfficeSpire.Game;

public interface IGameAdapter
{
    StateEnvelope CaptureState();

    ActionResponse Dispatch(ActionRequest request);
}

public sealed class NullGameAdapter : IGameAdapter
{
    private const long InitialRevision = 0;

    public StateEnvelope CaptureState()
    {
        return new StateEnvelope(
            ProtocolConstants.CurrentVersion,
            InitialRevision,
            PhaseNames.Unknown,
            ActionPending: false,
            Run: ProtocolJson.EmptyObject(),
            Screen: ProtocolJson.EmptyObject());
    }

    public ActionResponse Dispatch(ActionRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        return new ActionResponse(
            request.RequestId,
            Accepted: false,
            Code: "adapter_not_ready",
            Message: "OfficeSpire has not attached a runtime STS2 game adapter yet.",
            StateRevision: InitialRevision);
    }
}
