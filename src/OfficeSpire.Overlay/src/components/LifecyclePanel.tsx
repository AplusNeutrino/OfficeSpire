import type { LifecycleStateSnapshot, MenuStateSnapshot } from "../types";

export function LifecyclePanel({
  snapshot,
}: {
  snapshot: LifecycleStateSnapshot | MenuStateSnapshot;
}) {
  if (snapshot.phase === "menu") {
    return (
      <section className="empty lifecycle-panel" aria-live="polite">
        <h1>{snapshot.screen.menu_screen.replace(/_/g, " ")}</h1>
        <p>{snapshot.screen.message}</p>
        {snapshot.screen.options.length > 0 && (
          <ul className="menu-observation-list">
            {snapshot.screen.options.map((option) => (
              <li key={option.id}>
                <span>{option.label}</span>
                <small>{option.enabled ? "Available" : "Unavailable"}</small>
              </li>
            ))}
          </ul>
        )}
        <p className="lifecycle-safety">
          This menu is read-only in OfficeSpire. Complete the choice in STS2.
        </p>
      </section>
    );
  }
  const title =
    snapshot.screen.status === "victory"
      ? "Victory"
      : snapshot.screen.status === "abandoned"
        ? "Run abandoned"
        : "Defeat";

  return (
    <section className="empty lifecycle-panel" aria-live="polite">
      <h1>{title}</h1>
      <p>{snapshot.screen.message}</p>
      <p className="lifecycle-safety">
        OfficeSpire will not start, resume, or replay a run automatically.
      </p>
    </section>
  );
}
