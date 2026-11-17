// Setările publice pentru pagina de client. Cheia "anon" Supabase e publică prin design
// (accesul la date e limitat de regulile RLS din baza de date).
'use strict';
const { env, send, configured, handle } = require('./_lib');

module.exports = handle(async (req, res) => {
  const ok = configured();
  send(res, 200, {
    auth: ok,
    supabaseUrl: ok ? env('SUPABASE_URL') : null,
    supabaseAnonKey: ok ? env('SUPABASE_ANON_KEY') : null,
  });
});
