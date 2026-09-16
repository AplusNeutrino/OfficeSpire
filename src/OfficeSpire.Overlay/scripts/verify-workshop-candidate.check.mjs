import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { verifyCandidateDirectory } from "./verify-workshop-candidate.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const root = await mkdtemp(path.join(os.tmpdir(), "officespire-candidate-"));

try {
  const content = path.join(root, "OfficeSpire");
  await mkdir(content);
  const dll = Buffer.from("test-only-dll");
  await writeFile(path.join(content, "OfficeSpire.dll"), dll);
  const metadata = {
    schema_version: 1,
    mod_id: "OfficeSpire",
    mod_version: "0.6.0",
    minimum_game_version: "0.107.1",
    source_commit: "a".repeat(40),
    generated_utc: "2026-09-16T00:00:00Z",
    includes_overlay: false,
    dependencies: [],
    payload: [{ path: "OfficeSpire.dll", size: dll.length, sha256: hash(dll) }],
    publication_performed: false,
  };
  await writeFile(
    path.join(content, "CANDIDATE.json"),
    JSON.stringify(metadata),
  );

  assert.deepEqual(await verifyCandidateDirectory(content), {
    source_commit: "a".repeat(40),
    files_verified: 1,
    includes_overlay: false,
  });

  await writeFile(path.join(content, "OfficeSpire.dll"), "tampered");
  await assert.rejects(
    verifyCandidateDirectory(content),
    /size mismatch|SHA-256 mismatch/,
  );
  await writeFile(path.join(content, "OfficeSpire.dll"), dll);
  await writeFile(path.join(content, "unexpected.exe"), "unexpected");
  await assert.rejects(
    verifyCandidateDirectory(content),
    /do not match the provenance manifest/,
  );

  const saved = JSON.parse(
    await readFile(path.join(content, "CANDIDATE.json"), "utf8"),
  );
  saved.publication_performed = true;
  await writeFile(path.join(content, "CANDIDATE.json"), JSON.stringify(saved));
  await assert.rejects(
    verifyCandidateDirectory(content),
    /must not claim publication/,
  );
} finally {
  await rm(root, { recursive: true, force: true });
}

process.stdout.write("Workshop candidate verifier tests passed.\n");
