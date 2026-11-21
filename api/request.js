// Creează o comandă din site: pachetul/serviciul ales și ce dorește clientul.
// Întoarce codul comenzii (ex. AM-K7P2Q). Plata se stabilește în conversația comenzii, prin transfer bancar.
'use strict';
const { CATALOG, priceOptions, send, sameOrigin, readJson, configured, getUser, db, handle, orderCode, cleanInstagram } = require('./_lib');

const MAX_OPEN = 3; // limită anti-spam: câte comenzi neplătite poate avea un client deodată

module.exports = handle(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă.' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Cerere respinsă.' });
  if (!configured()) return send(res, 503, { error: 'Conturile nu sunt încă active.' });

  const user = await getUser(req);
  if (!user) return send(res, 401, { error: 'Intră în cont ca să trimiți comanda.' });

  const body = await readJson(req);
  const key = String(body.package || '');
  const pkg = CATALOG[key];
  if (!pkg || pkg.editorOnly) return send(res, 400, { error: 'Opțiune necunoscută.' });
  const lang = body.lang === 'en' ? 'en' : 'ro';
  const currency = lang === 'en' ? 'eur' : 'ron';
  const brief = String(body.brief || '').trim().slice(0, 2000) || null;
  const instagram = cleanInstagram(body.instagram) || null;
  const opt = priceOptions(key, body.options, currency, lang); // prețul opțiunilor îl calculează serverul

  // Întrebările se pun pe Instagram; pe site se scrie doar în conversația unei comenzi.
  if (pkg.question) return send(res, 400, { error: 'Pentru întrebări, scrie-mi pe Instagram: @costi1andrei.' });
  const open = await db(`orders?select=id&user_id=eq.${user.id}&status=eq.requested&package=neq.intrebare`);
  if (open.length >= MAX_OPEN) return send(res, 429, { error: 'Ai deja 3 comenzi neplătite. Anulează una din cont sau scrie-mi în conversația unei comenzi.' });

  for (let i = 0; i < 5; i++) {
    const code = orderCode();
    try {
      const rows = await db('orders', {
        method: 'POST',
        prefer: 'return=representation',
        body: {
          user_id: user.id, email: user.email, customer_name: user.name,
          package: key, title: pkg.name[lang], amount: pkg[currency] + opt.total, currency, lang,
          status: 'requested', code, instagram, brief, options: opt.options.length ? opt.options : null,
        },
      });
      return send(res, 201, { id: rows[0].id, code, max: pkg.max, amount: pkg[currency] + opt.total, currency });
    } catch (e) {
      if (!/23505|duplicate/.test(e.message)) throw e; // cod deja folosit: încercăm altul
    }
  }
  send(res, 500, { error: 'Nu am putut crea comanda. Încearcă din nou.' });
});
