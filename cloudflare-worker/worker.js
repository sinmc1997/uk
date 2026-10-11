// 美股風控計算機 — Yahoo Finance 數據代理（Cloudflare Worker，免費額度每日 10 萬次）
//
// 用法：https://你的-worker.workers.dev/?url=<已編碼嘅 Yahoo / Stooq 網址>
// 安全：只會轉發去下面 ALLOWED_HOSTS，亦只接受 ALLOWED_ORIGINS 嘅網頁呼叫，唔會變成任何人都用得嘅通用代理。

const ALLOWED_HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com', 'stooq.com'];

// 邊啲網頁可以用呢個代理。想喺其他網址用就加落去。
const ALLOWED_ORIGINS = ['https://sinmc1997.github.io'];

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const originOk = ALLOWED_ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const cors = originOk
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' }
      : { 'Vary': 'Origin' };

    if (request.method === 'OPTIONS') return new Response(null, { status: originOk ? 204 : 403, headers: cors });
    if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405, cors);

    const target = new URL(request.url).searchParams.get('url');
    // 冇 url 參數 = 健康檢查（app 嘅「測試連線」會用）
    if (!target) return json({ ok: true, service: 'us-stock-calc-proxy' }, 200, cors);
    if (!originOk) return json({ error: 'origin not allowed: ' + origin }, 403, cors);

    let t;
    try { t = new URL(target); } catch (e) { return json({ error: 'bad url' }, 400, cors); }
    if (t.protocol !== 'https:' || !ALLOWED_HOSTS.includes(t.hostname)) return json({ error: 'host not allowed: ' + t.hostname }, 403, cors);

    // 快取：報價 60 秒、行業資料 1 日，減少 Yahoo 限流
    const ttl = t.pathname.includes('/search') ? 86400 : 60;
    const cache = caches.default;
    const cacheKey = new Request(t.toString());
    let res = await cache.match(cacheKey);
    if (!res) {
      res = await fetchUpstream(t);
      if (res.ok) {
        res = new Response(res.body, res);
        res.headers.set('Cache-Control', 'public, max-age=' + ttl);
        ctx.waitUntil(cache.put(cacheKey, res.clone()));
      }
    }
    const out = new Response(res.body, res);
    out.headers.delete('Set-Cookie');
    Object.entries(cors).forEach(([k, v]) => out.headers.set(k, v));
    return out;
  }
};

async function fetchUpstream(t) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    'Accept': 'application/json,text/csv,text/plain,*/*'
  };
  let res = await fetch(t.toString(), { headers });
  // Yahoo 有時會限流 query1，自動轉 query2 再試一次
  if (!res.ok && t.hostname === 'query1.finance.yahoo.com') {
    const t2 = new URL(t.toString());
    t2.hostname = 'query2.finance.yahoo.com';
    res = await fetch(t2.toString(), { headers });
  }
  return res;
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status: status, headers: Object.assign({ 'Content-Type': 'application/json' }, cors) });
}
