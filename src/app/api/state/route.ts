import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  DEFAULT_STATE,
  clampLeadMutes,
  type SavedState,
} from "@/lib/player";
import {
  coerceArabicFont,
  coerceArabicTextSize,
  coerceEnglishFont,
  coerceEnglishTextSize,
} from "@/lib/fonts";
import { coerceTheme } from "@/lib/themes";

const ROW_ID = "default";

type Row = {
  surah: number;
  start_ayah: number;
  end_ayah: number;
  mode: string;
  pause_seconds: number;
  lead_mutes: number;
  arabic_font: string | null;
  english_font: string | null;
  arabic_text_size: string | null;
  english_text_size: string | null;
  theme: string | null;
  step: number;
};

function rowToState(row: Row): SavedState {
  const startAyah = row.start_ayah;
  const endAyah = row.end_ayah;
  return {
    surah: row.surah,
    startAyah,
    endAyah,
    mode: row.mode === "repeat" ? "repeat" : "test",
    pauseSeconds: row.pause_seconds,
    leadMutes: clampLeadMutes(row.lead_mutes ?? 0, startAyah, endAyah),
    arabicFont: coerceArabicFont(row.arabic_font),
    englishFont: coerceEnglishFont(row.english_font),
    arabicTextSize: coerceArabicTextSize(row.arabic_text_size),
    englishTextSize: coerceEnglishTextSize(row.english_text_size),
    theme: coerceTheme(row.theme),
    step: row.step,
  };
}

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const row = await env.DB.prepare(
      `SELECT surah, start_ayah, end_ayah, mode, pause_seconds, lead_mutes,
              arabic_font, english_font, arabic_text_size, english_text_size, theme, step
       FROM user_state WHERE id = ?`
    )
      .bind(ROW_ID)
      .first<Row>();
    if (!row) return Response.json(DEFAULT_STATE);
    return Response.json(rowToState(row));
  } catch (err) {
    console.error("GET /api/state failed:", err);
    return Response.json(DEFAULT_STATE);
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<SavedState>;
    const startAyah = Number(body.startAyah) || DEFAULT_STATE.startAyah;
    const endAyah = Number(body.endAyah) || DEFAULT_STATE.endAyah;
    const state: SavedState = {
      surah: Number(body.surah) || DEFAULT_STATE.surah,
      startAyah,
      endAyah,
      mode: body.mode === "repeat" ? "repeat" : "test",
      pauseSeconds: Number(body.pauseSeconds) || DEFAULT_STATE.pauseSeconds,
      leadMutes: clampLeadMutes(
        Number(body.leadMutes) || 0,
        startAyah,
        endAyah
      ),
      arabicFont: coerceArabicFont(body.arabicFont),
      englishFont: coerceEnglishFont(body.englishFont),
      arabicTextSize: coerceArabicTextSize(body.arabicTextSize),
      englishTextSize: coerceEnglishTextSize(body.englishTextSize),
      theme: coerceTheme(body.theme),
      step: Number.isFinite(Number(body.step)) ? Number(body.step) : 0,
    };

    const { env } = getCloudflareContext();
    await env.DB.prepare(
      `INSERT INTO user_state (
         id, surah, start_ayah, end_ayah, mode, pause_seconds, lead_mutes,
         arabic_font, english_font, arabic_text_size, english_text_size, theme, step, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         surah = excluded.surah,
         start_ayah = excluded.start_ayah,
         end_ayah = excluded.end_ayah,
         mode = excluded.mode,
         pause_seconds = excluded.pause_seconds,
         lead_mutes = excluded.lead_mutes,
         arabic_font = excluded.arabic_font,
         english_font = excluded.english_font,
         arabic_text_size = excluded.arabic_text_size,
         english_text_size = excluded.english_text_size,
         theme = excluded.theme,
         step = excluded.step,
         updated_at = datetime('now')`
    )
      .bind(
        ROW_ID,
        state.surah,
        state.startAyah,
        state.endAyah,
        state.mode,
        state.pauseSeconds,
        state.leadMutes,
        state.arabicFont,
        state.englishFont,
        state.arabicTextSize,
        state.englishTextSize,
        state.theme,
        state.step
      )
      .run();

    return Response.json(state);
  } catch (err) {
    console.error("PUT /api/state failed:", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
