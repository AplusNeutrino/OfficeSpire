using OfficeSpire.Protocol;

namespace OfficeSpire.Runtime;

public sealed class ProtocolStateStore
{
    private StateEnvelope _current;

    public ProtocolStateStore(StateEnvelope initial)
    {
        _current = initial ?? throw new ArgumentNullException(nameof(initial));
    }

    public StateEnvelope Read()
    {
        return Volatile.Read(ref _current);
    }

    public void Publish(StateEnvelope state)
    {
        ArgumentNullException.ThrowIfNull(state);
        Volatile.Write(ref _current, state);
    }
}
