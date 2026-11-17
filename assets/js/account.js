/* Zona de client: logare cu Google (prin Supabase, flux PKCE), comenzi, plată Stripe.
   Sesiunea stă în localStorage doar ca să rămâi logat (strict necesar, fără consimțământ). */
(function () {
  'use strict';
  var d = document, box = d.getElementById('acct');
  if (!box) return;
  var cfg = null, session = null, orders = null, notice = null, busy = false, confirmDel = false;
  var KEY = 'aman.session', PKCE = 'aman.pkce', BUY = 'aman.buy';
  var IG = 'https://ig.me/m/costi1andrei';

  var T = {
    ro: {
      soon: 'Contul de client va fi disponibil în curând. Până atunci, scrie-mi pe Instagram și stabilim totul acolo.',
      ig: 'Scrie-mi pe Instagram', google: 'Continuă cu Google',
      why: 'Folosesc doar numele și emailul din contul tău Google, ca să-ți arăt comenzile. Detalii în ',
      privacy: 'Politica de confidențialitate', logout: 'Ieși din cont', loading: 'Se încarcă…',
      test: 'Mod de test: plățile nu sunt reale. Poți încerca cu cardul 4242 4242 4242 4242.',
      paidOk: 'Plata a fost trimisă. Confirmarea apare aici în câteva secunde, iar eu îți scriu în curând.',
      paidCancel: 'Plata a fost anulată. Nu ți s-a luat niciun ban.',
      empty: 'Încă nu ai nicio comandă.', seePacks: 'Vezi pachetele', orders: 'Comenzile tale',
      files: 'Deschide fișierele', note: 'Mesaj de la Aman',
      data: 'Datele tale', export: 'Descarcă datele mele', del: 'Șterge contul',
      delConfirm: 'Sigur? Contul se șterge definitiv. Comenzile plătite rămân doar anonimizate, pentru evidența legală.',
      delYes: 'Da, șterge contul', delNo: 'Renunț', deleted: 'Contul a fost șters.',
      loginErr: 'Logarea nu a reușit. Încearcă din nou.', expired: 'Sesiunea a expirat. Intră din nou în cont.',
      buyTitle: 'Confirmă comanda', consent: 'Am citit și accept <a href="/termeni.html" target="_blank" rel="noopener">Termenii</a>. Vreau să încep lucrul imediat și înțeleg că, după ce serviciul e livrat complet, pierd dreptul de retragere de 14 zile.',
      pay: 'Continuă la plată', cancel: 'Renunț', payNote: 'Plata se face pe pagina securizată Stripe. Site-ul nu vede datele cardului tău.',
      st: { awaiting_payment: 'Se confirmă plata', paid: 'Plătită · urmează să încep', in_progress: 'În lucru', review: 'Gata de verificare', delivered: 'Livrată', cancelled: 'Anulată', refunded: 'Rambursată' },
    },
    en: {
      soon: 'The client area is coming soon. Until then, message me on Instagram and we sort everything out there.',
      ig: 'Message me on Instagram', google: 'Continue with Google',
      why: 'I only use the name and email from your Google account to show you your orders. Details in the ',
      privacy: 'Privacy policy', logout: 'Sign out', loading: 'Loading…',
      test: 'Test mode: payments are not real. You can try the card 4242 4242 4242 4242.',
      paidOk: 'Payment sent. The confirmation shows up here in a few seconds, and I will message you soon.',
      paidCancel: 'Payment cancelled. You were not charged.',
      empty: 'You have no orders yet.', seePacks: 'See packages', orders: 'Your orders',
      files: 'Open the files', note: 'Message from Aman',
      data: 'Your data', export: 'Download my data', del: 'Delete account',
      delConfirm: 'Are you sure? The account is deleted permanently. Paid orders are kept only in anonymised form, for legal records.',
      delYes: 'Yes, delete it', delNo: 'Cancel', deleted: 'Your account has been deleted.',
      loginErr: 'Sign-in failed. Please try again.', expired: 'Your session expired. Please sign in again.',
      buyTitle: 'Confirm your order', consent: 'I have read and accept the <a href="/termeni.html" target="_blank" rel="noopener">Terms</a>. I want work to start right away and I understand that once the service is fully delivered, I lose the 14-day right of withdrawal.',
      pay: 'Continue to payment', cancel: 'Cancel', payNote: 'Payment happens on the secure Stripe page. This site never sees your card details.',
      st: { awaiting_payment: 'Confirming payment', paid: 'Paid · starting soon', in_progress: 'In progress', review: 'Ready for review', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded' },
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

  // ---------- PKCE ----------
  function b64url(buf) { var s = btoa(String.fromCharCode.apply(null, new Uint8Array(buf))); return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function randomVerifier() { var a = new Uint8Array(48); crypto.getRandomValues(a); return b64url(a); }
  async function login() {
    var v = randomVerifier(); sstore(PKCE, v);
    var ch = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)));
    var back = location.origin + '/?auth=1';
    location.href = cfg.supabaseUrl + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(back) +
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
  async function logout() {
    var tk = session && session.access_token;
    session = null; orders = null; store(KEY, null);
    if (tk) fetch(cfg.supabaseUrl + '/auth/v1/logout', { method: 'POST', headers: { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + tk } }).catch(function () {});
    render();
  }

  // ---------- date ----------
  async function loadOrders() {
    var tk = await token(); if (!tk) { render(); return; }
    var r = await fetch(cfg.supabaseUrl + '/rest/v1/orders?select=id,title,package,amount,currency,status,note,delivery_url,created_at,paid_at&order=created_at.desc',
      { headers: { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + tk } });
    orders = r.ok ? await r.json() : [];
    var now = Date.now();
    orders = orders.filter(function (o) {
      if (o.status === 'awaiting_payment') return now - Date.parse(o.created_at) < 2 * 3600 * 1000;
      if (o.status === 'cancelled') return !!o.paid_at;
      return true;
    });
    render();
    // Imediat după plată, confirmarea Stripe poate întârzia câteva secunde.
    loadOrders._n = loadOrders._n || 0;
    if (orders.some(function (o) { return o.status === 'awaiting_payment'; }) && loadOrders._n < 6) { loadOrders._n++; setTimeout(loadOrders, 3000); }
  }
  function money(o) {
    var v = o.amount / 100;
    return o.currency === 'eur' ? '€' + (v % 1 ? v.toFixed(2) : v) : (v % 1 ? v.toFixed(2) : v) + ' lei';
  }
  function date(s) { return new Date(s).toLocaleDateString(L() === 'en' ? 'en-GB' : 'ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }); }

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

  // ---------- cumpărare ----------
  var dlg = null, pending = null;
  function openBuy(pkg) {
    pending = pkg;
    var card = d.querySelector('[data-buy="' + pkg + '"]').closest('.pack');
    var name = card.querySelector('h4').textContent, price = card.querySelector('.amount').innerHTML;
    if (!dlg) { dlg = d.createElement('dialog'); dlg.className = 'buy'; d.body.appendChild(dlg); }
    dlg.innerHTML = '<form method="dialog" class="buy-in">' +
      '<p class="eyebrow">' + t('buyTitle') + '</p><h3>' + esc(name) + '</h3><p class="amount">' + price + '</p>' +
      (cfg.testMode ? '<p class="banner">' + t('test') + '</p>' : '') +
      '<label class="chk"><input type="checkbox" id="buy-consent"/> <span>' + t('consent') + '</span></label>' +
      '<p class="err" id="buy-err" hidden></p>' +
      '<div class="row"><button type="button" class="btn" id="buy-go" disabled>' + t('pay') + '</button><button value="cancel" class="more plain">' + t('cancel') + '</button></div>' +
      '<p class="fine">' + t('payNote') + '</p></form>';
    var cb = dlg.querySelector('#buy-consent'), go = dlg.querySelector('#buy-go');
    cb.addEventListener('change', function () { go.disabled = !cb.checked; });
    go.addEventListener('click', checkout);
    dlg.showModal();
  }
  async function checkout() {
    var go = dlg.querySelector('#buy-go'), err = dlg.querySelector('#buy-err');
    go.disabled = true; err.hidden = true;
    var tk = await token();
    if (!tk) { dlg.close(); sstore(BUY, pending); return login(); }
    try {
      var r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk },
        body: JSON.stringify({ package: pending, lang: L(), consent: true }) });
      var j = await r.json();
      if (!r.ok || !j.url) throw new Error(j.error || 'Eroare.');
      location.href = j.url;
    } catch (e) { err.textContent = e.message; err.hidden = false; go.disabled = false; }
  }
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-buy]');
    if (!b || !cfg || !cfg.payments) return; // fără plăți active, butonul rămâne link spre Instagram
    e.preventDefault();
    if (!session) { sstore(BUY, b.dataset.buy); login(); return; }
    openBuy(b.dataset.buy);
  });

  // ---------- afișare ----------
  var G = '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
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
      box.innerHTML = h + '<div class="acct-card center"><button type="button" class="gbtn" id="g-login">' + G + '<span>' + t('google') + '</span></button>' +
        '<p class="fine">' + t('why') + '<a href="/confidentialitate.html">' + t('privacy') + '</a>.</p></div>';
      d.getElementById('g-login').addEventListener('click', login);
      return;
    }
    var u = session.user || {};
    h += '<div class="who"><div><strong>' + esc(u.name || u.email) + '</strong>' + (u.name ? '<span>' + esc(u.email) + '</span>' : '') + '</div><button type="button" class="more plain" id="logout">' + t('logout') + '</button></div>';
    if (cfg.testMode && cfg.payments) h += '<p class="banner">' + t('test') + '</p>';
    if (orders === null) h += '<p class="muted">' + t('loading') + '</p>';
    else if (!orders.length) h += '<div class="acct-card center"><p class="muted">' + t('empty') + '</p><div class="ctas"><a class="btn" href="#preturi" id="see-packs">' + t('seePacks') + '</a></div></div>';
    else {
      h += '<ul class="orders">' + orders.map(function (o) {
        return '<li class="order"><div class="o-top"><div><h4>' + esc(o.title) + '</h4><span class="muted">' + date(o.created_at) + ' · ' + money(o) + '</span></div>' +
          '<span class="pill s-' + esc(o.status) + '">' + esc(t('st')[o.status] || o.status) + '</span></div>' +
          (o.note ? '<p class="o-note"><span>' + t('note') + '</span>' + esc(o.note) + '</p>' : '') +
          (o.delivery_url && /^https:\/\//.test(o.delivery_url) ? '<a class="more" href="' + esc(o.delivery_url) + '" target="_blank" rel="noopener">' + t('files') + '</a>' : '') + '</li>';
      }).join('') + '</ul>';
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
    if ((x = d.getElementById('see-packs'))) x.addEventListener('click', function () { setTimeout(function () { var p = d.getElementById('tab-pachete'); if (p) p.click(); }, 0); });
  }
  d.addEventListener('langchange', render);

  // ---------- pornire ----------
  (async function init() {
    render();
    try { var r = await fetch('/api/config', { cache: 'no-store' }); cfg = r.ok ? await r.json() : { auth: false, payments: false }; }
    catch (e) { cfg = { auth: false, payments: false }; }
    if (!cfg.auth) return render();

    var q = new URLSearchParams(location.search);
    if (q.get('auth') && q.get('code')) {
      try { saveSession(await authPost('pkce', { auth_code: q.get('code'), code_verifier: sload(PKCE) || '' })); }
      catch (e) { notice = { kind: 'warn', text: t('loginErr') }; }
      sstore(PKCE, null); goCont();
    } else if (q.get('auth') && q.get('error')) {
      notice = { kind: 'warn', text: t('loginErr') }; goCont();
    } else if (q.get('plata')) {
      notice = q.get('plata') === 'ok' ? { kind: 'ok', text: t('paidOk') } : { kind: 'warn', text: t('paidCancel') };
      goCont();
    }
    if (!session) session = load(KEY);
    render();
    if (session) {
      await loadOrders();
      var want = sload(BUY); sstore(BUY, null);
      if (want && cfg.payments && session && d.querySelector('[data-buy="' + want + '"]')) openBuy(want);
    }
  })();
})();
