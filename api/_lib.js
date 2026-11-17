// Funcții comune pentru serverul site-ului (Vercel Functions, Node 18+).
// Fără dependențe externe: Stripe și Supabase sunt apelate direct prin HTTPS.
'use strict';
const crypto = require('crypto');

const env = (k) => (process.env[k] || '').trim();

// Catalogul de prețuri stă DOAR pe server. Clientul trimite doar numele pachetului,
// niciodată suma, ca nimeni să nu poată plăti alt preț modificând pagina.
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

async function readRaw(req, limit = 64 * 1024) {
  const chunks = []; let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw Object.assign(new Error('Body too large'), { status: 413 });
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = await readRaw(req);
  try { return JSON.parse(raw.toString('utf8') || '{}'); } catch { return {}; }
}

function configured() {
  return {
    auth: !!(env('SUPABASE_URL') && env('SUPABASE_ANON_KEY') && env('SUPABASE_SERVICE_ROLE_KEY')),
    payments: !!(env('STRIPE_SECRET_KEY') && env('STRIPE_WEBHOOK_SECRET')),
  };
}

// Verifică token-ul utilizatorului direct la Supabase. Întoarce { id, email } sau null.
async function getUser(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token || token.length > 4096) return null;
  const r = await fetch(env('SUPABASE_URL') + '/auth/v1/user', {
    headers: { apikey: env('SUPABASE_ANON_KEY'), Authorization: 'Bearer ' + token },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? { id: u.id, email: u.email || null, name: (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || null } : null;
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

// Stripe REST cu body form-encoded (formatul cerut de API-ul Stripe).
function form(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') form(v, key, out);
    else out.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(v)));
  }
  return out.join('&');
}

async function stripe(path, params, idempotencyKey) {
  const headers = { Authorization: 'Bearer ' + env('STRIPE_SECRET_KEY'), 'Content-Type': 'application/x-www-form-urlencoded' };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  // STRIPE_API_BASE e folosit doar în testele locale; în producție rămâne api.stripe.com.
  const r = await fetch((env('STRIPE_API_BASE') || 'https://api.stripe.com') + '/v1/' + path, { method: 'POST', headers, body: form(params) });
  const j = await r.json();
  if (!r.ok) throw Object.assign(new Error('Stripe: ' + ((j.error && j.error.message) || r.status)), { status: 502 });
  return j;
}

// Verificarea semnăturii webhook-ului Stripe (fără SDK): HMAC-SHA256 peste "timestamp.payload".
function verifyStripeSignature(raw, header, secret, toleranceSec = 300) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => { const i = p.indexOf('='); return [p.slice(0, i), p.slice(i + 1)]; }));
  const sigs = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  const t = Number(parts.t);
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = crypto.createHmac('sha256', secret).update(t + '.' + raw.toString('utf8')).digest('hex');
  const e = Buffer.from(expected, 'hex');
  return sigs.some((s) => { const b = Buffer.from(s, 'hex'); return b.length === e.length && crypto.timingSafeEqual(b, e); });
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

module.exports = { env, CATALOG, send, sameOrigin, readRaw, readJson, configured, getUser, db, authAdmin, stripe, verifyStripeSignature, handle };
