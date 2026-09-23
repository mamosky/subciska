import type { VerseText } from "./player";

type QuranApiResponse = {
  verse?: {
    text_uthmani?: string;
    translations?: { text?: string }[];
  };
};

export async function fetchVerseText(
  surah: number,
  ayah: number
): Promise<VerseText> {
  const url = new URL("https://api.quran.com/api/v4/verses/by_key");
  url.searchParams.set("language", "en");
  url.searchParams.set("fields", "text_uthmani");
  url.searchParams.set("translations", "131");

  const key = `${surah}:${ayah}`;
  // The API path is /verses/by_key/{key} — encode carefully
  const res = await fetch(
    `https://api.quran.com/api/v4/verses/by_key/${encodeURIComponent(key)}?${url.searchParams.toString()}`,
    { next: { revalidate: 86400 } }
  );

  if (!res.ok) {
    throw new Error(`Failed to load verse ${key}`);
  }

  const data = (await res.json()) as QuranApiResponse;
  const verse = data.verse;

  return {
    arabic: verse?.text_uthmani ?? "",
    english: verse?.translations?.[0]?.text ?? "",
  };
}
