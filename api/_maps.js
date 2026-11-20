// Linkurile scurte de Google Maps (maps.app.goo.gl/…) nu spun unde e locul. Serverul urmează redirecționarea
// (fără să deschidă pagina Google) și scoate de acolo linkul complet și coordonatele exacte ale locului.
'use strict';
const SHORT = /^https:\/\/(maps\.app\.goo\.gl|goo\.gl)\//i;
const cache = new Map();

function coords(u) {
  const m = u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || u.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  return m ? (+m[1]).toFixed(6) + ',' + (+m[2]).toFixed(6) : '';
}

async function expand(url, fetchFn = fetch) {
  if (!SHORT.test(url || '')) return { url, geo: url ? coords(url) : '' };
  if (cache.has(url)) return cache.get(url);
  let cur = url;
  try {
    for (let i = 0; i < 4 && SHORT.test(cur); i++) {
      const r = await fetchFn(cur, { redirect: 'manual', signal: AbortSignal.timeout(3500) });
      const loc = r.headers.get('location');
      if (!loc) break;
      cur = new URL(loc, cur).href;
    }
  } catch (e) { return { url, geo: '' }; }
  const geo = coords(cur);
  // păstrăm doar partea utilă (fără parametrii lungi de după /data=)
  const short = /^https:\/\/(www\.)?google\.[a-z.]+\/maps\//i.test(cur) ? cur.split('/data=')[0].split('?')[0] : url;
  const out = { url: short.length <= 400 ? short : url, geo };
  if (cache.size > 500) cache.clear();
  cache.set(url, out);
  return out;
}

module.exports = { expand, coords };
