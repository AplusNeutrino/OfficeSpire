export type RunKeyboardCommand =
  | { kind: "choice"; index: number }
  | { kind: "confirm" }
  | { kind: "skip" }
  | { kind: "leave" }
  | { kind: "remove" };

export function resolveRunShortcut(
  code: string,
): RunKeyboardCommand | undefined {
  const match = /^Digit([1-9])$/.exec(code);
  if (match) return { kind: "choice", index: Number(match[1]) - 1 };
  if (code === "Enter") return { kind: "confirm" };
  if (code === "KeyS") return { kind: "skip" };
  if (code === "KeyL") return { kind: "leave" };
  if (code === "KeyR") return { kind: "remove" };
  return undefined;
}
