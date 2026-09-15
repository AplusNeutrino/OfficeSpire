import { DEFAULT_SETTINGS, type OverlaySettings } from "../settings";
import { useEffect, useRef, type RefObject } from "react";

interface Props {
  settings: OverlaySettings;
  onChange: (settings: OverlaySettings) => void;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}

export function SettingsPanel({
  settings,
  onChange,
  onClose,
  returnFocusRef,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.code === "Escape") onClose();
      if (event.code !== "Tab" || !panelRef.current) return;
      const controls = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled)",
        ),
      );
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        last.focus();
        event.preventDefault();
      } else if (!event.shiftKey && document.activeElement === last) {
        first.focus();
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      returnFocusRef.current?.focus();
    };
  }, [onClose, returnFocusRef]);
  const update = (change: Partial<OverlaySettings>) =>
    onChange({ ...settings, ...change, version: 1 });

  return (
    <section
      ref={panelRef}
      className="settings-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-heading"
    >
      <header>
        <h1 id="settings-heading">Overlay settings</h1>
        <button ref={closeRef} onClick={onClose} aria-label="Close settings">
          ×
        </button>
      </header>
      <label>
        Background opacity{" "}
        <output>{Math.round(settings.opacity * 100)}%</output>
        <input
          type="range"
          min="0.65"
          max="0.98"
          step="0.01"
          value={settings.opacity}
          onChange={(event) => update({ opacity: Number(event.target.value) })}
        />
      </label>
      <label>
        Interface scale <output>{Math.round(settings.scale * 100)}%</output>
        <input
          type="range"
          min="0.85"
          max="1.4"
          step="0.05"
          value={settings.scale}
          onChange={(event) => update({ scale: Number(event.target.value) })}
        />
      </label>
      <label className="setting-check">
        <input
          type="checkbox"
          checked={settings.highContrast}
          onChange={(event) => update({ highContrast: event.target.checked })}
        />
        High contrast
      </label>
      <label className="setting-check">
        <input
          type="checkbox"
          checked={settings.reduceMotion}
          onChange={(event) => update({ reduceMotion: event.target.checked })}
        />
        Reduce motion
      </label>
      <button
        className="settings-reset"
        onClick={() => onChange(DEFAULT_SETTINGS)}
      >
        Reset defaults
      </button>
    </section>
  );
}
