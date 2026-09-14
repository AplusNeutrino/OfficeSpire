param(
    [int]$IntervalMs = 500,
    [switch]$Raw
)

$ErrorActionPreference = "Stop"

$sessionPath = Join-Path $env:APPDATA "SlayTheSpire2\OfficeSpire\session.json"
if (-not (Test-Path $sessionPath)) {
    throw "OfficeSpire session file not found: $sessionPath. Start STS2 with OfficeSpire enabled first."
}

$session = Get-Content $sessionPath -Raw | ConvertFrom-Json
$escapedToken = [Uri]::EscapeDataString([string]$session.token)
$uri = [Uri]("ws://127.0.0.1:{0}/officespire?token={1}" -f $session.port, $escapedToken)
$ct = [Threading.CancellationToken]::None
$socket = [System.Net.WebSockets.ClientWebSocket]::new()

function Receive-OfficeSpireMessage {
    param([System.Net.WebSockets.ClientWebSocket]$Socket)

    $buffer = New-Object byte[] 65536
    $segment = [ArraySegment[byte]]::new($buffer)
    $stream = [IO.MemoryStream]::new()

    try {
        do {
            $result = $Socket.ReceiveAsync($segment, $ct).GetAwaiter().GetResult()
            if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
                return $null
            }
            $stream.Write($buffer, 0, $result.Count)
        } while (-not $result.EndOfMessage)

        return [Text.Encoding]::UTF8.GetString($stream.ToArray())
    }
    finally {
        $stream.Dispose()
    }
}

function Send-OfficeSpireMessage {
    param(
        [System.Net.WebSockets.ClientWebSocket]$Socket,
        [string]$Json
    )

    $bytes = [Text.Encoding]::UTF8.GetBytes($Json)
    $segment = [ArraySegment[byte]]::new($bytes)
    $Socket.SendAsync(
        $segment,
        [System.Net.WebSockets.WebSocketMessageType]::Text,
        $true,
        $ct
    ).GetAwaiter().GetResult() | Out-Null
}

function Show-State {
    param($State)

    if ($Raw) {
        $State | ConvertTo-Json -Depth 20
        return
    }

    if ($State.phase -eq "combat") {
        $screen = $State.screen
        $player = $screen.player
        Write-Host (
            "rev={0} pending={1} phase=combat HP={2}/{3} Block={4} Energy={5}/{6} Hand={7} Enemies={8}" -f
            $State.state_revision,
            $State.action_pending,
            $player.current_hp,
            $player.max_hp,
            $player.block,
            $screen.energy,
            $screen.max_energy,
            @($screen.hand).Count,
            @($screen.enemies).Count
        )

        foreach ($card in @($screen.hand)) {
            Write-Host ("  [{0}] {1} cost={2} dmg={3} block={4} can_play={5}" -f
                $card.hand_index,
                $card.name,
                $card.cost,
                $card.damage,
                $card.block,
                $card.can_play)
        }

        foreach ($enemy in @($screen.enemies)) {
            $targetLabel = if ($null -ne $enemy.combat_id -and [int]$enemy.combat_id -ge 0) {
                "enemy-{0}" -f $enemy.combat_id
            }
            elseif (-not [string]::IsNullOrWhiteSpace([string]$enemy.stable_id)) {
                [string]$enemy.stable_id
            }
            else {
                "enemy-?"
            }

            Write-Host ("  {0} {1}: HP={2}/{3} Block={4} Intent={5}" -f
                $targetLabel,
                $enemy.name,
                $enemy.current_hp,
                $enemy.max_hp,
                $enemy.block,
                $enemy.intent)
        }
    }
    else {
        Write-Host ("rev={0} pending={1} phase={2}" -f
            $State.state_revision,
            $State.action_pending,
            $State.phase)
    }
}

try {
    Write-Host "Connecting to $uri"
    $socket.ConnectAsync($uri, $ct).GetAwaiter().GetResult()
    Write-Host "Connected. Watching OfficeSpire state; Ctrl+C to stop."

    $lastRevision = [long]-1
    $lastPending = $null

    # Server sends hello and an initial state immediately after the WebSocket upgrade.
    for ($i = 0; $i -lt 2; $i++) {
        $text = Receive-OfficeSpireMessage -Socket $socket
        if ($null -eq $text) { break }
        $message = $text | ConvertFrom-Json
        if ($message.type -eq "state") {
            $lastRevision = [long]$message.body.state_revision
            $lastPending = [bool]$message.body.action_pending
            Show-State -State $message.body
        }
    }

    while ($socket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        $request = @{
            type = "get_state"
            protocol_version = 1
            body = @{}
        } | ConvertTo-Json -Compress

        Send-OfficeSpireMessage -Socket $socket -Json $request
        $text = Receive-OfficeSpireMessage -Socket $socket
        if ($null -eq $text) { break }

        $message = $text | ConvertFrom-Json
        if ($message.type -eq "state") {
            $revision = [long]$message.body.state_revision
            $pending = [bool]$message.body.action_pending
            if ($revision -ne $lastRevision -or $pending -ne $lastPending) {
                $lastRevision = $revision
                $lastPending = $pending
                Show-State -State $message.body
            }
        }

        Start-Sleep -Milliseconds $IntervalMs
    }
}
finally {
    if ($socket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        $socket.CloseAsync(
            [System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure,
            "diagnostic client closing",
            $ct
        ).GetAwaiter().GetResult() | Out-Null
    }
    $socket.Dispose()
}
