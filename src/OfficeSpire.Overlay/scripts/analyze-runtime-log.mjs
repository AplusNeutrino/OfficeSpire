import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const stateLine =
  /\[(?<timestamp>[^\]]+)\] \[OfficeSpire\] state_changed \| rev=(?<revision>-?\d+) phase=(?<phase>\S+) pending=(?<pending>True|False|true|false)/;

export function analyzeRuntimeLog(text) {
  const samples = [];
  const malformedStateLines = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const match = stateLine.exec(line);
    if (!match?.groups) {
      if (line.includes("[OfficeSpire] state_changed"))
        malformedStateLines.push(index + 1);
      continue;
    }
    samples.push({
      line: index + 1,
      timestamp: match.groups.timestamp,
      revision: Number(match.groups.revision),
      phase: match.groups.phase,
      pending: match.groups.pending.toLowerCase() === "true",
    });
  }

  const revisionRegressions = [];
  const sameRevisionPhaseChanges = [];
  const timestampRegressions = [];
  const invalidTimestampLines = [];
  const pendingCycles = [];
  let pendingStart;

  for (let index = 0; index < samples.length; index += 1) {
    const current = samples[index];
    const previous = samples[index - 1];
    const currentTime = Date.parse(current.timestamp);
    const previousTime = previous ? Date.parse(previous.timestamp) : undefined;
    if (!Number.isFinite(currentTime)) invalidTimestampLines.push(current.line);
    if (
      previous &&
      Number.isFinite(previousTime) &&
      Number.isFinite(currentTime) &&
      currentTime < previousTime
    ) {
      timestampRegressions.push({ previous, current });
    }
    if (previous && current.revision < previous.revision) {
      revisionRegressions.push({ previous, current });
    }
    if (
      previous &&
      current.revision === previous.revision &&
      current.phase !== previous.phase
    ) {
      sameRevisionPhaseChanges.push({ previous, current });
    }
    if (current.pending && !previous?.pending) pendingStart = current;
    if (!current.pending && previous?.pending && pendingStart) {
      pendingCycles.push({
        start: pendingStart,
        end: current,
        revision_advanced: current.revision > pendingStart.revision,
      });
      pendingStart = undefined;
    }
  }

  return {
    schema_version: 1,
    evidence_kind: "passive_runtime_log_analysis",
    source_sha256: createHash("sha256").update(text).digest("hex"),
    samples: samples.length,
    first_timestamp: samples[0]?.timestamp ?? null,
    last_timestamp: samples.at(-1)?.timestamp ?? null,
    first_revision: samples[0]?.revision ?? null,
    last_revision: samples.at(-1)?.revision ?? null,
    phases: [...new Set(samples.map((sample) => sample.phase))],
    pending_cycles: pendingCycles,
    unresolved_pending: pendingStart ?? null,
    revision_regressions: revisionRegressions,
    same_revision_phase_changes: sameRevisionPhaseChanges,
    timestamp_regressions: timestampRegressions,
    malformed_state_lines: malformedStateLines,
    invalid_timestamp_lines: invalidTimestampLines,
    invariant_warnings:
      revisionRegressions.length +
      sameRevisionPhaseChanges.length +
      timestampRegressions.length +
      malformedStateLines.length +
      invalidTimestampLines.length +
      (pendingStart ? 1 : 0),
    requires_manual_runtime_judgment: true,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const outputFlag = args.indexOf("--output");
  const outputPath = outputFlag >= 0 ? args[outputFlag + 1] : undefined;
  if (outputFlag >= 0) args.splice(outputFlag, 2);
  const inputPath = args[0];
  if (!inputPath) {
    throw new Error(
      "Usage: npm run analyze:runtime -- <runtime.log> [--output report.json]",
    );
  }

  const report = analyzeRuntimeLog(await readFile(inputPath, "utf8"));
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (outputPath) await writeFile(outputPath, json, "utf8");
  process.stdout.write(json);
  if (report.invariant_warnings > 0) process.exitCode = 2;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
