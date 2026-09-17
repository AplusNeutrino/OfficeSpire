import type { RunPartyState } from "../types";

export function PartyPanel({ party }: { party: RunPartyState }) {
  const missing = party.members.length - party.connected_players;
  return (
    <details
      className="party-panel"
      open={missing > 0}
      aria-live={missing > 0 ? "assertive" : "polite"}
    >
      <summary>
        Party {party.connected_players}/{party.members.length}
        {missing > 0 ? ` · ${missing} disconnected` : ""}
      </summary>
      <p>
        Network role: {party.role}. Existing players may rejoin through STS2;
        OfficeSpire will not reconnect or replay actions automatically.
      </p>
      <ul>
        {party.members.map((member) => (
          <li key={member.id}>
            <strong>
              {member.character_name || member.character_id}
              {member.is_local ? " (you)" : ""}
            </strong>{" "}
            — {member.current_hp}/{member.max_hp} HP · {member.block} block ·{" "}
            {member.max_energy} energy · {member.gold} gold ·{" "}
            {member.potion_count}/{member.potion_capacity} potions ·{" "}
            {member.is_alive ? "Alive" : "Down"} ·{" "}
            {member.connected ? "Connected" : "Disconnected"}
          </li>
        ))}
      </ul>
    </details>
  );
}
