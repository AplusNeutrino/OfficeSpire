# OfficeSpire Overlay

Tauri 2 + React + TypeScript desktop client for the OfficeSpire STS2 mod.

## Current implementation

- transparent, borderless, resizable, always-on-top window configuration;
- native Windows session discovery from `%APPDATA%/SlayTheSpire2/OfficeSpire/session.json`;
- authenticated loopback WebSocket connection;
- protocol-version validation, heartbeat, state polling, and reconnect;
- authoritative combat rendering;
- untargeted and targeted card interaction;
- End Turn interaction;
- request/revision IDs and action-result polling;
- pending, stale, rejected, disconnected, and incompatible states.

All native desktop and live STS2 behavior remains `implemented_unverified` until the Windows runtime checklist in [`docs/DEVELOPMENT_ROADMAP.md`](../../docs/DEVELOPMENT_ROADMAP.md) passes.

## Frontend checks

```bash
npm ci
npm run check
npm audit --omit=dev
```

## Desktop development

Install the current Tauri 2 Windows prerequisites, Rust, and Node.js. Start STS2 with OfficeSpire Mod loaded so that `session.json` exists, then run:

```bash
npm ci
npm run tauri dev
```

The overlay reads the session descriptor through a native Tauri command. A browser-only Vite session cannot discover the local STS2 session.

## Production bundle

```bash
npm run tauri build
```

Do not mark the desktop build or live combat loop as runtime-pass solely because the frontend production build succeeds.

`npm run check` verifies formatting, protocol tests, the production frontend build, and synchronized release metadata across package-lock, Cargo, Tauri, and the Mod compatibility line.
