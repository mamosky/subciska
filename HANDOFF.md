# Subciska — Agent Handoff

> Last updated: 2026-09-23. Read this before touching the project.

## What this is

"Subciska" — a Quran memorization web app per `subciska spec doc.rtf`. It plays ayah audio, then pauses so the user recites from memory. Built with Next.js 16 + OpenNext for Cloudflare Workers (D1 + R2).

- **Production URL:** https://subciska.gat234.workers.dev
- **Repo root:** `/Users/mahad/Documents/MAMCODE/subciska`
- **Stack:** Next.js 16.3.6, React 19, Tailwind 4, OpenNext `@opennextjs/cloudflare` 1.20.6, wrangler 4.60.0 (pinned), Cloudflare D1 + R2

## Cloudflare resources (account: 2mahad@gmail.com, ID `a2508a89e88edb8d7639acdaef9f5628a`)

| Resource | Name | ID / notes |
|---|---|---|
| Worker | `subciska` | deployed via `wrangler deploy` |
| D1 database | `subciska` | `871ee7d9-e37c-4d50-8d7c-639fe1dd3718` |
| R2 bucket (page cache) | `subciska-cache` | binding `NEXT_INC_CACHE_R2_BUCKET` |
| R2 bucket (audio) | `subciska-audio` | binding `AUDIO_BUCKET` — **still empty** |

Wrangler is OAuth-logged-in on this machine. Migration `migrations/0001_init.sql` was already applied remotely (table `user_state` exists).

## ⚠️ Critical environment constraints (macOS 12.6.2, x86_64)

This Mac cannot run modern workerd. **Do not upgrade wrangler/workerd/miniflare.**

- Max working **workerd: `1.20260120.0`**. Versions `1.20260124.0+` crash with `dyld: symbol not found __ZNSt3__122__libcpp_verbose_abortEPKcz`.
- **wrangler pinned to `4.60.0`** via `devDependencies` + `overrides` in `package.json`. Do not bump it.
- Wrangler 4.x hard-fails the OS check (needs macOS 13.5+) unless **`CI=true`** is set. Every script that boots workerd already sets it.
- `.npmrc` has `legacy-peer-deps=true` because OpenNext's peer wants wrangler `^4.125.0` (we pin 4.60.0).
- Wrangler 4.136.3 pulls a miniflare that wants compat date 2026-07-08 — incompatible with old workerd. Stay on 4.60.0.
- Node v22.18.0, npm 10.9.3. OS cannot be upgraded (macOS 12 end-of-life).

## Deploy procedure (the only one that works on this machine)

```bash
npm run deploy
# = CI=true opennextjs-cloudflare build
#   && node scripts/populate-cache.mjs          # manual R2 populate (built-in remote populate times out here)
#   && CI=true OPEN_NEXT_DEPLOY=true wrangler deploy
```

- `OPEN_NEXT_DEPLOY=true` prevents OpenNext from recursing back into its own deploy.
- `scripts/populate-cache.mjs` walks `.open-next/cache`, hashes each key with SHA-256, and `PUT`s to `s3://subciska-cache/incremental-cache/{buildId}/{sha256(key)}.{cache|fetch}`.
- **After deploying, if HTML still references old assets**, delete stale `incremental-cache/{oldBuildId}/*` objects in `subciska-cache` so pages re-render. Stale HTML in R2 causes old CSS links (old ones 404).

Other scripts: `npm run preview` (local), `npm run lint`, `npm run build`, `npm run cf-typegen`.

## Architecture / files

```
src/
  app/
    layout.tsx            # preloads /fonts/hafs-uthmanic-v14-full.woff2
    globals.css           # @font-face for KFGQPC Hafs Uthmanic Script; --font-arabic
    api/state/route.ts    # GET/PUT user state (D1, prepare-only — see below)
    api/audio/[surah]/[ayah]/route.ts  # streams MP3 from R2 AUDIO_BUCKET
  components/player.tsx   # main UI: Test/Repeat modes, range, pause slider, progress; renders Menubar
  components/menubar.tsx   # sticky top bar + gear icon; App Settings (theme grid, fonts, text sizes)
  lib/player.ts           # DEFAULT_STATE, SavedState type
  lib/fonts.ts            # Arabic/English font + text-size options; applyFontSettings CSS vars
  lib/themes.ts           # 30 theme defs (light/mid/dark), coerceTheme, applyTheme (data-theme on html)
public/fonts/             # hafs-uthmanic-v14-full.woff2 (.ttf), self-hosted
scripts/populate-cache.mjs
migrations/0001_init.sql  # user_state schema (already applied remotely)
migrations/0002_lead_mutes.sql  # ADD COLUMN lead_mutes INTEGER NOT NULL DEFAULT 0 (applied remotely)
migrations/0003_font_settings.sql  # ADD COLUMN arabic_font / english_font (applied remotely via --command, not --file)
migrations/0004_text_sizes.sql  # ADD COLUMN arabic_text_size / english_text_size (applied remotely)
migrations/0005_theme.sql  # ADD COLUMN theme TEXT NOT NULL DEFAULT 'auto' (applied remotely)
wrangler.jsonc            # bindings (DB, R2, ASSETS, WORKER_SELF_REFERENCE)
open-next.config.ts
subciska spec doc.rtf     # original requirements
```

### D1 route gotcha

`db.exec(CREATE_SQL)` **fails in the production worker** (returns 503). The route must use only `env.DB.prepare(...)`. The table already exists — do not re-run migrations from the route. See `src/app/api/state/route.ts`.

### Audio convention

Files go in R2 bucket **`subciska-audio`** at key `{surah}_{ayah}.mp3` (e.g. `1_1.mp3`). Route: `/api/audio/[surah]/[ayah]`. **No audio files uploaded yet** — API correctly 404s until they exist.

### Arabic font (done, live in prod)

- Family: `"KFGQPC Hafs Uthmanic Script"`, self-hosted from `public/fonts/hafs-uthmanic-v14-full.woff2` (+ `.ttf` fallback).
- Source used: `https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/fonts/hafs-uthmanic-v14-full.woff2`.
- `@font-face` + `--font-arabic` in `globals.css`; preload `<link>` in `layout.tsx`.
- Player Arabic text: `src/components/player.tsx` ~line 292, `dir="rtl" lang="ar" class="... font-arabic text-3xl leading-[2.25]"`.
- Verified live: font 200, CSS chunk contains `KFGQPC`, HTML has preload, BUILD_ID matches.

### Test-mode lead mutes (`leadMutes`)

- UI: **"Mute first (ayat)"** number input (0…range length).
- First N ayat in the range are **pause-only steps** (no audio) so the user recites cold; after that, normal play/pause alternation starts on the first unmuted ayah (test) or play+pause pairs (repeat).
- Persisted in localStorage + D1 column `user_state.lead_mutes` (migration `0002_lead_mutes.sql`, applied via `CI=true npx wrangler d1 execute subciska --remote --file=...` — not via route `db.exec`).
- Clamped with `clampLeadMutes()` whenever range/mode changes; `buildSteps(start, end, mode, leadMutes)`.

### App Settings — fonts, text sizes, themes

- **Menubar** (`src/components/menubar.tsx`): sticky top bar with app name + **gear icon**. Gear opens an **App Settings** popover (close on ✕ / outside click / Escape; scrollable, sticky header).
- **Theme picker** (`src/lib/themes.ts`): 30 options grouped Default / Light / Mid / Dark — System + 12 light + 10 mid (between light and dark: Fog, Sandstone, Dusk, Taupe, Slate, Moss, Mauve, Denim, Clay, Olive) + 7 dark. Applied via `data-theme` on `<html>`; CSS palettes live in `globals.css` as `[data-theme="…"]` blocks. `auto` removes the attribute so `prefers-color-scheme` dark still applies (`:root:not([data-theme])`). Mid themes use `color-scheme: dark` (or light for Fog/Sandstone) so form controls match.
- Font pickers + live previews live **only in that popover** (not in the player body).
- Arabic options (`src/lib/fonts.ts`): `hafs` (default, self-hosted KFGQPC), `system`, `naskh`.
- English options: `geist` (default), `mono`, `system`, `serif`, `arial`.
- Text sizes: `sm` / `md` (default) / `lg` / `xl` → CSS vars `--font-arabic-size` / `--font-english-size`.
- Applied by setting CSS vars `--font-arabic-user` / `--font-english-user` on `<html>`; Tailwind `font-arabic` / `font-english` read those vars (`globals.css` `@theme inline`).
- Player owns `SavedState` and passes props + change callbacks into `Menubar`.
- Persisted in localStorage + D1 columns `user_state.arabic_font`, `user_state.english_font`, `user_state.arabic_text_size`, `user_state.english_text_size`, `user_state.theme` (migrations `0003`–`0005`). **Apply migrations with `--command`, not `--file`** — multi-statement file import can hit OAuth `Authentication error [code: 10000]` on this machine. Transient Cloudflare API `7403` can also flake — just retry.
- Invalid values coerced with `coerceArabicFont` / `coerceEnglishFont` / `coerceArabicTextSize` / `coerceEnglishTextSize` / `coerceTheme`.

### Design system — warm modern (live)

Visual language: warm oatmeal canvas (Allbirds) + contemporary product chrome (frosted header, layered shadows, circular transport, countdown ring).

| Role | Light | Notes |
|---|---|---|
| Canvas | `#ece9e2` | page bg — never pure white |
| Surface | `#ffffff` | header, cards |
| Sand / sunken | `#e0dacf` / `#f4f2ec` | progress track, inputs, verse well |
| Ink / muted / quiet | `#212121` / `#575757` / `#767676` | text hierarchy |
| Line / line-strong | `#d6d2c8` / `#b9b4a7` | hairline borders (often at /70 opacity) |
| Action / on-action | `#212121` / `#ffffff` | primary play button |
| Forest | `#3a6b52` | progress, countdown ring, focus, pause badge |

- Tokens live as CSS vars in `globals.css` (`:root` + warm dark override) + elevation shadows (`--shadow-xs/sm/md/lg`) exposed via `@theme inline`.
- **Chrome:** sticky frosted header (`bg-surface/75 backdrop-blur-xl`); settings popover `rounded-3xl` + `shadow-lg` + `animate-pop`.
- **Cards:** `rounded-3xl border-line/70 shadow-sm/md`; verse well is gradient sunken→surface with hairline border.
- **Transport:** circular prev/next icon buttons + large center play/stop circle (`h-14 w-14`, `active:scale-95`).
- **Recite phase:** SVG circular countdown ring (forest stroke, 100ms linear updates) with seconds in the center.
- **Mode control:** sliding pill indicator (`translate-x-full`, 300ms ease) over sunken track.
- **Controls:** custom range (filled track + forest thumb), `.select-pill` chevron on selects, pause length shown as forest-tint badge.
- **Motion:** `animate-rise` (page), `animate-pop` (popover), `animate-soft-pulse` (status dot / loading); respect `prefers-reduced-motion`.
- **Typography:** Instrument Serif for wordmark + recite prompt; Geist UI; uppercase tracked eyebrows.
- Dark mode flips the same CSS vars (warm charcoal). `themeColor` lives on `viewport`.

### Lint gotcha

`eslint-config-next` rule **`react-hooks/set-state-in-effect`** forbids synchronous `setState` in effect bodies. Don't "fix" by moving setState into the effect body.

ESLint ignores: `.open-next/**`, `.wrangler/**`, `worker-configuration.d.ts` (see `eslint.config.mjs`).

## Current status (verified 2026-09-23)

Working in production:
- Home page 200, BUILD_ID matches local `.open-next/assets/BUILD_ID`
- `/api/state` GET + PUT round-trip persists to D1 (includes `leadMutes`, `arabicFont`, `englishFont`)
- Arabic font fully live (200 on woff2/ttf, preload in HTML, KFGQPC in CSS)
- Lead-mute option live ("Mute first (ayat)")
- App Settings live (menubar gear → theme grid + Arabic/English font + text size pickers)
- Warm modern redesign live (frosted header, circular transport, countdown ring, sliding mode pill)
- `lint` / `tsc --noEmit` / `next build` / `opennextjs-cloudflare build` all pass

Not done:
- **Audio files** — user still needs to supply them; upload to `subciska-audio` as `{surah}_{ayah}.mp3`
- Spec features beyond what's in `player.tsx` (check RTF for anything missing)

## Quick verification commands

```bash
# Production smoke
curl -sS -o /dev/null -w "%{http_code}\n" https://subciska.gat234.workers.dev/
curl -sS https://subciska.gat234.workers.dev/api/state
curl -sS -o /dev/null -w "%{http_code}\n" https://subciska.gat234.workers.dev/fonts/hafs-uthmanic-v14-full.woff2
curl -sS https://subciska.gat234.workers.dev/BUILD_ID   # should equal .open-next/assets/BUILD_ID

# Stale HTML? Compare CSS refs
curl -sS https://subciska.gat234.workers.dev/ | grep -oE '/_next/static/[^"]+\.css'
```

If production serves old CSS: delete `incremental-cache/{oldBuildId}/*` in `subciska-cache`, redeploy with `npm run deploy`.
