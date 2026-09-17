param(
    [Parameter(Mandatory = $true)]
    [string]$ModDll,

    [Parameter(Mandatory = $true)]
    [string]$OverlayArchive,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{40}$')]
    [string]$SourceCommit,

    [string]$OutputDirectory = "dist/offline"
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $repositoryRoot "src/OfficeSpire.Mod/OfficeSpire.json"
$resolvedDll = (Resolve-Path -LiteralPath $ModDll).Path
$resolvedOverlay = (Resolve-Path -LiteralPath $OverlayArchive).Path
$resolvedOutput = [IO.Path]::GetFullPath((Join-Path $repositoryRoot $OutputDirectory))
$allowedOutput = [IO.Path]::GetFullPath((Join-Path $repositoryRoot "dist"))
$allowedPrefix = $allowedOutput.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar

if ($resolvedOutput -ne $allowedOutput -and
    -not $resolvedOutput.StartsWith($allowedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "OutputDirectory must remain inside the repository dist directory."
}

$dllItem = Get-Item -LiteralPath $resolvedDll
$overlayItem = Get-Item -LiteralPath $resolvedOverlay
if ($dllItem.PSIsContainer -or ($dllItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -or
    $dllItem.Name -ne "OfficeSpire.dll") {
    throw "ModDll must be a regular OfficeSpire.dll file."
}
if ($overlayItem.PSIsContainer -or ($overlayItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -or
    $overlayItem.Extension.ToLowerInvariant() -ne ".zip") {
    throw "OverlayArchive must be a regular ZIP produced by Windows Offline Kits."
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($manifest.id -ne "OfficeSpire" -or -not $manifest.has_dll -or $manifest.has_pck) {
    throw "OfficeSpire.json is not the expected DLL-only manifest."
}

$stagingRoot = Join-Path $resolvedOutput ("staging-" + [guid]::NewGuid().ToString("N"))
$contentRoot = Join-Path $stagingRoot "OfficeSpire-Offline"
$modRoot = Join-Path $contentRoot "mod"
$overlayRoot = Join-Path $contentRoot "overlay"
$scriptRoot = Join-Path $contentRoot "scripts"
New-Item -ItemType Directory -Path $modRoot, $overlayRoot, $scriptRoot -Force | Out-Null

Copy-Item -LiteralPath $resolvedDll -Destination $modRoot
Copy-Item -LiteralPath $manifestPath -Destination $modRoot
Expand-Archive -LiteralPath $resolvedOverlay -DestinationPath $overlayRoot
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "install-offline.ps1") -Destination $scriptRoot
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "uninstall-offline.ps1") -Destination $scriptRoot
Copy-Item -LiteralPath (Join-Path $repositoryRoot "LICENSE") -Destination $contentRoot
Copy-Item -LiteralPath (Join-Path $repositoryRoot "THIRD_PARTY_NOTICES.md") -Destination $contentRoot
Copy-Item -LiteralPath (Join-Path $repositoryRoot "docs/OFFLINE_DEPLOYMENT.md") -Destination (Join-Path $contentRoot "README.md")

[ordered]@{
    schema_version = 1
    product = "OfficeSpire"
    mod_version = $manifest.version
    minimum_game_version = $manifest.min_game_version
    source_commit = $SourceCommit.ToLowerInvariant()
    generated_utc = [DateTimeOffset]::UtcNow.ToString("O")
    includes_mod = $true
    includes_overlay = $true
    includes_game_files = $false
    publication_performed = $false
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $contentRoot "DEPLOYMENT.json") -Encoding utf8

$checksums = Get-ChildItem -LiteralPath $contentRoot -File -Recurse |
    Where-Object Name -ne "SHA256SUMS.txt" |
    Sort-Object FullName |
    ForEach-Object {
        $relative = [IO.Path]::GetRelativePath($contentRoot, $_.FullName).Replace('\', '/')
        $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        "$hash  $relative"
    }
$checksums | Set-Content -LiteralPath (Join-Path $contentRoot "SHA256SUMS.txt") -Encoding utf8

New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
$version = $manifest.version.TrimStart("v")
$zipPath = Join-Path $resolvedOutput "OfficeSpire-v$version-Windows-x64-offline.zip"
if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -LiteralPath $contentRoot -DestinationPath $zipPath -CompressionLevel Optimal
$hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath "$zipPath.sha256" -Value "$hash  $([IO.Path]::GetFileName($zipPath))" -Encoding utf8

Remove-Item -LiteralPath $stagingRoot -Recurse -Force
Write-Host "Offline package: $zipPath"
Write-Host "SHA-256: $hash"
Write-Host "No game files, Steam upload, or Workshop publication were performed."
