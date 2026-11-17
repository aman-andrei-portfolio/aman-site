// Panoul de administrare: au acces doar conturile din ADMIN_USER_IDS (id-uri Supabase, setate în Vercel)
// sau, opțional, emailurile din ADMIN_EMAILS.
// GET  → toate comenzile;  POST { id, status, note, delivery_url } → actualizează o comandă.
'use strict';
const { send, sameOrigin, readJson, configured, getUser, db, handle, isAdmin } = require('./_lib');

const STATUSES = ['requested', 'paid', 'in_progress', 'review', 'delivered', 'cancelled', 'refunded'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


module.exports = handle(async (req, res) => {
  if (!configured()) return send(res, 503, { error: 'Conturile nu sunt încă active.' });
  const user = await getUser(req);
  if (!user) return send(res, 401, { error: 'Intră în cont.' });
  if (!isAdmin(user)) return send(res, 403, { error: 'Nu ai acces la panou.' });

  if (req.method === 'GET') {
    const rows = await db('orders?select=id,title,package,amount,currency,status,note,delivery_url,customer_name,email,created_at,paid_at,updated_at&order=created_at.desc&limit=500');
    return send(res, 200, { orders: rows });
  }

  if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă.' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Cerere respinsă.' });
  const b = await readJson(req);
  if (!UUID.test(String(b.id || ''))) return send(res, 400, { error: 'Comandă necunoscută.' });

  const patch = {};
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) return send(res, 400, { error: 'Status invalid.' });
    patch.status = b.status;
  }
  if (b.note !== undefined) {
    const n = String(b.note || '').trim();
    if (n.length > 1000) return send(res, 400, { error: 'Mesajul e prea lung (maxim 1000 de caractere).' });
    patch.note = n || null;
  }
  if (b.delivery_url !== undefined) {
    const u = String(b.delivery_url || '').trim();
    if (u && (!/^https:\/\/[^\s<>"']+$/.test(u) || u.length > 500)) return send(res, 400, { error: 'Linkul trebuie să înceapă cu https://' });
    patch.delivery_url = u || null;
  }
  if (!Object.keys(patch).length) return send(res, 400, { error: 'Nimic de salvat.' });

  const rows = await db('orders?id=eq.' + b.id + '&select=id,status,note,delivery_url,paid_at,updated_at', { method: 'PATCH', prefer: 'return=representation', body: patch });
  if (!rows || !rows.length) return send(res, 404, { error: 'Comanda nu mai există.' });
  send(res, 200, { order: rows[0] });
});
