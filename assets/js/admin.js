/* Panoul de comenzi. Folosește aceeași sesiune Google ca pagina Cont;
   serverul verifică la fiecare cerere că emailul e în lista de administratori. */
(function () {
  'use strict';
  var d = document, app = d.getElementById('app');
  var cfg = null, session = null, orders = [], tab = 'new', query = '', unread = {}, openChat = null, chatInst = null;
  var KEY = 'aman.session';
  var LABEL = { requested: 'Cerere nouă', paid: 'Plătită', in_progress: 'În lucru', review: 'De verificat', delivered: 'Livrată', cancelled: 'Anulată', refunded: 'Rambursată' };
  var FLOW = ['requested', 'paid', 'in_progress', 'review', 'delivered', 'cancelled'];
  var TABS = { unread: [], new: ['requested'], active: ['paid', 'in_progress', 'review'], done: ['delivered', 'cancelled', 'refunded'] };
  var TAB_NAME = { unread: 'Necitite', new: 'Cereri noi', active: 'În lucru', done: 'Finalizate' };
  var PAY = 'aman.payinfo';
  function inTab(o, k) { return k === 'unread' ? (unread[o.id] || 0) > 0 : TABS[k].indexOf(o.status) >= 0; }

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
    d.getElementById('reload').hidden = true; d.getElementById('help').hidden = true; d.getElementById('q').hidden = true;
    app.innerHTML = '<div class="box"><p>' + text + '</p>' + (withLogin ? '<a class="btn" href="/#cont">Intră în cont cu Google</a>' : '') + '</div>';
  }

  async function load() {
    var r = await call('GET');
    if (r.status === 401) return msg('Intră mai întâi în cont, cu Google, apoi revino aici.', true);
    if (r.status === 403) return msg('Contul cu care ești logat nu are acces la panou.', false);
    if (r.status !== 200) return msg(esc(r.json.error || 'Nu am putut încărca comenzile.'), false);
    orders = r.json.orders || [];
    await loadUnread(true);
    if (tab === 'new' && Object.keys(unread).some(function (k) { return unread[k] > 0; })) tab = 'unread';
    else if (tab === 'new' && !orders.some(function (o) { return o.status === 'requested'; }) && orders.some(function (o) { return TABS.active.indexOf(o.status) >= 0; })) tab = 'active';
    render();
  }

  function size(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  async function loadClient(li) {
    var tk = await token(); if (!tk) return;
    var r = await fetch('/api/files?kind=client&order=' + li.dataset.id, { headers: { Authorization: 'Bearer ' + tk } });
    var j = await r.json().catch(function () { return {}; });
    var files = (j.files && j.files[li.dataset.id]) || [];
    li.querySelector('[data-clist]').innerHTML = files.length ? files.map(function (f) {
      return '<li><a href="' + esc(f.download) + '">' + esc(f.name) + '</a><span class="meta">' + size(f.size) + '</span><a class="x dl" href="' + esc(f.download) + '">Descarcă</a></li>';
    }).join('') : '<li class="meta">Clientul nu a trimis fișiere.</li>';
  }
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
    var draft = app.querySelector('.chatbox textarea'); draft = draft ? draft.value : '';
    if (chatInst) { chatInst.stop(); chatInst = null; }
    d.getElementById('reload').hidden = false; d.getElementById('help').hidden = false; d.getElementById('q').hidden = false;
    var count = function (k) { return orders.filter(function (o) { return inTab(o, k); }).length; };
    var h = '<div class="tabs" role="tablist">' + Object.keys(TABS).map(function (k) {
      return '<button type="button" role="tab" data-tab="' + k + '" aria-selected="' + (k === tab) + '">' + TAB_NAME[k] + '<b>' + count(k) + '</b></button>';
    }).join('') + '</div>';
    var q = query.trim().toLowerCase().replace(/^@/, '');
    var list = q
      ? orders.filter(function (o) { return [o.code, o.instagram, o.customer_name, o.email, o.title].some(function (v) { return v && String(v).toLowerCase().indexOf(q) >= 0; }); })
      : orders.filter(function (o) { return inTab(o, tab); });
    if (q) h = '<p class="meta" style="margin-bottom:12px">' + list.length + (list.length === 1 ? ' rezultat' : ' rezultate') + ' pentru „' + esc(query.trim()) + '”, din toate comenzile</p>';
    if (!list.length) h += '<p class="empty">' + (q ? 'Nicio comandă găsită. Verifică codul sau username-ul.' : 'Nimic aici deocamdată.') + '</p>';
    else h += '<ul class="list">' + list.map(card).join('') + '</ul>';
    app.innerHTML = h;
    app.querySelectorAll('.card').forEach(function (li) { if (li.querySelector('[data-flist]')) loadFiles(li); if (li.querySelector('[data-clist]')) loadClient(li); });
    var cb = app.querySelector('[data-chatbox]');
    if (cb && window.AmanChat) {
      var oid = cb.dataset.chatbox, o = orders.find(function (x) { return x.id === oid; });
      chatInst = window.AmanChat.mount(cb, { order: oid, token: token, as: 'admin', empty: 'Niciun mesaj încă. Scrie-i clientului primul.', placeholder: 'Răspunde clientului…',
        quick: [{ label: 'Detaliile de plată', text: function () { return payText(o); } }, { label: 'Am primit plata', text: function () { return 'Am primit plata pentru ' + (o.code || 'comandă') + ', mulțumesc! Încep lucrul și te țin la curent aici.'; } }],
        onSeen: function () { unread[oid] = 0; badges(); } });
      if (draft) cb.querySelector('textarea').value = draft;
    }
  }
  function payText(o) {
    var info = ''; try { info = localStorage.getItem(PAY) || ''; } catch (e) {}
    if (!info.trim()) { alert('Completează mai întâi „Detaliile tale de plată”, sus în panou.'); var p = d.getElementById('payinfo'); if (p) { p.open = true; p.querySelector('textarea').focus(); } return ''; }
    return 'Salut! Pentru comanda ' + (o.code || '') + ' (' + o.title + '), suma este ' + money(o) + '.\n\n' + info.trim() + '\n\nLa detaliile transferului scrie codul ' + (o.code || '') + '. După ce primesc plata, îți confirm aici.';
  }
  function badges() {
    app.querySelectorAll('[data-chat]').forEach(function (b) { var n = unread[b.dataset.chat] || 0, e = b.querySelector('.badge'); if (e) { e.textContent = n || ''; e.hidden = !n; } });
    updateCounts();
    var total = Object.keys(unread).reduce(function (a, k) { return a + (unread[k] || 0); }, 0);
    d.title = (total ? '(' + total + ') ' : '') + 'Comenzi · Aman';
  }
  async function loadUnread(silent) {
    var tk = await token(); if (!tk) return;
    var r = await fetch('/api/messages?unread=1', { headers: { Authorization: 'Bearer ' + tk } }).catch(function () { return null; });
    if (!r || !r.ok) return;
    var next = (await r.json()).unread || {};
    if (openChat) next[openChat] = 0;
    var fresh = Object.keys(next).some(function (k) { return (next[k] || 0) > (unread[k] || 0); });
    unread = next;
    if (!silent) { badges(); if (fresh) { var ids = Object.keys(next); if (ids.some(function (k) { return !orders.some(function (o) { return o.id === k; }); })) load(); } }
  }

  function card(o) {
    return '<li class="card" data-id="' + o.id + '">' +
      '<div class="head"><div>' + (o.code ? '<p class="code">' + esc(o.code) + '</p>' : '') + '<h2>' + esc(o.title) + '</h2><div class="who">' + esc(o.customer_name || 'Fără nume') + (o.email ? ' · ' + esc(o.email) : '') + '</div>' +
        (o.instagram ? '<a class="igh" href="https://www.instagram.com/' + encodeURIComponent(o.instagram) + '/" target="_blank" rel="noopener">@' + esc(o.instagram) + '</a>' : '<span class="meta">Fără Instagram</span>') +
        '</div><span class="price">' + money(o) + '</span></div>' +
      (o.brief ? '<div class="brief"><label>Ce vrea clientul</label><p>' + esc(o.brief) + '</p></div>' : '') +
      (o.site_id ? '<div class="brief"><label>Site din editor</label><p>„Plătită” deblochează descărcarea pentru client. <a href="/editor.html?id=' + esc(o.site_id) + '" target="_blank" rel="noopener">Vezi site-ul în editor ›</a></p></div>' : '') +
      (o.site_id ? '' : '<div class="files cl"><label>Materiale de la client</label><ul class="flist" data-clist><li class="meta">Se încarcă…</li></ul></div>') +
      '<button type="button" class="chat-toggle" data-chat="' + o.id + '" aria-expanded="' + (openChat === o.id) + '"><span>' + (openChat === o.id ? 'Ascunde conversația' : 'Conversația cu clientul') + '</span><b class="badge"' + (unread[o.id] ? '' : ' hidden') + '>' + (unread[o.id] || '') + '</b></button>' +
      (openChat === o.id ? '<div class="chatbox" data-chatbox="' + o.id + '"></div>' : '') +
      '<div class="st">' + FLOW.map(function (s) { return '<button type="button" data-s="' + s + '" aria-pressed="' + (o.status === s) + '">' + LABEL[s] + '</button>'; }).join('') + '</div>' +
      '<div><label for="n-' + o.id + '">Notă scurtă, afișată la comandă (opțional)</label><textarea id="n-' + o.id + '" maxlength="1000" placeholder="ex: Am primit plata, livrez joi.">' + esc(o.note || '') + '</textarea></div>' +
      '<div><label for="u-' + o.id + '">Link livrare (opțional)</label><input type="url" id="u-' + o.id + '" placeholder="https://drive.google.com/…" value="' + esc(o.delivery_url || '') + '"/></div>' +
      '<div class="row"><button type="button" class="btn" data-save>Salvează</button><span class="out" aria-live="polite"></span></div>' +
      (o.site_id ? '' : '<div class="files"><label>Fișiere pentru client</label><ul class="flist" data-flist><li class="meta">Se încarcă…</li></ul>' +
      '<label class="up"><input type="file" multiple data-up/> <span>＋ Adaugă fișiere</span></label><span class="meta"> Maximum 50 MB pe fișier. Clientul le vede în contul lui.</span></div>') +
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
    updateCounts();
  }
  function updateCounts() {
    app.querySelectorAll('[data-tab]').forEach(function (b) {
      var n = orders.filter(function (o) { return inTab(o, b.dataset.tab); }).length;
      var el = b.querySelector('b'); if (el) el.textContent = n;
    });
  }

  app.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; render(); return; }
    var li = e.target.closest('.card'); if (!li) return;
    var ch = e.target.closest('[data-chat]');
    if (ch) { openChat = openChat === ch.dataset.chat ? null : ch.dataset.chat; render(); var box = app.querySelector('[data-chatbox]'); if (box) box.scrollIntoView({ block: 'nearest' }); return; }
    var del = e.target.closest('[data-del]');
    if (del) { delFile(li, del.dataset.del); return; }
    var s = e.target.closest('.st button');
    if (s) { save(li, { status: s.dataset.s }); return; }
    if (e.target.closest('[data-save]')) {
      save(li, { note: li.querySelector('#n-' + li.dataset.id).value, delivery_url: li.querySelector('#u-' + li.dataset.id).value });
    }
  });
  app.addEventListener('change', function (e) {
    if (e.target.matches('[data-up]') && e.target.files.length) { upload(e.target.closest('.card'), Array.prototype.slice.call(e.target.files)); e.target.value = ''; }
  });
  d.getElementById('reload').addEventListener('click', load);
  d.getElementById('q').addEventListener('input', function (e) { query = e.target.value; if (orders.length || query) render(); });

  (async function init() {
    try { var r = await fetch('/api/config', { cache: 'no-store' }); cfg = r.ok ? await r.json() : { auth: false }; } catch (e) { cfg = { auth: false }; }
    if (!cfg.auth) return msg('Conturile nu sunt încă active.', false);
    var p = d.getElementById('payinfo'), ta = p && p.querySelector('textarea');
    if (ta) { try { ta.value = localStorage.getItem(PAY) || ''; } catch (e) {} ta.addEventListener('input', function () { try { localStorage.setItem(PAY, ta.value); } catch (e) {} var s = d.getElementById('paysaved'); if (s) s.textContent = 'Salvat pe acest dispozitiv ✓'; }); }
    await load();
    setInterval(function () { if (!d.hidden && orders.length) loadUnread(false); }, 20000);
  })();
})();
