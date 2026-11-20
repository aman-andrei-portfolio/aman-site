/* Zona de client: logare cu Google (prin Supabase, flux PKCE) și statusul comenzilor.
   Plata nu se face pe site: butoanele de la pachete deschid Instagram, iar dacă ești logat,
   cererea se salvează și în cont. Sesiunea stă în localStorage doar ca să rămâi logat. */
(function () {
  'use strict';
  var d = document, box = d.getElementById('acct');
  if (!box) return;
  var cfg = null, session = null, orders = null, notice = null, busy = false, confirmDel = false, confirmCancel = null, isAdmin = false, files = {}, sites = [];
  var KEY = 'aman.session', PKCE = 'aman.pkce';
  var IG = 'https://www.instagram.com/costi1andrei/';

  var T = {
    ro: {
      soon: 'Contul de client va fi disponibil în curând. Până atunci, scrie-mi pe Instagram și stabilim totul acolo.',
      ig: 'Scrie-mi pe Instagram', google: 'Continuă cu Google',
      why: 'Folosesc doar numele și emailul din contul tău Google, ca să-ți arăt comenzile. Detalii în ',
      perks: ['Trimiți comenzi și primești un cod pentru fiecare', 'Vezi statusul: plătită, în lucru, livrată', 'Descarci fișierele finale direct de aici'],
      privacy: 'Politica de confidențialitate', logout: 'Ieși din cont', loading: 'Se încarcă…',
      empty: 'Încă nu ai nicio comandă. Alege un pachet, scrie-mi pe Instagram și comanda apare aici.',
      seePacks: 'Vezi pachetele', files: 'Deschide fișierele', note: 'Mesaj de la Aman', yourFiles: 'Fișierele tale', dl: 'Descarcă',
      how: 'Plata se face prin transfer bancar. Îți trimit detaliile pe Instagram, iar statusul se actualizează aici după ce primesc plata.',
      saved: 'Cererea pentru {p} a fost salvată în cont. Continuă discuția pe Instagram.',
      data: 'Datele tale', export: 'Descarcă datele mele', del: 'Șterge contul',
      delConfirm: 'Sigur? Contul se șterge definitiv. Comenzile plătite rămân doar anonimizate, pentru evidență.',
      delYes: 'Da, șterge contul', delNo: 'Renunț', deleted: 'Contul a fost șters.',
      loginErr: 'Logarea nu a reușit. Încearcă din nou.', expired: 'Sesiunea a expirat. Intră din nou în cont.',
      zip: 'Descarcă site-ul (ZIP)', openEd: 'Deschide în editor', mySites: 'Site-urile tale din editor', newSite: 'Fă un site nou', edit: 'Continuă editarea', draft: 'Ciornă',
      cancel: 'Anulează cererea', cancelQ: 'Sigur anulezi cererea?', cancelYes: 'Da, anulează', cancelNo: 'Nu', cancelled: 'Cererea a fost anulată.',
      st: { requested: 'Cerere trimisă · aștept plata', paid: 'Plătită · urmează să încep', in_progress: 'În lucru', review: 'Gata de verificare', delivered: 'Livrată', cancelled: 'Anulată', refunded: 'Rambursată' },
    },
    en: {
      soon: 'The client area is coming soon. Until then, message me on Instagram and we sort everything out there.',
      ig: 'Message me on Instagram', google: 'Continue with Google',
      why: 'I only use the name and email from your Google account to show you your orders. Details in the ',
      perks: ['Send orders and get a code for each one', 'Follow the status: paid, in progress, delivered', 'Download the final files right here'],
      privacy: 'Privacy policy', logout: 'Sign out', loading: 'Loading…',
      empty: 'You have no orders yet. Pick a package, message me on Instagram and the order shows up here.',
      seePacks: 'See packages', files: 'Open the files', note: 'Message from Aman', yourFiles: 'Your files', dl: 'Download',
      how: 'Payment is by bank transfer. I send you the details on Instagram, and the status updates here once I receive it.',
      saved: 'Your request for {p} is saved in your account. Carry on the chat on Instagram.',
      data: 'Your data', export: 'Download my data', del: 'Delete account',
      delConfirm: 'Are you sure? The account is deleted permanently. Paid orders are kept only in anonymised form, for records.',
      delYes: 'Yes, delete it', delNo: 'Cancel', deleted: 'Your account has been deleted.',
      loginErr: 'Sign-in failed. Please try again.', expired: 'Your session expired. Please sign in again.',
      zip: 'Download the site (ZIP)', openEd: 'Open in the editor', mySites: 'Your sites from the editor', newSite: 'Make a new site', edit: 'Continue editing', draft: 'Draft',
      cancel: 'Cancel request', cancelQ: 'Cancel this request?', cancelYes: 'Yes, cancel', cancelNo: 'No', cancelled: 'The request has been cancelled.',
      st: { requested: 'Request sent · awaiting payment', paid: 'Paid · starting soon', in_progress: 'In progress', review: 'Ready for review', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded' },
    },
  };
  function L() { return d.documentElement.lang === 'en' ? 'en' : 'ro'; }
  function t(k) { return T[L()][k]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function sstore(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }
  function sload(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function goCont() { history.replaceState(null, '', location.pathname + '#cont'); window.dispatchEvent(new HashChangeEvent('hashchange')); }

  // ---------- logare (PKCE) ----------
  function b64url(buf) { var s = btoa(String.fromCharCode.apply(null, new Uint8Array(buf))); return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  async function login() {
    var a = new Uint8Array(48); crypto.getRandomValues(a); var v = b64url(a); sstore(PKCE, v);
    var ch = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)));
    location.href = cfg.supabaseUrl + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(location.origin + '/?auth=1') +
      '&code_challenge=' + ch + '&code_challenge_method=s256';
  }
  function saveSession(j) {
    var u = j.user || {}, m = u.user_metadata || {};
    session = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600),
      user: { id: u.id, email: u.email, name: m.full_name || m.name || '' } };
    store(KEY, session);
  }
  async function authPost(grant, body) {
    var r = await fetch(cfg.supabaseUrl + '/auth/v1/token?grant_type=' + grant, { method: 'POST', headers: { apikey: cfg.supabaseAnonKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('auth ' + r.status);
    return r.json();
  }
  async function token() {
    if (!session) return null;
    if (session.expires_at - 60 > Date.now() / 1000) return session.access_token;
    try { saveSession(await authPost('refresh_token', { refresh_token: session.refresh_token })); return session.access_token; }
    catch (e) { session = null; store(KEY, null); notice = { kind: 'warn', text: t('expired') }; return null; }
  }
  function logout() {
    var tk = session && session.access_token;
    session = null; orders = null; store(KEY, null);
    if (tk) fetch(cfg.supabaseUrl + '/auth/v1/logout', { method: 'POST', headers: { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + tk } }).catch(function () {});
    render();
  }

  // ---------- comenzi ----------
  async function loadOrders() {
    var tk = await token(); if (!tk) { render(); return; }
    var r = await fetch(cfg.supabaseUrl + '/rest/v1/orders?select=id,code,title,package,site_id,amount,currency,status,note,delivery_url,created_at,paid_at&order=created_at.desc',
      { headers: { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + tk } });
    orders = r.ok ? await r.json() : [];
    var sr = await fetch('/api/sites', { headers: { Authorization: 'Bearer ' + tk } }).catch(function () { return null; });
    sites = sr && sr.ok ? ((await sr.json()).sites || []) : [];
    render();
    // Fișierele livrate: linkuri temporare, generate de server doar pentru comenzile tale.
    if (orders.some(function (o) { return o.status !== 'requested'; })) {
      var f = await fetch('/api/files', { headers: { Authorization: 'Bearer ' + tk } }).catch(function () { return null; });
      if (f && f.ok) { files = (await f.json()).files || {}; render(); }
    }
  }
  function money(o) {
    var v = o.amount / 100, n = v % 1 ? v.toFixed(2) : String(v);
    return o.currency === 'eur' ? '€' + n : n + ' lei';
  }
  function date(s) { return new Date(s).toLocaleDateString(L() === 'en' ? 'en-GB' : 'ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }); }

  // Legătura cu formularul de comandă (assets/js/order.js).
  window.AmanAccount = {
    ready: function () { return !!cfg; },
    enabled: function () { return !!(cfg && cfg.auth); },
    user: function () { return session && session.user; },
    token: token,
    login: login,
    lang: L,
    refresh: function (n) { if (n) notice = n; return loadOrders(); },
  };

  // Când clientul revine din Instagram, reîmprospătăm statusurile.
  d.addEventListener('visibilitychange', function () { if (!d.hidden && session && cfg && cfg.auth) loadOrders(); });

  function exportData() {
    var data = { exportat_la: new Date().toISOString(), cont: session && session.user, comenzi: orders || [] };
    var a = d.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'datele-mele-aman.json'; d.body.appendChild(a); a.click(); a.remove();
  }
  async function deleteAccount() {
    var tk = await token(); if (!tk) return render();
    busy = true; render();
    var r = await fetch('/api/delete-account', { method: 'POST', headers: { Authorization: 'Bearer ' + tk } });
    busy = false; confirmDel = false;
    if (r.ok) { session = null; orders = null; store(KEY, null); notice = { kind: 'ok', text: t('deleted') }; }
    else { var j = await r.json().catch(function () { return {}; }); notice = { kind: 'warn', text: j.error || 'Eroare.' }; }
    render();
  }

  async function downloadZip(siteId, btn) {
    var tk = await token(); if (!tk) return render();
    var old = btn.textContent; btn.disabled = true; btn.textContent = '…';
    var r = await fetch('/api/site-export?id=' + encodeURIComponent(siteId), { headers: { Authorization: 'Bearer ' + tk } });
    btn.disabled = false; btn.textContent = old;
    if (!r.ok) { var j = await r.json().catch(function () { return {}; }); notice = { kind: 'warn', text: j.error || 'Eroare.' }; return render(); }
    var m = (r.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/);
    var a = d.createElement('a'); a.href = URL.createObjectURL(await r.blob()); a.download = m ? m[1] : 'site.zip'; d.body.appendChild(a); a.click(); a.remove();
  }
  async function cancelOrder(id) {
    var tk = await token(); if (!tk) return render();
    busy = true; render();
    var r = await fetch('/api/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk }, body: JSON.stringify({ id: id }) });
    var j = await r.json().catch(function () { return {}; });
    busy = false; confirmCancel = null;
    notice = r.ok ? { kind: 'ok', text: t('cancelled') } : { kind: 'warn', text: j.error || 'Eroare.' };
    await loadOrders();
  }

  function fsize(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function fileList(list) {
    if (!list || !list.length) return '';
    return '<div class="dl"><p class="dl-h">' + t('yourFiles') + ' · ' + list.length + '</p><ul>' + list.map(function (f) {
      var img = /^image\//.test(f.type) && f.url;
      return '<li>' + (img ? '<img src="' + esc(f.url) + '" alt="" loading="lazy"/>' : '<span class="ficon" aria-hidden="true">' + esc((f.name.split('.').pop() || '').slice(0, 4).toUpperCase()) + '</span>') +
        '<span class="fname">' + esc(f.name) + '<small>' + fsize(f.size) + '</small></span>' +
        '<a class="btn small" href="' + esc(f.download) + '" download="' + esc(f.name) + '">' + t('dl') + '</a></li>';
    }).join('') + '</ul></div>';
  }

  // ---------- afișare ----------
  var G = '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.540 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.730-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  function render() {
    var sec = d.getElementById('s-cont'); if (sec) sec.classList.toggle('in', !!session);
    var h = '';
    if (notice) h += '<p class="notice ' + notice.kind + '">' + esc(notice.text) + '</p>';
    if (!cfg) { box.innerHTML = '<p class="muted">' + t('loading') + '</p>'; return; }
    if (!cfg.auth) {
      box.innerHTML = h + '<div class="acct-card center"><p class="muted">' + t('soon') + '</p><div class="ctas"><a class="btn" href="' + IG + '" target="_blank" rel="noopener">' + t('ig') + '</a></div></div>';
      return;
    }
    if (!session) {
      box.innerHTML = h + '<div class="acct-card center"><ul class="perks">' + t('perks').map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><button type="button" class="gbtn" id="g-login">' + G + '<span>' + t('google') + '</span></button>' +
        '<p class="fine">' + t('why') + '<a href="/confidentialitate.html">' + t('privacy') + '</a>.</p></div>';
      d.getElementById('g-login').addEventListener('click', login);
      return;
    }
    var u = session.user || {};
    h += '<div class="who"><div><strong>' + esc(u.name || u.email) + '</strong>' + (u.name ? '<span>' + esc(u.email) + '</span>' : '') + '</div><button type="button" class="more plain" id="logout">' + t('logout') + '</button></div>';
    if (isAdmin) h += '<a class="btn admin-link" href="/admin.html">Panou comenzi</a>';
    if (orders === null) h += '<p class="muted">' + t('loading') + '</p>';
    else if (!orders.length) h += '<div class="acct-card center"><p class="muted">' + t('empty') + '</p><div class="ctas"><a class="btn" href="#preturi" id="see-packs">' + t('seePacks') + '</a></div></div>';
    else {
      if (orders.some(function (o) { return o.status === 'requested'; })) h += '<p class="banner">' + t('how') + '</p>';
      h += '<ul class="orders">' + orders.map(function (o) {
        return '<li class="order"><div class="o-top"><div><h4>' + esc(o.title) + '</h4><span class="muted">' + (o.code ? '<b class="ocode">' + esc(o.code) + '</b> · ' : '') + date(o.created_at) + ' · ' + money(o) + '</span></div>' +
          '<span class="pill s-' + esc(o.status) + '">' + esc(t('st')[o.status] || o.status) + '</span></div>' +
          (o.note ? '<p class="o-note"><span>' + t('note') + '</span>' + esc(o.note) + '</p>' : '') +
          (o.status === 'requested' ? (confirmCancel === o.id
            ? '<div class="confirm"><p>' + t('cancelQ') + '</p><div class="row"><button type="button" class="btn danger" data-cancel-yes="' + esc(o.id) + '"' + (busy ? ' disabled' : '') + '>' + t('cancelYes') + '</button><button type="button" class="more plain" data-cancel-no="1">' + t('cancelNo') + '</button></div></div>'
            : '<div class="row o-actions"><a class="more" href="' + IG + '" target="_blank" rel="noopener">' + t('ig') + '</a><button type="button" class="more plain danger" data-cancel="' + esc(o.id) + '">' + t('cancel') + '</button></div>') : '') +
          (o.delivery_url && /^https:\/\//.test(o.delivery_url) ? '<a class="more" href="' + esc(o.delivery_url) + '" target="_blank" rel="noopener">' + t('files') + '</a>' : '') +
          fileList(files[o.id]) +
          (o.site_id ? '<div class="row o-actions">' + (['paid', 'in_progress', 'review', 'delivered'].indexOf(o.status) >= 0 ? '<button type="button" class="btn small" data-zip="' + esc(o.site_id) + '">' + t('zip') + '</button>' : '') + '<a class="more" href="/editor.html?id=' + esc(o.site_id) + '">' + t('openEd') + '</a></div>' : '') + '</li>';
      }).join('') + '</ul>';
    }
    if (sites.length) {
      h += '<div class="sites"><p class="eyebrow">' + t('mySites') + '</p><ul>' + sites.map(function (x) {
        return '<li><span><strong>' + esc(x.name || 'Site fără nume') + '</strong><small>' + (x.order ? esc(x.order.code) + ' · ' + esc(t('st')[x.order.status] || x.order.status) : t('draft')) + '</small></span><a class="more" href="/editor.html?id=' + esc(x.id) + '">' + t('edit') + '</a></li>';
      }).join('') + '</ul></div>';
    }
    h += '<div class="data"><p class="eyebrow">' + t('data') + '</p><div class="row">' +
      '<button type="button" class="more plain" id="exp">' + t('export') + '</button>' +
      (confirmDel ? '' : '<button type="button" class="more plain danger" id="del">' + t('del') + '</button>') + '</div>' +
      (confirmDel ? '<div class="confirm"><p>' + t('delConfirm') + '</p><div class="row"><button type="button" class="btn danger" id="del-yes"' + (busy ? ' disabled' : '') + '>' + t('delYes') + '</button><button type="button" class="more plain" id="del-no">' + t('delNo') + '</button></div></div>' : '') +
      '</div>';
    box.innerHTML = h;
    d.getElementById('logout').addEventListener('click', logout);
    d.getElementById('exp').addEventListener('click', exportData);
    var x;
    if ((x = d.getElementById('del'))) x.addEventListener('click', function () { confirmDel = true; render(); });
    if ((x = d.getElementById('del-no'))) x.addEventListener('click', function () { confirmDel = false; render(); });
    if ((x = d.getElementById('del-yes'))) x.addEventListener('click', deleteAccount);
    box.querySelectorAll('[data-zip]').forEach(function (b) { b.addEventListener('click', function () { downloadZip(b.dataset.zip, b); }); });
    box.querySelectorAll('[data-cancel]').forEach(function (b) { b.addEventListener('click', function () { confirmCancel = b.dataset.cancel; render(); }); });
    box.querySelectorAll('[data-cancel-no]').forEach(function (b) { b.addEventListener('click', function () { confirmCancel = null; render(); }); });
    box.querySelectorAll('[data-cancel-yes]').forEach(function (b) { b.addEventListener('click', function () { cancelOrder(b.dataset.cancelYes); }); });
    if ((x = d.getElementById('see-packs'))) x.addEventListener('click', function () { setTimeout(function () { var p = d.getElementById('tab-pachete'); if (p) p.click(); }, 0); });
  }
  d.addEventListener('langchange', render);

  // ---------- pornire ----------
  (async function init() {
    render();
    try { var r = await fetch('/api/config', { cache: 'no-store' }); cfg = r.ok ? await r.json() : { auth: false }; }
    catch (e) { cfg = { auth: false }; }
    if (!cfg.auth) { render(); return d.dispatchEvent(new CustomEvent('aman:ready')); }
    var q = new URLSearchParams(location.search);
    if (q.get('auth') && q.get('code')) {
      try { saveSession(await authPost('pkce', { auth_code: q.get('code'), code_verifier: sload(PKCE) || '' })); }
      catch (e) { notice = { kind: 'warn', text: t('loginErr') }; }
      sstore(PKCE, null);
      var back = sload('aman.return'); sstore('aman.return', null);
      if (back && /^\/[a-z0-9./?=&-]*$/i.test(back) && session) { location.replace(back); return; }
      goCont();
    } else if (q.get('auth') && q.get('error')) {
      notice = { kind: 'warn', text: t('loginErr') }; goCont();
    }
    if (!session) session = load(KEY);
    if (!session && sload('aman.autologin')) { sstore('aman.autologin', null); return login(); }
    if (session && sload('aman.return')) { var b2 = sload('aman.return'); sstore('aman.return', null); if (/^\/[a-z0-9./?=&-]*$/i.test(b2)) { location.replace(b2); return; } }
    render();
    if (session) {
      await loadOrders();
      // Doar pentru administrator: serverul răspunde 200 numai dacă emailul e în ADMIN_EMAILS.
      var tk = await token();
      if (tk) fetch('/api/admin', { headers: { Authorization: 'Bearer ' + tk } }).then(function (r) { if (r.ok) { isAdmin = true; render(); } }).catch(function () {});
    }
    d.dispatchEvent(new CustomEvent('aman:ready'));
  })();
})();
