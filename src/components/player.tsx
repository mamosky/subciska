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
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink transition-colors hover:border-line-strong";
const secondaryBtn =
  "rounded-full border border-line-strong bg-surface px-5 py-2.5 text-[13px] font-medium tracking-[0.02em] text-ink transition-colors hover:bg-sunken";

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
    applyFontSettings(state.arabicFont, state.englishFont);
  }, [state.arabicFont, state.englishFont]);

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

  let body: React.ReactNode;
  if (phase === "reciting") {
    body = (
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <p className={eyebrow}>Your turn</p>
        <p className="font-display text-2xl leading-snug text-ink">
          {state.mode === "test"
            ? `Recite ${state.surah}:${displayAyah} from memory`
            : `Repeat ${state.surah}:${displayAyah} aloud`}
        </p>
        <p className="text-4xl font-medium tabular-nums tracking-tight text-forest">
          {remaining.toFixed(1)}
          <span className="ml-0.5 text-lg text-muted">s</span>
        </p>
        {state.mode === "repeat" && (
          <p className="text-sm text-muted">
            The verse is paused — say it while you have it.
          </p>
        )}
      </div>
    );
  } else if (!verseEntry || verseEntry.status === "loading") {
    body = <p className="text-center text-sm text-muted">Loading verse…</p>;
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
            className="font-arabic text-right text-[1.7rem] leading-[2.35] text-ink"
          >
            {verse.arabic}
          </p>
        )}
        {hideText ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <p className={eyebrow}>Hidden</p>
            <p className="text-sm text-muted">
              Reciting from memory — the text stays covered.
            </p>
          </div>
        ) : (
          <p className="font-english text-base leading-relaxed text-muted">
            {verse.english}
          </p>
        )}
        <a
          href={quranComUrl(state.surah, displayAyah)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-medium tracking-[0.02em] text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:text-forest hover:decoration-forest"
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
        onArabicFontChange={(arabicFont) =>
          setStateAndPersist((prev) => ({ ...prev, arabicFont }))
        }
        onEnglishFontChange={(englishFont) =>
          setStateAndPersist((prev) => ({ ...prev, englishFont }))
        }
      />

      <div className="flex flex-1 flex-col items-center bg-canvas px-4 pb-16 pt-10 font-sans">
        <main className="flex w-full max-w-3xl flex-col gap-10">
          <header className="max-w-xl">
            <p className={eyebrow}>Quran memorization</p>
            <h1 className="mt-3 font-display text-[2.5rem] leading-[1.1] tracking-tight text-ink sm:text-[3rem]">
              Hear an ayah.
              <br />
              Pause. Recall.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
              Listen, then recite the next from memory. A calm loop for
              building verse-by-verse recall.
            </p>
          </header>

          <div className="flex w-full flex-col gap-6">
            <audio
              ref={audioRef}
              onEnded={onAudioEnded}
              preload="none"
              className="hidden"
            />

            <section className="rounded-2xl border border-line bg-surface p-6">
              <div className="mb-5 flex items-center justify-between border-b border-line pb-3">
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
                    className="flex rounded-full border border-line bg-sunken p-1"
                    role="group"
                    aria-label="Mode"
                  >
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
                          className={`flex-1 rounded-full px-3 py-2 text-[13px] font-medium tracking-[0.02em] transition-colors ${
                            active
                              ? "bg-ink text-on-action"
                              : "text-muted hover:text-ink"
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
                    <span className="text-sm tabular-nums text-ink">
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
                    className="w-full"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">
                  {surah.name}
                  <span className="text-muted">
                    {" "}
                    · {state.surah}:{displayAyah}
                  </span>
                </p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-quiet tabular-nums">
                  Step {Math.min(step + 1, steps.length)} / {steps.length}
                </p>
              </div>

              <div className="mb-6 h-1 overflow-hidden rounded-full bg-sand">
                <div
                  className="h-full rounded-full bg-forest transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="min-h-[11rem] rounded-xl bg-sunken px-5 py-6">
                {body}
              </div>

              {audioError && (
                <p className="mt-4 rounded-xl border border-line bg-clay/15 px-3.5 py-2.5 text-sm text-ink">
                  {audioError}
                </p>
              )}

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button type="button" onClick={goPrev} className={secondaryBtn} aria-label="Previous step">
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="rounded-full bg-action px-9 py-3 text-[13px] font-medium uppercase tracking-[0.1em] text-on-action transition-colors hover:opacity-90"
                >
                  {phase === "idle" ? "Play" : "Stop"}
                </button>
                <button type="button" onClick={goNext} className={secondaryBtn} aria-label="Next step">
                  Forward →
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

          <footer className="border-t border-line pt-6 text-center">
            <p className="text-[11px] uppercase tracking-[0.14em] text-quiet">
              Your last position is saved automatically
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}
