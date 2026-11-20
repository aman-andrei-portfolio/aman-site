// Editorul de site-uri: ciorne salvate în cont, poze, comanda pentru deblocare.
// GET               → ciornele clientului
// GET ?id=ID        → o ciornă (proprietarul sau administratorul), cu linkuri temporare la poze
// POST {action:'save', id?, template, data}            → salvează ciorna (max. 3 pe cont)
// POST {action:'upload', id, kind, size, type}         → link de încărcare pentru o poză
// POST {action:'delete-asset', id, file}               → șterge o poză
// POST {action:'order', id, instagram, lang}           → comanda cu cod (plata pe Instagram)
// POST {action:'delete', id}                           → șterge ciorna (dacă nu e plătită)
'use strict';
const T = require('../assets/js/site-templates.js');
const { env, CATALOG, send, sameOrigin, readJson, configured, getUser, db, handle, BUCKET, storage, isAdmin, orderCode, cleanInstagram, usedBytes } = require('./_lib');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SITES = 3, MAX_ASSETS = 8, MAX_IMG = 5 * 1024 * 1024, QUOTA = 900 * 1024 * 1024;
const PAID = ['paid', 'in_progress', 'review', 'delivered'];
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

async function listAssets(id) {
  const items = await storage('object/list/' + BUCKET, { body: { prefix: 'sites/' + id, limit: 100, offset: 0 } });
  return (items || []).filter((f) => f.id && f.name && !f.name.startsWith('.'));
}
async function signAssets(id, names) {
  if (!names.length) return {};
  const signed = await storage('object/sign/' + BUCKET, { body: { expiresIn: 3600, paths: names.map((n) => `sites/${id}/${n}`) } });
  const out = {};
  names.forEach((n, i) => { const s = signed[i]; if (s && s.signedURL) out[n] = env('SUPABASE_URL') + '/storage/v1' + s.signedURL; });
  return out;
}
async function siteOrder(id) {
  const rows = await db(`orders?select=id,code,status&site_id=eq.${id}&status=neq.cancelled&order=created_at.desc&limit=1`);
  return rows && rows[0] ? { code: rows[0].code, status: rows[0].status, unlocked: PAID.includes(rows[0].status) } : null;
}

module.exports = handle(async (req, res) => {
  if (!configured()) return send(res, 503, { error: 'Conturile nu sunt încă active.' });
  const user = await getUser(req);
  if (!user) return send(res, 401, { error: 'Intră în cont.' });
  const admin = isAdmin(user);

  if (req.method === 'GET') {
    const q = new URL(req.url, 'http://x').searchParams;
    const id = String((req.query && req.query.id) || q.get('id') || '');
    if (id) {
      if (!UUID.test(id)) return send(res, 400, { error: 'Site necunoscut.' });
      const rows = await db(`sites?select=id,user_id,template,data,updated_at&id=eq.${id}` + (admin ? '' : `&user_id=eq.${user.id}`));
      if (!rows || !rows.length) return send(res, 404, { error: 'Site-ul nu există.' });
      const s = rows[0];
      const files = (await listAssets(id)).map((f) => f.name);
      return send(res, 200, { site: { id: s.id, template: s.template, data: s.data, updated_at: s.updated_at, own: s.user_id === user.id }, assets: await signAssets(id, files), order: await siteOrder(id) });
    }
    const rows = await db(`sites?select=id,template,data,updated_at&user_id=eq.${user.id}&order=updated_at.desc`);
    const out = [];
    for (const s of rows || []) out.push({ id: s.id, template: s.template, name: (s.data && s.data.name) || '', updated_at: s.updated_at, order: await siteOrder(s.id) });
    return send(res, 200, { sites: out });
  }

  if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă.' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Cerere respinsă.' });
  const b = await readJson(req, 128 * 1024);

  const own = async (id) => {
    if (!UUID.test(String(id || ''))) return null;
    const r = await db(`sites?select=id,template,data&id=eq.${id}&user_id=eq.${user.id}`);
    return r && r[0];
  };

  if (b.action === 'save') {
    const template = T.TEMPLATES[b.template] ? b.template : null;
    if (!template) return send(res, 400, { error: 'Șablon necunoscut.' });
    const data = T.normalize(template, b.data);
    if (b.id) {
      const s = await own(b.id); if (!s) return send(res, 404, { error: 'Site-ul nu există.' });
      await db('sites?id=eq.' + s.id, { method: 'PATCH', prefer: 'return=minimal', body: { template, data } });
      return send(res, 200, { id: s.id });
    }
    const mine = await db(`sites?select=id&user_id=eq.${user.id}`);
    if (mine.length >= MAX_SITES) return send(res, 400, { error: 'Poți avea maximum 3 site-uri în cont. Șterge unul ca să faci altul.' });
    const rows = await db('sites', { method: 'POST', prefer: 'return=representation', body: { user_id: user.id, template, data } });
    return send(res, 201, { id: rows[0].id });
  }

  if (b.action === 'upload') {
    const s = await own(b.id); if (!s) return send(res, 404, { error: 'Salvează mai întâi site-ul.' });
    const ext = TYPES[b.type]; if (!ext) return send(res, 400, { error: 'Folosește poze JPG, PNG sau WEBP.' });
    if ((Number(b.size) || 0) > MAX_IMG) return send(res, 400, { error: 'Poza are peste 5 MB.' });
    const kind = ['logo', 'hero', 'gallery'].includes(b.kind) ? b.kind : 'gallery';
    if ((await listAssets(s.id)).length >= MAX_ASSETS) return send(res, 400, { error: 'Ai deja 8 poze la acest site. Șterge una ca să adaugi alta.' });
    if ((await usedBytes()) + (Number(b.size) || 0) > QUOTA) return send(res, 507, { error: 'Nu mai pot primi poze acum. Încearcă mai târziu.' });
    const file = `${kind}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const j = await storage(`object/upload/sign/${BUCKET}/sites/${s.id}/${file}`, { headers: { 'x-upsert': 'true' } });
    return send(res, 200, { url: env('SUPABASE_URL') + '/storage/v1' + j.url, file });
  }

  if (b.action === 'delete-asset') {
    const s = await own(b.id); if (!s) return send(res, 404, { error: 'Site-ul nu există.' });
    const file = String(b.file || '');
    if (!/^[A-Za-z0-9._-]{1,120}$/.test(file)) return send(res, 400, { error: 'Fișier necunoscut.' });
    await storage('object/' + BUCKET, { method: 'DELETE', body: { prefixes: [`sites/${s.id}/${file}`] } });
    return send(res, 200, { deleted: true });
  }

  if (b.action === 'order') {
    const s = await own(b.id); if (!s) return send(res, 404, { error: 'Salvează mai întâi site-ul.' });
    const existing = await siteOrder(s.id);
    if (existing) return send(res, 200, { code: existing.code, status: existing.status, existing: true });
    const open = await db(`orders?select=id&user_id=eq.${user.id}&status=eq.requested`);
    if (open.length >= 3) return send(res, 429, { error: 'Ai deja 3 comenzi neplătite. Scrie-mi pe Instagram sau anulează una din cont.' });
    const lang = b.lang === 'en' ? 'en' : 'ro', currency = lang === 'en' ? 'eur' : 'ron', pkg = CATALOG['site-builder'];
    const name = (s.data && s.data.name) || 'site';
    for (let i = 0; i < 5; i++) {
      const code = orderCode();
      try {
        await db('orders', { method: 'POST', prefer: 'return=minimal', body: {
          user_id: user.id, email: user.email, customer_name: user.name, package: 'site-builder',
          title: pkg.name[lang] + ': ' + String(name).slice(0, 60), amount: pkg[currency], currency, lang,
          status: 'requested', code, instagram: cleanInstagram(b.instagram) || null, brief: 'Șablon: ' + T.TEMPLATES[s.template].label, site_id: s.id } });
        return send(res, 201, { code, status: 'requested' });
      } catch (e) { if (!/23505|duplicate/.test(e.message)) throw e; }
    }
    return send(res, 500, { error: 'Nu am putut crea comanda. Încearcă din nou.' });
  }

  if (b.action === 'delete') {
    const s = await own(b.id); if (!s) return send(res, 404, { error: 'Site-ul nu există.' });
    const o = await siteOrder(s.id);
    if (o && o.unlocked) return send(res, 409, { error: 'Site-ul e plătit; îl poți descărca oricând din cont.' });
    const files = (await listAssets(s.id)).map((f) => `sites/${s.id}/${f.name}`);
    if (files.length) await storage('object/' + BUCKET, { method: 'DELETE', body: { prefixes: files } });
    await db(`orders?site_id=eq.${s.id}&status=eq.requested`, { method: 'DELETE', prefer: 'return=minimal' });
    await db('sites?id=eq.' + s.id, { method: 'DELETE', prefer: 'return=minimal' });
    return send(res, 200, { deleted: true });
  }

  send(res, 400, { error: 'Acțiune necunoscută.' });
});
