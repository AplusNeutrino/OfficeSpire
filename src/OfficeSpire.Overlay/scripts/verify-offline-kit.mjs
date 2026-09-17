import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const overlayRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(overlayRoot, "..", "..");
const read = (path) => readFileSync(resolve(repositoryRoot, path), "utf8");
const requireText = (value, expected, source) => {
  if (!value.includes(expected)) {
    throw new Error(`${source} is missing required text: ${expected}`);
  }
};

const config = JSON.parse(
  read("src/OfficeSpire.Overlay/src-tauri/tauri.offline.conf.json"),
);
if (config.bundle?.windows?.webviewInstallMode?.type !== "offlineInstaller") {
  throw new Error(
    "Offline Tauri config must embed the WebView2 offline installer.",
  );
}

const workflow = read(".github/workflows/windows-offline-kit.yml");
for (const expected of [
  "workflow_dispatch:",
  "pull_request:",
  "edition: Lite",
  "edition: Full-Offline",
  "npm run check",
  "npm audit --omit=dev",
  "retention-days: 90",
  "publication_performed = $false",
]) {
  requireText(workflow, expected, "Windows Offline Kits workflow");
}

const packager = read("scripts/package-offline.ps1");
for (const expected of [
  "includes_game_files = $false",
  "publication_performed = $false",
  "SHA256SUMS.txt",
  "OfficeSpire.dll",
]) {
  requireText(packager, expected, "offline packager");
}

const installer = read("scripts/install-offline.ps1");
requireText(
  installer,
  "data_sts2_windows_x86_64/sts2.dll",
  "offline installer",
);
requireText(installer, "mods/OfficeSpire", "offline installer");

const uninstaller = read("scripts/uninstall-offline.ps1");
requireText(uninstaller, "OfficeSpire.dll", "offline uninstaller");
requireText(uninstaller, "OfficeSpire.json", "offline uninstaller");

console.log(
  "Offline kit source validation passed: Lite + Full-Offline, checksums, 90-day retention, no publication.",
);
