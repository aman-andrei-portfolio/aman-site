// Funcții comune pentru serverul site-ului (Vercel Functions, Node 18+).
// Fără dependențe externe: Supabase e apelat direct prin HTTPS.
'use strict';

const env = (k) => (process.env[k] || '').trim();

// Pachetele care pot fi cerute din site. Prețul e stabilit aici, pe server.
const CATALOG = {
  mini:     { name: { ro: 'Pachet Mini',           en: 'Mini package' },           ron: 12900, eur: 2500 },
  starter:  { name: { ro: 'Pachet Starter',        en: 'Starter package' },        ron: 27900, eur: 5500 },
  business: { name: { ro: 'Pachet Business Basic', en: 'Business Basic package' }, ron: 85900, eur: 16900 },
};

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

// Acceptă cereri doar de pe domeniul site-ului (protecție CSRF pentru POST).
function sameOrigin(req) {
  const site = env('SITE_URL');
  const origin = req.headers.origin || '';
  if (!site) return true;
  try { return new URL(origin).origin === new URL(site).origin; } catch { return false; }
}

async function readJson(req, limit = 16 * 1024) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const chunks = []; let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw Object.assign(new Error('Cerere prea mare.'), { status: 413 });
    chunks.push(c);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}

function configured() {
  return !!(env('SUPABASE_URL') && env('SUPABASE_ANON_KEY') && env('SUPABASE_SERVICE_ROLE_KEY'));
}

// Verifică token-ul utilizatorului direct la Supabase. Întoarce { id, email, name } sau null.
async function getUser(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token || token.length > 4096) return null;
  const r = await fetch(env('SUPABASE_URL') + '/auth/v1/user', {
    headers: { apikey: env('SUPABASE_ANON_KEY'), Authorization: 'Bearer ' + token },
  });
  if (!r.ok) return null;
  const u = await r.json();
  const m = (u && u.user_metadata) || {};
  return u && u.id ? { id: u.id, email: u.email || null, name: m.full_name || m.name || null } : null;
}

// Acces la baza de date cu cheia de server (ocolește RLS; folosită doar aici, pe server).
async function db(path, { method = 'GET', body, prefer } = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const headers = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(env('SUPABASE_URL') + '/rest/v1/' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) throw Object.assign(new Error('DB ' + r.status + ': ' + text.slice(0, 300)), { status: 502 });
  return text ? JSON.parse(text) : null;
}

async function authAdmin(path, method = 'GET') {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(env('SUPABASE_URL') + '/auth/v1/admin/' + path, { method, headers: { apikey: key, Authorization: 'Bearer ' + key } });
  if (!r.ok && r.status !== 404) throw Object.assign(new Error('Auth admin ' + r.status), { status: 502 });
  return r.ok;
}

function handle(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (err) {
      console.error(err && err.message);
      send(res, err.status || 500, { error: err.status && err.status < 500 ? err.message : 'Eroare de server. Încearcă din nou.' });
    }
  };
}

module.exports = { env, CATALOG, send, sameOrigin, readJson, configured, getUser, db, authAdmin, handle };
