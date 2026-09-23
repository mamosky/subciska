export type ArabicFont = "hafs" | "system" | "naskh";
export type EnglishFont = "geist" | "mono" | "system" | "serif" | "arial";

type FontOption<T extends string> = {
  value: T;
  label: string;
  stack: string;
  previewClass?: string;
};

export const ARABIC_FONT_OPTIONS: FontOption<ArabicFont>[] = [
  {
    value: "hafs",
    label: "Hafs Uthmanic (default)",
    stack:
      '"KFGQPC Hafs Uthmanic Script", "UthmanicHafs", "Geeza Pro", "Arabic Typesetting", "Noto Naskh Arabic", serif',
  },
  {
    value: "system",
    label: "System Arabic",
    stack:
      '"Geeza Pro", "Segoe UI", "Noto Sans Arabic", "Tahoma", "Arial", sans-serif',
  },
  {
    value: "naskh",
    label: "Naskh / Traditional",
    stack:
      '"Noto Naskh Arabic", "Traditional Arabic", "Arabic Typesetting", "Times New Roman", serif',
  },
];

export const ENGLISH_FONT_OPTIONS: FontOption<EnglishFont>[] = [
  {
    value: "geist",
    label: "Geist (default)",
    stack: 'var(--font-geist-sans), Arial, Helvetica, sans-serif',
  },
  {
    value: "mono",
    label: "Geist Mono",
    stack: 'var(--font-geist-mono), ui-monospace, monospace',
  },
  {
    value: "system",
    label: "System UI",
    stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  {
    value: "serif",
    label: "Serif",
    stack: 'Georgia, "Times New Roman", Times, serif',
  },
  {
    value: "arial",
    label: "Arial",
    stack: "Arial, Helvetica, sans-serif",
  },
];

export const DEFAULT_ARABIC_FONT: ArabicFont = "hafs";
export const DEFAULT_ENGLISH_FONT: EnglishFont = "geist";

export function isArabicFont(value: unknown): value is ArabicFont {
  return ARABIC_FONT_OPTIONS.some((o) => o.value === value);
}

export function isEnglishFont(value: unknown): value is EnglishFont {
  return ENGLISH_FONT_OPTIONS.some((o) => o.value === value);
}

export function coerceArabicFont(value: unknown): ArabicFont {
  return isArabicFont(value) ? value : DEFAULT_ARABIC_FONT;
}

export function coerceEnglishFont(value: unknown): EnglishFont {
  return isEnglishFont(value) ? value : DEFAULT_ENGLISH_FONT;
}

export function arabicFontStack(id: ArabicFont): string {
  return (
    ARABIC_FONT_OPTIONS.find((o) => o.value === id)?.stack ??
    ARABIC_FONT_OPTIONS[0].stack
  );
}

export function englishFontStack(id: EnglishFont): string {
  return (
    ENGLISH_FONT_OPTIONS.find((o) => o.value === id)?.stack ??
    ENGLISH_FONT_OPTIONS[0].stack
  );
}

/** Push font choices onto CSS variables used by .font-arabic / .font-english. */
export function applyFontSettings(
  arabic: ArabicFont,
  english: EnglishFont
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--font-arabic-user", arabicFontStack(arabic));
  root.style.setProperty("--font-english-user", englishFontStack(english));
}
