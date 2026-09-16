import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const overlayRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(overlayRoot, "../..");
const readRepositoryFile = (relative) =>
  readFile(path.join(repositoryRoot, relative), "utf8");
const fail = (message) => {
  throw new Error(`M9 source audit failed: ${message}`);
};

const phaseNames = [
  "unknown",
  "combat",
  "card_selection",
  "map",
  "rewards",
  "shop",
  "event",
  "special_event",
  "rest",
  "treasure",
  "menu",
  "run_end",
];

const actionsByPhase = {
  combat: ["play_card", "end_turn", "use_potion", "discard_potion"],
  card_selection: ["choose_card_option", "confirm_card_selection"],
  map: ["choose_map_node"],
  rewards: ["choose_reward", "choose_reward_card", "skip_rewards"],
  shop: ["open_shop", "buy_shop_item", "request_card_removal", "leave_shop"],
  event: ["choose_event_option"],
  special_event: [
    "choose_special_event_cell",
    "select_special_event_tool",
    "proceed_special_event",
  ],
  rest: ["choose_rest_option", "leave_rest_site"],
  treasure: ["open_treasure", "choose_treasure_relic", "leave_treasure"],
  menu: ["choose_menu_option", "set_run_ascension", "set_custom_seed"],
  run_end: ["advance_run_end"],
};

const [
  protocolModels,
  inbox,
  adapter,
  dispatcher,
  actionDispatcher,
  frontendTypes,
  modManifest,
  packageJson,
  tauriConfig,
  interfaceMatrix,
] = await Promise.all([
  readRepositoryFile("src/OfficeSpire.Mod/Protocol/ProtocolModels.cs"),
  readRepositoryFile("src/OfficeSpire.Mod/Runtime/ActionInbox.cs"),
  readRepositoryFile("src/OfficeSpire.Mod/Game/Sts2GameAdapter.cs"),
  readRepositoryFile("src/OfficeSpire.Mod/Game/M4GameAdapter.cs"),
  readRepositoryFile("src/OfficeSpire.Overlay/src/actions/actionDispatcher.ts"),
  readRepositoryFile("src/OfficeSpire.Overlay/src/types.ts"),
  readRepositoryFile("src/OfficeSpire.Mod/OfficeSpire.json").then(JSON.parse),
  readRepositoryFile("src/OfficeSpire.Overlay/package.json").then(JSON.parse),
  readRepositoryFile("src/OfficeSpire.Overlay/src-tauri/tauri.conf.json").then(
    JSON.parse,
  ),
  readRepositoryFile("docs/M9_INTERFACE_MATRIX.md"),
]);

if (!protocolModels.includes("public const int CurrentVersion = 1;"))
  fail("backend protocol version is not exactly 1");
if (!frontendTypes.includes("export const PROTOCOL_VERSION = 1;"))
  fail("frontend protocol version is not exactly 1");

for (const phase of phaseNames) {
  if (!protocolModels.includes(`= "${phase}";`))
    fail(`backend phase '${phase}' is missing`);
  if (!interfaceMatrix.includes(`\`${phase}\``))
    fail(`interface matrix phase '${phase}' is missing`);
}

for (const [phase, actions] of Object.entries(actionsByPhase)) {
  for (const action of actions) {
    if (!actionDispatcher.includes(`"${action}"`))
      fail(`frontend action '${action}' is missing`);
    if (!inbox.includes(`"${action}"`))
      fail(`phase allowlist action '${action}' is missing`);
    if (!dispatcher.includes(`"${action}"`))
      fail(`game adapter action '${action}' is missing`);
    if (!interfaceMatrix.includes(`\`${action}\``))
      fail(`interface matrix action '${action}' is missing`);
  }
  if (!interfaceMatrix.includes(`\`${phase}\``))
    fail(`interface matrix action phase '${phase}' is missing`);
}

if (!inbox.includes("_ => false"))
  fail("unknown actions are not fail-closed in the phase allowlist");
if (!inbox.includes("request.ExpectedRevision != current.StateRevision"))
  fail("enqueue-time revision guard is missing");
if (!inbox.includes("request.ExpectedRevision != freshState.StateRevision"))
  fail("main-thread revision guard is missing");
if (!adapter.includes("rewards.OwnerPlayerId"))
  fail("reward ownership is absent from semantic settlement identity");

const overlayLine = packageJson.version.split(".").slice(0, 2).join(".");
const modLine = String(modManifest.version).split(".").slice(0, 2).join(".");
if (overlayLine !== modLine)
  fail(`Mod line ${modLine} differs from Overlay line ${overlayLine}`);
if (tauriConfig.version !== packageJson.version)
  fail("Tauri and Overlay versions differ");
if (
  modManifest.id !== "OfficeSpire" ||
  tauriConfig.identifier !== "com.officespire.overlay"
)
  fail("stable application identity changed");
if (!Array.isArray(modManifest.dependencies))
  fail("Mod dependency declaration is not an array");

const actionCount = Object.values(actionsByPhase).flat().length;
console.log(
  `M9 source audit passed: ${phaseNames.length} phases, ${actionCount} actions, protocol v1, Mod ${modManifest.version}, Overlay ${packageJson.version}.`,
);
