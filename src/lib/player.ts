export type Mode = "test" | "repeat";

import type { ArabicFont, EnglishFont } from "./fonts";
import { DEFAULT_ARABIC_FONT, DEFAULT_ENGLISH_FONT } from "./fonts";

export type SavedState = {
  surah: number;
  startAyah: number;
  endAyah: number;
  mode: Mode;
  pauseSeconds: number;
  /** Number of ayat at the start of the range to mute (no audio) before playback begins. */
  leadMutes: number;
  arabicFont: ArabicFont;
  englishFont: EnglishFont;
  step: number;
};

export type VerseText = {
  arabic: string;
  english: string;
};

export type Step =
  | { type: "play"; ayah: number }
  | { type: "pause"; ayah: number };

export const DEFAULT_STATE: SavedState = {
  surah: 1,
  startAyah: 1,
  endAyah: 7,
  mode: "test",
  pauseSeconds: 5,
  leadMutes: 0,
  arabicFont: DEFAULT_ARABIC_FONT,
  englishFont: DEFAULT_ENGLISH_FONT,
  step: 0,
};

export function clampLeadMutes(
  leadMutes: number,
  startAyah: number,
  endAyah: number
): number {
  const total = Math.max(0, endAyah - startAyah + 1);
  if (!Number.isFinite(leadMutes)) return 0;
  return Math.max(0, Math.min(Math.floor(leadMutes), total));
}

export function buildSteps(
  startAyah: number,
  endAyah: number,
  mode: Mode,
  leadMutes = 0
): Step[] {
  const steps: Step[] = [];
  const muted = clampLeadMutes(leadMutes, startAyah, endAyah);
  for (let ayah = startAyah; ayah <= endAyah; ayah++) {
    const offset = ayah - startAyah;
    if (offset < muted) {
      steps.push({ type: "pause", ayah });
      continue;
    }
    if (mode === "test") {
      const isRecite = (offset - muted) % 2 === 1;
      steps.push({ type: isRecite ? "pause" : "play", ayah });
    } else {
      steps.push({ type: "play", ayah });
      steps.push({ type: "pause", ayah });
    }
  }
  return steps;
}

export function quranComUrl(surah: number, ayah: number): string {
  return `https://quran.com/${surah}:${ayah}`;
}

export function audioUrl(surah: number, ayah: number): string {
  const base = process.env.NEXT_PUBLIC_AUDIO_BASE;
  if (base) return `${base.replace(/\/$/, "")}/${surah}_${ayah}.mp3`;
  return `/api/audio/${surah}/${ayah}`;
}
