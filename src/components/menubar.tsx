"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ARABIC_FONT_OPTIONS,
  ENGLISH_FONT_OPTIONS,
  TEXT_SIZE_OPTIONS,
  type ArabicFont,
  type EnglishFont,
  type TextSize,
} from "@/lib/fonts";
import { themeGroups, type ThemeId } from "@/lib/themes";

type MenubarProps = {
  arabicFont: ArabicFont;
  englishFont: EnglishFont;
  arabicTextSize: TextSize;
  englishTextSize: TextSize;
  theme: ThemeId;
  onArabicFontChange: (font: ArabicFont) => void;
  onEnglishFontChange: (font: EnglishFont) => void;
  onArabicTextSizeChange: (size: TextSize) => void;
  onEnglishTextSizeChange: (size: TextSize) => void;
  onThemeChange: (theme: ThemeId) => void;
};

function GearIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function MarkIcon() {
  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[11px] font-semibold tracking-tight text-on-action"
    >
      S
    </span>
  );
}

const eyebrow =
  "text-[11px] font-medium uppercase tracking-[0.14em] text-quiet";
const fieldSelect =
  "select-pill w-full rounded-full border border-line bg-sunken/60 px-3.5 py-2.5 text-sm text-ink transition-all hover:border-line-strong hover:bg-sunken focus:border-line-strong";

export function Menubar({
  arabicFont,
  englishFont,
  arabicTextSize,
  englishTextSize,
  theme,
  onArabicFontChange,
  onEnglishFontChange,
  onArabicTextSizeChange,
  onEnglishTextSizeChange,
  onThemeChange,
}: MenubarProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-surface/75 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/60">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-3">
        <Link href="/" className="group flex items-center gap-2.5">
          <MarkIcon />
          <span className="flex flex-col leading-none">
            <span className="font-display text-[1.2rem] tracking-tight text-ink transition-colors group-hover:text-forest">
              Subciska
            </span>
            <span className="mt-0.5 hidden text-[9px] font-medium uppercase tracking-[0.18em] text-quiet sm:block">
              Memorize
            </span>
          </span>
        </Link>

        <div className="relative" ref={rootRef}>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.12em] transition-all active:scale-[0.98] ${
              open
                ? "border-ink bg-ink text-on-action shadow-md"
                : "border-line bg-surface/80 text-ink shadow-xs hover:border-line-strong hover:bg-sunken"
            }`}
            aria-label="App Settings"
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            <GearIcon />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {open && (
            <div
              role="dialog"
              aria-label="App Settings"
              className="animate-pop absolute right-0 mt-3 max-h-[min(85vh,40rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-line/80 bg-surface p-5 shadow-lg"
            >
              <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-center justify-between border-b border-line/70 bg-surface/95 px-5 pb-3 pt-5 backdrop-blur">
                <p className={eyebrow}>App Settings</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="-mr-1 flex h-7 w-7 items-center justify-center rounded-full text-sm text-muted transition-colors hover:bg-sunken hover:text-ink"
                  aria-label="Close settings"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <span className={eyebrow}>Theme</span>
                  <div
                    className="flex flex-col gap-3"
                    role="listbox"
                    aria-label="Theme"
                  >
                    {themeGroups().map((group) => (
                      <div key={group.label} className="flex flex-col gap-1.5">
                        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-quiet/80">
                          {group.label}
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {group.themes.map((option) => {
                            const active = theme === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => onThemeChange(option.id)}
                                title={option.label}
                                className={`group flex flex-col items-center gap-1.5 rounded-xl p-1.5 transition-all active:scale-95 ${
                                  active
                                    ? "bg-forest-tint ring-2 ring-forest"
                                    : "hover:bg-sunken"
                                }`}
                              >
                                <span
                                  className="relative flex h-10 w-full items-center justify-center overflow-hidden rounded-lg border border-line/60"
                                  style={{ backgroundColor: option.canvas }}
                                >
                                  <span
                                    className="absolute left-1 top-1 h-3.5 w-5 rounded-[3px] border border-black/5"
                                    style={{ backgroundColor: option.surface }}
                                  />
                                  <span
                                    className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: option.accent }}
                                  />
                                  <span
                                    className="absolute bottom-1.5 left-1.5 h-1 w-6 rounded-full"
                                    style={{
                                      backgroundColor: option.ink,
                                      opacity: 0.35,
                                    }}
                                  />
                                </span>
                                <span
                                  className={`w-full truncate text-center text-[9px] font-medium leading-tight ${
                                    active ? "text-forest" : "text-quiet"
                                  }`}
                                >
                                  {option.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <label className="flex flex-col gap-2 text-sm">
                  <span className={eyebrow}>Arabic font</span>
                  <select
                    className={fieldSelect}
                    value={arabicFont}
                    onChange={(event) =>
                      onArabicFontChange(event.target.value as ArabicFont)
                    }
                  >
                    {ARABIC_FONT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className={eyebrow}>Arabic text size</span>
                  <select
                    className={fieldSelect}
                    value={arabicTextSize}
                    onChange={(event) =>
                      onArabicTextSizeChange(event.target.value as TextSize)
                    }
                  >
                    {TEXT_SIZE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span
                    dir="rtl"
                    lang="ar"
                    className="font-arabic rounded-2xl border border-line/50 bg-sunken px-4 py-3 text-right text-ink"
                    style={{ fontSize: "var(--font-arabic-size)" }}
                  >
                    بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                  </span>
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className={eyebrow}>English font</span>
                  <select
                    className={fieldSelect}
                    value={englishFont}
                    onChange={(event) =>
                      onEnglishFontChange(event.target.value as EnglishFont)
                    }
                  >
                    {ENGLISH_FONT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className={eyebrow}>English text size</span>
                  <select
                    className={fieldSelect}
                    value={englishTextSize}
                    onChange={(event) =>
                      onEnglishTextSizeChange(event.target.value as TextSize)
                    }
                  >
                    {TEXT_SIZE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span
                    className="font-english rounded-2xl border border-line/50 bg-sunken px-4 py-3 text-ink"
                    style={{ fontSize: "var(--font-english-size)" }}
                  >
                    In the name of God, the Most Gracious, the Most Merciful.
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
