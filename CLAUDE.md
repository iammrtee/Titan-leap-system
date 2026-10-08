# TitanLeap Monolith — handoff for Claude Code

Put this file in the repo root as `CLAUDE.md`. It is the context from a long Cowork
session (Sep–Oct 2026) so you don't have to rediscover it.

## What this is

TitanLeap is a growth agency. This repo (`github.com/iammrtee/Titan-leap-system`) is the
internal "Monolith" app at **monolith.titanleap.co**: an audit tool the team runs on
prospects (Business Assessment → Audit Result → Growth Blueprint, plus a $297 Customer
Leak Report), and a content/scheduling system.

- Stack: React + Vite + Tailwind (client), Express in `server.ts` run with `tsx` (server),
  Supabase (auth + Postgres), Claude via `@anthropic-ai/sdk`, Apify for social scraping.
- Hosting: Render, service `titanleap-monolith` (srv-d8786399rddc73875tjg), **free tier,
  512MB RAM** — keep server memory low. Build: `npm install && npm run build`.
  Start: `tsx server.ts`. Every push to `main` auto-deploys (~1 min).
- Supabase project: `lsbmalwgylrhbzjqudbt` (the old `vchdaboijdpvbmwgmfxo` is dead).

## Ground rules from the owner

- **Money is tight.** Prefer free or per-call-cents options; cap scrape sizes; cache.
- **Don't run Chrome/Puppeteer on the server** (memory). Screenshots are uploaded by the user.
- Never handle secrets: the owner sets API keys in Render himself. Refer to env vars by name.
- Check builds before pushing: `npx tsc --noEmit` (one known pre-existing error at
  `src/components/ContentManager.tsx(620,11)` — ignore it), `npx vite build`,
  and `npx esbuild server.ts --platform=node --format=esm --outfile=/tmp/s.mjs`.
- Verify on the live site after deploy when possible.

## Env vars (names only, set in Render)

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `ALLOWED_EMAILS` (login allowlist),
`CLAUDE_API_KEY`, `GEMINI_API_KEY`, `APIFY_API_TOKEN`, `APP_URL`, Meta/LinkedIn/TikTok
tokens. Planned: `TREG_TOKEN` (see Next work). Optional: `CLAUDE_VISION_MODEL`.

Connected Accounts (Auto Post → Connected Accounts) use OAuth and store tokens encrypted in
`user_settings` (`src/services/tokenVault.ts`; key from `TOKEN_VAULT_KEY`, else the first of
the TikTok/LinkedIn/Meta secrets or `CLAUDE_API_KEY`). Connect buttons need: Meta
`META_APP_ID` + `META_APP_SECRET` (redirect `<APP_URL>/api/auth/meta/callback`), LinkedIn
`LINKEDIN_CLIENT_ID` + `LINKEDIN_CLIENT_SECRET` (+ `LINKEDIN_COMPANY_POSTING=true` once the
Community Management API is approved), TikTok `TIKTOK_CLIENT_KEY` + `TIKTOK_CLIENT_SECRET`.
Env-var tokens (`META_ACCESS_TOKEN`, `LINKEDIN_ACCESS_TOKEN`, …) still work as a fallback.

## Auth

Per-user Supabase Auth. `src/components/Login.tsx`; `App.tsx` gates the app. Server
middleware `requireUser` verifies `Authorization: Bearer <supabase token>` and checks the
email against `ALLOWED_EMAILS`. Client gets the header from `getAuthHeader()` in
`src/lib/supabase.ts`.

Gotcha: `src/services/claude.ts` is imported by the browser AND dynamically by the server.
Anything it imports at top level must work in Node — `src/lib/supabase.ts` uses
`import.meta.env` and crashes in Node, so claude.ts imports it lazily inside the browser
branch. Keep it that way.

## What was built this session (all live)

**Content audit, folded into the main audit** (`src/components/ContentAuditPanel.tsx`,
`AuditView.tsx`, `/api/ai/content-audit` in server.ts)
- `useContentAudit` hook: per-profile cache (12h), dedupes concurrent requests, combines
  per-platform results; persisted in localStorage `titanleap_content_audit`.
- Prefetches 2.5s after profile links are edited; "Run Audit" reuses results; the old
  "Research this profile" button was removed (content audit fills reach/consistency).
- Instagram + TikTok = real data via Apify (IG: profile scraper + post scraper up to 60
  posts / 6 months; TikTok: clockworks~tiktok-scraper 60 videos). Others = Claude web
  search (max 3 searches). Fixed-rule scores, A–F grade, engagement benchmarks.
- 6-month history: posts/month, active weeks, posting/engagement/views trend, longest gap.
- Follower growth from our own snapshots table `social_snapshots` (SQL in
  `supabase-schema.sql` section 11 — confirm the owner ran it).
- Shown in the Audit Result as a "Content & Social" section (`ContentReportSection`).
- **Unverified live:** the 60-post IG scrape and the TikTok actor input. If IG history
  shows ~12 posts, the post-scraper input needs fixing.

**Social discovery** (`/api/discover-socials`, `extractSocialLinks` in server.ts)
- Reads social links from the website source (hrefs, JSON-LD sameAs), no AI, cached 12h.
  Runs on website-field blur, inside Smart Fill, and in Run Audit if no handles.
  Tested: gymshark/allbirds/stripe/glossier correct.

**Leak Report screenshots** (`LeakReportPanel.tsx`, `src/lib/markShot.ts`,
`/api/ai/annotate-shot`, `src/lib/leakReportTemplate.ts`)
- After the report is built, the user uploads/drops/pastes one screenshot per leak as
  proof. Claude vision returns a box; the browser draws a purple circle (no note text).
  "Draw mark" editor to fix it. The report's "What we saw" shows the screenshot only.

## Next work (agreed with the owner, not started)

Rebuild the main audit around the **money path** so it matters to prospects:
1. Demand — monthly searches for what they sell, in their area.
2. Visibility — do they rank on Google for it; who beats them.
3. Trust — Google rating/review count vs top competitor.
4. The page — read with Jina Reader (`https://r.jina.ai/<url>`, free, handles JS sites)
   as a fallback when plain fetch returns little; screenshots as proof.
5. Speed to lead + follow-up — a "mystery shop" log in the form (when we enquired, when
   they replied, follow-ups received in 7 days). Free and the most persuasive finding.
6. Content → customers (existing content audit).
7. Money maths from THEIR numbers (replace the fixed 15–25%/8–13%/4–8% leak values in
   `RevenueLeakBlueprint` — those are made up), top 3 fixes, 30-day re-audit baseline.

Data for 1–3 via **treg.to** (one token, pay per call, $1 free credit). Call shape:
`https://treg.to/call/<tool-id>` with header `X-Treg-Token: $TREG_TOKEN`. Useful tools
(prices from their catalog, Oct 2026): `dataforseo.google.keywords.ideas` (~$0.012),
`dataforseo.google.serp.organic` (~$0.002), `dataforseo.x.business-data-google-my-business-info-live`
(~$0.0054), `serpapi.google.ads.transparency` (~$0.015). Read `https://treg.to/llms.txt`
for exact request formats before coding. Whole market check ≈ $0.10–0.15 per audit.
Make every Treg step optional (skip cleanly if `TREG_TOKEN` is unset).

Open question for the owner: are buyers mostly local/service businesses or online/SaaS?
Default: adapt by the industry field in the form.

## Other loose ends

- Gumroad product rename to "The 5-Hour Customer Leak Audit" (owner's manual task).
- titanleap.co links no socials in its footer (found while testing discovery).
