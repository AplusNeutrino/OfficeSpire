# Steam Workshop Release Preparation

OfficeSpire's target distribution is a Slay the Spire 2 Steam Workshop item plus its Windows desktop overlay. This document prepares a candidate package; it does **not** authorize or automate Workshop upload, publication, visibility changes, or Steam account actions.

## Current compatibility declaration

- Mod ID: `OfficeSpire`
- Minimum game version: `0.107.1`
- Payload: managed DLL (`has_dll=true`, `has_pck=false`)
- Gameplay flag: `affects_gameplay=false`
- Required third-party Mod frameworks: none

OfficeSpire currently compiles directly against STS2/Godot/Harmony assemblies supplied by the game runtime. It does not call BaseLib or another separately installed Mod API, so `dependencies` must remain `[]`. If an external framework is introduced later, add an object containing both `id` and `min_version` to `OfficeSpire.json`, update this document and the Workshop dependency list, and validate clean installation with only the declared dependencies.

## Candidate layout

```text
OfficeSpire/
├── OfficeSpire.json
├── OfficeSpire.dll
├── CANDIDATE.json
├── LICENSE
├── THIRD_PARTY_NOTICES.md
├── INSTALL.md
└── overlay/                         # optional; only after policy confirmation
    └── <unsigned Windows Tauri installer or bundle>
```

The manifest and DLL remain at the Mod content root so the STS2 loader can discover them. The desktop overlay is separate from the in-game DLL and must be installed or launched by the user. Do not place development files, local game paths, session tokens, PDBs, or `OfficeSpire.Local.props` in the Workshop payload.

The packager defaults to a Mod-only candidate. Passing `-OverlayBundle` explicitly adds an unsigned `.exe`, `.msi`, or `.zip` beside the Mod. Whether STS2's final Workshop policy accepts that payload is `implemented_unverified`; do not include it until the policy is confirmed. If executables are prohibited, keep only the manifest/DLL/notices as Workshop content and distribute the matching overlay installer separately; do not work around a platform restriction.

`CANDIDATE.json` records the source commit, Mod/game versions, dependency declarations, generation time, whether an Overlay is present, and the size/SHA-256 of every staged payload file. It also records `publication_performed=false`; this is provenance metadata, not evidence of Workshop acceptance.

## Build a local candidate

1. Build `OfficeSpire.dll` against the target STS2 version on a machine that owns the game.
2. Manually run the repository's **Windows Bundle** workflow or run `npm run tauri build` on Windows.
3. From PowerShell at repository root, run:

```powershell
./scripts/package-workshop.ps1 `
  -ModDll ./path/to/OfficeSpire.dll `
  -SourceCommit 0123456789abcdef0123456789abcdef01234567
```

Only after confirming that the current Workshop policy permits the Overlay payload, append `-OverlayBundle "./path/to/OfficeSpire Overlay installer.exe"`.

The script validates the Mod manifest and declared dependency shape, rejects directory/reparse-point inputs and unexpected Overlay extensions, stages the exact payload, emits the internal provenance manifest, creates a ZIP, and writes a SHA-256 file. It never invokes SteamCMD or a Workshop API.

## Manual pre-publication checklist

- Confirm the current official STS2 Workshop content-root and upload procedure; no game-specific official upload schema was located as of 2026-09-15.
- Test a clean Workshop-style install with no undeclared Mods present.
- Confirm the game loads `OfficeSpire.json` and `OfficeSpire.dll` without warnings.
- Install/launch the overlay and execute the full runtime validation matrix.
- Test with every declared dependency at its minimum supported version; currently there are none.
- Test coexistence with the current commonly used Mod framework(s), without declaring optional frameworks as required dependencies.
- Verify unsubscribe/removal leaves no executable in the game directory and document overlay uninstall separately.
- Scan the staged payload for credentials, session files, local paths, debug symbols, and unrelated binaries.
- Verify ZIP SHA-256, commit SHA, game version, Mod version, Overlay version, and release notes.
- Extract the ZIP and independently verify every `CANDIDATE.json` payload size/hash before upload; ensure the recorded source commit is the reviewed commit.
- Prepare Workshop title, short description, long description, preview image, change notes, support links, license disclosure, compatibility tags, and an explicit note that the overlay is unsigned until signing is configured.
- Upload as private/hidden first, perform a clean subscription test, and only then change visibility manually.

## Installation and upgrade behavior

Workshop should own only the Mod content directory. The separately installed overlay must keep its settings in the WebView local store and discover the authenticated loopback session at runtime. Upgrades must preserve the stable Mod ID `OfficeSpire` and Tauri identifier `com.officespire.overlay`; changing either creates a parallel installation rather than an in-place upgrade.

For upgrade testing, install the previous candidate, preserve settings, replace it through the intended subscription/update path, and confirm the Mod ID remains singular. For removal testing, unsubscribe/delete the Workshop-owned Mod directory, uninstall the separately distributed Overlay through Windows, and verify that neither executable nor DLL remains in the game directory. User settings/log removal is a separate, explicit user choice.

Never bundle STS2 assemblies, game assets, Steam credentials, third-party Mod binaries, or another framework inside OfficeSpire. Declare genuine required dependencies through the manifest and Workshop UI instead.

## References

- [Steamworks Workshop implementation guide](https://partner.steamgames.com/doc/features/workshop/implementation) — general item creation, content update, subscription, and visibility lifecycle.
- [Tauri GitHub pipeline guide](https://v2.tauri.app/distribute/pipelines/github/) — Windows bundle workflow and `tauri-action` usage.
- [Current STS2 ModTemplate manifest](https://github.com/Alchyr/ModTemplate-StS2/blob/master/content/ModTemplate/ModTemplate.json) — dependency objects use `id` and `min_version`; reference only, with no copied source.
