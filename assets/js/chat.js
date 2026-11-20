/* Fereastra de chat pentru o comandă. Folosită în pagina Cont (clientul) și în Panou (tu).
   Se actualizează singură la câteva secunde cât timp e deschisă și pagina e vizibilă. */
(function () {
  'use strict';
  var d = document;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function when(s) {
    var t = new Date(s), now = new Date();
    var same = t.toDateString() === now.toDateString();
    return same ? t.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : t.toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // opts: { order, token(): Promise<string>, as: 'client'|'admin', empty, placeholder, quick: [{label, text()}], onSeen() }
  function mount(el, opts) {
    var as = opts.as || 'client', alive = true, timer = 0, last = null;
    el.classList.add('chat');
    el.innerHTML = '<div class="chat-log" role="log" aria-live="polite"><p class="chat-empty">Se încarcă…</p></div>' +
      (opts.quick && opts.quick.length ? '<div class="chat-quick">' + opts.quick.map(function (q, i) { return '<button type="button" class="chat-chip" data-q="' + i + '">' + esc(q.label) + '</button>'; }).join('') + '</div>' : '') +
      '<form class="chat-form"><textarea rows="1" maxlength="2000" placeholder="' + esc(opts.placeholder || 'Scrie un mesaj…') + '" aria-label="Mesaj"></textarea><button type="submit" class="chat-send" aria-label="Trimite">↑</button></form><p class="chat-err" hidden></p>';
    var log = el.querySelector('.chat-log'), form = el.querySelector('form'), ta = el.querySelector('textarea'), err = el.querySelector('.chat-err');

    function grow() { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; }
    ta.addEventListener('input', grow);
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); form.requestSubmit(); } });

    async function call(method, url, body) {
      var tk = await opts.token(); if (!tk) throw new Error('Intră din nou în cont.');
      var r = await fetch(url, { method: method, headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(j.error || 'Eroare.');
      return j;
    }
    function draw(list) {
      var key = list.map(function (m) { return m.id; }).join(',');
      if (key === last) return; last = key;
      var atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
      log.innerHTML = list.length ? list.map(function (m) {
        var mine = m.sender === as;
        return '<div class="msg ' + (mine ? 'me' : 'them') + '"><p>' + esc(m.body).replace(/\n/g, '<br/>') + '</p><time>' + (mine ? '' : (as === 'client' ? 'Aman · ' : 'Client · ')) + when(m.created_at) + '</time></div>';
      }).join('') : '<p class="chat-empty">' + esc(opts.empty || 'Niciun mesaj încă.') + '</p>';
      if (atBottom || list.length && list[list.length - 1].sender === as) log.scrollTop = log.scrollHeight;
    }
    async function load() {
      if (!alive || !el.isConnected) return stop();
      try {
        var j = await call('GET', '/api/messages?order=' + encodeURIComponent(opts.order) + (as === 'client' ? '&as=client' : ''));
        draw(j.messages || []); if (opts.onSeen) opts.onSeen();
      } catch (e) { /* încercăm din nou la următorul ciclu */ }
    }
    function schedule() { clearTimeout(timer); timer = setTimeout(function () { if (!d.hidden) load(); schedule(); }, 6000); }
    function stop() { alive = false; clearTimeout(timer); }

    form.addEventListener('submit', async function (e) {
      e.preventDefault(); var text = ta.value.trim(); if (!text) return;
      var btn = form.querySelector('button'); btn.disabled = true; err.hidden = true;
      try {
        await call('POST', '/api/messages', { order: opts.order, body: text, as: as });
        ta.value = ''; grow(); last = ''; await load();
      } catch (x) { err.textContent = x.message; err.hidden = false; }
      btn.disabled = false; ta.focus();
    });
    el.querySelectorAll('[data-q]').forEach(function (b) {
      b.addEventListener('click', function () { var q = opts.quick[+b.dataset.q]; var t = q.text(); if (!t) return; ta.value = t; grow(); ta.focus(); });
    });
    load(); schedule();
    return { stop: stop, focus: function () { ta.focus(); } };
  }

  window.AmanChat = { mount: mount };
})();
