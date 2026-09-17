export function shouldMoveDecisionFocus(
  previousSurface: string | undefined,
  nextSurface: string | undefined,
  settingsOpen: boolean,
) {
  return (
    !settingsOpen &&
    nextSurface !== undefined &&
    previousSurface !== nextSurface
  );
}
