using Godot;
using MegaCrit.Sts2.Core.Nodes;
using MegaCrit.Sts2.Core.Nodes.GodotExtensions;
using OfficeSpire.Runtime;

namespace OfficeSpire.Game;

public static class Sts2RuntimeBridge
{
    private static OfficeSpireUpdateNode? _updateNode;

    public static void Attach()
    {
        if (_updateNode is not null)
        {
            return;
        }

        OfficeSpireRuntime.AttachGameAdapter(new Sts2GameAdapter());

        _updateNode = new OfficeSpireUpdateNode();
        NGame.Instance.AddChildSafely(_updateNode);
    }
}

public partial class OfficeSpireUpdateNode : Node
{
    private const double RefreshIntervalSeconds = 0.05;
    private double _elapsed;

    public OfficeSpireUpdateNode()
    {
        Name = "OfficeSpireUpdateNode";
        ProcessMode = ProcessModeEnum.Always;
    }

    public override void _Process(double delta)
    {
        _elapsed += delta;
        if (_elapsed < RefreshIntervalSeconds)
        {
            return;
        }

        _elapsed = 0;
        OfficeSpireRuntime.RefreshStateOnGameThread();
    }
}
