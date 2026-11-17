// Fișierele livrate pentru fiecare comandă.
// GET               → clientul primește fișierele comenzilor LUI (linkuri temporare, 1 oră)
// GET ?order=ID     → fișierele unei comenzi (doar proprietarul sau administratorul)
// POST {action:'upload', order, name, size}  → administratorul primește un link de încărcare
// POST {action:'delete', order, name}        → administratorul șterge un fișier
'use strict';
const { env, send, sameOrigin, readJson, configured, getUser, db, handle, BUCKET, MAX_FILE, storage, listFiles, removeFiles, safeName, isAdmin } = require('./_lib');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = handle(async (req, res) => {
  if (!configured()) return send(res, 503, { error: 'Conturile nu sunt încă active.' });
  const user = await getUser(req);
  if (!user) return send(res, 401, { error: 'Intră în cont.' });
  const admin = isAdmin(user);

  if (req.method === 'GET') {
    const one = req.query && req.query.order ? String(req.query.order) : (new URL(req.url, 'http://x').searchParams.get('order') || '');
    if (one) {
      if (!UUID.test(one)) return send(res, 400, { error: 'Comandă necunoscută.' });
      const own = admin ? [{ id: one }] : await db(`orders?select=id&id=eq.${one}&user_id=eq.${user.id}`);
      if (!own || !own.length) return send(res, 404, { error: 'Comanda nu există.' });
      return send(res, 200, { files: { [one]: await listFiles(one) } });
    }
    const mine = await db(`orders?select=id&user_id=eq.${user.id}&status=neq.requested`);
    const out = {};
    for (const o of mine || []) { const f = await listFiles(o.id); if (f.length) out[o.id] = f; }
    return send(res, 200, { files: out });
  }

  if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă.' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Cerere respinsă.' });
  if (!admin) return send(res, 403, { error: 'Doar administratorul poate încărca sau șterge fișiere.' });
  const b = await readJson(req);
  if (!UUID.test(String(b.order || ''))) return send(res, 400, { error: 'Comandă necunoscută.' });
  const exists = await db(`orders?select=id&id=eq.${b.order}`);
  if (!exists || !exists.length) return send(res, 404, { error: 'Comanda nu există.' });
  const name = safeName(b.name);

  if (b.action === 'upload') {
    const size = Number(b.size) || 0;
    if (size > MAX_FILE) return send(res, 400, { error: 'Fișierul are peste 50 MB. Pentru fișiere mari folosește câmpul „Link livrare”.' });
    const j = await storage(`object/upload/sign/${BUCKET}/${b.order}/${encodeURIComponent(name)}`, { headers: { 'x-upsert': 'true' } });
    const url = env('SUPABASE_URL') + '/storage/v1' + (j.url || '');
    return send(res, 200, { url, name });
  }
  if (b.action === 'delete') {
    await removeFiles(b.order, [name]);
    return send(res, 200, { deleted: true });
  }
  send(res, 400, { error: 'Acțiune necunoscută.' });
});
