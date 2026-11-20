// Chat-ul pentru fiecare comandă, între client și administrator.
// GET ?order=ID      → mesajele comenzii (proprietarul sau administratorul); le marchează citite pentru cine le citește
// GET ?unread=1      → câte mesaje necitite are fiecare comandă (pentru insigne)
// POST {order, body} → trimite un mesaj
'use strict';
const { send, sameOrigin, readJson, configured, getUser, db, handle, isAdmin } = require('./_lib');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PER_HOUR = 30; // limită anti-spam pentru clienți

async function canSee(user, admin, orderId) {
  if (admin) { const r = await db(`orders?select=id,status&id=eq.${orderId}`); return r && r[0]; }
  const r = await db(`orders?select=id,status&id=eq.${orderId}&user_id=eq.${user.id}`);
  return r && r[0];
}

module.exports = handle(async (req, res) => {
  if (!configured()) return send(res, 503, { error: 'Conturile nu sunt încă active.' });
  const user = await getUser(req);
  if (!user) return send(res, 401, { error: 'Intră în cont.' });
  const admin = isAdmin(user);
  const q = new URL(req.url, 'http://x').searchParams;

  if (req.method === 'GET') {
    if (q.get('unread')) {
      let rows;
      if (admin && q.get('as') !== 'client') {
        rows = await db('messages?select=order_id&sender=eq.client&read_by_admin=is.null');
      } else {
        const mine = await db(`orders?select=id&user_id=eq.${user.id}`);
        if (!mine.length) return send(res, 200, { unread: {} });
        rows = await db(`messages?select=order_id&sender=eq.admin&read_by_client=is.null&order_id=in.(${mine.map((o) => o.id).join(',')})`);
      }
      const out = {};
      (rows || []).forEach((m) => { out[m.order_id] = (out[m.order_id] || 0) + 1; });
      return send(res, 200, { unread: out });
    }
    const id = String(q.get('order') || '');
    if (!UUID.test(id)) return send(res, 400, { error: 'Comandă necunoscută.' });
    const o = await canSee(user, admin, id);
    if (!o) return send(res, 404, { error: 'Comanda nu există.' });
    const msgs = await db(`messages?select=id,sender,body,created_at&order_id=eq.${id}&order=created_at.asc&limit=500`);
    // Administratorul care își vede propria comandă de test e tratat ca administrator.
    const side = admin && q.get('as') !== 'client' ? 'admin' : 'client';
    const other = side === 'admin' ? 'client' : 'admin';
    const col = side === 'admin' ? 'read_by_admin' : 'read_by_client';
    if (msgs.some((m) => m.sender === other)) {
      await db(`messages?order_id=eq.${id}&sender=eq.${other}&${col}=is.null`, { method: 'PATCH', prefer: 'return=minimal', body: { [col]: new Date().toISOString() } });
    }
    return send(res, 200, { messages: msgs, me: side });
  }

  if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă.' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Cerere respinsă.' });
  const b = await readJson(req);
  const id = String(b.order || '');
  if (!UUID.test(id)) return send(res, 400, { error: 'Comandă necunoscută.' });
  const body = String(b.body || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, 2000);
  if (!body) return send(res, 400, { error: 'Scrie un mesaj.' });
  const o = await canSee(user, admin, id);
  if (!o) return send(res, 404, { error: 'Comanda nu există.' });
  const side = admin && b.as !== 'client' ? 'admin' : 'client';
  if (side === 'client') {
    if (o.status === 'cancelled') return send(res, 409, { error: 'Comanda e anulată. Scrie-mi pe Instagram.' });
    const mine = await db(`orders?select=id&user_id=eq.${user.id}`);
    const since = new Date(Date.now() - 3600 * 1000).toISOString();
    const recent = await db(`messages?select=id&sender=eq.client&created_at=gt.${since}&order_id=in.(${mine.map((x) => x.id).join(',')})`);
    if (recent.length >= PER_HOUR) return send(res, 429, { error: 'Ai trimis multe mesaje într-o oră. Încearcă puțin mai târziu.' });
  }
  const now = new Date().toISOString();
  const rows = await db('messages', { method: 'POST', prefer: 'return=representation', body: {
    order_id: id, sender: side, body,
    read_by_client: side === 'client' ? now : null, read_by_admin: side === 'admin' ? now : null } });
  send(res, 201, { message: { id: rows[0].id, sender: side, body, created_at: rows[0].created_at } });
});
