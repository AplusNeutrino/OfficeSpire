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
        {snapshot.screen.popup_body && <p>{snapshot.screen.popup_body}</p>}
        {snapshot.screen.current_profile_id !== null && (
          <p>Current profile: {snapshot.screen.current_profile_id}</p>
        )}
        {snapshot.screen.run_setup && (
          <section className="menu-run-setup" aria-label="Run setup">
            <h2>Run setup</h2>
            <p>
              Mode: {snapshot.screen.run_setup.mode} · Ascension{" "}
              {snapshot.screen.run_setup.ascension}/
              {snapshot.screen.run_setup.max_ascension}
            </p>
            <p>
              Seed: {snapshot.screen.run_setup.seed || "Random"} · First act:{" "}
              {snapshot.screen.run_setup.act_one}
            </p>
            {snapshot.screen.run_setup.daily_server_time && (
              <p>
                Daily server time: {snapshot.screen.run_setup.daily_server_time}
              </p>
            )}
            <p>
              Modifiers:{" "}
              {snapshot.screen.run_setup.modifiers
                .map((modifier) => modifier.name)
                .join(", ") || "None"}
            </p>
          </section>
        )}
        {snapshot.screen.lobby && (
          <section className="menu-lobby" aria-label="Lobby">
            <h2>Lobby</h2>
            <p>
              Role: {snapshot.screen.lobby.role} · Players{" "}
              {snapshot.screen.lobby.players.length}/
              {snapshot.screen.lobby.max_players ?? "?"}
            </p>
            <ul>
              {snapshot.screen.lobby.players.map((player) => (
                <li key={player.id}>
                  Slot {player.slot_id + 1}:{" "}
                  {player.character_name || player.character_id || "Unselected"}
                  {player.is_local ? " (you)" : ""}
                  {player.is_host === true ? " (host)" : ""} —{" "}
                  {player.is_ready ? "Ready" : "Not ready"}
                </li>
              ))}
            </ul>
          </section>
        )}
        {snapshot.screen.characters &&
          snapshot.screen.characters.length > 0 && (
            <div className="menu-character-list">
              {snapshot.screen.characters.map((character) => (
                <article key={character.id}>
                  <h2>{character.name}</h2>
                  <p>
                    {character.starting_hp} HP · {character.starting_gold} gold
                    · {character.max_energy} energy
                  </p>
                  {character.description && <p>{character.description}</p>}
                  <p>
                    Starting relics:{" "}
                    {character.starting_relics
                      .map((relic) => relic.name)
                      .join(", ") || "None"}
                  </p>
                  <p>
                    Starting deck:{" "}
                    {character.starting_deck.join(", ") || "Unknown"}
                  </p>
                  {character.locked && <small>Locked</small>}
                </article>
              ))}
            </div>
          )}
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
