// Ștergerea contului (dreptul de ștergere, art. 17 GDPR).
// Contul și datele personale dispar; comenzile plătite rămân anonimizate,
// pentru că evidența încasărilor trebuie păstrată.
'use strict';
const { send, sameOrigin, configured, getUser, db, authAdmin, handle, removeFiles } = require('./_lib');

module.exports = handle(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă.' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Cerere respinsă.' });
  if (!configured()) return send(res, 503, { error: 'Conturile nu sunt încă active.' });
  const user = await getUser(req);
  if (!user) return send(res, 401, { error: 'Sesiunea a expirat. Intră din nou în cont.' });

  // Fișierele livrate (pot fi poze cu clientul) se șterg odată cu contul.
  const mine = await db(`orders?select=id&user_id=eq.${user.id}`);
  for (const o of mine || []) await removeFiles(o.id);
  // Cererile neplătite se șterg; comenzile plătite se anonimizează.
  await db(`orders?user_id=eq.${user.id}&paid_at=is.null`, { method: 'DELETE', prefer: 'return=minimal' });
  await db(`orders?user_id=eq.${user.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { email: null, customer_name: null, user_id: null } });
  await authAdmin('users/' + user.id, 'DELETE');
  send(res, 200, { deleted: true });
});
