import type { SavedState } from "./player";
import { DEFAULT_STATE } from "./player";
import {
  coerceArabicFont,
  coerceArabicTextSize,
  coerceEnglishFont,
  coerceEnglishTextSize,
} from "./fonts";

const KEY = "subciska:state";

export function loadLocalState(): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      surah: Number(parsed.surah) || DEFAULT_STATE.surah,
      startAyah: Number(parsed.startAyah) || DEFAULT_STATE.startAyah,
      endAyah: Number(parsed.endAyah) || DEFAULT_STATE.endAyah,
      pauseSeconds: Number(parsed.pauseSeconds) || DEFAULT_STATE.pauseSeconds,
      leadMutes: Number.isFinite(Number(parsed.leadMutes))
        ? Math.max(0, Math.floor(Number(parsed.leadMutes)))
        : DEFAULT_STATE.leadMutes,
      arabicFont: coerceArabicFont(parsed.arabicFont),
      englishFont: coerceEnglishFont(parsed.englishFont),
      arabicTextSize: coerceArabicTextSize(parsed.arabicTextSize),
      englishTextSize: coerceEnglishTextSize(parsed.englishTextSize),
      step: Number(parsed.step) || 0,
      mode: parsed.mode === "repeat" ? "repeat" : "test",
    };
  } catch {
    return null;
  }
}

export function saveLocalState(state: SavedState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export async function fetchRemoteState(): Promise<SavedState | null> {
  try {
    const res = await fetch("/api/state");
    if (!res.ok) return null;
    return (await res.json()) as SavedState;
  } catch {
    return null;
  }
}

export async function saveRemoteState(state: SavedState): Promise<void> {
  try {
    await fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
  } catch {
    // D1 unavailable locally without wrangler — localStorage still works
  }
}
