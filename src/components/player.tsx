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
        <p className="text-lg font-medium text-zinc-800 dark:text-zinc-100">
          {state.mode === "test"
            ? `Recite ${state.surah}:${displayAyah} from memory`
            : `Your turn: ${state.surah}:${displayAyah}`}
        </p>
        <p className="text-3xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
          {remaining.toFixed(1)}s
        </p>
        {state.mode === "repeat" && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Repeat the verse aloud while it is paused.
          </p>
        )}
      </div>
    );
  } else if (!verseEntry || verseEntry.status === "loading") {
    body = <p className="text-center text-zinc-500">Loading verse…</p>;
  } else if (verseEntry.status === "error") {
    body = (
      <p className="text-center text-red-500">Could not load verse text.</p>
    );
  } else {
    const verse = verseEntry.data;
    body = (
      <div className="flex flex-col gap-4">
        {!hideText && (
          <p
            dir="rtl"
            lang="ar"
            className="text-right font-arabic text-3xl leading-[2.25] text-zinc-900 dark:text-zinc-50"
          >
            {verse.arabic}
          </p>
        )}
        {hideText ? (
          <p className="text-center text-zinc-500 dark:text-zinc-400">
            Hidden while you recite
          </p>
        ) : (
          <p className="text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
            {verse.english}
          </p>
        )}
        <a
          href={quranComUrl(state.surah, displayAyah)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          Open on Quran.com →
        </a>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <audio
        ref={audioRef}
        onEnded={onAudioEnded}
        preload="none"
        className="hidden"
      />

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">
              Surah
            </span>
            <select
              className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
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

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">
              Mode
            </span>
            <select
              className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
              value={state.mode}
              onChange={(e) => {
                stopAll();
                const mode = e.target.value as Mode;
                setStateAndPersist((prev) => ({ ...prev, mode }));
                applyStep(0);
              }}
            >
              <option value="test">Test me (recall)</option>
              <option value="repeat">Repeat (learn)</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">
              From ayah
            </span>
            <input
              type="number"
              min={1}
              max={surah.ayahs}
              className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
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

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">
              To ayah
            </span>
            <input
              type="number"
              min={state.startAyah}
              max={surah.ayahs}
              className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
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
                  leadMutes: clampLeadMutes(prev.leadMutes, prev.startAyah, end),
                }));
                applyStep(0);
              }}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">
              Mute first (ayat)
            </span>
            <input
              type="number"
              min={0}
              max={Math.max(0, state.endAyah - state.startAyah + 1)}
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

          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="flex items-center justify-between font-medium text-zinc-600 dark:text-zinc-400">
              Pause length
              <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
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
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
          <span>
            {surah.name} · {state.surah}:{displayAyah}
          </span>
          <span>
            Step {Math.min(step + 1, steps.length)} / {steps.length}
          </span>
        </div>

        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="min-h-[10rem] rounded-xl bg-zinc-50 p-5 dark:bg-zinc-900">
          {body}
        </div>

        {audioError && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {audioError}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            aria-label="Previous step"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="rounded-full bg-emerald-600 px-8 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            {phase === "idle" ? "Play" : "Stop"}
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            aria-label="Next step"
          >
            Forward →
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
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
  );
}
