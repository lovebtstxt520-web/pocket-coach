// Cloudflare Pages Function: POST /api/ai
// Variables and secrets (Cloudflare): GEMINI_API_KEY (secret), ANTHROPIC_API_KEY (secret, optional backup),
// optional GEMINI_MODEL, GEMINI_FALLBACK_MODEL, CLAUDE_MODEL
//
// Request: { mode, lang: "en"|"zh"|"th", image?: base64 jpeg (no data: prefix), text?: string }
// modes and replies (every reply also has `by` = model that answered):
//   receipt -> { readable, amount, currency, merchant, category, method, items:[{name,price}], note }
//   quick   -> { entries:[{ item, amount, category, method }] }            (text note, may be voice-typed)
//   wish    -> { item, price, currency, store, category, questions[3], tip }
//   weekly  -> { headline, tips[] }                                        (text summary)
//   regret  -> { headline, tips[] }                                        (text summary of past purchases)
// Error: HTTP 502 { error: "model: reason | model: reason" }

const LANG = { en: 'English', zh: 'Traditional Chinese', th: 'Thai' };
const CATS = ['food', 'drink', 'groceries', 'transport', 'shopping', 'bills', 'health', 'fun', 'other'];
const METHODS = ['cash', 'transfer', 'card'];

const SYSTEM = {
  receipt: [
    'You read photos of receipts, bills, price tags, menus with prices, bus tickets, handwritten notes, or Thai bank transfer slips (PromptPay / mobile banking e-slips), mostly from Bangkok. Text may be Thai, English or Chinese.',
    'Answer ONLY with a JSON object with keys:',
    'readable (boolean: false if no price can be read), amount (number: the TOTAL actually paid; if several items and no total, add them up),',
    'currency (3-letter code, default THB), merchant (shop name, or for a transfer slip the receiver name; empty if unknown),',
    'category (one of: ' + CATS.join(', ') + '), method (one of: cash, transfer, card. A bank transfer or PromptPay slip is transfer; a card slip is card; otherwise cash),',
    'items (up to 6 objects {name, price} for the main lines, empty if unclear), note (one short sentence about anything you were unsure of, or empty).',
    'Never invent numbers you cannot see. Never output account numbers or reference numbers.'
  ].join(' '),
  quick: [
    'You turn a short note of spending into separate entries. The note may be typed or voice-transcribed, in Thai, English or Chinese, and may contain several items, for example "chicken rice 50, taxi 80, thai tea 25" or "ข้าวมันไก่ 50 แท็กซี่ 80".',
    'Answer ONLY with a JSON object: { "entries": [ { "item": short name, "amount": number, "category": one of ' + CATS.join(', ') + ', "method": one of cash, transfer, card (default cash; use transfer if the note says scan, QR, PromptPay or transfer; card if it says card) } ] }.',
    'Skip anything without an amount. Do not invent amounts. Keep the order of the note.'
  ].join(' '),
  wish: [
    'You read a screenshot of an online shop product page or cart (Shopee, Lazada, TikTok Shop and similar) or a photo of an item in a store. The user wants to pause before buying.',
    'Answer ONLY with a JSON object with keys: item (short product name), price (number, the price the user would actually pay after vouchers; 0 if not visible), currency (default THB), store (shop or platform, or empty),',
    'category (one of: ' + CATS.join(', ') + '), questions (exactly 3 short, kind, specific questions about THIS item that help decide if it is really needed, such as owning something similar or how often it would be used),',
    'tip (one practical money tip for this kind of purchase). Never shame the user.'
  ].join(' '),
  weekly: [
    'You are a friendly, practical money coach for someone tracking their everyday spending in Bangkok.',
    'You get a short text summary of their numbers. Answer ONLY with a JSON object: { "headline": one short sentence on the most important pattern, "tips": 2 or 3 short, concrete, kind suggestions based ONLY on the numbers given }.',
    'Do not invent numbers. If there is little data, say so kindly.'
  ].join(' '),
  regret: [
    'You are a friendly money coach. You get a list of things the user bought after a cool-off period, each with its category, price and how they felt a week later (worth it, okay, regret).',
    'Answer ONLY with a JSON object: { "headline": one short sentence describing their pattern (which kinds of purchases they tend to regret or not), "tips": 2 short, kind, concrete suggestions }. Base it ONLY on the data. If there is too little data, say so kindly.'
  ].join(' ')
};

export async function onRequestPost({ request, env }) {
  const gKey = env.GEMINI_API_KEY, cKey = env.ANTHROPIC_API_KEY;
  if (!gKey && !cKey) return reply(500, { error: 'No API key is set in Cloudflare.' });
  let body;
  try { body = await request.json(); } catch (e) { return reply(400, { error: 'Bad request.' }); }
  const mode = SYSTEM[body.mode] ? body.mode : null;
  if (!mode) return reply(400, { error: 'Unknown mode.' });
  const lang = LANG[body.lang] ? body.lang : 'en';

  const parts = [];
  if (body.image) parts.push({ inline_data: { mime_type: 'image/jpeg', data: String(body.image) } });
  if (body.text) parts.push({ text: String(body.text).slice(0, 4000) });
  if (!parts.length) return reply(400, { error: 'Nothing to read.' });
  parts.push({ text: 'IMPORTANT: write every sentence, question, tip and item name in ' + LANG[lang] + ', even if the input is in another language. Keep shop and brand names as printed.' });

  // Order: two free Gemini models first, Claude (paid, separate servers) last.
  const queue = [];
  if (gKey) {
    queue.push({ p: 'gemini', m: env.GEMINI_MODEL || 'gemini-3.5-flash-lite', t: 25000 });
    queue.push({ p: 'gemini', m: env.GEMINI_FALLBACK_MODEL || 'gemini-3.8-flash', t: 10000 });
  }
  if (cKey) queue.push({ p: 'claude', m: env.CLAUDE_MODEL || 'claude-haiku-5-5', t: 0 });
  if (!cKey && gKey) queue.push({ p: 'gemini', m: env.GEMINI_MODEL || 'gemini-3.5-flash-lite', t: 0 });

  const started = Date.now(), deadline = started + 50000, notes = [];
  let lowThink = true;
  for (let i = 0; i < queue.length; i++) {
    const q = queue[i], left = deadline - Date.now();
    if (left < 3000) break;
    const limit = q.t && i < queue.length - 1 ? Math.min(left, q.t) : left;
    try {
      let text = '';
      if (q.p === 'claude') {
        const content = parts.map((pt) => pt.inline_data
          ? { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: pt.inline_data.data } }
          : { type: 'text', text: pt.text });
        content.push({ type: 'text', text: 'Reply with the JSON object only.' });
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST', signal: AbortSignal.timeout(limit),
          headers: { 'Content-Type': 'application/json', 'x-api-key': cKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: q.m, max_tokens: 1200, system: SYSTEM[mode], messages: [{ role: 'user', content }] })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { notes.push(q.m + ' (' + res.status + '): ' + msgOf(data)); continue; }
        text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
      } else {
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + q.m + ':generateContent', {
          method: 'POST', signal: AbortSignal.timeout(limit),
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': gKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM[mode] }] },
            contents: [{ parts }],
            generationConfig: Object.assign({ responseMimeType: 'application/json', temperature: 0.2 }, lowThink ? { thinkingConfig: { thinkingLevel: 'low' } } : {})
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const m = msgOf(data);
          if (res.status === 400 && lowThink && /think/i.test(m)) { lowThink = false; i--; continue; }
          notes.push(q.m + ' (' + res.status + '): ' + m);
          if ([429, 500, 503].includes(res.status)) await sleep(300);
          continue;
        }
        const cand = data.candidates && data.candidates[0];
        text = cand && cand.content && cand.content.parts ? cand.content.parts.filter((p) => p.text && !p.thought).map((p) => p.text).join('') : '';
      }
      if (!text) { notes.push(q.m + ': empty answer'); continue; }
      let o;
      try { o = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); } catch (e) { notes.push(q.m + ': unreadable answer'); continue; }
      const out = clean(mode, o);
      out.by = q.m;
      return reply(200, out);
    } catch (e) {
      notes.push(q.m + ': ' + (e && e.name === 'TimeoutError' ? 'no answer in ' + Math.round((Date.now() - started) / 1000) + 's' : String((e && e.message) || e).slice(0, 90)));
    }
  }
  return reply(502, { error: notes.join(' | ') || 'AI is busy.' });
}
export async function onRequest() { return reply(405, { error: 'Use POST.' }); }

const msgOf = (d) => String((d && d.error && d.error.message) || 'request failed').slice(0, 100);
const num = (v) => { const n = Number(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0; };
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
const cat = (v) => CATS.includes(v) ? v : 'other';
const meth = (v) => METHODS.includes(v) ? v : 'cash';
const cur = (v) => { const c = String(v || '').toUpperCase(); return /^[A-Z]{3}$/.test(c) ? c : 'THB'; };
const list = (a, n, len) => (Array.isArray(a) ? a : []).map((x) => str(x, len)).filter(Boolean).slice(0, n);
function clean(mode, o) {
  if (mode === 'receipt') return {
    readable: o.readable !== false && num(o.amount) > 0, amount: num(o.amount), currency: cur(o.currency),
    merchant: str(o.merchant, 60), category: cat(o.category), method: meth(o.method), note: str(o.note, 200),
    items: (Array.isArray(o.items) ? o.items : []).slice(0, 6).map((x) => ({ name: str(x && x.name, 60), price: num(x && x.price) })).filter((x) => x.name)
  };
  if (mode === 'quick') return {
    entries: (Array.isArray(o.entries) ? o.entries : []).slice(0, 20).map((x) => ({ item: str(x && x.item, 60), amount: num(x && x.amount), category: cat(x && x.category), method: meth(x && x.method) })).filter((x) => x.amount > 0)
  };
  if (mode === 'wish') return {
    item: str(o.item, 80), price: num(o.price), currency: cur(o.currency), store: str(o.store, 40), category: cat(o.category),
    questions: list(o.questions, 3, 160), tip: str(o.tip, 200)
  };
  return { headline: str(o.headline, 220), tips: list(o.tips, 3, 220) };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function reply(status, obj) { return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } }); }
