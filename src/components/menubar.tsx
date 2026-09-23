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

type MenubarProps = {
  arabicFont: ArabicFont;
  englishFont: EnglishFont;
  arabicTextSize: TextSize;
  englishTextSize: TextSize;
  onArabicFontChange: (font: ArabicFont) => void;
  onEnglishFontChange: (font: EnglishFont) => void;
  onArabicTextSizeChange: (size: TextSize) => void;
  onEnglishTextSizeChange: (size: TextSize) => void;
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

const eyebrow =
  "text-[11px] font-medium uppercase tracking-[0.14em] text-quiet";
const fieldSelect =
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink transition-colors hover:border-line-strong";

export function Menubar({
  arabicFont,
  englishFont,
  arabicTextSize,
  englishTextSize,
  onArabicFontChange,
  onEnglishFontChange,
  onArabicTextSizeChange,
  onEnglishTextSizeChange,
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
    <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-3.5">
        <Link
          href="/"
          className="group flex items-baseline gap-2"
        >
          <span className="font-display text-[1.35rem] leading-none tracking-tight text-ink">
            Subciska
          </span>
          <span className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-quiet sm:inline">
            Memorize
          </span>
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors ${
              open
                ? "border-ink bg-ink text-on-action"
                : "border-line bg-surface text-ink hover:border-line-strong hover:bg-sunken"
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
              className="absolute right-0 mt-2.5 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-5 shadow-[0_12px_40px_rgba(33,33,33,0.08)]"
            >
              <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
                <p className={eyebrow}>App Settings</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="-mr-1 rounded-full px-2 py-1 text-sm text-muted hover:bg-sunken hover:text-ink"
                  aria-label="Close settings"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-4">
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
                    className="font-arabic rounded-xl bg-sunken px-3.5 py-2.5 text-right text-ink"
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
                    className="font-english rounded-xl bg-sunken px-3.5 py-2.5 text-ink"
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
