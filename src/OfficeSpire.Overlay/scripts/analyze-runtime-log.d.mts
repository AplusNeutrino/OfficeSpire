export interface RuntimeLogSample {
  line: number;
  timestamp: string;
  revision: number;
  phase: string;
  pending: boolean;
}

export interface RuntimeLogTransition {
  previous: RuntimeLogSample;
  current: RuntimeLogSample;
}

export interface RuntimePendingCycle {
  start: RuntimeLogSample;
  end: RuntimeLogSample;
  revision_advanced: boolean;
}

export interface RuntimeLogAnalysis {
  schema_version: 1;
  evidence_kind: "passive_runtime_log_analysis";
  source_sha256: string;
  samples: number;
  first_timestamp: string | null;
  last_timestamp: string | null;
  first_revision: number | null;
  last_revision: number | null;
  phases: string[];
  pending_cycles: RuntimePendingCycle[];
  unresolved_pending: RuntimeLogSample | null;
  revision_regressions: RuntimeLogTransition[];
  same_revision_phase_changes: RuntimeLogTransition[];
  timestamp_regressions: RuntimeLogTransition[];
  malformed_state_lines: number[];
  invalid_timestamp_lines: number[];
  invariant_warnings: number;
  requires_manual_runtime_judgment: true;
}

export function analyzeRuntimeLog(text: string): RuntimeLogAnalysis;
