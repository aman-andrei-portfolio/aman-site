// Înregistrează în contul clientului o cerere pentru un pachet.
// Plata se stabilește apoi pe Instagram, prin transfer bancar; aici nu se plătește nimic.
'use strict';
const { CATALOG, send, sameOrigin, readJson, configured, getUser, db, handle } = require('./_lib');

const MAX_OPEN = 5; // limită anti-spam: câte cereri neplătite poate avea un client deodată

module.exports = handle(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă.' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Cerere respinsă.' });
  if (!configured()) return send(res, 503, { error: 'Conturile nu sunt încă active.' });

  const user = await getUser(req);
  if (!user) return send(res, 401, { error: 'Intră în cont ca să salvezi cererea.' });

  const body = await readJson(req);
  const key = String(body.package || '');
  const pkg = CATALOG[key];
  if (!pkg) return send(res, 400, { error: 'Pachet necunoscut.' });
  const lang = body.lang === 'en' ? 'en' : 'ro';
  const currency = lang === 'en' ? 'eur' : 'ron';

  const open = await db(`orders?select=id,package&user_id=eq.${user.id}&status=eq.requested`);
  if (open.some((o) => o.package === key)) return send(res, 200, { ok: true, duplicate: true });
  if (open.length >= MAX_OPEN) return send(res, 429, { error: 'Ai deja mai multe cereri deschise. Scrie-mi pe Instagram.' });

  await db('orders', {
    method: 'POST',
    prefer: 'return=minimal',
    body: {
      user_id: user.id, email: user.email, customer_name: user.name,
      package: key, title: pkg.name[lang], amount: pkg[currency], currency, lang,
      status: 'requested',
    },
  });
  send(res, 201, { ok: true });
});
