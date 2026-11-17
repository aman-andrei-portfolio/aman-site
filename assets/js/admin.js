/* Panoul de comenzi. Folosește aceeași sesiune Google ca pagina Cont;
   serverul verifică la fiecare cerere că emailul e în lista de administratori. */
(function () {
  'use strict';
  var d = document, app = d.getElementById('app');
  var cfg = null, session = null, orders = [], tab = 'new';
  var KEY = 'aman.session';
  var LABEL = { requested: 'Cerere nouă', paid: 'Plătită', in_progress: 'În lucru', review: 'De verificat', delivered: 'Livrată', cancelled: 'Anulată', refunded: 'Rambursată' };
  var FLOW = ['requested', 'paid', 'in_progress', 'review', 'delivered', 'cancelled'];
  var TABS = { new: ['requested'], active: ['paid', 'in_progress', 'review'], done: ['delivered', 'cancelled', 'refunded'] };
  var TAB_NAME = { new: 'Cereri noi', active: 'În lucru', done: 'Finalizate' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(o) { var v = o.amount / 100, n = v % 1 ? v.toFixed(2) : String(v); return o.currency === 'eur' ? '€' + n : n + ' lei'; }
  function when(s) { return s ? new Date(s).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }

  async function token() {
    try { session = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { session = null; }
    if (!session) return null;
    if (session.expires_at - 60 > Date.now() / 1000) return session.access_token;
    var r = await fetch(cfg.supabaseUrl + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: cfg.supabaseAnonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session.refresh_token }) });
    if (!r.ok) { try { localStorage.removeItem(KEY); } catch (e) {} return null; }
    var j = await r.json();
    session.access_token = j.access_token; session.refresh_token = j.refresh_token;
    session.expires_at = j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600);
    try { localStorage.setItem(KEY, JSON.stringify(session)); } catch (e) {}
    return session.access_token;
  }
  async function call(method, body) {
    var tk = await token();
    if (!tk) return { status: 401, json: {} };
    var r = await fetch('/api/admin', { method: method, headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(function () { return {}; }) };
  }

  function msg(text, withLogin) {
    d.getElementById('reload').hidden = true; d.getElementById('help').hidden = true;
    app.innerHTML = '<div class="box"><p>' + text + '</p>' + (withLogin ? '<a class="btn" href="/#cont">Intră în cont cu Google</a>' : '') + '</div>';
  }

  async function load() {
    var r = await call('GET');
    if (r.status === 401) return msg('Intră mai întâi în cont, cu Google, apoi revino aici.', true);
    if (r.status === 403) return msg('Contul cu care ești logat nu are acces la panou.', false);
    if (r.status !== 200) return msg(esc(r.json.error || 'Nu am putut încărca comenzile.'), false);
    orders = r.json.orders || [];
    if (tab === 'new' && !orders.some(function (o) { return o.status === 'requested'; }) && orders.some(function (o) { return TABS.active.indexOf(o.status) >= 0; })) tab = 'active';
    render();
  }

  function size(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  async function loadFiles(li) {
    var tk = await token(); if (!tk) return;
    var r = await fetch('/api/files?order=' + li.dataset.id, { headers: { Authorization: 'Bearer ' + tk } });
    var j = await r.json().catch(function () { return {}; });
    var files = (j.files && j.files[li.dataset.id]) || [];
    var ul = li.querySelector('[data-flist]');
    ul.innerHTML = files.length ? files.map(function (f) {
      return '<li><a href="' + esc(f.download) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a><span class="meta">' + size(f.size) + '</span><button type="button" class="x" data-del="' + esc(f.name) + '" aria-label="Șterge ' + esc(f.name) + '">Șterge</button></li>';
    }).join('') : '<li class="meta">Niciun fișier încă.</li>';
  }
  function put(url, file, onp) {
    return new Promise(function (ok, bad) {
      var x = new XMLHttpRequest(); x.open('PUT', url);
      x.setRequestHeader('Content-Type', file.type || 'application/octet-stream'); x.setRequestHeader('x-upsert', 'true');
      x.upload.onprogress = function (e) { if (e.lengthComputable) onp(Math.round(e.loaded / e.total * 100)); };
      x.onload = function () { x.status < 300 ? ok() : bad(new Error('Încărcarea a eșuat (' + x.status + ').')); };
      x.onerror = function () { bad(new Error('Conexiunea s-a întrerupt.')); };
      x.send(file);
    });
  }
  async function upload(li, list) {
    var out = li.querySelector('.out');
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      out.className = 'out'; out.textContent = 'Se încarcă ' + f.name + '…';
      if (f.size > 50 * 1024 * 1024) { out.className = 'out err'; out.textContent = f.name + ' are peste 50 MB. Folosește „Link livrare”.'; continue; }
      var tk = await token();
      var r = await fetch('/api/files', { method: 'POST', headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'upload', order: li.dataset.id, name: f.name, size: f.size }) });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) { out.className = 'out err'; out.textContent = j.error || 'Nu am putut pregăti încărcarea.'; continue; }
      try { await put(j.url, f, function (p) { out.textContent = 'Se încarcă ' + f.name + '… ' + p + '%'; }); out.className = 'out saved'; out.textContent = 'Încărcat ✓'; }
      catch (e) { out.className = 'out err'; out.textContent = e.message; }
    }
    loadFiles(li);
  }
  async function delFile(li, name) {
    var tk = await token();
    var r = await fetch('/api/files', { method: 'POST', headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', order: li.dataset.id, name: name }) });
    var out = li.querySelector('.out');
    if (r.ok) { out.className = 'out saved'; out.textContent = 'Șters ✓'; } else { out.className = 'out err'; out.textContent = 'Nu s-a șters.'; }
    loadFiles(li);
  }

  function render() {
    d.getElementById('reload').hidden = false; d.getElementById('help').hidden = false;
    var count = function (k) { return orders.filter(function (o) { return TABS[k].indexOf(o.status) >= 0; }).length; };
    var h = '<div class="tabs" role="tablist">' + Object.keys(TABS).map(function (k) {
      return '<button type="button" role="tab" data-tab="' + k + '" aria-selected="' + (k === tab) + '">' + TAB_NAME[k] + '<b>' + count(k) + '</b></button>';
    }).join('') + '</div>';
    var list = orders.filter(function (o) { return TABS[tab].indexOf(o.status) >= 0; });
    if (!list.length) h += '<p class="empty">Nimic aici deocamdată.</p>';
    else h += '<ul class="list">' + list.map(card).join('') + '</ul>';
    app.innerHTML = h;
    app.querySelectorAll('.card').forEach(loadFiles);
  }

  function card(o) {
    return '<li class="card" data-id="' + o.id + '">' +
      '<div class="head"><div><h2>' + esc(o.title) + '</h2><div class="who">' + esc(o.customer_name || 'Fără nume') + (o.email ? ' · ' + esc(o.email) : '') + '</div></div><span class="price">' + money(o) + '</span></div>' +
      '<div class="st">' + FLOW.map(function (s) { return '<button type="button" data-s="' + s + '" aria-pressed="' + (o.status === s) + '">' + LABEL[s] + '</button>'; }).join('') + '</div>' +
      '<div><label for="n-' + o.id + '">Mesaj pentru client</label><textarea id="n-' + o.id + '" maxlength="1000" placeholder="ex: Am primit plata, livrez joi.">' + esc(o.note || '') + '</textarea></div>' +
      '<div><label for="u-' + o.id + '">Link livrare (opțional)</label><input type="url" id="u-' + o.id + '" placeholder="https://drive.google.com/…" value="' + esc(o.delivery_url || '') + '"/></div>' +
      '<div class="row"><button type="button" class="btn" data-save>Salvează</button><span class="out" aria-live="polite"></span></div>' +
      '<div class="files"><label>Fișiere pentru client</label><ul class="flist" data-flist><li class="meta">Se încarcă…</li></ul>' +
      '<label class="up"><input type="file" multiple data-up/> <span>＋ Adaugă fișiere</span></label><span class="meta"> Maximum 50 MB pe fișier. Clientul le vede în contul lui.</span></div>' +
      '<p class="meta">Cerută ' + when(o.created_at) + (o.paid_at ? ' · plătită ' + when(o.paid_at) : '') + '</p></li>';
  }

  async function save(li, patch) {
    var out = li.querySelector('.out');
    out.className = 'out'; out.textContent = 'Se salvează…';
    li.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    var r = await call('POST', Object.assign({ id: li.dataset.id }, patch));
    li.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
    if (r.status !== 200) { out.className = 'out err'; out.textContent = r.json.error || 'Nu s-a salvat.'; return; }
    var o = orders.find(function (x) { return x.id === li.dataset.id; });
    Object.assign(o, r.json.order);
    li.querySelectorAll('.st button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.s === o.status)); });
    out.className = 'out saved'; out.textContent = 'Salvat ✓';
  }

  app.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; render(); return; }
    var li = e.target.closest('.card'); if (!li) return;
    var del = e.target.closest('[data-del]');
    if (del) { delFile(li, del.dataset.del); return; }
    var s = e.target.closest('.st button');
    if (s) { save(li, { status: s.dataset.s }); return; }
    if (e.target.closest('[data-save]')) {
      save(li, { note: li.querySelector('textarea').value, delivery_url: li.querySelector('input[type=url]').value });
    }
  });
  app.addEventListener('change', function (e) {
    if (e.target.matches('[data-up]') && e.target.files.length) { upload(e.target.closest('.card'), Array.prototype.slice.call(e.target.files)); e.target.value = ''; }
  });
  d.getElementById('reload').addEventListener('click', load);

  (async function init() {
    try { var r = await fetch('/api/config', { cache: 'no-store' }); cfg = r.ok ? await r.json() : { auth: false }; } catch (e) { cfg = { auth: false }; }
    if (!cfg.auth) return msg('Conturile nu sunt încă active.', false);
    load();
  })();
})();
