param(
    [string]$Sts2Dir = $env:STS2_DIR
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($Sts2Dir)) {
    throw "Pass -Sts2Dir or set STS2_DIR to the Slay the Spire 2 installation directory."
}

$resolvedGame = (Resolve-Path -LiteralPath $Sts2Dir).Path
$gameAssembly = Join-Path $resolvedGame "data_sts2_windows_x86_64/sts2.dll"
if (-not (Test-Path -LiteralPath $gameAssembly -PathType Leaf)) {
    throw "The selected directory is not a supported STS2 installation: $gameAssembly was not found."
}

$packageRoot = Split-Path -Parent $PSScriptRoot
$sourceMod = Join-Path $packageRoot "mod"
$sourceDll = Join-Path $sourceMod "OfficeSpire.dll"
$sourceManifest = Join-Path $sourceMod "OfficeSpire.json"
if (-not (Test-Path -LiteralPath $sourceDll -PathType Leaf) -or
    -not (Test-Path -LiteralPath $sourceManifest -PathType Leaf)) {
    throw "The offline package is incomplete: mod/OfficeSpire.dll and mod/OfficeSpire.json are required."
}

$destination = Join-Path $resolvedGame "mods/OfficeSpire"
New-Item -ItemType Directory -Path $destination -Force | Out-Null
Copy-Item -LiteralPath $sourceDll -Destination $destination -Force
Copy-Item -LiteralPath $sourceManifest -Destination $destination -Force

Write-Host "OfficeSpire Mod installed to: $destination"
Write-Host "Install or run the Overlay from the package's overlay directory."
Write-Host "No SDK, npm, Rust, Cargo, Steam upload, or game action was performed."
