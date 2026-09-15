export type CombatKeyboardCommand =
  | { kind: "cancel" }
  | { kind: "end_turn" }
  | { kind: "card"; index: number }
  | { kind: "potion"; index: number }
  | { kind: "target"; index: number };

export function resolveCombatShortcut(
  code: string,
  shiftKey: boolean,
  selectingTarget: boolean,
): CombatKeyboardCommand | undefined {
  if (code === "Escape") return { kind: "cancel" };
  if (!selectingTarget && code === "KeyE") return { kind: "end_turn" };

  const match = /^Digit([1-9])$/.exec(code);
  if (!match) return undefined;
  const index = Number(match[1]) - 1;
  if (selectingTarget) return { kind: "target", index };
  return shiftKey ? { kind: "potion", index } : { kind: "card", index };
}
