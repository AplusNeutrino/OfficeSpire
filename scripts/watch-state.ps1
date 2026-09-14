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
            "rev={0} phase=combat HP={1}/{2} Block={3} Energy={4}/{5} Hand={6} Enemies={7}" -f
            $State.state_revision,
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
            Write-Host ("  enemy {0}: HP={1}/{2} Block={3} Intent={4}" -f
                $enemy.name,
                $enemy.current_hp,
                $enemy.max_hp,
                $enemy.block,
                $enemy.intent)
        }
    }
    else {
        Write-Host ("rev={0} phase={1}" -f $State.state_revision, $State.phase)
    }
}

try {
    Write-Host "Connecting to $uri"
    $socket.ConnectAsync($uri, $ct).GetAwaiter().GetResult()
    Write-Host "Connected. Watching OfficeSpire state; Ctrl+C to stop."

    $lastRevision = [long]-1

    # Server sends hello and an initial state immediately after the WebSocket upgrade.
    for ($i = 0; $i -lt 2; $i++) {
        $text = Receive-OfficeSpireMessage -Socket $socket
        if ($null -eq $text) { break }
        $message = $text | ConvertFrom-Json
        if ($message.type -eq "state") {
            $lastRevision = [long]$message.body.state_revision
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
            if ($revision -ne $lastRevision) {
                $lastRevision = $revision
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
