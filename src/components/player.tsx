"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SURAHS, getSurah } from "@/lib/surahs";
import {
  DEFAULT_STATE,
  audioUrl,
  buildSteps,
  clampLeadMutes,
  quranComUrl,
  type Mode,
  type SavedState,
  type Step,
  type VerseText,
} from "@/lib/player";
import { fetchVerseText } from "@/lib/quran-api";
import { applyFontSettings } from "@/lib/fonts";
import { applyTheme } from "@/lib/themes";
import { Menubar } from "@/components/menubar";
import {
  fetchRemoteState,
  loadLocalState,
  saveLocalState,
  saveRemoteState,
} from "@/lib/storage";

type Phase = "idle" | "playing" | "reciting";

type VerseEntry =
  | { status: "loading" }
  | { status: "ok"; data: VerseText }
  | { status: "error" };

const eyebrow = "text-[11px] font-medium uppercase tracking-[0.14em] text-quiet";
const labelCls = "flex flex-col gap-2";
const inputCls =
  "select-pill w-full rounded-full border border-line bg-sunken/60 px-3.5 py-2.5 text-sm text-ink transition-all hover:border-line-strong hover:bg-sunken focus:border-line-strong";
const iconBtn =
  "flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-xs transition-all hover:border-line-strong hover:bg-sunken hover:shadow-sm active:scale-95";

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1.2" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 ${direction === "left" ? "" : "rotate-180"}`}
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function Player() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  const playingRef = useRef(false);
  const advanceRef = useRef<(() => void) | null>(null);

  const [state, setState] = useState<SavedState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [verses, setVerses] = useState<Record<string, VerseEntry>>({});
  const [audioError, setAudioError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);

  const surah = getSurah(state.surah);
  const leadMutes = clampLeadMutes(
    state.leadMutes,
    state.startAyah,
    state.endAyah
  );
  const steps = useMemo(
    () => buildSteps(state.startAyah, state.endAyah, state.mode, leadMutes),
    [state.startAyah, state.endAyah, state.mode, leadMutes]
  );
  const currentStep: Step | undefined = steps[Math.min(step, steps.length - 1)];
  const displayAyah = currentStep?.ayah ?? state.startAyah;
  const verseKey = `${state.surah}:${displayAyah}`;
  const verseEntry = verses[verseKey];
  const hideText =
    state.mode === "test" &&
    currentStep?.type === "pause" &&
    phase === "reciting";

  const setStateAndPersist = useCallback(
    (updater: (prev: SavedState) => SavedState) => {
      setState((prev) => {
        const next = updater(prev);
        saveLocalState(next);
        void saveRemoteState(next);
        return next;
      });
    },
    []
  );

  const applyStep = useCallback(
    (nextStep: number) => {
      stepRef.current = nextStep;
      setStep(nextStep);
      setStateAndPersist((prev) =>
        prev.step === nextStep ? prev : { ...prev, step: nextStep }
      );
    },
    [setStateAndPersist]
  );

  const clearPauseTimer = useCallback(() => {
    if (pauseTimer.current) {
      clearTimeout(pauseTimer.current);
      pauseTimer.current = null;
    }
    if (intervalTimer.current) {
      clearInterval(intervalTimer.current);
      intervalTimer.current = null;
    }
    setRemaining(0);
  }, []);

  const stopAll = useCallback(() => {
    playingRef.current = false;
    phaseRef.current = "idle";
    setPhase("idle");
    clearPauseTimer();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [clearPauseTimer]);

  const runStep = useCallback(
    (index: number) => {
      const stepsNow = buildSteps(
        state.startAyah,
        state.endAyah,
        state.mode,
        clampLeadMutes(state.leadMutes, state.startAyah, state.endAyah)
      );
      const safeIndex = Math.max(0, Math.min(index, stepsNow.length - 1));
      const stepDef = stepsNow[safeIndex];
      stepRef.current = safeIndex;
      setStep(safeIndex);
      setAudioError(null);

      if (stepDef.type === "play") {
        clearPauseTimer();
        phaseRef.current = "playing";
        setPhase("playing");
        const audio = audioRef.current;
        if (!audio) return;
        const src = audioUrl(state.surah, stepDef.ayah);
        if (audio.getAttribute("src") !== src) {
          audio.src = src;
        }
        audio
          .play()
          .then(() => {
            playingRef.current = true;
          })
          .catch(() => {
            setAudioError(
              `Could not play audio for ${state.surah}:${stepDef.ayah}. Upload it to R2 as ${state.surah}_${stepDef.ayah}.mp3.`
            );
            phaseRef.current = "idle";
            setPhase("idle");
            playingRef.current = false;
          });
      } else {
        const audio = audioRef.current;
        if (audio) audio.pause();
        playingRef.current = false;
        phaseRef.current = "reciting";
        setPhase("reciting");
        const total = state.pauseSeconds;
        setRemaining(total);
        const startedAt = Date.now();
        intervalTimer.current = setInterval(() => {
          const left = Math.max(0, total - (Date.now() - startedAt) / 1000);
          setRemaining(left);
        }, 100);
        pauseTimer.current = setTimeout(() => {
          clearPauseTimer();
          advanceRef.current?.();
        }, total * 1000);
      }
    },
    [
      clearPauseTimer,
      state.pauseSeconds,
      state.surah,
      state.startAyah,
      state.endAyah,
      state.mode,
      state.leadMutes,
    ]
  );

  const advance = useCallback(() => {
    const stepsNow = buildSteps(
      state.startAyah,
      state.endAyah,
      state.mode,
      clampLeadMutes(state.leadMutes, state.startAyah, state.endAyah)
    );
    let next = stepRef.current + 1;
    if (next >= stepsNow.length) {
      if (state.mode === "repeat") {
        next = 0;
      } else {
        stopAll();
        applyStep(stepsNow.length - 1);
        return;
      }
    }
    runStep(next);
  }, [
    applyStep,
    runStep,
    state.endAyah,
    state.mode,
    state.startAyah,
    state.leadMutes,
    stopAll,
  ]);

  useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);

  const goPrev = useCallback(() => {
    stopAll();
    applyStep(Math.max(0, stepRef.current - 1));
  }, [applyStep, stopAll]);

  const goNext = useCallback(() => {
    stopAll();
    const stepsNow = buildSteps(
      state.startAyah,
      state.endAyah,
      state.mode,
      clampLeadMutes(state.leadMutes, state.startAyah, state.endAyah)
    );
    applyStep(Math.min(stepsNow.length - 1, stepRef.current + 1));
  }, [
    applyStep,
    state.endAyah,
    state.mode,
    state.startAyah,
    state.leadMutes,
    stopAll,
  ]);

  const togglePlay = useCallback(() => {
    if (phaseRef.current === "idle") {
      runStep(stepRef.current);
    } else {
      stopAll();
    }
  }, [runStep, stopAll]);

  useEffect(() => {
    const local = loadLocalState();
    let cancelled = false;
    void (async () => {
      const remote = await fetchRemoteState();
      if (cancelled) return;
      const initial = remote ?? local ?? DEFAULT_STATE;
      setState(initial);
      stepRef.current = initial.step ?? 0;
      setStep(initial.step ?? 0);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    applyFontSettings(
      state.arabicFont,
      state.englishFont,
      state.arabicTextSize,
      state.englishTextSize
    );
  }, [
    state.arabicFont,
    state.englishFont,
    state.arabicTextSize,
    state.englishTextSize,
  ]);

  useEffect(() => {
    applyTheme(state.theme);
  }, [state.theme]);

  useEffect(() => {
    if (!hydrated) return;
    const entry = verses[verseKey];
    if (entry && entry.status !== "loading") return;

    let cancelled = false;
    fetchVerseText(state.surah, displayAyah)
      .then((data) => {
        if (cancelled) return;
        setVerses((prev) => ({ ...prev, [verseKey]: { status: "ok", data } }));
      })
      .catch(() => {
        if (cancelled) return;
        setVerses((prev) => ({ ...prev, [verseKey]: { status: "error" } }));
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, state.surah, displayAyah, verseKey, verses]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      clearPauseTimer();
      audio?.pause();
    };
  }, [clearPauseTimer]);

  const onAudioEnded = () => {
    advanceRef.current?.();
  };

  const progress = steps.length > 0 ? ((step + 1) / steps.length) * 100 : 0;
  const ringProgress =
    state.pauseSeconds > 0
      ? Math.max(0, Math.min(1, remaining / state.pauseSeconds))
      : 0;
  const ringCircumference = 2 * Math.PI * 54;
  const rangePct =
    ((state.pauseSeconds - 1) / (20 - 1)) * 100;

  let body: React.ReactNode;
  if (phase === "reciting") {
    body = (
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <div className="relative h-36 w-36">
          <svg
            viewBox="0 0 120 120"
            className="h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="var(--surface-muted)"
              strokeWidth="6"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="var(--forest)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={
                ringCircumference * (1 - ringProgress)
              }
              style={{ transition: "stroke-dashoffset 100ms linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-3xl font-medium tabular-nums tracking-tight text-ink">
              {remaining.toFixed(1)}
              <span className="ml-0.5 text-base text-muted">s</span>
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-quiet">
              Your turn
            </p>
          </div>
        </div>
        <p className="font-display text-xl leading-snug text-ink">
          {state.mode === "test"
            ? `Recite ${state.surah}:${displayAyah} from memory`
            : `Repeat ${state.surah}:${displayAyah} aloud`}
        </p>
        {state.mode === "repeat" && (
          <p className="text-sm text-muted">
            The verse is paused — say it while you have it.
          </p>
        )}
      </div>
    );
  } else if (!verseEntry || verseEntry.status === "loading") {
    body = (
      <div className="flex h-full min-h-[11rem] items-center justify-center">
        <div className="flex items-center gap-2.5 text-sm text-muted">
          <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-forest" />
          Loading verse…
        </div>
      </div>
    );
  } else if (verseEntry.status === "error") {
    body = (
      <p className="text-center text-sm text-danger">
        Could not load verse text.
      </p>
    );
  } else {
    const verse = verseEntry.data;
    body = (
      <div className="flex flex-col gap-5">
        {!hideText && (
          <p
            dir="rtl"
            lang="ar"
            className="font-arabic text-right leading-[2.35] text-ink"
            style={{ fontSize: "var(--font-arabic-size)" }}
          >
            {verse.arabic}
          </p>
        )}
        {hideText ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <p className={`${eyebrow} animate-soft-pulse`}>Hidden</p>
            <p className="text-sm text-muted">
              Reciting from memory — the text stays covered.
            </p>
          </div>
        ) : (
          <div className="border-l-2 border-forest/40 pl-4">
            <p
              className="font-english leading-relaxed text-muted"
              style={{ fontSize: "var(--font-english-size)" }}
            >
              {verse.english}
            </p>
          </div>
        )}
        <a
          href={quranComUrl(state.surah, displayAyah)}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start rounded-full bg-sunken px-3.5 py-1.5 text-[12px] font-medium tracking-[0.02em] text-ink transition-colors hover:bg-forest-tint hover:text-forest"
        >
          Open on Quran.com →
        </a>
      </div>
    );
  }

  return (
    <>
      <Menubar
        arabicFont={state.arabicFont}
        englishFont={state.englishFont}
        arabicTextSize={state.arabicTextSize}
        englishTextSize={state.englishTextSize}
        theme={state.theme}
        onArabicFontChange={(arabicFont) =>
          setStateAndPersist((prev) => ({ ...prev, arabicFont }))
        }
        onEnglishFontChange={(englishFont) =>
          setStateAndPersist((prev) => ({ ...prev, englishFont }))
        }
        onArabicTextSizeChange={(arabicTextSize) =>
          setStateAndPersist((prev) => ({ ...prev, arabicTextSize }))
        }
        onEnglishTextSizeChange={(englishTextSize) =>
          setStateAndPersist((prev) => ({ ...prev, englishTextSize }))
        }
        onThemeChange={(theme) =>
          setStateAndPersist((prev) => ({ ...prev, theme }))
        }
      />

      <div className="flex flex-1 flex-col items-center bg-canvas px-4 pb-16 pt-8 font-sans">
        <main className="animate-rise flex w-full max-w-3xl flex-col gap-8">
          <div className="flex w-full flex-col gap-5">
            <audio
              ref={audioRef}
              onEnded={onAudioEnded}
              preload="none"
              className="hidden"
            />

            <section className="rounded-3xl border border-line/70 bg-surface p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between border-b border-line/70 pb-3">
                <p className={eyebrow}>Session</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-quiet">
                  {surah.name}
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className={labelCls}>
                  <span className={eyebrow}>Surah</span>
                  <select
                    className={inputCls}
                    value={state.surah}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const s = getSurah(id);
                      stopAll();
                      setStateAndPersist((prev) => ({
                        ...prev,
                        surah: id,
                        startAyah: 1,
                        endAyah: Math.min(prev.endAyah || s.ayahs, s.ayahs),
                        step: 0,
                      }));
                      applyStep(0);
                    }}
                  >
                    {SURAHS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id}. {s.name} ({s.ayahs})
                      </option>
                    ))}
                  </select>
                </label>

                <div className={labelCls}>
                  <span className={eyebrow}>Mode</span>
                  <div
                    className="relative flex rounded-full border border-line bg-sunken p-1"
                    role="group"
                    aria-label="Mode"
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-ink shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        state.mode === "repeat" ? "translate-x-full" : ""
                      }`}
                    />
                    {(
                      [
                        { value: "test", label: "Test me" },
                        { value: "repeat", label: "Repeat" },
                      ] as const
                    ).map((option) => {
                      const active = state.mode === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            if (state.mode === option.value) return;
                            stopAll();
                            setStateAndPersist((prev) => ({
                              ...prev,
                              mode: option.value as Mode,
                            }));
                            applyStep(0);
                          }}
                          className={`relative z-10 flex-1 rounded-full px-3 py-2 text-[13px] font-medium tracking-[0.02em] transition-colors duration-200 ${
                            active ? "text-on-action" : "text-muted hover:text-ink"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className={labelCls}>
                  <span className={eyebrow}>From ayah</span>
                  <input
                    type="number"
                    min={1}
                    max={surah.ayahs}
                    className={inputCls}
                    value={state.startAyah}
                    onChange={(e) => {
                      const start = Math.max(
                        1,
                        Math.min(Number(e.target.value) || 1, surah.ayahs)
                      );
                      stopAll();
                      setStateAndPersist((prev) => ({
                        ...prev,
                        startAyah: start,
                        endAyah: Math.max(prev.endAyah, start),
                        leadMutes: clampLeadMutes(
                          prev.leadMutes,
                          start,
                          Math.max(prev.endAyah, start)
                        ),
                      }));
                      applyStep(0);
                    }}
                  />
                </label>

                <label className={labelCls}>
                  <span className={eyebrow}>To ayah</span>
                  <input
                    type="number"
                    min={state.startAyah}
                    max={surah.ayahs}
                    className={inputCls}
                    value={state.endAyah}
                    onChange={(e) => {
                      const end = Math.max(
                        state.startAyah,
                        Math.min(
                          Number(e.target.value) || state.startAyah,
                          surah.ayahs
                        )
                      );
                      stopAll();
                      setStateAndPersist((prev) => ({
                        ...prev,
                        endAyah: end,
                        leadMutes: clampLeadMutes(
                          prev.leadMutes,
                          prev.startAyah,
                          end
                        ),
                      }));
                      applyStep(0);
                    }}
                  />
                </label>

                <label className={labelCls}>
                  <span className={eyebrow}>Mute first (ayat)</span>
                  <input
                    type="number"
                    min={0}
                    max={Math.max(0, state.endAyah - state.startAyah + 1)}
                    className={inputCls}
                    value={leadMutes}
                    onChange={(e) => {
                      const next = clampLeadMutes(
                        Number(e.target.value) || 0,
                        state.startAyah,
                        state.endAyah
                      );
                      stopAll();
                      setStateAndPersist((prev) => ({ ...prev, leadMutes: next }));
                      applyStep(0);
                    }}
                  />
                </label>

                <label className={`${labelCls} sm:col-span-2`}>
                  <span className="flex items-center justify-between">
                    <span className={eyebrow}>Pause length</span>
                    <span className="rounded-full bg-forest-tint px-2.5 py-0.5 text-sm font-medium tabular-nums text-forest">
                      {state.pauseSeconds.toFixed(1)}s
                    </span>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={0.5}
                    value={state.pauseSeconds}
                    onChange={(e) => {
                      const pauseSeconds = Number(e.target.value);
                      setStateAndPersist((prev) => ({ ...prev, pauseSeconds }));
                    }}
                    style={{ "--range-progress": `${rangePct}%` } as React.CSSProperties}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-line/70 bg-surface p-6 shadow-md">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      phase === "playing"
                        ? "animate-soft-pulse bg-forest"
                        : phase === "reciting"
                          ? "bg-clay"
                          : "bg-line-strong"
                    }`}
                  />
                  <p className="truncate text-sm font-medium text-ink">
                    {surah.name}
                    <span className="text-muted"> · {state.surah}:{displayAyah}</span>
                  </p>
                </div>
                <p className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-quiet tabular-nums">
                  Step {Math.min(step + 1, steps.length)} / {steps.length}
                </p>
              </div>

              <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-sand">
                <div
                  className="h-full rounded-full bg-forest transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="min-h-[14rem] rounded-2xl border border-line/40 bg-gradient-to-b from-sunken to-surface/40 px-5 py-7 sm:px-7">
                {body}
              </div>

              {audioError && (
                <p className="mt-4 rounded-2xl border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-ink">
                  {audioError}
                </p>
              )}

              <div className="mt-7 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={goPrev}
                  className={iconBtn}
                  aria-label="Previous step"
                >
                  <ChevronIcon direction="left" />
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-action text-on-action shadow-md transition-all hover:opacity-90 hover:shadow-lg active:scale-95"
                  aria-label={phase === "idle" ? "Play" : "Stop"}
                >
                  <PlayIcon playing={phase !== "idle"} />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className={iconBtn}
                  aria-label="Next step"
                >
                  <ChevronIcon direction="right" />
                </button>
              </div>

              <p className="mt-5 text-center text-xs leading-relaxed text-quiet">
                {leadMutes > 0
                  ? `First ${leadMutes} ayat muted (recite from memory), then ${
                      state.mode === "test"
                        ? "even steps play · odd steps pause"
                        : "each ayah plays, then pauses"
                    }`
                  : state.mode === "test"
                    ? "Even steps play audio · Odd steps pause so you recite the next ayah"
                    : "Each ayah plays, then pauses so you repeat it aloud · Range loops"}
              </p>
            </section>
          </div>

          <footer className="border-t border-line/70 pt-6 text-center">
            <p className="text-[11px] uppercase tracking-[0.14em] text-quiet">
              Your last position is saved automatically
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}
