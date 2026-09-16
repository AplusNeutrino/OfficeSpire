import { invoke } from "@tauri-apps/api/core";

export interface PrivacyStatus {
  enabled: boolean;
  hide_overlay: boolean;
  game_hidden: boolean;
  shortcut: string;
  registered: boolean;
  error: string | null;
}

export const PRIVACY_SHORTCUT = "Ctrl+Shift+F12";

export async function configurePrivacyMode(
  enabled: boolean,
  hideOverlay: boolean,
): Promise<PrivacyStatus> {
  return invoke<PrivacyStatus>("configure_privacy_mode", {
    enabled,
    hideOverlay,
  });
}

export async function getPrivacyStatus(): Promise<PrivacyStatus> {
  return invoke<PrivacyStatus>("privacy_status");
}
