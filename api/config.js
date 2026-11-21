// Setările publice pentru pagina de client. Cheia "anon" Supabase e publică prin design
// (accesul la date e limitat de regulile RLS din baza de date).
'use strict';
const { env, send, configured, handle, EXTRAS, CATALOG } = require('./_lib');

// prețurile de bază (pentru calculatorul din formular); totalul final îl calculează tot serverul
const PRICES = {};
for (const k of Object.keys(CATALOG)) if (!CATALOG[k].question) PRICES[k] = { ron: CATALOG[k].ron, eur: CATALOG[k].eur };

module.exports = handle(async (req, res) => {
  const ok = configured();
  send(res, 200, {
    auth: ok,
    supabaseUrl: ok ? env('SUPABASE_URL') : null,
    supabaseAnonKey: ok ? env('SUPABASE_ANON_KEY') : null,
    extras: EXTRAS, prices: PRICES,
  });
});
