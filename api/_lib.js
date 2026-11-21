// Funcții comune pentru serverul site-ului (Vercel Functions, Node 18+).
// Fără dependențe externe: Supabase e apelat direct prin HTTPS.
'use strict';

const env = (k) => (process.env[k] || '').trim();

// Pachetele care pot fi cerute din site. Prețul e stabilit aici, pe server.
// max = câte fișiere poate urca clientul la comandă (poze de editat, clipuri, logo etc.)
const CATALOG = {
  mini:             { name: { ro: 'Pachet Mini',           en: 'Mini package' },           ron: 12900, eur: 2500,  max: 15 },
  starter:          { name: { ro: 'Pachet Starter',        en: 'Starter package' },        ron: 27900, eur: 5500,  max: 15 },
  business:         { name: { ro: 'Pachet Business Basic', en: 'Business Basic package' }, ron: 85900, eur: 16900, max: 15 },
  'web-landing':    { name: { ro: 'Pagină de prezentare', en: 'Landing page' },   ron: 42900, eur: 8500,  max: 10 },
  'web-simplu':     { name: { ro: 'Site simplu',          en: 'Simple site' },    ron: 68900, eur: 13500, max: 10 },
  'web-business':   { name: { ro: 'Site pentru afaceri',  en: 'Business site' },  ron: 85900, eur: 16900, max: 10 },
  'video-scurt':    { name: { ro: 'Video scurt',          en: 'Short video' },    ron: 4500,  eur: 900,   max: 3 },
  'video-standard': { name: { ro: 'Video standard',       en: 'Standard video' }, ron: 7900,  eur: 1500,  max: 3 },
  'foto-1':         { name: { ro: '1 fotografie',         en: '1 photo' },        ron: 1900,  eur: 400,   max: 1 },
  'foto-10':        { name: { ro: '10 fotografii',        en: '10 photos' },      ron: 12900, eur: 2500,  max: 10 },
  // conversație fără comandă (întrebare): cere cont, nu are preț
  intrebare:        { name: { ro: 'Întrebare', en: 'Question' }, ron: 0, eur: 0, max: 0, question: true },
  // site făcut de client în editor: se comandă doar din editor, nu din lista de servicii
  'site-builder':   { name: { ro: 'Site din editor',      en: 'Site from the editor' }, ron: 14900, eur: 2900, max: 0, editorOnly: true },
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
  if (!u || !u.id) return null;
  // Anti-boți: doar conturile cu email verificat (Google îl verifică la logare) pot face ceva pe site.
  if (!u.email || !(u.email_confirmed_at || u.confirmed_at)) return null;
  const m = u.user_metadata || {};
  return { id: u.id, email: u.email, name: m.full_name || m.name || null };
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

// Spațiul privat pentru fișierele livrate. Doar serverul (cheia service_role) are acces.
const BUCKET = 'livrari';
const MAX_FILE = 50 * 1024 * 1024; // limita planului gratuit Supabase

async function storage(path, { method = 'POST', body, headers = {} } = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(env('SUPABASE_URL') + '/storage/v1/' + path, {
    method, headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', ...headers },
    // Supabase Storage refuză cererile JSON fără conținut, așa că trimitem cel puțin {}.
    body: method === 'GET' ? undefined : JSON.stringify(body || {}),
  });
  const text = await r.text();
  if (!r.ok) throw Object.assign(new Error('Storage ' + r.status + ': ' + text.slice(0, 200)), { status: 502 });
  return text ? JSON.parse(text) : null;
}

// Fișierele unei comenzi, cu linkuri de descărcare valabile o oră.
// folder = orderId (fișierele livrate de tine) sau orderId + '/client' (materialele trimise de client)
async function listFiles(folder) {
  const items = await storage('object/list/' + BUCKET, { body: { prefix: folder, limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'asc' } } });
  const files = (items || []).filter((f) => f.id && f.name && !f.name.startsWith('.') && !f.name.includes('/')); // fără subfoldere (ex. client/)
  if (!files.length) return [];
  const signed = await storage('object/sign/' + BUCKET, { body: { expiresIn: 3600, paths: files.map((f) => folder + '/' + f.name) } });
  const base = env('SUPABASE_URL') + '/storage/v1';
  return files.map((f, i) => {
    const s = signed[i] || {};
    const url = s.signedURL ? base + s.signedURL : null;
    return { name: f.name, size: (f.metadata && f.metadata.size) || 0, type: (f.metadata && f.metadata.mimetype) || '', created_at: f.created_at,
      url, download: url ? url + (url.includes('?') ? '&' : '?') + 'download=' + encodeURIComponent(f.name) : null };
  });
}

// names = doar acele fișiere livrate; fără names = tot ce ține de comandă (inclusiv materialele clientului)
async function removeFiles(orderId, names) {
  const paths = [];
  if (names) names.forEach((n) => paths.push(orderId + '/' + n));
  else {
    for (const folder of [orderId, orderId + '/client']) {
      const items = await storage('object/list/' + BUCKET, { body: { prefix: folder, limit: 1000, offset: 0 } });
      (items || []).filter((f) => f.id).forEach((f) => paths.push(folder + '/' + f.name));
    }
  }
  if (!paths.length) return;
  await storage('object/' + BUCKET, { method: 'DELETE', body: { prefixes: paths } });
}

// Cod scurt de comandă, ușor de dictat: fără litere/cifre care se confundă (0/O, 1/I/L).
function orderCode() {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const b = require('crypto').randomBytes(5);
  return 'AM-' + Array.from(b, (x) => A[x % A.length]).join('');
}
function cleanInstagram(v) {
  const h = String(v || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '');
  return /^[A-Za-z0-9._]{1,30}$/.test(h) ? h.toLowerCase() : '';
}

// Descarcă un fișier din spațiul privat (doar pe server).
async function storageGet(path) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(env('SUPABASE_URL') + '/storage/v1/object/' + BUCKET + '/' + path.split('/').map(encodeURIComponent).join('/'), { headers: { apikey: key, Authorization: 'Bearer ' + key } });
  if (!r.ok) return null;
  return Buffer.from(await r.arrayBuffer());
}
async function usedBytes() {
  const r = await db('rpc/livrari_used_bytes', { method: 'POST', body: {} });
  return Number(r) || 0;
}

// Nume de fișier sigur: fără diacritice, spații sau caractere speciale.
function safeName(name) {
  const n = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+|-+$/g, '').slice(-120);
  return n || 'fisier';
}

const csv = (k) => env(k).toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
function isAdmin(user) {
  if (!user) return false;
  if (csv('ADMIN_USER_IDS').includes(String(user.id).toLowerCase())) return true;
  return !!(user.email && csv('ADMIN_EMAILS').includes(user.email.toLowerCase()));
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

module.exports = { storageGet, usedBytes, env, CATALOG, send, sameOrigin, readJson, configured, getUser, db, authAdmin, handle, BUCKET, MAX_FILE, storage, listFiles, removeFiles, safeName, isAdmin, orderCode, cleanInstagram };
