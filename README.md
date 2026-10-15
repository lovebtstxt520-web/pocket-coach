# Pocket Coach

**Track your cash. Pause before you buy.**

Pocket Coach is an AI money coach for young people in Thailand. It logs the spending that banking apps miss (cash at markets, street food, buses), and it puts a brake on impulse online shopping before you tap Buy.

- **Live demo:** https://pocket-coach-bnl.pages.dev (tap "See how it works" on the first screen for a guided tour with sample data)
- **Track:** U-Hackathon 2026, Track 1 (AI)
- **Builder:** Rita, solo. Written from scratch during the event, 15 to 16 October 2026.

## The problem

1. **Cash is invisible.** A lot of everyday spending in Bangkok is still cash. Banking apps record transfers, but nobody records the cash in your wallet, so it is easy to lose track of where it goes.
2. **Shopping apps are built for impulse.** One-tap buying, flash sales and big sale days like 11.11 make it easy to buy things you regret a week later.

## Who it is for

- **Students and young workers in Bangkok (18 to 30):** pocket money or a first salary, street food, Shopee and TikTok Shop.
- **Foreigners living in Thailand:** two currencies, a lot of cash, apps in a language that is not their own.

The first screen asks which one you are and sets the app up for you: students see prices as days of pocket money, workers as hours of work, and foreigners get a second wallet in their home currency.

## What it does

**Spending**
- Type or say one sentence ("chicken rice 50, taxi 80") and the AI splits it into separate entries.
- Snap a receipt, price tag or Thai bank transfer slip (PromptPay) and the AI reads the total, shop, category and payment method.
- Cash wallet per currency: it subtracts every cash expense automatically and shows what is left.
- Multi-currency with live exchange rates; totals are converted to your main currency.

**Want list (the brake)**
- Screenshot a product page or cart. The AI reads the item and the price you would actually pay, and asks three questions about that item.
- Choose a cool-off of 1, 2 or 3 days. When it ends, decide: still want it, or skip it.
- Skipped items add up in "Saved by pausing" and count toward your savings goal.
- One week after buying something, the app asks: was it worth it?
- Optional stronger brake: a pop-up when you open a shopping app (step-by-step guide for MacroDroid on Android and Shortcuts on iPhone).

**Insights and coaching**
- Monthly breakdown by category and payment method, compared with last month.
- **Ask your coach:** ask anything about your own money, in any language ("Can I afford a 3,000 baht concert this month?"). The answer uses your real wallet, spending and goal.
- Weekly coach and "find my buying pattern" (which kinds of purchases you tend to regret).

**Together**
- Saving challenges with friends: create a challenge, share a 6-letter code, and see a leaderboard. Friends only see how much each person saved, never what anyone bought.
- Share card: an image of what you saved, with a 3D preview, ready for Instagram or LINE.

**Everywhere**
- 9 languages: Traditional Chinese, Simplified Chinese, English, Thai, Japanese, Korean, Spanish, French and Arabic (right-to-left).
- Your records follow the language: type "雞飯" and switch to English to see "Chicken rice". The original text is always kept.
- 8 themes, installable on the home screen, pull down to update, QR code to open on a phone.
- Optional account to back up and sync between devices, with change password, reset password by email and delete account.
- A guided tour of every tab (Settings > How to use Pocket Coach), with sample data you can keep or remove.

## How AI is used

| Feature | What the AI does |
|---|---|
| Receipt and slip scan | Reads amount, shop, category, payment method and line items from a photo |
| One-sentence entry | Splits a typed or spoken note into separate entries, detects currency |
| Want list | Reads a shop screenshot and writes three questions about that specific item |
| Ask your coach | Answers a question using a summary of the user's own data |
| Weekly coach and buying pattern | Finds patterns in spending and regret ratings |
| Translation | Translates record names into the app language, keeping brand names |

Design rules:
- The AI never saves anything by itself. The user always reviews the result and can edit every field.
- Answers always come back in the app's language, even when the receipt is in Thai.
- The AI is told to use only the numbers it is given, never to shame the user, and not to give investment, legal or tax advice.

**Reliability.** Three models are tried in order, each with its own time limit: Gemini 3.5 Flash Lite, then Gemini 3.8 Flash, then Claude Haiku as the last backup. The app shows which model answered (optional) and always lets the user type values by hand if the AI is busy.

## How it is built

```
Phone browser (PWA, one HTML file, plain JavaScript)
   |-- localStorage: records, wallets, settings (works offline)
   |-- /api/ai      Cloudflare Pages Function -> Gemini / Claude
   |-- /api/rates   Cloudflare Pages Function -> exchange rates
   |-- /api/config  Cloudflare Pages Function -> public Supabase URL and key
   `-- Supabase (optional): login, sync, saving challenges, feature ideas
```

- **Front end:** `index.html` (HTML, CSS and JavaScript in one file), `sw.js` (service worker, network first), `manifest.json`.
- **Back end:** Cloudflare Pages Functions in `functions/api/`. API keys live in Cloudflare secrets and never reach the browser.
- **Database:** Supabase with Row Level Security on every table (`supabase_setup.sql`). Friends join a challenge only through a code checked on the server.
- **Hosting:** GitHub and Cloudflare Pages.

## Privacy

- Records are stored on the phone. Sync is optional and only after you sign in.
- Photos are sent to the AI to be read and are not stored by Pocket Coach on any server. Only a small thumbnail stays on the phone.
- The AI is told never to output bank account or reference numbers from transfer slips.
- In a saving challenge, friends see only the amount saved and the number of skipped items.

## Business model

- **Free:** cash wallets, spending log, want list and cool-off, weekly coach, sync, saving challenges and all 9 languages. 30 AI reads and 5 "Ask your coach" questions a month.
- **Plus (59 THB a month or 490 THB a year):** unlimited AI reads, unlimited "Ask your coach", the buying pattern found from your regrets, and more accounts (bank, e-wallet, card, envelopes; coming soon).
- The Plus page shows each user how many months of Plus their own savings have already paid for.

The Plus page in the demo shows pricing only. Nothing is charged and nothing is locked during the hackathon.

## How it compares

| | MeowJot | Money Lover | Cleo | Buy or Bye | **Pocket Coach** |
|---|---|---|---|---|---|
| Log cash spending | Manual | Manual | No | No | **AI photo or one sentence** |
| Read Thai transfer slips | Yes | No | No | No | **Yes** |
| Brake before buying | No | No | No | Yes | **Yes, with AI questions per item** |
| Learn from regret | No | No | Partly | No | **Yes** |
| Saving challenges with friends | No | No | No | No | **Yes** |
| Multi-currency, 9 languages | Thai | Yes | English | English | **Yes** |
| Works in Thailand | Yes | Yes | No | Yes | **Yes** |

## Run it yourself

1. Fork this repository and connect it to Cloudflare Pages (no build command, output folder empty).
2. In Cloudflare, Settings > Variables and Secrets, add:
   - `GEMINI_API_KEY` (secret) and optionally `ANTHROPIC_API_KEY` (secret) for the backup model
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` (public values) if you want login, sync and challenges
3. In Supabase, run `supabase_setup.sql` once in the SQL Editor.
4. Redeploy. Optional model overrides: `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `CLAUDE_MODEL`.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app |
| `sw.js` | Service worker (offline and updates) |
| `functions/api/ai.js` | AI modes: receipt, quick, wish, ask, weekly, regret, translate |
| `functions/api/rates.js` | Exchange rates |
| `functions/api/config.js` | Public Supabase settings |
| `supabase_setup.sql` | Tables and security rules |
| `qrcode.js` | QR code library by Kazuhiko Arase (MIT) |
| `PROJECT_NOTES.md` | Build log |

Third-party code: qrcode-generator (MIT) and supabase-js (MIT, loaded from jsDelivr). Everything else was written during the hackathon.
