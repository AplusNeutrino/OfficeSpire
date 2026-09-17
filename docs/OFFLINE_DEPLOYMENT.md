# Offline Deployment

OfficeSpire can be prepared on a connected build machine and installed on the
game PC without installing the .NET SDK, Node.js, npm, Rust, Cargo or Tauri.

## 1. Build the Overlay in GitHub Actions

Run **Windows Offline Kits** from the repository Actions page. After validation,
it produces two artifacts retained for 90 days:

- \`OfficeSpire-Overlay-Lite-Windows-x64\` uses normal Tauri WebView2 bootstrap
  behavior and is smaller;
- \`OfficeSpire-Overlay-Full-Offline-Windows-x64\` embeds the WebView2 offline
  installer and can be installed without network access.

Each artifact contains an unsigned MSI/setup executable, a portable executable,
\`VERSION.json\`, per-file checksums and an archive checksum. It does not contain
the Mod DLL or any STS2 file.

## 2. Build the Mod once

On a Windows machine that owns and has STS2 installed:

\`\`\`powershell
$env:STS2_DIR = "C:\\path\\to\\Slay the Spire 2"
dotnet build src/OfficeSpire.Mod/OfficeSpire.Mod.csproj -c Release
\`\`\`

Only this build machine needs the .NET 9 SDK. Never commit or upload
\`sts2.dll\`, \`0Harmony.dll\`, or other game files.

## 3. Assemble the complete offline ZIP

Download one Overlay artifact and run:

\`\`\`powershell
./scripts/package-offline.ps1 \`
  -ModDll ./src/OfficeSpire.Mod/bin/Release/net9.0/OfficeSpire.dll \`
  -OverlayArchive ./OfficeSpire-Overlay-Full-Offline-Windows-x64.zip \`
  -SourceCommit (git rev-parse HEAD)
\`\`\`

The result and its SHA-256 file are written under \`dist/offline\`.

## 4. Install on the game PC

Extract the complete ZIP, then run:

\`\`\`powershell
./scripts/install-offline.ps1 -Sts2Dir "C:\\path\\to\\Slay the Spire 2"
\`\`\`

Install the MSI/setup executable under \`overlay\`, or run the included portable
executable. The installer is unsigned until a maintainer deliberately signs a
release, so Windows may show an unrecognized-publisher warning.

To remove the Mod-owned files:

\`\`\`powershell
./scripts/uninstall-offline.ps1 -Sts2Dir "C:\\path\\to\\Slay the Spire 2"
\`\`\`

Remove an installed Overlay through Windows Apps. Delete its extracted directory
if the portable executable was used.

## Boundaries

- These packages are build/deployment artifacts, not runtime evidence.
- No script publishes to Steam Workshop.
- No game DLL is included or uploaded.
- The scripts never send or replay a game action.
- Verify both the archive checksum and \`SHA256SUMS.txt\` after transferring files.
