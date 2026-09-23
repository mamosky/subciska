export type ArabicFont = "hafs" | "system" | "naskh";
export type EnglishFont = "geist" | "mono" | "system" | "serif" | "arial";
export type TextSize = "sm" | "md" | "lg" | "xl";

type FontOption<T extends string> = {
  value: T;
  label: string;
  stack: string;
  previewClass?: string;
};

export const TEXT_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium (default)" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Extra large" },
];

export const ARABIC_SIZE_SCALE: Record<TextSize, string> = {
  sm: "1.35rem",
  md: "1.7rem",
  lg: "2.1rem",
  xl: "2.5rem",
};

export const ENGLISH_SIZE_SCALE: Record<TextSize, string> = {
  sm: "0.875rem",
  md: "1rem",
  lg: "1.125rem",
  xl: "1.3rem",
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
export const DEFAULT_ARABIC_SIZE: TextSize = "md";
export const DEFAULT_ENGLISH_SIZE: TextSize = "md";

export function isArabicFont(value: unknown): value is ArabicFont {
  return ARABIC_FONT_OPTIONS.some((o) => o.value === value);
}

export function isEnglishFont(value: unknown): value is EnglishFont {
  return ENGLISH_FONT_OPTIONS.some((o) => o.value === value);
}

export function isTextSize(value: unknown): value is TextSize {
  return TEXT_SIZE_OPTIONS.some((o) => o.value === value);
}

export function coerceArabicFont(value: unknown): ArabicFont {
  return isArabicFont(value) ? value : DEFAULT_ARABIC_FONT;
}

export function coerceEnglishFont(value: unknown): EnglishFont {
  return isEnglishFont(value) ? value : DEFAULT_ENGLISH_FONT;
}

export function coerceArabicTextSize(value: unknown): TextSize {
  return isTextSize(value) ? value : DEFAULT_ARABIC_SIZE;
}

export function coerceEnglishTextSize(value: unknown): TextSize {
  return isTextSize(value) ? value : DEFAULT_ENGLISH_SIZE;
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

/** Push font + size choices onto CSS variables used by verse text. */
export function applyFontSettings(
  arabic: ArabicFont,
  english: EnglishFont,
  arabicSize: TextSize = DEFAULT_ARABIC_SIZE,
  englishSize: TextSize = DEFAULT_ENGLISH_SIZE
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--font-arabic-user", arabicFontStack(arabic));
  root.style.setProperty("--font-english-user", englishFontStack(english));
  root.style.setProperty("--font-arabic-size", ARABIC_SIZE_SCALE[arabicSize]);
  root.style.setProperty("--font-english-size", ENGLISH_SIZE_SCALE[englishSize]);
}
