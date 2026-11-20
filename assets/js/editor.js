/* Editorul de site-uri. Textele se salvează local în browser; după logare, ciorna se salvează și în cont
   (cu poze). La final, clientul cere site-ul: primește un cod și o conversație pe site, plătește,
   iar după ce marchezi comanda „Plătită” în panou, apare butonul de descărcare (ZIP). */
(function () {
  'use strict';
  var d = document, ST = window.SiteTemplates;
  var LOCAL = 'aman.editor.v1', SESSION = 'aman.session';
  var PRICE = { ro: '149 lei', en: '€29' };
  var SWATCHES = ['#c8a24a', '#8a5a3b', '#c56b8a', '#2b59ff', '#1a7f37', '#d9480f', '#6741d9', '#111111'];

  var S = { id: null, template: 'barber', data: ST.starter('barber'), assets: {}, order: null, own: true, step: 0 };
  var cfg = null, session = null, saveTimer = 0, pvTimer = 0, dirty = false;

  var $ = function (id) { return d.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function T() { return ST.TEMPLATES[S.template]; }
  // Site plătit = înghețat (descărcarea e exact versiunea plătită). Admin = doar vizualizare.
  function locked() { return !!(S.order && S.order.unlocked); }
  function editable() { return S.own && !locked(); }
  function steps() { return ['Șablon', 'Identitate', 'Poze', T().itemsLabel, 'Contact', 'Gata']; }

  // ---------- cont ----------
  async function token() {
    session = lsGet(SESSION);
    if (!session || !cfg || !cfg.auth) return null;
    if (session.expires_at - 60 > Date.now() / 1000) return session.access_token;
    var r = await fetch(cfg.supabaseUrl + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: cfg.supabaseAnonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session.refresh_token }) });
    if (!r.ok) { session = null; return null; }
    var j = await r.json();
    session.access_token = j.access_token; session.refresh_token = j.refresh_token;
    session.expires_at = j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600);
    lsSet(SESSION, session);
    return session.access_token;
  }
  function goLogin() {
    ssSet('aman.return', '/editor.html' + (S.id ? '?id=' + S.id : ''));
    ssSet('aman.autologin', '1');
    location.href = '/#cont';
  }
  async function api(method, path, body) {
    var tk = await token(); if (!tk) return { status: 401, json: {} };
    var r = await fetch(path, { method: method, headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, ok: r.ok, json: await r.json().catch(function () { return {}; }) };
  }

  // ---------- salvare ----------
  function status(t) { $('saved').textContent = t || ''; }
  function changed() {
    if (!editable()) return;
    dirty = true;
    lsSet(LOCAL, { id: S.id, template: S.template, data: S.data });
    preview();
    status(session ? 'Se salvează…' : 'Salvat pe acest dispozitiv');
    clearTimeout(saveTimer);
    if (S.id && session) saveTimer = setTimeout(function () { save(false); }, 1200);
  }
  async function save(create) {
    if (!editable()) return false;
    if (!(await token())) { status('Salvat pe acest dispozitiv'); return false; }
    if (!S.id && !create) return false;
    var r = await api('POST', '/api/sites', { action: 'save', id: S.id || undefined, template: S.template, data: S.data });
    if (!r.ok) { status(''); flash(r.json.error || 'Nu s-a putut salva.'); return false; }
    if (!S.id) { S.id = r.json.id; history.replaceState(null, '', '/editor.html?id=' + S.id); lsSet(LOCAL, { id: S.id, template: S.template, data: S.data }); }
    dirty = false; status('Salvat în cont ✓');
    return true;
  }
  function flash(msg) { var e = d.querySelector('#body .err'); if (e) { e.textContent = msg; e.hidden = false; } else alert(msg); }

  // ---------- previzualizare ----------
  function preview() {
    clearTimeout(pvTimer);
    pvTimer = setTimeout(function () {
      $('pv').srcdoc = ST.render(S.template, S.data, { preview: true, img: function (n) { return S.assets[n] || ''; } });
    }, 120);
  }

  // ---------- pași ----------
  function renderSteps() {
    $('steps').innerHTML = steps().map(function (n, i) { return '<button type="button" role="tab" data-step="' + i + '" aria-selected="' + (i === S.step) + '" title="' + esc(n) + '"><b>' + (i + 1) + '</b><span>' + esc(n) + '</span></button>'; }).join('');
    $('prev').style.visibility = S.step ? 'visible' : 'hidden';
    $('next').hidden = S.step === steps().length - 1;
    $('next').textContent = S.step === steps().length - 2 ? 'Gata, vezi prețul' : 'Continuă';
  }
  function go(i) {
    S.step = Math.max(0, Math.min(steps().length - 1, i)); renderSteps(); renderBody(); $('body').scrollTop = 0;
    var cur = d.querySelector('#steps [aria-selected="true"]'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function field(key, label, opts) {
    opts = opts || {}; var max = ST.LIMITS[key] || 200, v = S.data[key] || '';
    var input = opts.area
      ? '<textarea id="f-' + key + '" data-k="' + key + '" maxlength="' + max + '" rows="' + (opts.rows || 4) + '" placeholder="' + esc(opts.ph || '') + '">' + esc(v) + '</textarea>'
      : '<input type="' + (opts.type || 'text') + '" id="f-' + key + '" data-k="' + key + '" maxlength="' + max + '" value="' + esc(v) + '" placeholder="' + esc(opts.ph || '') + '"' + (opts.type === 'tel' ? ' inputmode="tel"' : '') + ' autocomplete="off"/>';
    return '<label class="f" for="f-' + key + '">' + label + (opts.count ? '<span class="count" data-count="' + key + '">' + v.length + '/' + max + '</span>' : '') + '</label>' + input;
  }

  function renderBody() {
    var b = $('body'), t = T(), h = '';
    var ro = S.own ? '' : '<p class="note warn">Vezi site-ul clientului ca administrator. Modificările nu se salvează.</p>';
    switch (S.step) {
      case 0:
        h = '<h2>Alege un șablon</h2><p class="sub">Pornești de la un site deja completat. Schimbi doar ce e al tău.</p><div class="tpls">' +
          Object.keys(ST.TEMPLATES).map(function (k) {
            var x = ST.TEMPLATES[k], dk = x.defaults.theme === 'dark';
            var A = x.defaults.accent, fg = dk ? '#f2f2f2' : '#151515';
            // Miniatură: același font, aceleași culori și același buton ca șablonul real.
            var sw = '<span class="sw" aria-hidden="true" style="background:' + (dk ? '#111' : A + '14') + ';color:' + fg + '">' +
              '<i class="sw-t" style="font-family:' + esc(x.font) + ';' + (x.upper ? 'text-transform:uppercase;' : '') + (x.italic ? 'font-style:italic;' : '') + '">' + esc(x.defaults.name) + '</i>' +
              '<i class="sw-l" style="background:' + fg + '"></i><i class="sw-b" style="background:' + A + '"></i></span>';
            return '<button type="button" class="tpl" data-tpl="' + k + '" aria-pressed="' + (k === S.template) + '">' + sw + '<strong>' + esc(x.label) + '</strong><small>' + esc(x.itemsHint) + '</small></button>';
          }).join('') + '</div>';
        break;
      case 1:
        h = '<h2>Numele și stilul</h2><p class="sub">Așa te vor vedea clienții tăi.</p>' +
          field('name', 'Numele afacerii', { ph: t.defaults.name }) +
          field('tagline', 'Slogan (o frază)', { count: true, ph: t.defaults.tagline }) +
          field('about', 'Despre', { area: true, count: true, rows: 5, ph: 'Câteva fraze despre tine sau afacerea ta' }) +
          field('cta', 'Textul butonului principal', { ph: t.cta }) +
          '<label class="f">Culoarea principală</label><div class="swatches" id="sw">' +
          SWATCHES.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '" aria-label="Culoare ' + c + '" aria-pressed="' + (S.data.accent === c) + '"></button>'; }).join('') +
          '<input type="color" id="f-accent" value="' + esc(S.data.accent) + '" aria-label="Altă culoare"/></div>' +
          '<label class="f">Fundal</label><div class="seg" id="theme"><button type="button" data-th="light" aria-pressed="' + (S.data.theme === 'light') + '">Luminos</button><button type="button" data-th="dark" aria-pressed="' + (S.data.theme === 'dark') + '">Întunecat</button></div>';
        break;
      case 2:
        if (!session) {
          h = '<h2>Pozele tale</h2><p class="sub">Logo, o poză mare pentru început și până la 6 poze în galerie.</p><p class="note">Ca să urci poze, intră în cont cu Google. Textele scrise până acum rămân salvate.</p><p><button type="button" class="btn" id="login">Intră cu Google</button></p><p class="sub" style="margin-top:14px">Poți sări peste pas: site-ul arată bine și fără poze.</p>';
        } else {
          var slot = function (kind, label, hint) {
            var f = S.data[kind], u = f && S.assets[f];
            return '<label class="f">' + label + '</label><div class="slot">' + (u ? '<img src="' + esc(u) + '" alt=""/>' : '<span class="ph">＋</span>') +
              '<span class="t">' + (f ? 'Poză încărcată' : 'Nicio poză') + '<small>' + hint + '</small></span>' +
              (f ? '<button type="button" class="plain danger" data-rm="' + kind + '">Șterge</button>' : '') +
              '<span class="btn sm ghost up">' + (f ? 'Schimbă' : 'Alege') + '<input type="file" accept="image/*" data-up="' + kind + '"/></span></div>';
          };
          h = '<h2>Pozele tale</h2><p class="sub">Le micșorez automat, ca site-ul să se încarce repede.</p>' + ro +
            slot('logo', 'Logo', 'Pătrat, apare lângă nume') + slot('hero', 'Poza principală', 'Apare mare, în spatele numelui') +
            '<label class="f">Galerie <span class="count">' + S.data.gallery.length + '/6</span></label><div class="gal">' +
            S.data.gallery.map(function (f, i) { return '<figure><img src="' + esc(S.assets[f] || '') + '" alt=""/><button type="button" data-rmg="' + i + '" aria-label="Șterge poza">×</button></figure>'; }).join('') +
            (S.data.gallery.length < 6 ? '<label class="add">＋ Adaugă<input type="file" accept="image/*" multiple data-up="gallery"/></label>' : '') + '</div>' +
            '<p class="err" hidden></p><p class="sub" id="upst" aria-live="polite" style="margin-top:10px"></p>';
        }
        break;
      case 3:
        h = '<h2>' + esc(t.itemsLabel) + '</h2><p class="sub">' + esc(t.itemsHint) + '. Prețul e opțional.</p><ul class="items" id="items">' +
          S.data.items.map(function (it, i) {
            return '<li><input type="text" data-i="' + i + '" data-f="name" maxlength="60" value="' + esc(it.name) + '" placeholder="Nume" aria-label="Nume"/>' +
              '<input type="text" data-i="' + i + '" data-f="price" maxlength="24" value="' + esc(it.price) + '" placeholder="Preț" aria-label="Preț"/>' +
              '<input class="d" type="text" data-i="' + i + '" data-f="desc" maxlength="160" value="' + esc(it.desc) + '" placeholder="Descriere scurtă (opțional)" aria-label="Descriere"/>' +
              '<span class="ctl">' + (i ? '<button type="button" class="plain" data-up-i="' + i + '">↑ Sus</button>' : '') + '<button type="button" class="plain danger" data-del-i="' + i + '">Șterge</button></span></li>';
          }).join('') + '</ul>' + (S.data.items.length < ST.LIMITS.items ? '<p><button type="button" class="btn ghost sm" id="add-item">＋ Adaugă</button></p>' : '');
        break;
      case 4:
        h = '<h2>Contact și program</h2><p class="sub">Butonul principal duce pe WhatsApp, dacă îl completezi.</p>' +
          field('phone', 'Telefon', { type: 'tel', ph: '07xx xxx xxx' }) + field('whatsapp', 'WhatsApp', { type: 'tel', ph: '07xx xxx xxx' }) +
          field('instagram', 'Instagram', { ph: 'numele.tau' }) + field('email', 'Email', { type: 'email', ph: 'contact@exemplu.ro' }) +
          field('address', 'Adresă', { ph: 'Strada, număr, oraș' }) +
          '<label class="f">Program (lasă gol zilele în care nu vrei să apară)</label><div class="hours">' +
          ST.DAYS.map(function (day, i) { return '<span>' + day + '</span><input type="text" data-h="' + i + '" maxlength="30" value="' + esc(S.data.hours[i]) + '" placeholder="ex: 09:00–18:00 sau Închis" aria-label="' + day + '"/>'; }).join('') + '</div>';
        break;
      case 5:
        h = renderFinal();
        break;
    }
    if (locked() && S.step !== 5) {
      h = '<div class="note ok lockbar"><strong>Site-ul ăsta e plătit.</strong> Îl poți descărca oricând (pasul Gata sau din cont). Ca să schimbi ceva, fă o versiune nouă: o copie pe care o comanzi separat.' +
        (S.own ? '<p style="margin:10px 0 0"><button type="button" class="btn sm" id="dup">Fă o versiune nouă</button></p>' : '') + '<p class="err" hidden></p></div>' +
        '<fieldset class="lock" disabled>' + h + '</fieldset>';
    }
    b.innerHTML = h;
  }

  function renderFinal() {
    var lang = d.documentElement.lang === 'en' ? 'en' : 'ro';
    var o = S.order;
    if (o && o.unlocked) {
      return '<h2>Site-ul tău e gata</h2><p class="note ok">Plata e confirmată. Poți descărca site-ul oricând, și din contul tău.</p>' +
        '<p><button type="button" class="btn" id="dl">Descarcă site-ul (ZIP)</button></p>' + (S.own ? '<p class="sub">Vrei să schimbi ceva? <button type="button" class="plain" id="dup">Fă o versiune nouă ›</button></p>' : '') + '<p class="sub">În arhivă găsești și instrucțiuni simple pentru a-l pune online gratuit. Prin descărcare ești de acord cu livrarea imediată a conținutului digital.</p><p class="err" hidden></p>';
    }
    if (o) {
      return '<h2>Comanda e trimisă</h2><p class="code">' + esc(o.code) + '</p>' +
        '<p class="sub">Îți răspund pe site, în conversația comenzii, cu detaliile de plată. După ce confirm plata, aici și în contul tău apare butonul de descărcare.</p>' +
        '<p><a class="btn" id="tochat" href="/#cont">Deschide conversația</a></p>' +
        '<p class="sub" style="margin-top:14px">Poți continua să modifici site-ul până la descărcare.</p>';
    }
    var list = '<ul class="list"><li>Site-ul complet, gata de pus online</li><li>Pozele tale, optimizate</li><li>Arată bine pe telefon și calculator</li><li>Instrucțiuni pas cu pas pentru publicare</li></ul>';
    if (!session) return '<h2>Îți place?</h2><p class="price">' + PRICE[lang] + '</p>' + list + '<p class="note" style="margin-top:16px">Intră în cont ca să-ți salvăm site-ul și să primești codul comenzii.</p><p><button type="button" class="btn" id="login">Intră cu Google</button></p>';
    return '<h2>Îți place?</h2><p class="price">' + PRICE[lang] + '</p>' + list +
      '<label class="f" for="f-ig">Instagram (opțional)</label><input type="text" id="f-ig" maxlength="40" placeholder="@numele.tau sau al afacerii" autocapitalize="none" autocomplete="off"/>' +
      '<p class="sub" style="margin-top:12px">Primești un cod și vorbim aici, pe site: îți trimit detaliile de plată, plătești prin transfer, iar eu deblochez descărcarea.</p>' +
      '<p><button type="button" class="btn" id="buy">Vreau site-ul</button></p><p class="err" hidden></p>' +
      '<p class="sub" style="font-size:12px">Site-ul e conținut digital: după ce îl descarci, nu mai poți cere banii înapoi. Detalii în <a href="/termeni.html" target="_blank" rel="noopener">Termeni</a>.</p>';
  }

  // ---------- poze ----------
  function resize(file, max, keepPng) {
    return new Promise(function (ok, bad) {
      var im = new Image(), url = URL.createObjectURL(file);
      im.onload = function () {
        var s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = d.createElement('canvas');
        c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
        var x = c.getContext('2d'); if (!keepPng) { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
        x.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? ok(b) : bad(new Error('Poza nu a putut fi procesată.')); }, keepPng ? 'image/png' : 'image/jpeg', 0.85);
      };
      im.onerror = function () { bad(new Error('Fișierul nu e o poză validă.')); };
      im.src = url;
    });
  }
  async function upload(kind, files) {
    var st = $('upst');
    if (!S.id && !(await save(true))) return;
    for (var i = 0; i < files.length; i++) {
      if (kind === 'gallery' && S.data.gallery.length >= 6) break;
      try {
        if (st) st.textContent = 'Se încarcă poza ' + (i + 1) + ' din ' + files.length + '…';
        var png = kind === 'logo' && /png/.test(files[i].type);
        var blob = await resize(files[i], kind === 'logo' ? 512 : kind === 'hero' ? 2000 : 1600, png);
        var r = await api('POST', '/api/sites', { action: 'upload', id: S.id, kind: kind, size: blob.size, type: blob.type });
        if (!r.ok) throw new Error(r.json.error || 'Nu am putut încărca poza.');
        var put = await fetch(r.json.url, { method: 'PUT', headers: { 'Content-Type': blob.type, 'x-upsert': 'true' }, body: blob });
        if (!put.ok) throw new Error('Încărcarea a eșuat. Încearcă din nou.');
        if (kind === 'gallery') S.data.gallery.push(r.json.file);
        else { var old = S.data[kind]; S.data[kind] = r.json.file; if (old) api('POST', '/api/sites', { action: 'delete-asset', id: S.id, file: old }); }
      } catch (e) { flash(e.message); }
    }
    changed(); await save(false); await refreshAssets(); renderBody(); preview();
  }
  // Linkuri temporare de la server (previzualizarea izolată nu poate citi pozele din memoria browserului).
  async function refreshAssets() {
    if (!S.id) return;
    var g = await api('GET', '/api/sites?id=' + S.id);
    if (g.ok) { S.assets = g.json.assets || {}; if (g.json.order) S.order = g.json.order; }
  }
  function removeAsset(file) { if (file && S.id) api('POST', '/api/sites', { action: 'delete-asset', id: S.id, file: file }); }

  // ---------- evenimente ----------
  d.addEventListener('input', function (e) {
    var el = e.target;
    if (!editable() && el.closest('#body')) return;
    if (el.dataset.k) {
      S.data[el.dataset.k] = el.value;
      var c = d.querySelector('[data-count="' + el.dataset.k + '"]'); if (c) c.textContent = el.value.length + '/' + (ST.LIMITS[el.dataset.k] || '');
      changed();
    } else if (el.dataset.i !== undefined && el.dataset.f) { S.data.items[+el.dataset.i][el.dataset.f] = el.value; changed(); }
    else if (el.dataset.h !== undefined) { S.data.hours[+el.dataset.h] = el.value; changed(); }
    else if (el.id === 'f-accent') { S.data.accent = el.value; changed(); d.querySelectorAll('#sw [data-c]').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); }
  });
  d.addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset && el.dataset.up && el.files && el.files.length) { upload(el.dataset.up, Array.prototype.slice.call(el.files)); el.value = ''; }
  });
  d.addEventListener('click', function (e) {
    var t = e.target.closest('button,a'); if (!t) return;
    if (t.dataset.step !== undefined) return go(+t.dataset.step);
    if (t.id === 'next') return go(S.step + 1);
    if (t.id === 'prev') return go(S.step - 1);
    if (t.dataset.mtab) { $('app').dataset.tab = t.dataset.mtab; d.querySelectorAll('[data-mtab]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === t)); }); return; }
    if (t.dataset.dev) { $('frame').className = 'frame' + (t.dataset.dev === 'phone' ? ' phone' : ''); d.querySelectorAll('[data-dev]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === t)); }); return; }
    if (t.id === 'login') return goLogin();
    if (t.id === 'dup') return duplicate();
    if (!editable() && t.closest('#body') && t.id !== 'dl' && t.id !== 'tochat' && t.id !== 'login') return;
    if (t.dataset.tpl) {
      var pristine = JSON.stringify(S.data) === JSON.stringify(ST.starter(S.template));
      var keepImgs = { logo: S.data.logo, hero: S.data.hero, gallery: S.data.gallery };
      S.template = t.dataset.tpl;
      if (pristine) S.data = Object.assign(ST.starter(S.template), keepImgs);
      renderSteps(); renderBody(); changed(); return;
    }
    if (t.dataset.c) { S.data.accent = t.dataset.c; d.querySelectorAll('#sw [data-c]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === t)); }); $('f-accent').value = t.dataset.c; changed(); return; }
    if (t.dataset.th) { S.data.theme = t.dataset.th; d.querySelectorAll('#theme [data-th]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === t)); }); changed(); return; }
    if (t.id === 'add-item') { S.data.items.push({ name: '', price: '', desc: '' }); renderBody(); var ins = d.querySelectorAll('#items li:last-child input'); if (ins[0]) ins[0].focus(); changed(); return; }
    if (t.dataset.delI !== undefined) { S.data.items.splice(+t.dataset.delI, 1); renderBody(); changed(); return; }
    if (t.dataset.upI !== undefined) { var i = +t.dataset.upI, a = S.data.items; a.splice(i - 1, 0, a.splice(i, 1)[0]); renderBody(); changed(); return; }
    if (t.dataset.rm) { removeAsset(S.data[t.dataset.rm]); S.data[t.dataset.rm] = ''; renderBody(); changed(); return; }
    if (t.dataset.rmg !== undefined) { removeAsset(S.data.gallery.splice(+t.dataset.rmg, 1)[0]); renderBody(); changed(); return; }
    if (t.id === 'buy') return buy();
    if (t.id === 'tochat') { try { sessionStorage.setItem('aman.openchat', S.order && S.order.id || ''); } catch (x) {} return; }
    if (t.id === 'dl') return download();
  });

  async function duplicate() {
    var btn = $('dup'); if (btn) { btn.disabled = true; btn.textContent = 'Se copiază…'; }
    var r = await api('POST', '/api/sites', { action: 'duplicate', id: S.id });
    if (!r.ok) { if (btn) { btn.disabled = false; btn.textContent = 'Fă o versiune nouă'; } return flash(r.json.error || 'Nu am putut face copia.'); }
    lsSet(LOCAL, { id: r.json.id, template: S.template, data: S.data });
    location.href = '/editor.html?id=' + r.json.id;
  }
  async function buy() {
    var btn = $('buy'); btn.disabled = true;
    if (!(await save(true))) { btn.disabled = false; return; }
    var r = await api('POST', '/api/sites', { action: 'order', id: S.id, instagram: ($('f-ig') || {}).value || '', lang: d.documentElement.lang });
    if (!r.ok) { btn.disabled = false; return flash(r.json.error || 'Nu am putut trimite comanda.'); }
    S.order = { id: r.json.id, code: r.json.code, status: r.json.status, unlocked: false };
    renderBody();
  }
  async function download() {
    var tk = await token(); if (!tk) return goLogin();
    var btn = $('dl'); btn.disabled = true; btn.textContent = 'Se pregătește…';
    var r = await fetch('/api/site-export?id=' + S.id, { headers: { Authorization: 'Bearer ' + tk } });
    btn.disabled = false; btn.textContent = 'Descarcă site-ul (ZIP)';
    if (!r.ok) { var j = await r.json().catch(function () { return {}; }); return flash(j.error || 'Descărcarea nu a mers.'); }
    var cd = r.headers.get('Content-Disposition') || '', m = cd.match(/filename="([^"]+)"/);
    var a = d.createElement('a'); a.href = URL.createObjectURL(await r.blob()); a.download = m ? m[1] : 'site.zip';
    d.body.appendChild(a); a.click(); a.remove();
  }

  // ---------- pornire ----------
  (async function init() {
    try { var r = await fetch('/api/config', { cache: 'no-store' }); cfg = r.ok ? await r.json() : { auth: false }; } catch (e) { cfg = { auth: false }; }
    await token();
    var id = new URLSearchParams(location.search).get('id');
    var local = lsGet(LOCAL);
    if (id && session) {
      var g = await api('GET', '/api/sites?id=' + encodeURIComponent(id));
      if (g.ok) {
        S.id = g.json.site.id; S.template = g.json.site.template; S.data = ST.normalize(S.template, g.json.site.data);
        S.assets = g.json.assets || {}; S.order = g.json.order; S.own = g.json.site.own;
        if (local && local.id === S.id && S.own && !(S.order && S.order.unlocked)) { S.data = ST.normalize(S.template, Object.assign({}, S.data, local.data, { logo: S.data.logo, hero: S.data.hero, gallery: S.data.gallery })); }
        status(!S.own ? 'Doar vizualizare' : (S.order && S.order.unlocked) ? 'Plătit · blocat' : 'Salvat în cont ✓');
      } else { history.replaceState(null, '', '/editor.html'); if (local && local.id === id) { delete local.id; lsSet(LOCAL, local); } }
    } else if (local && local.template && ST.TEMPLATES[local.template]) {
      S.template = local.template; S.data = ST.normalize(S.template, local.data);
      if (local.id && session) { S.id = local.id; history.replaceState(null, '', '/editor.html?id=' + S.id); return init(); }
    }
    if (!session) status('Salvat pe acest dispozitiv');
    else if (!S.id) status('');
    if (S.id && session && !S.order) { var g2 = await api('GET', '/api/sites?id=' + S.id); if (g2.ok) { S.order = g2.json.order; S.assets = g2.json.assets || S.assets; } }
    renderSteps(); renderBody(); preview();
    // Revine pe pagină: verificăm dacă plata a fost confirmată.
    d.addEventListener('visibilitychange', async function () {
      if (d.hidden || !S.id || !session || !S.order || S.order.unlocked) return;
      var g3 = await api('GET', '/api/sites?id=' + S.id);
      if (g3.ok && g3.json.order && g3.json.order.unlocked) { S.order = g3.json.order; if (S.step === 5) renderBody(); }
    });
  })();
})();
