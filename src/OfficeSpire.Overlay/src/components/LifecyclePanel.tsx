import type { LifecycleStateSnapshot } from "../types";

export function LifecyclePanel({
  snapshot,
}: {
  snapshot: LifecycleStateSnapshot;
}) {
  const title = snapshot.phase === "run_end" ? "Run complete" : "Main menu";

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
