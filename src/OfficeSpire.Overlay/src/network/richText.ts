import type { StateSnapshot } from "../types";

const presentationKeys = new Set([
  "description",
  "intent",
  "message",
  "name",
  "title",
  "unplayable_reason",
]);

const iconPattern = /\[img[^\]]*\]([^[]*)\[\/img\]/gi;
const bbCodePattern = /\[\/?[a-z][a-z0-9_-]*(?:[=\s][^\]]*)?\]/gi;
const malformedBbCodePattern =
  /\[\/?[a-z][a-z0-9_-]*(?:=[^\]\s]+)?(?=\s|$|[.,;:!?])/gi;
const bareClosingColorPattern =
  /\/(?:gold|red|green|blue|purple|orange|grey|gray|white)\b/gi;
const unresolvedVariablePattern = /\{[^{}]+\}/g;

function iconLabel(path: string): string {
  const parts = path.split(/[\\/]/);
  const filename = parts[parts.length - 1]?.replace(/\.[^.]+$/, "") ?? "";
  const normalized = filename
    .replace(/_icon$/i, "")
    .replace(/.*_energy$/i, "energy")
    .replace(/[_-]+/g, " ")
    .trim();
  return normalized ? ` ${normalized} ` : " ";
}

export function normalizeGameText(value: string): string {
  return value
    .replace(/\[br\s*\/?\]/gi, "\n")
    .replace(iconPattern, (_, path: string) => iconLabel(path))
    .replace(bbCodePattern, "")
    .replace(malformedBbCodePattern, "")
    .replace(bareClosingColorPattern, "")
    .replace(unresolvedVariablePattern, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizePresentationValue(value: unknown, key?: string): unknown {
  if (typeof value === "string")
    return key && presentationKeys.has(key) ? normalizeGameText(value) : value;
  if (Array.isArray(value))
    return value.map((item) => normalizePresentationValue(item));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([childKey, childValue]) => [
      childKey,
      normalizePresentationValue(childValue, childKey),
    ]),
  );
}

export function normalizeSnapshotText(snapshot: StateSnapshot): StateSnapshot {
  return normalizePresentationValue(snapshot) as StateSnapshot;
}
