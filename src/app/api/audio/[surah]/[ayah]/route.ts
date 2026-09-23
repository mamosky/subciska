import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/audio/[surah]/[ayah]">
) {
  const { surah, ayah } = await ctx.params;
  const s = Number(surah);
  const a = Number(ayah);

  if (!Number.isInteger(s) || !Number.isInteger(a) || s < 1 || s > 114 || a < 1) {
    return new Response("Invalid verse", { status: 400 });
  }

  try {
    const { env } = getCloudflareContext();
    const key = `${s}_${a}.mp3`;
    const object = await env.AUDIO_BUCKET.get(key);
    if (!object) {
      return new Response(`Audio not found for ${s}:${a}`, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", "audio/mpeg");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    const len = object.size;
    if (typeof len === "number") headers.set("Content-Length", String(len));

    return new Response(object.body, { headers });
  } catch {
    return new Response(
      "Audio storage unavailable. Upload files to the R2 AUDIO_BUCKET as {surah}_{ayah}.mp3",
      { status: 503 }
    );
  }
}
