import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalizeRelative = (value) => value.split(path.sep).join("/");

async function listFiles(root, relative = "") {
  const entries = await readdir(path.join(root, relative), {
    withFileTypes: true,
  });
  const files = [];
  for (const entry of entries) {
    const next = path.join(relative, entry.name);
    if (entry.isSymbolicLink())
      throw new Error(`symlink is forbidden: ${next}`);
    if (entry.isDirectory()) files.push(...(await listFiles(root, next)));
    else if (entry.isFile()) files.push(normalizeRelative(next));
    else throw new Error(`unsupported filesystem entry: ${next}`);
  }
  return files.sort();
}

export async function verifyCandidateDirectory(candidateRoot) {
  const root = path.resolve(candidateRoot);
  const metadataPath = path.join(root, "CANDIDATE.json");
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));

  if (metadata.schema_version !== 1)
    throw new Error("unsupported candidate schema");
  if (metadata.mod_id !== "OfficeSpire") throw new Error("unexpected Mod ID");
  if (!/^[0-9a-f]{40}$/.test(metadata.source_commit))
    throw new Error("invalid source commit");
  if (metadata.publication_performed !== false)
    throw new Error("candidate must not claim publication");
  if (!Array.isArray(metadata.dependencies) || !Array.isArray(metadata.payload))
    throw new Error("dependencies and payload must be arrays");

  const declared = new Map();
  for (const item of metadata.payload) {
    if (
      !item ||
      typeof item.path !== "string" ||
      item.path.length === 0 ||
      path.isAbsolute(item.path) ||
      item.path.includes("\\") ||
      item.path.split("/").includes("..") ||
      !Number.isSafeInteger(item.size) ||
      item.size < 0 ||
      !/^[0-9a-f]{64}$/.test(item.sha256)
    ) {
      throw new Error("invalid payload entry");
    }
    if (item.path === "CANDIDATE.json" || declared.has(item.path))
      throw new Error(`duplicate or recursive payload path: ${item.path}`);
    declared.set(item.path, item);
  }

  const actual = (await listFiles(root)).filter(
    (file) => file !== "CANDIDATE.json",
  );
  const declaredPaths = [...declared.keys()].sort();
  if (JSON.stringify(actual) !== JSON.stringify(declaredPaths))
    throw new Error("candidate files do not match the provenance manifest");

  for (const relative of actual) {
    const fullPath = path.join(root, ...relative.split("/"));
    const info = await stat(fullPath);
    const bytes = await readFile(fullPath);
    const expected = declared.get(relative);
    if (info.size !== expected.size)
      throw new Error(`size mismatch: ${relative}`);
    if (sha256(bytes) !== expected.sha256)
      throw new Error(`SHA-256 mismatch: ${relative}`);
  }

  return {
    source_commit: metadata.source_commit,
    files_verified: actual.length,
    includes_overlay: metadata.includes_overlay === true,
  };
}

async function main() {
  const candidateRoot = process.argv[2];
  if (!candidateRoot)
    throw new Error(
      "Usage: npm run verify:workshop -- <extracted OfficeSpire directory>",
    );
  const result = await verifyCandidateDirectory(candidateRoot);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
