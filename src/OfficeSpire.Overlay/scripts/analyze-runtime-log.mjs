import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const stateLine = /\[(?<timestamp>[^\]]+)\] \[OfficeSpire\] state_changed \| rev=(?<revision>-?\d+) phase=(?<phase>\S+) pending=(?<pending>True|False|true|false)/;

export function analyzeRuntimeLog(text) {
  const samples = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const match = stateLine.exec(line);
    if (!match?.groups) continue;
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
  const pendingCycles = [];
  let pendingStart;

  for (let index = 0; index < samples.length; index += 1) {
    const current = samples[index];
    const previous = samples[index - 1];
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
    samples: samples.length,
    first_revision: samples[0]?.revision ?? null,
    last_revision: samples.at(-1)?.revision ?? null,
    phases: [...new Set(samples.map((sample) => sample.phase))],
    pending_cycles: pendingCycles,
    unresolved_pending: pendingStart ?? null,
    revision_regressions: revisionRegressions,
    same_revision_phase_changes: sameRevisionPhaseChanges,
    invariant_warnings:
      revisionRegressions.length +
      sameRevisionPhaseChanges.length +
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
    throw new Error("Usage: npm run analyze:runtime -- <runtime.log> [--output report.json]");
  }

  const report = analyzeRuntimeLog(await readFile(inputPath, "utf8"));
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (outputPath) await writeFile(outputPath, json, "utf8");
  process.stdout.write(json);
  if (report.invariant_warnings > 0) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
