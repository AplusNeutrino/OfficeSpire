param(
    [Parameter(Mandatory = $true)]
    [string]$ModDll,

    [string]$OverlayBundle,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{40}$')]
    [string]$SourceCommit,

    [string]$OutputDirectory = "dist/workshop"
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $repositoryRoot "src/OfficeSpire.Mod/OfficeSpire.json"
$resolvedDll = (Resolve-Path -LiteralPath $ModDll).Path
$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot $OutputDirectory))
$allowedOutputRoot = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot "dist"))
$allowedOutputPrefix = $allowedOutputRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

if ($resolvedOutput -ne $allowedOutputRoot -and -not $resolvedOutput.StartsWith($allowedOutputPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "OutputDirectory must remain inside the repository dist directory."
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($manifest.id -ne "OfficeSpire" -or -not $manifest.has_dll -or $manifest.has_pck -or $manifest.dependencies -isnot [array]) {
    throw "OfficeSpire.json is not a DLL-only OfficeSpire manifest."
}
$dependencyIds = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
foreach ($dependency in $manifest.dependencies) {
    if ([string]::IsNullOrWhiteSpace($dependency.id) -or [string]::IsNullOrWhiteSpace($dependency.min_version)) {
        throw "Every declared dependency must contain id and min_version."
    }
    if (-not $dependencyIds.Add($dependency.id)) {
        throw "Duplicate dependency id: $($dependency.id)"
    }
}
$dllItem = Get-Item -LiteralPath $resolvedDll
if ($dllItem.PSIsContainer -or ($dllItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
    throw "ModDll must be a regular file, not a directory or reparse point."
}
if ($dllItem.Name -ne "OfficeSpire.dll") {
    throw "ModDll must point to OfficeSpire.dll."
}

$resolvedOverlay = $null
if (-not [string]::IsNullOrWhiteSpace($OverlayBundle)) {
    $resolvedOverlay = (Resolve-Path -LiteralPath $OverlayBundle).Path
    $overlayItem = Get-Item -LiteralPath $resolvedOverlay
    $allowedOverlayExtensions = @(".exe", ".msi", ".zip")
    if ($overlayItem.PSIsContainer -or ($overlayItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
        throw "OverlayBundle must be a regular file, not a directory or reparse point."
    }
    if ($allowedOverlayExtensions -notcontains $overlayItem.Extension.ToLowerInvariant()) {
        throw "OverlayBundle must be a .exe, .msi, or .zip produced by the Windows bundle workflow."
    }
}

$stagingRoot = Join-Path $resolvedOutput ("staging-" + [guid]::NewGuid().ToString("N"))
$contentRoot = Join-Path $stagingRoot "OfficeSpire"
New-Item -ItemType Directory -Path $contentRoot -Force | Out-Null

Copy-Item -LiteralPath $manifestPath -Destination $contentRoot
Copy-Item -LiteralPath $resolvedDll -Destination $contentRoot
if ($resolvedOverlay) {
    $overlayRoot = Join-Path $contentRoot "overlay"
    New-Item -ItemType Directory -Path $overlayRoot -Force | Out-Null
    Copy-Item -LiteralPath $resolvedOverlay -Destination $overlayRoot
}
Copy-Item -LiteralPath (Join-Path $repositoryRoot "LICENSE") -Destination $contentRoot
Copy-Item -LiteralPath (Join-Path $repositoryRoot "THIRD_PARTY_NOTICES.md") -Destination $contentRoot
Copy-Item -LiteralPath (Join-Path $repositoryRoot "docs/STEAM_WORKSHOP_RELEASE.md") -Destination (Join-Path $contentRoot "INSTALL.md")

$payloadFiles = Get-ChildItem -LiteralPath $contentRoot -File -Recurse | Sort-Object FullName
$payload = @($payloadFiles | ForEach-Object {
    [ordered]@{
        path = [System.IO.Path]::GetRelativePath($contentRoot, $_.FullName).Replace('\', '/')
        size = $_.Length
        sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
})
$candidateMetadata = [ordered]@{
    schema_version = 1
    mod_id = $manifest.id
    mod_version = $manifest.version
    minimum_game_version = $manifest.min_game_version
    source_commit = $SourceCommit.ToLowerInvariant()
    generated_utc = [DateTimeOffset]::UtcNow.ToString("O")
    includes_overlay = [bool]$resolvedOverlay
    dependencies = @($manifest.dependencies)
    payload = $payload
    publication_performed = $false
}
$candidateMetadata | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $contentRoot "CANDIDATE.json") -Encoding utf8

$version = $manifest.version.TrimStart("v")
$zipPath = Join-Path $resolvedOutput "OfficeSpire-v$version-workshop-candidate.zip"
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -LiteralPath $contentRoot -DestinationPath $zipPath -CompressionLevel Optimal

$hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
$checksumPath = "$zipPath.sha256"
Set-Content -LiteralPath $checksumPath -Value "$hash  $([System.IO.Path]::GetFileName($zipPath))" -Encoding utf8
Write-Host "Workshop candidate: $zipPath"
Write-Host "SHA-256: $hash"
Write-Host "Source commit: $($SourceCommit.ToLowerInvariant())"
Write-Host "No Steam upload or Workshop publication was performed."
