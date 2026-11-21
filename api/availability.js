// Calendarul de disponibilitate: câte locuri libere ai pe săptămână (săptămânile încep luni, ora României).
// GET  → public: următoarele 6 săptămâni care au locuri setate (fără date despre comenzi).
// POST {week_start, slots} → doar administratorul; slots: 0–50, sau null ca să ștergi săptămâna.
'use strict';
const { send, sameOrigin, readJson, configured, getUser, db, handle, isAdmin } = require('./_lib');

const DAY = 86400000;
function today() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest' }).format(new Date()); } // AAAA-LL-ZZ
function monday(offsetWeeks) {
  const t = new Date(today() + 'T00:00:00Z'), dow = (t.getUTCDay() + 6) % 7;
  return new Date(t.getTime() - dow * DAY + offsetWeeks * 7 * DAY).toISOString().slice(0, 10);
}
const WEEKS = 6;

module.exports = handle(async (req, res) => {
  if (!configured()) return send(res, 503, { error: 'Indisponibil.' });
  if (req.method === 'GET') {
    const from = monday(0), to = monday(WEEKS - 1);
    const rows = await db(`availability?select=week_start,slots&and=(week_start.gte.${from},week_start.lte.${to})&order=week_start.asc`);
    const weeks = (rows || []).filter((r) => r.week_start >= from && r.week_start <= to).map((r) => ({ week_start: r.week_start, slots: r.slots }));
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
    return send(res, 200, { today: today(), weeks, range: [from, to] });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă.' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Cerere respinsă.' });
  const user = await getUser(req);
  if (!user || !isAdmin(user)) return send(res, 403, { error: 'Doar administratorul poate schimba disponibilitatea.' });
  const b = await readJson(req);
  const w = String(b.week_start || '');
  const allowed = Array.from({ length: 12 }, (_, i) => monday(i));
  if (!allowed.includes(w)) return send(res, 400, { error: 'Săptămână invalidă (trebuie să fie o zi de luni din următoarele 12 săptămâni).' });
  if (b.slots === null) { await db(`availability?week_start=eq.${w}`, { method: 'DELETE', prefer: 'return=minimal' }); return send(res, 200, { week_start: w, slots: null }); }
  const slots = Math.floor(Number(b.slots));
  if (!Number.isFinite(slots) || slots < 0 || slots > 50) return send(res, 400, { error: 'Numărul de locuri trebuie să fie între 0 și 50.' });
  await db('availability?on_conflict=week_start', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: { week_start: w, slots, updated_at: new Date().toISOString() } });
  send(res, 200, { week_start: w, slots });
});
