// Primește confirmările de la Stripe și actualizează statusul comenzii.
// Fiecare mesaj e verificat cu semnătura secretă; mesajele false sunt respinse.
'use strict';
const { env, send, readRaw, db, verifyStripeSignature, handle } = require('./_lib');

const STATUS = {
  'checkout.session.completed': (s) => (s.payment_status === 'paid' ? 'paid' : null),
  'checkout.session.async_payment_succeeded': () => 'paid',
  'checkout.session.async_payment_failed': () => 'cancelled',
  'checkout.session.expired': () => 'cancelled',
};

module.exports = handle(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă.' });
  const raw = await readRaw(req, 512 * 1024);
  if (!verifyStripeSignature(raw, req.headers['stripe-signature'], env('STRIPE_WEBHOOK_SECRET'))) {
    return send(res, 400, { error: 'Semnătură invalidă.' });
  }
  const event = JSON.parse(raw.toString('utf8'));
  const pick = STATUS[event.type];
  if (pick) {
    const s = event.data.object;
    const orderId = (s.metadata && s.metadata.order_id) || s.client_reference_id;
    const status = pick(s);
    if (orderId && status) {
      const patch = { status };
      if (status === 'paid') { patch.paid_at = new Date().toISOString(); patch.payment_intent = s.payment_intent || null; }
      // Nu suprascriem o comandă deja trecută mai departe (în lucru, livrată etc.).
      await db(`orders?id=eq.${encodeURIComponent(orderId)}&status=eq.awaiting_payment`, { method: 'PATCH', prefer: 'return=minimal', body: patch });
    }
  }
  if (event.type === 'charge.refunded') {
    const pi = event.data.object.payment_intent;
    if (pi) await db(`orders?payment_intent=eq.${encodeURIComponent(pi)}`, { method: 'PATCH', prefer: 'return=minimal', body: { status: 'refunded' } });
  }
  send(res, 200, { received: true });
});

module.exports.config = { api: { bodyParser: false } };
