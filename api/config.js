// Setările publice pentru pagina de client. Cheia "anon" Supabase e publică prin design
// (accesul la date e limitat de regulile RLS din baza de date).
'use strict';
const { env, send, configured, handle } = require('./_lib');

module.exports = handle(async (req, res) => {
  const c = configured();
  const key = env('AMAN_STRIPE_SECRET_KEY');
  send(res, 200, {
    auth: c.auth,
    payments: c.auth && c.payments,
    testMode: !key || key.startsWith('sk_test_') || key.startsWith('rk_test_'),
    supabaseUrl: c.auth ? env('SUPABASE_URL') : null,
    supabaseAnonKey: c.auth ? env('SUPABASE_ANON_KEY') : null,
  });
});
