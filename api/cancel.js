// Clientul își anulează o cerere neplătită (statusul „requested”).
// Comenzile plătite nu pot fi anulate de aici; pentru ele clientul îți scrie.
'use strict';
const { send, sameOrigin, readJson, configured, getUser, db, handle } = require('./_lib');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = handle(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă.' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Cerere respinsă.' });
  if (!configured()) return send(res, 503, { error: 'Conturile nu sunt încă active.' });
  const user = await getUser(req);
  if (!user) return send(res, 401, { error: 'Sesiunea a expirat. Intră din nou în cont.' });

  const { id } = await readJson(req);
  if (!UUID.test(String(id || ''))) return send(res, 400, { error: 'Comandă necunoscută.' });

  const gone = await db(`orders?id=eq.${id}&user_id=eq.${user.id}&status=eq.requested`, { method: 'DELETE', prefer: 'return=representation' });
  if (!gone || !gone.length) return send(res, 409, { error: 'Cererea nu mai poate fi anulată. Scrie-mi pe Instagram.' });
  send(res, 200, { cancelled: true });
});
