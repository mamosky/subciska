# Subciska

A Quran memorization web app: play ayah audio, pause so you recite the next ayah from memory, then continue.

**Live:** https://subciska.gat234.workers.dev

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind 4
- OpenNext for Cloudflare Workers (`@opennextjs/cloudflare`)
- Cloudflare D1 (user state) + R2 (page cache + audio)

## Quick start

```bash
npm install
npm run dev        # local dev server
npm run lint
npm run build
npm run deploy     # only working deploy path — see HANDOFF.md
```

## Documentation

| Doc | Purpose |
|-----|---------|
| [HANDOFF.md](./HANDOFF.md) | **Start here** — Cloudflare resource IDs, deploy constraints, architecture, migrations, status |
| [AGENTS.md](./AGENTS.md) | Agent instructions (points at HANDOFF.md) |
| [subciska spec doc.rtf](./subciska%20spec%20doc.rtf) | Original product spec |

## Features

- Surah + ayah range (`Ayat from` / `Ayat to` dropdowns)
- **Test me** (play → recite next) and **Repeat** (play → say it) modes
- **Mute first (ayat)** — recite the first N ayat cold (no audio)
- Adjustable pause length; prev/next transport; progress bar
- Arabic + English verse text; quran.com link
- App Settings: themes (30), Arabic/English fonts, text sizes
- State persists (localStorage + D1)

## Audio

Upload MP3s to R2 bucket `subciska-audio` as `{surah}_{ayah}.mp3` (e.g. `1_1.mp3`). Route: `/api/audio/[surah]/[ayah]`. Bucket is empty until files are supplied.

## Deploy

Use **`npm run deploy`** only. Do not upgrade wrangler or workerd. Full constraints and procedure: [HANDOFF.md](./HANDOFF.md).
