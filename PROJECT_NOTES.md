# Pocket Coach (U-Hackathon 2026 event build)

Written from scratch at the event, 15-16 Oct 2026. Solo, Track 1 AI.

## Files
- index.html: the whole app (HTML + CSS + JS). Data in localStorage (keys start with pc_).
- functions/api/ai.js: Cloudflare Pages Function at /api/ai. Modes: receipt, quick, wish, weekly, regret.
- functions/api/rates.js: GET /api/rates, units per 1 THB from open.er-api.com (free, no key).
- functions/api/config.js: GET /api/config, gives SUPABASE_URL and SUPABASE_ANON_KEY (public values, data protected by RLS).
- supabase_setup.sql: run once in Supabase SQL Editor (tables user_data, challenges, challenge_members, RLS, join_challenge).
- qrcode.js: third-party MIT library (Kazuhiko Arase) for the QR code.
- sw.js: service worker, network first. Bump CACHE name every deploy.
- manifest.json, icon-192.png, icon-512.png, apple-touch-icon.png.

## Cloudflare settings
- Pages project connected to GitHub. Build command and output: empty.
- Secrets: GEMINI_API_KEY, ANTHROPIC_API_KEY. Variables: SUPABASE_URL, SUPABASE_ANON_KEY (never the service_role key). Optional: GEMINI_MODEL, GEMINI_FALLBACK_MODEL, CLAUDE_MODEL.
- After changing variables: Deployments > Retry deployment.

## AI order
gemini-3.5-flash-lite (25s) -> gemini-3.8-flash (10s) -> claude-haiku-5-5 (last, paid). Response includes "by".

## Every deploy
1. VERSION in index.html +1. 2. CACHE in sw.js +1. 3. Upload unzipped files to GitHub.

## Layers
1. Done (v1): quick text/voice entry, receipt and slip scan with payment method, wallet balance, day list, edit/delete, 3 languages, theme.
2. Done (v2): want list, cool-off, saved total, hours of work, tabs, 8 themes (default Flow night).
3. Done (v3): multi-currency wallets + live rates (/api/rates), regret check, savings goal, insights tab, weekly coach, buying pattern, demo mode, QR, pull down to update.
4. Done (v4): email login + sync (Supabase, merge by id with tombstones, photos stay local), saving challenge with friends (code join via RPC, leaderboard shows only saved amount), share card image, black-purple icon.
5. v5: 9 languages (zh, zhs, en, th, ja, ko, es, fr, ar with RTL), record names translated by AI (mode translate, cached in rec.tr), brake guide, demo mode removed. Left: final testing, demo video, deck, write-up.

## v6 (target users and business model)
- First-time setup asks who you are: student (prices as days of pocket money), young worker (hours of work), foreigner in Thailand (second wallet in home currency). Stored in pc_profile, pc_allow. Coach prompt includes the profile.
- Plus page (demo only, nothing charged or locked): free vs Plus table, 59 THB/month or 490 THB/year, ROI line from the user's own saved amount, AI use counter (pc_aiuse, 30 free per month shown).
- "Move to savings" sheet: planned partner bank savings account (referral fee model).
- Target users: A) Bangkok students and young workers 18-30, B) foreigners living in Thailand.
- v7: Ask your coach (mode ask) on Insights: user asks about their own money; context = weekText + month totals + wallets + cool-off items + last 25 records.
- v7.1: sample data (demo: true on every record; load from first screen or Settings, remove in Settings). README.md for judges.
- Competitors: MeowJot (KBTG, slip reading, 79/149 THB), Money Lover / Spendee / Wallet, Cleo (US AI coach), Buy or Bye / CutCut (cool-off only).

## v8 (21:30 to midnight, Thursday)
- Wallets: card shows one equal-size row per currency; sheet has Add / Take out / Set balance / Remove. Removing keeps { removed: true, ts } so sync cannot bring it back.
- Guided tour of every tab and Settings (9 steps), replay from Settings > How to use. Sample data is loaded if the app is empty; at the end the user keeps or removes it.
- Account: change password (checks the current one), forgot password by email (resetPasswordForEmail, PASSWORD_RECOVERY event), delete account (RPC delete_my_account in supabase_setup.sql section 4). Not signed in: "Delete all my data" wipes this phone.
- Ask your coach: newest answer only, older ones behind a History button (keeps 20).
- Plus table lists only what Plus adds: AI reads, coach questions (free 5/month), buying pattern, more accounts. Partner bank savings removed.
- Price comparison: hours, days of pocket money, custom item ("bubble tea 60 -> ≈ bubble tea × 22"), or off.
- Voice: language picker next to the mic (9 languages), hint under the input.
- Removed "Change my profile" (profile only sets defaults; everything is changeable in Settings).
