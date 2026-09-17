param(
    [string]$Sts2Dir = $env:STS2_DIR
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($Sts2Dir)) {
    throw "Pass -Sts2Dir or set STS2_DIR to the Slay the Spire 2 installation directory."
}

$resolvedGame = (Resolve-Path -LiteralPath $Sts2Dir).Path
$destination = Join-Path $resolvedGame "mods/OfficeSpire"
$ownedFiles = @(
    (Join-Path $destination "OfficeSpire.dll"),
    (Join-Path $destination "OfficeSpire.json")
)

foreach ($file in $ownedFiles) {
    if (Test-Path -LiteralPath $file -PathType Leaf) {
        Remove-Item -LiteralPath $file -Force
        Write-Host "Removed: $file"
    }
}

if ((Test-Path -LiteralPath $destination -PathType Container) -and
    -not (Get-ChildItem -LiteralPath $destination -Force)) {
    Remove-Item -LiteralPath $destination
}

Write-Host "The Overlay is managed separately through Windows Apps or its portable directory."
