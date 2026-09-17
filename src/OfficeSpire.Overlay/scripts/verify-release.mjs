import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFile(path.join(root, relative), "utf8");
const fail = (message) => {
  throw new Error(`Release preflight failed: ${message}`);
};

const [packageJson, lockJson, cargoToml, tauriJson, modJson] =
  await Promise.all([
    read("package.json").then(JSON.parse),
    read("package-lock.json").then(JSON.parse),
    read("src-tauri/Cargo.toml"),
    read("src-tauri/tauri.conf.json").then(JSON.parse),
    read("../OfficeSpire.Mod/OfficeSpire.json").then(JSON.parse),
  ]);

const overlayVersion = packageJson.version;
const cargoVersion = /^version\s*=\s*"([^"]+)"/m.exec(cargoToml)?.[1];
const versions = {
  "package-lock root": lockJson.version,
  "package-lock workspace": lockJson.packages?.[""]?.version,
  Cargo: cargoVersion,
  Tauri: tauriJson.version,
};
for (const [source, version] of Object.entries(versions)) {
  if (version !== overlayVersion)
    fail(`${source} version ${String(version)} != ${overlayVersion}`);
}

const overlayLine = overlayVersion.split(".").slice(0, 2).join(".");
const modLine = String(modJson.version).split(".").slice(0, 2).join(".");
if (overlayLine !== modLine)
  fail(`Mod compatibility line ${modLine} != Overlay ${overlayLine}`);
if (tauriJson.identifier !== "com.officespire.overlay")
  fail("unexpected Tauri application identifier");
if (tauriJson.bundle?.active !== true) fail("Tauri bundling is disabled");
if (modJson.id !== "OfficeSpire") fail("unexpected Mod ID");
if (modJson.has_dll !== true || modJson.has_pck !== false)
  fail("OfficeSpire must remain a DLL-only Mod payload");
if (!Array.isArray(modJson.dependencies))
  fail("Mod dependencies must be an array");
const dependencyIds = new Set();
for (const dependency of modJson.dependencies) {
  if (
    !dependency ||
    typeof dependency.id !== "string" ||
    dependency.id.length === 0 ||
    typeof dependency.min_version !== "string" ||
    dependency.min_version.length === 0
  )
    fail("each Mod dependency must contain id and min_version");
  if (dependencyIds.has(dependency.id))
    fail(`duplicate Mod dependency ${dependency.id}`);
  dependencyIds.add(dependency.id);
}

console.log(`Release preflight passed for OfficeSpire ${overlayVersion}.`);
