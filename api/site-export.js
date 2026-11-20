// Descărcarea site-ului (ZIP). Se deblochează doar după ce marchezi comanda lui ca plătită.
'use strict';
const T = require('../assets/js/site-templates.js');
const { zip } = require('./_zip');
const fs = require('fs');
const path = require('path');
const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts', 'tpl');
const { send, configured, getUser, db, handle, isAdmin, storageGet } = require('./_lib');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAID = ['paid', 'in_progress', 'review', 'delivered'];

function slug(s) {
  return String(s || 'site').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'site';
}

const README = (name) => `${name}: site-ul tău, gata de pus online

Ce e în arhivă
  index.html   pagina site-ului
  assets/      pozele și fonturile

Cel mai simplu mod de a-l pune online (gratuit, 2 minute)
  1. Dezarhivează folderul.
  2. Intră pe https://app.netlify.com/drop
  3. Trage folderul în pagină. Primești imediat un link de tipul ceva.netlify.app.
  4. Opțional: în Netlify poți lega și domeniul tău (ex. numeafacerii.ro).

Alte variante: Vercel, GitHub Pages, Cloudflare Pages sau orice găzduire web
(urci conținutul folderului în public_html).

Vrei să-l pun eu online sau să-l fac mai bun? Scrie-mi pe https://costi1andrei.site (butonul „Scrie-mi”).
`;

module.exports = handle(async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Metodă nepermisă.' });
  if (!configured()) return send(res, 503, { error: 'Conturile nu sunt încă active.' });
  const user = await getUser(req);
  if (!user) return send(res, 401, { error: 'Intră în cont.' });
  const id = String((req.query && req.query.id) || new URL(req.url, 'http://x').searchParams.get('id') || '');
  if (!UUID.test(id)) return send(res, 400, { error: 'Site necunoscut.' });

  const admin = isAdmin(user);
  const rows = await db(`sites?select=id,template,data&id=eq.${id}` + (admin ? '' : `&user_id=eq.${user.id}`));
  if (!rows || !rows.length) return send(res, 404, { error: 'Site-ul nu există.' });
  const site = rows[0];
  const paid = await db(`orders?select=id&site_id=eq.${id}&status=in.(${PAID.join(',')})&limit=1`);
  if (!admin && (!paid || !paid.length)) return send(res, 402, { error: 'Descărcarea se deblochează după ce confirm plata.' });

  const data = T.normalize(site.template, site.data);
  const used = [data.logo, data.hero, ...data.gallery].filter(Boolean);
  const files = [];
  for (const name of [...new Set(used)]) {
    const buf = await storageGet(`sites/${id}/${name}`);
    if (buf) files.push({ name: 'assets/' + name, data: buf });
  }
  const have = new Set(files.map((f) => f.name.slice(7)));
  const html = T.render(site.template, data, { img: (n) => (have.has(n) ? 'assets/' + n : '') });
  const name = data.name || 'site';
  // fonturile titlurilor (licență OFL), ca site-ul să arate la fel ca în editor
  for (const f of T.siteFonts(site.template, data)) {
    try { files.push({ name: 'assets/fonts/' + f, data: fs.readFileSync(path.join(FONT_DIR, f)) }); } catch (e) { /* fără font: rămâne rezerva din sistem */ }
  }
  try { files.push({ name: 'assets/fonts/LICENTE.txt', data: fs.readFileSync(path.join(FONT_DIR, 'LICENTE.txt')) }); } catch (e) {}
  const body = zip([{ name: 'index.html', data: html }, ...files, { name: 'CITESTE-MA.txt', data: README(name) }]);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${slug(name)}.zip"`);
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
});
