# Pocket Coach (U-Hackathon 2026 event build)

Written from scratch at the event, 15-16 Oct 2026. Solo, Track 1 AI.

## Files
- index.html: the whole app (HTML + CSS + JS). Data in localStorage (keys start with pc_).
- functions/api/ai.js: Cloudflare Pages Function at /api/ai. Modes: receipt, quick, wish, weekly, regret.
- functions/api/rates.js: GET /api/rates, units per 1 THB from open.er-api.com (free, no key).
- qrcode.js: third-party MIT library (Kazuhiko Arase) for the QR code.
- sw.js: service worker, network first. Bump CACHE name every deploy.
- manifest.json, icon-192.png, icon-512.png, apple-touch-icon.png.

## Cloudflare settings
- Pages project connected to GitHub. Build command and output: empty.
- Secrets: GEMINI_API_KEY, ANTHROPIC_API_KEY. Optional: GEMINI_MODEL, GEMINI_FALLBACK_MODEL, CLAUDE_MODEL.
- After changing variables: Deployments > Retry deployment.

## AI order
gemini-3.5-flash-lite (25s) -> gemini-3.8-flash (10s) -> claude-haiku-5-5 (last, paid). Response includes "by".

## Every deploy
1. VERSION in index.html +1. 2. CACHE in sw.js +1. 3. Upload unzipped files to GitHub.

## Layers
1. Done (v1): quick text/voice entry, receipt and slip scan with payment method, wallet balance, day list, edit/delete, 3 languages, theme.
2. Done (v2): want list, cool-off, saved total, hours of work, tabs, 8 themes (default Flow night).
3. Done (v3): multi-currency wallets + live rates (/api/rates), regret check, savings goal, insights tab, weekly coach, buying pattern, demo mode, QR, pull down to update.
4. Login + sync, friend challenge, share card.
5. QR, brake guide, polish, demo, deck.
