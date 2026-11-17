// Creează comanda și sesiunea de plată Stripe Checkout pentru un pachet.
// Datele cardului se introduc doar pe pagina Stripe; site-ul nu le vede niciodată.
'use strict';
const crypto = require('crypto');
const { env, CATALOG, send, sameOrigin, readJson, configured, getUser, db, stripe, handle } = require('./_lib');

module.exports = handle(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă.' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Cerere respinsă.' });
  const c = configured();
  if (!c.auth || !c.payments) return send(res, 503, { error: 'Plățile online nu sunt încă active.' });

  const user = await getUser(req);
  if (!user) return send(res, 401, { error: 'Intră în cont ca să plătești.' });

  const body = await readJson(req);
  const pkg = CATALOG[String(body.package || '')];
  if (!pkg) return send(res, 400, { error: 'Pachet necunoscut.' });
  const lang = body.lang === 'en' ? 'en' : 'ro';
  const currency = lang === 'en' ? 'eur' : 'ron';
  // Consimțământul pentru începerea lucrului înainte de 14 zile (OUG 34/2014, art. 16 lit. a).
  if (body.consent !== true) return send(res, 400, { error: 'Bifează acordul pentru termeni înainte de plată.' });

  const site = env('SITE_URL').replace(/\/$/, '');
  const orderId = crypto.randomUUID();
  const amount = pkg[currency];

  await db('orders', {
    method: 'POST',
    prefer: 'return=minimal',
    body: {
      id: orderId, user_id: user.id, email: user.email, customer_name: user.name,
      package: String(body.package), title: pkg.name[lang], amount, currency,
      status: 'awaiting_payment', consent_at: new Date().toISOString(), lang,
    },
  });

  const session = await stripe('checkout/sessions', {
    mode: 'payment',
    customer_email: user.email || undefined,
    client_reference_id: orderId,
    locale: lang === 'en' ? 'en' : 'ro',
    line_items: { 0: { quantity: 1, price_data: { currency, unit_amount: amount, product_data: { name: pkg.name[lang] } } } },
    metadata: { order_id: orderId, user_id: user.id, package: String(body.package) },
    payment_intent_data: { metadata: { order_id: orderId } },
    success_url: `${site}/?plata=ok#cont`,
    cancel_url: `${site}/?plata=anulat#cont`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // sesiunea expiră într-o oră
  }, 'checkout-' + orderId);

  await db('orders?id=eq.' + orderId, { method: 'PATCH', prefer: 'return=minimal', body: { stripe_session_id: session.id } });
  send(res, 200, { url: session.url });
});
