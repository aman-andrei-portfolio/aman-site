// Fișierele fiecărei comenzi. Două foldere private per comandă:
//   {comandă}/         → ce livrezi tu clientului
//   {comandă}/client/  → materialele trimise de client la comandă (poze de editat, clipuri, logo)
//
// GET                         → clientul: fișierele livrate pentru comenzile LUI
// GET ?order=ID[&kind=client] → proprietarul sau administratorul: fișierele unei comenzi
// POST {action:'client-upload', order, name, size} → clientul urcă materiale la o comandă neplătită a lui
// POST {action:'upload', order, name, size}        → administratorul urcă livrarea
// POST {action:'delete', order, name}              → administratorul șterge un fișier livrat
'use strict';
const { env, CATALOG, send, sameOrigin, readJson, configured, getUser, db, handle, BUCKET, MAX_FILE, storage, listFiles, removeFiles, safeName, isAdmin } = require('./_lib');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOO_BIG = 'Fișierul are peste 50 MB. Pentru fișiere mari trimite un link (Google Drive, WeTransfer).';
const ORDER_CAP = 150 * 1024 * 1024;   // cât poate trimite un client la o comandă
const CLIENT_QUOTA = 900 * 1024 * 1024; // peste atât, clienții nu mai pot urca (planul gratuit are 1 GB)

async function usedBytes() {
  const r = await db('rpc/livrari_used_bytes', { method: 'POST', body: {} });
  return Number(r) || 0;
}

async function signUpload(path) {
  const j = await storage(`object/upload/sign/${BUCKET}/${path}`, { headers: { 'x-upsert': 'true' } });
  return env('SUPABASE_URL') + '/storage/v1' + (j.url || '');
}

module.exports = handle(async (req, res) => {
  if (!configured()) return send(res, 503, { error: 'Conturile nu sunt încă active.' });
  const user = await getUser(req);
  if (!user) return send(res, 401, { error: 'Intră în cont.' });
  const admin = isAdmin(user);

  if (req.method === 'GET') {
    const q = new URL(req.url, 'http://x').searchParams;
    const one = String((req.query && req.query.order) || q.get('order') || '');
    const kind = String((req.query && req.query.kind) || q.get('kind') || '') === 'client' ? 'client' : 'delivery';
    if (one) {
      if (!UUID.test(one)) return send(res, 400, { error: 'Comandă necunoscută.' });
      const own = admin ? [{ id: one }] : await db(`orders?select=id&id=eq.${one}&user_id=eq.${user.id}`);
      if (!own || !own.length) return send(res, 404, { error: 'Comanda nu există.' });
      return send(res, 200, { files: { [one]: await listFiles(kind === 'client' ? one + '/client' : one) } });
    }
    const mine = await db(`orders?select=id&user_id=eq.${user.id}&status=neq.requested`);
    const out = {};
    for (const o of mine || []) { const f = await listFiles(o.id); if (f.length) out[o.id] = f; }
    return send(res, 200, { files: out });
  }

  if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă.' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Cerere respinsă.' });
  const b = await readJson(req);
  if (!UUID.test(String(b.order || ''))) return send(res, 400, { error: 'Comandă necunoscută.' });
  const name = safeName(b.name);
  const size = Number(b.size) || 0;

  if (b.action === 'client-upload') {
    const rows = await db(`orders?select=id,package,status&id=eq.${b.order}&user_id=eq.${user.id}`);
    const o = rows && rows[0];
    if (!o) return send(res, 404, { error: 'Comanda nu există.' });
    if (o.status !== 'requested') return send(res, 409, { error: 'Comanda e deja în lucru. Trimite-mi fișierele pe Instagram.' });
    if (size > MAX_FILE) return send(res, 400, { error: TOO_BIG });
    if (CATALOG[o.package] && (CATALOG[o.package].question || CATALOG[o.package].editorOnly)) return send(res, 400, { error: 'Aici nu se pot urca fișiere.' });
    const max = (CATALOG[o.package] && CATALOG[o.package].max) || 10;
    const have = await listFiles(o.id + '/client');
    if (have.length >= max && !have.some((f) => f.name === name)) return send(res, 400, { error: `Poți trimite maximum ${max} ${max === 1 ? 'fișier' : 'fișiere'} pentru opțiunea asta.` });
    const orderBytes = have.filter((f) => f.name !== name).reduce((a, f) => a + (f.size || 0), 0);
    if (orderBytes + size > ORDER_CAP) return send(res, 400, { error: 'Ai trimis deja 150 MB la comanda asta. Restul trimite-l ca link (Google Drive, WeTransfer).' });
    if ((await usedBytes()) + size > CLIENT_QUOTA) return send(res, 507, { error: 'Nu mai pot primi fișiere pe site acum. Trimite-mi-le pe Instagram sau ca link.' });
    return send(res, 200, { url: await signUpload(`${o.id}/client/${encodeURIComponent(name)}`), name });
  }

  if (!admin) return send(res, 403, { error: 'Doar administratorul poate încărca sau șterge fișiere livrate.' });
  const exists = await db(`orders?select=id&id=eq.${b.order}`);
  if (!exists || !exists.length) return send(res, 404, { error: 'Comanda nu există.' });

  if (b.action === 'upload') {
    if (size > MAX_FILE) return send(res, 400, { error: TOO_BIG });
    return send(res, 200, { url: await signUpload(`${b.order}/${encodeURIComponent(name)}`), name });
  }
  if (b.action === 'delete') {
    await removeFiles(b.order, [name]);
    return send(res, 200, { deleted: true });
  }
  send(res, 400, { error: 'Acțiune necunoscută.' });
});
