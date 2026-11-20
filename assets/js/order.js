/* Formularul de comandă: clientul alege opțiunea, descrie ce vrea și urcă materialele.
   Primește un cod (ex. AM-K7P2Q) și o conversație privată pe site, unde stabiliți plata. */
(function () {
  'use strict';
  var d = document, A = function () { return window.AmanAccount; };
  var MAX = 50 * 1024 * 1024;
  var BUY = 'aman.buy';
  var dlg = null, cur = null, picked = [];

  var KIND = function (k) {
    if (/^foto/.test(k)) return 'foto';
    if (/^video/.test(k)) return 'video';
    if (/^web/.test(k)) return 'web';
    return 'pack';
  };
  var LIMIT = { 'foto-1': 1, 'foto-10': 10, 'video-scurt': 3, 'video-standard': 3, 'web-landing': 10, 'web-simplu': 10, 'web-business': 10, mini: 15, starter: 15, business: 15 };
  var T = {
    ro: {
      eyebrow: 'Comandă nouă', login: 'Ca să trimiți comanda și să primești codul ei, intră în cont cu Google. Durează câteva secunde.',
      google: 'Continuă cu Google', why: 'Contul cu email verificat ține site-ul departe de boți.',
      brief: 'Ce vrei să fac?', briefPh: { foto: 'ex: retuș ten, fundal alb, culori calde', video: 'ex: reel de 30 s pentru salon, muzică energică, subtitrări', web: 'ex: site pentru frizerie, 3 pagini, programări pe WhatsApp', pack: 'Spune-mi pe scurt pentru ce e conținutul și cum îl vrei' },
      ig: 'Instagram (opțional)', igPh: '@numele.tau sau al afacerii', igHelp: 'Dacă vrei să mă uit pe profilul tău sau al afacerii.',
      files: { foto: 'Pozele pe care le editez', video: 'Clipurile tale', web: 'Logo, poze, texte (opțional)', pack: 'Clipuri și poze (opțional)' },
      pick: 'Alege fișiere', max: 'maximum {n} · până la 50 MB fiecare', big: 'Pentru fișiere mai mari, pune un link în descriere (Google Drive, WeTransfer).',
      tooMany: 'Poți trimite maximum {n} fișiere pentru opțiunea asta.', tooBig: '{f} are peste 50 MB. Pune-l ca link în descriere.',
      send: 'Trimite comanda', cancel: 'Renunț', sending: 'Se trimite comanda…', up: 'Se încarcă {f}… {p}%',
      doneH: 'Comanda a fost trimisă', doneP: 'Îți răspund aici, pe site, în conversația comenzii, cu detaliile de plată. De obicei în mai puțin de 2 ore.', chatGo: 'Deschide conversația',
      seeAcc: 'Vezi comanda în cont', partial: 'Comanda e trimisă, dar unele fișiere nu s-au încărcat. Mi le poți trimite ca link în conversație.',
    },
    en: {
      eyebrow: 'New order', login: 'To send the order and get its code, sign in with Google. It takes a few seconds.',
      google: 'Continue with Google', why: 'An account with a verified email keeps bots off the site.',
      brief: 'What do you need?', briefPh: { foto: 'e.g. skin retouch, white background, warm colours', video: 'e.g. 30 s reel for a salon, upbeat music, subtitles', web: 'e.g. barber shop site, 3 pages, WhatsApp bookings', pack: 'Tell me briefly what the content is for and how you want it' },
      ig: 'Instagram (optional)', igPh: '@you or your business', igHelp: 'If you want me to look at your or your business profile.',
      files: { foto: 'The photos to edit', video: 'Your clips', web: 'Logo, photos, texts (optional)', pack: 'Clips and photos (optional)' },
      pick: 'Choose files', max: 'up to {n} · up to 50 MB each', big: 'For bigger files, add a link in the description (Google Drive, WeTransfer).',
      tooMany: 'You can send up to {n} files for this option.', tooBig: '{f} is over 50 MB. Add it as a link in the description.',
      send: 'Send order', cancel: 'Cancel', sending: 'Sending the order…', up: 'Uploading {f}… {p}%',
      doneH: 'Order sent', doneP: 'I will reply here on the site, in the order conversation, with the payment details. Usually within 2 hours.', chatGo: 'Open the conversation',
      seeAcc: 'See the order in your account', partial: 'The order is sent, but some files did not upload. You can send them as a link in the conversation.',
    },
  };
  function L() { return (A() && A().lang()) || (d.documentElement.lang === 'en' ? 'en' : 'ro'); }
  function t(k) { return T[L()][k]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fsize(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function sstore(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }
  function sload(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }

  function info(key) {
    var b = d.querySelector('[data-buy="' + key + '"]');
    var card = b && b.closest('.pack'), li = b && b.closest('li');
    var el = card ? card.querySelector('h4') : li && li.querySelector('strong');
    if (el && el.firstElementChild) el = el.firstElementChild;
    var price = card ? card.querySelector('.amount') : li && li.querySelector('.price');
    return { key: key, name: el ? el.textContent.trim() : key, price: price ? price.innerHTML : '', kind: KIND(key), max: LIMIT[key] || 10 };
  }

  function shell(inner) {
    if (!dlg) {
      dlg = d.createElement('dialog'); dlg.className = 'buy order-dlg'; d.body.appendChild(dlg);
      dlg.addEventListener('close', function () { picked = []; });
    }
    dlg.innerHTML = '<div class="buy-in">' + inner + '</div>';
    if (!dlg.open) dlg.showModal();
    return dlg;
  }
  function head() {
    return '<p class="eyebrow">' + t('eyebrow') + '</p><h3>' + esc(cur.name) + '</h3>' + (cur.price ? '<p class="amount sm">' + cur.price + '</p>' : '');
  }

  function stepLogin() {
    shell(head() + '<p class="muted">' + t('login') + '</p>' +
      '<div class="row"><button type="button" class="gbtn" id="o-login">' + t('google') + '</button></div>' +
      '<p class="fine">' + t('why') + ' · <button type="button" class="more plain" id="o-x">' + t('cancel') + '</button></p>');
    dlg.querySelector('#o-login').addEventListener('click', function () { sstore(BUY, cur.key); A().login(); });
    dlg.querySelector('#o-x').addEventListener('click', function () { dlg.close(); });
  }

  function stepForm() {
    var accept = cur.kind === 'foto' ? 'image/*' : cur.kind === 'video' ? 'video/*,image/*' : cur.kind === 'pack' ? 'image/*,video/*' : '';
    shell(head() +
      '<form id="o-form" novalidate>' +
      '<label class="fl" for="o-brief">' + t('brief') + '</label><textarea id="o-brief" maxlength="2000" rows="3" placeholder="' + esc(t('briefPh')[cur.kind]) + '"></textarea>' +
      '<label class="fl" for="o-ig">' + t('ig') + '</label><input id="o-ig" type="text" inputmode="text" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="40" placeholder="' + t('igPh') + '"/>' +
      '<p class="fine tight">' + t('igHelp') + '</p>' +
      '<label class="fl">' + t('files')[cur.kind] + '</label>' +
      '<label class="drop"><input type="file" id="o-files" multiple' + (accept ? ' accept="' + accept + '"' : '') + '/><span>＋ ' + t('pick') + '</span><small>' + t('max').replace('{n}', cur.max) + '</small></label>' +
      '<ul class="picked" id="o-picked"></ul><p class="fine tight">' + t('big') + '</p>' +
      '<p class="err" id="o-err" hidden></p>' +
      '<div class="row"><button type="submit" class="btn" id="o-send">' + t('send') + '</button><button type="button" class="more plain" id="o-x">' + t('cancel') + '</button></div>' +
      '</form>');
    var inp = dlg.querySelector('#o-files');
    inp.addEventListener('change', function () { add(Array.prototype.slice.call(inp.files)); inp.value = ''; });
    dlg.querySelector('#o-x').addEventListener('click', function () { dlg.close(); });
    dlg.querySelector('#o-form').addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    showPicked();
  }
  function err(m) { var e = dlg.querySelector('#o-err'); if (!e) return; e.textContent = m || ''; e.hidden = !m; }
  function add(list) {
    err('');
    list.forEach(function (f) {
      if (f.size > MAX) { err(t('tooBig').replace('{f}', f.name)); return; }
      if (picked.some(function (p) { return p.name === f.name && p.size === f.size; })) return;
      if (picked.length >= cur.max) { err(t('tooMany').replace('{n}', cur.max)); return; }
      picked.push(f);
    });
    showPicked();
  }
  function showPicked() {
    var ul = dlg.querySelector('#o-picked'); if (!ul) return;
    ul.innerHTML = picked.map(function (f, i) {
      return '<li><span>' + esc(f.name) + '<small>' + fsize(f.size) + '</small></span><button type="button" class="more plain danger" data-rm="' + i + '" aria-label="Elimină ' + esc(f.name) + '">×</button></li>';
    }).join('');
    ul.querySelectorAll('[data-rm]').forEach(function (b) { b.addEventListener('click', function () { picked.splice(+b.dataset.rm, 1); showPicked(); }); });
  }

  function put(url, file, onp) {
    return new Promise(function (ok, bad) {
      var x = new XMLHttpRequest(); x.open('PUT', url);
      x.setRequestHeader('Content-Type', file.type || 'application/octet-stream'); x.setRequestHeader('x-upsert', 'true');
      x.upload.onprogress = function (e) { if (e.lengthComputable) onp(Math.round(e.loaded / e.total * 100)); };
      x.onload = function () { x.status < 300 ? ok() : bad(new Error(String(x.status))); };
      x.onerror = function () { bad(new Error('network')); };
      x.send(file);
    });
  }

  async function submit() {
    var send = dlg.querySelector('#o-send'); send.disabled = true; err('');
    var brief = dlg.querySelector('#o-brief').value, ig = dlg.querySelector('#o-ig').value;
    var form = dlg.querySelector('#o-form'), status = d.createElement('p');
    status.className = 'fine'; status.setAttribute('aria-live', 'polite'); status.textContent = t('sending'); form.appendChild(status);
    try {
      var tk = await A().token();
      if (!tk) { sstore(BUY, cur.key); return stepLogin(); }
      var r = await fetch('/api/request', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk }, body: JSON.stringify({ package: cur.key, lang: L(), brief: brief, instagram: ig }) });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(j.error || 'Eroare.');
      var failed = 0;
      for (var i = 0; i < picked.length; i++) {
        var f = picked[i];
        status.textContent = t('up').replace('{f}', f.name).replace('{p}', 0);
        try {
          var s = await fetch('/api/files', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk }, body: JSON.stringify({ action: 'client-upload', order: j.id, name: f.name, size: f.size }) });
          var sj = await s.json().catch(function () { return {}; });
          if (!s.ok) throw new Error(sj.error);
          await put(sj.url, f, function (p) { status.textContent = t('up').replace('{f}', f.name).replace('{p}', p); });
        } catch (e) { failed++; }
      }
      stepDone(j.code, failed, j.id);
      A().refresh();
    } catch (e) {
      status.remove(); err(e.message); send.disabled = false;
    }
  }

  function stepDone(code, failed, orderId) {
    shell('<p class="eyebrow">' + t('doneH') + '</p><p class="code">' + esc(code) + '</p>' +
      '<p class="muted">' + t('doneP') + '</p>' + (failed ? '<p class="banner">' + t('partial') + '</p>' : '') +
      '<div class="row"><button type="button" class="btn" id="o-chat">' + t('chatGo') + '</button></div>');
    dlg.querySelector('#o-chat').addEventListener('click', function () {
      try { sessionStorage.setItem('aman.openchat', orderId); } catch (e) {}
      dlg.close();
      if (location.hash === '#cont') location.reload(); else { location.hash = 'cont'; location.reload(); }
    });
  }

  function open(key) {
    cur = info(key); picked = [];
    var a = A();
    if (!a || !a.enabled()) return false;            // fără conturi active: linkul duce la pagina Cont
    if (!a.user()) stepLogin(); else stepForm();
    return true;
  }

  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-buy]');
    if (!b) return;
    var a = A();
    if (!a || !a.ready() || !a.enabled()) return;     // fără conturi active, linkul duce la pagina Cont
    e.preventDefault();
    open(b.dataset.buy);
  });

  // După logare (revenire de la Google), redeschidem formularul pentru opțiunea aleasă.
  d.addEventListener('aman:ready', function () {
    var k = sload(BUY); sstore(BUY, null);
    if (k && d.querySelector('[data-buy="' + k + '"]') && A() && A().enabled() && A().user()) open(k);
  });
})();
