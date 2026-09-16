import type {
  LifecycleStateSnapshot,
  MenuOptionState,
  MenuStateSnapshot,
} from "../types";

export function LifecyclePanel({
  snapshot,
  disabled = false,
  onOption,
  onAscension,
  onSeed,
  onRunEnd,
}: {
  snapshot: LifecycleStateSnapshot | MenuStateSnapshot;
  disabled?: boolean;
  onOption?: (option: MenuOptionState) => void;
  onAscension?: (ascension: number) => void;
  onSeed?: (seed: string | null) => void;
  onRunEnd?: (target: "summary" | "main_menu") => void;
}) {
  if (snapshot.phase === "menu") {
    return (
      <section className="empty lifecycle-panel" aria-live="polite">
        <h1>{snapshot.screen.menu_screen.replace(/_/g, " ")}</h1>
        <p>{snapshot.screen.message}</p>
        {snapshot.screen.popup_title && <h2>{snapshot.screen.popup_title}</h2>}
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
            {["character_select", "custom_run"].includes(
              snapshot.screen.menu_screen,
            ) && (
              <div className="menu-run-controls">
                <button
                  disabled={
                    disabled || snapshot.screen.run_setup.ascension <= 0
                  }
                  onClick={() =>
                    onAscension?.(snapshot.screen.run_setup!.ascension - 1)
                  }
                  aria-label="Decrease ascension"
                >
                  −
                </button>
                <span>Ascension {snapshot.screen.run_setup.ascension}</span>
                <button
                  disabled={
                    disabled ||
                    snapshot.screen.run_setup.ascension >=
                      snapshot.screen.run_setup.max_ascension
                  }
                  onClick={() =>
                    onAscension?.(snapshot.screen.run_setup!.ascension + 1)
                  }
                  aria-label="Increase ascension"
                >
                  +
                </button>
              </div>
            )}
            {snapshot.screen.menu_screen === "custom_run" && (
              <form
                key={`${snapshot.state_revision}:${snapshot.screen.run_setup.seed ?? ""}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = new FormData(event.currentTarget)
                    .get("seed")
                    ?.toString()
                    .trim();
                  onSeed?.(value || null);
                }}
              >
                <label>
                  Custom seed{" "}
                  <input
                    name="seed"
                    defaultValue={snapshot.screen.run_setup.seed ?? ""}
                    maxLength={64}
                    disabled={disabled}
                  />
                </label>
                <button type="submit" disabled={disabled}>
                  Apply seed
                </button>
              </form>
            )}
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
        {snapshot.screen.connection && (
          <section className="menu-connection" aria-label="Connection state">
            <h2>Connection</h2>
            <p>
              Status: {snapshot.screen.connection.status.replace(/_/g, " ")}
            </p>
            {snapshot.screen.connection.required_players !== null && (
              <p>
                Connected: {snapshot.screen.connection.connected_players}/
                {snapshot.screen.connection.required_players}
              </p>
            )}
            {snapshot.screen.connection.sessions.length > 0 && (
              <ul>
                {snapshot.screen.connection.sessions.map((session) => (
                  <li key={session.id}>
                    {session.label} —{" "}
                    {session.enabled ? "Available" : "Unavailable"}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {snapshot.screen.saved_run && (
          <section className="menu-saved-run" aria-label="Saved run">
            <h2>Saved run</h2>
            <p>
              {snapshot.screen.saved_run.mode} · Ascension{" "}
              {snapshot.screen.saved_run.ascension} · Act{" "}
              {snapshot.screen.saved_run.current_act} · Floor{" "}
              {snapshot.screen.saved_run.visited_floor_count}
            </p>
            {snapshot.screen.saved_run.missing_players > 0 && (
              <p role="alert">
                Missing players: {snapshot.screen.saved_run.missing_players}.
                Continuing without them must be confirmed in STS2.
              </p>
            )}
            <ul>
              {snapshot.screen.saved_run.players.map((player) => (
                <li key={player.id}>
                  {player.character_id || "Unknown character"}:{" "}
                  {player.current_hp}/{player.max_hp} HP · {player.gold} gold ·{" "}
                  {player.max_energy} energy · {player.potion_capacity} potion
                  slots — {player.connected ? "Connected" : "Missing"}
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
            {snapshot.screen.options.map((option) => {
              const actionable = snapshot.screen.options.filter(
                (candidate) => candidate.actionable && candidate.enabled,
              );
              const shortcutIndex = actionable.findIndex(
                (candidate) => candidate.id === option.id,
              );
              const shortcut =
                option.id === "back"
                  ? "Escape"
                  : option.id === "confirm"
                    ? "Enter"
                    : shortcutIndex >= 0 && shortcutIndex < 9
                      ? `${shortcutIndex + 1}`
                      : undefined;
              return (
                <li key={option.id}>
                  {option.actionable ? (
                    <button
                      disabled={disabled || !option.enabled}
                      onClick={() => onOption?.(option)}
                      aria-keyshortcuts={shortcut}
                    >
                      {shortcutIndex >= 0 && shortcutIndex < 9
                        ? `[${shortcutIndex + 1}] `
                        : ""}
                      {option.label}
                    </button>
                  ) : (
                    <span>{option.label}</span>
                  )}
                  <small>{option.enabled ? "Available" : "Unavailable"}</small>
                </li>
              );
            })}
          </ul>
        )}
        <p className="lifecycle-safety">
          Supported controls are revalidated against the current native menu
          before execution. Unsupported or destructive choices stay read-only.
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
      <section className="run-end-summary" aria-label="Run summary">
        <h2>Run summary</h2>
        <p>
          Score: {snapshot.screen.score} · Floors climbed:{" "}
          {snapshot.screen.floors_climbed}
        </p>
        <p>
          Discoveries: {snapshot.screen.discoveries.cards} cards ·{" "}
          {snapshot.screen.discoveries.relics} relics ·{" "}
          {snapshot.screen.discoveries.potions} potions ·{" "}
          {snapshot.screen.discoveries.enemies} enemies ·{" "}
          {snapshot.screen.discoveries.epochs} epochs
        </p>
        <p>
          Unlocks remaining: {snapshot.screen.unlocks_remaining}
          {snapshot.screen.unlock_score_threshold > 0 && (
            <>
              {" "}
              · Progress: {snapshot.screen.current_unlock_score}/
              {snapshot.screen.unlock_score_threshold}
            </>
          )}
        </p>
        {snapshot.screen.unlocked_epoch_id && (
          <p>Unlocked epoch: {snapshot.screen.unlocked_epoch_id}</p>
        )}
      </section>
      {snapshot.screen.can_view_summary && (
        <button
          disabled={disabled}
          onClick={() => onRunEnd?.("summary")}
          aria-keyshortcuts="Enter"
        >
          [Enter] View native summary
        </button>
      )}
      {snapshot.screen.can_return_to_menu && (
        <button
          disabled={disabled}
          onClick={() => onRunEnd?.("main_menu")}
          aria-keyshortcuts={
            snapshot.screen.stage === "summary" ? "Enter" : undefined
          }
        >
          {snapshot.screen.stage === "summary" ? "[Enter] " : ""}
          Return to main menu
        </button>
      )}
      <p className="lifecycle-safety">
        OfficeSpire will not start another run or replay a post-run action
        automatically.
      </p>
    </section>
  );
}
