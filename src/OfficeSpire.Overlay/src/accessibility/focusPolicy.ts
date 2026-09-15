export function shouldMoveDecisionFocus(
  previousPhase: string | undefined,
  nextPhase: string | undefined,
  settingsOpen: boolean,
) {
  return (
    !settingsOpen && nextPhase !== undefined && previousPhase !== nextPhase
  );
}
