export interface OverlaySettings {
  version: 1;
  opacity: number;
  scale: number;
  highContrast: boolean;
  reduceMotion: boolean;
  privacyHotkeyEnabled: boolean;
  hideOverlayWithGame: boolean;
}

export const DEFAULT_SETTINGS: OverlaySettings = {
  version: 1,
  opacity: 0.91,
  scale: 1,
  highContrast: false,
  reduceMotion: false,
  privacyHotkeyEnabled: true,
  hideOverlayWithGame: false,
};

export const SETTINGS_KEY = "officespire.settings.v1";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function parseSettings(value: string | null): OverlaySettings {
  if (!value) return DEFAULT_SETTINGS;
  try {
    const candidate = JSON.parse(value) as Partial<OverlaySettings>;
    if (candidate.version !== 1) return DEFAULT_SETTINGS;
    return {
      version: 1,
      opacity:
        typeof candidate.opacity === "number"
          ? clamp(candidate.opacity, 0.65, 0.98)
          : DEFAULT_SETTINGS.opacity,
      scale:
        typeof candidate.scale === "number"
          ? clamp(candidate.scale, 0.85, 1.4)
          : DEFAULT_SETTINGS.scale,
      highContrast:
        typeof candidate.highContrast === "boolean"
          ? candidate.highContrast
          : DEFAULT_SETTINGS.highContrast,
      reduceMotion:
        typeof candidate.reduceMotion === "boolean"
          ? candidate.reduceMotion
          : DEFAULT_SETTINGS.reduceMotion,
      privacyHotkeyEnabled:
        typeof candidate.privacyHotkeyEnabled === "boolean"
          ? candidate.privacyHotkeyEnabled
          : DEFAULT_SETTINGS.privacyHotkeyEnabled,
      hideOverlayWithGame:
        typeof candidate.hideOverlayWithGame === "boolean"
          ? candidate.hideOverlayWithGame
          : DEFAULT_SETTINGS.hideOverlayWithGame,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function loadSettings(): OverlaySettings {
  try {
    return parseSettings(window.localStorage.getItem(SETTINGS_KEY));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: OverlaySettings): boolean {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
