// Cloudflare Pages Function: GET /api/rates
// Returns how many units of each currency equal 1 THB, e.g. { base:"THB", rates:{ THB:1, TWD:0.97, ... }, ts, source }
// Uses the free open.er-api.com feed (no key). The app keeps the last good rates if this fails.
const WANT = ['THB', 'TWD', 'USD', 'JPY', 'KRW', 'CNY', 'HKD', 'SGD', 'MYR', 'VND', 'EUR', 'GBP', 'AUD'];
export async function onRequestGet() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/THB', { signal: AbortSignal.timeout(8000), cf: { cacheTtl: 21600 } });
    const j = await res.json();
    if (!res.ok || !j.rates) throw new Error('rates ' + res.status);
    const rates = {};
    WANT.forEach((c) => { if (typeof j.rates[c] === 'number') rates[c] = j.rates[c]; });
    rates.THB = 1;
    return new Response(JSON.stringify({ base: 'THB', rates, ts: Date.now(), source: 'open.er-api.com' }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=21600' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e && e.message) || e).slice(0, 100) }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
}
