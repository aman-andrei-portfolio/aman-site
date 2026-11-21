/* Before / After: împerechează pozele trimise de client cu cele livrate, după numele fișierului.
   Regula: livrarea are același nume ca originalul, eventual cu un sufix (-edit, _final, -aman, -retus, v2…).
   Ex.: „IMG_2041.jpg” (de la client) ↔ „IMG_2041-edit.jpg” (livrat). Doar imagini. */
(function () {
  'use strict';
  var SUFFIX = /([ _.-]+(edit|edited|editat|final|aman|retus|retusat|retouch|color|grade|v\d+))+$/i;
  function base(name) {
    var b = String(name || '').toLowerCase().replace(/\.[a-z0-9]{2,5}$/, '').replace(/\s*\(\d+\)$/, '');
    var prev; do { prev = b; b = b.replace(SUFFIX, ''); } while (b !== prev && b.length);
    return b.trim();
  }
  function isImg(f) { return f && /^image\//.test(f.type || '') && f.url; }
  // întoarce [{before, after}] pentru fiecare fișier livrat care are original
  function pairs(clientFiles, delivered) {
    var map = {};
    (clientFiles || []).filter(isImg).forEach(function (f) { var k = base(f.name); if (k && !map[k]) map[k] = f; });
    var out = [];
    (delivered || []).filter(isImg).forEach(function (f) { var k = base(f.name), b = map[k]; if (b) out.push({ before: b, after: f }); });
    return out;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function html(list, L) {
    if (!list.length) return '';
    return '<div class="ba-wrap"><p class="dl-h">' + esc(L.title) + ' · ' + list.length + '</p>' + list.map(function (p) {
      return '<figure class="ba" data-ba><div class="ba-box"><img class="ba-b" src="' + esc(p.before.url) + '" alt="' + esc(L.before + ': ' + p.before.name) + '"/>' +
        '<img class="ba-a" src="' + esc(p.after.url) + '" alt="' + esc(L.after + ': ' + p.after.name) + '"/><span class="ba-line" aria-hidden="true"></span>' +
        '<span class="ba-tag l">' + esc(L.before) + '</span><span class="ba-tag r">' + esc(L.after) + '</span></div>' +
        '<input type="range" min="0" max="100" value="50" aria-label="' + esc(L.slider) + '"/><figcaption>' + esc(p.after.name) + '</figcaption></figure>';
    }).join('') + '</div>';
  }
  function set(fig, v) {
    var a = fig.querySelector('.ba-a'), l = fig.querySelector('.ba-line');
    if (a) a.style.clipPath = 'inset(0 0 0 ' + v + '%)';
    if (l) l.style.left = v + '%';
  }
  // trageți direct pe imagine sau folosiți bara de sub ea
  document.addEventListener('input', function (e) { var f = e.target.closest && e.target.closest('[data-ba]'); if (f && e.target.type === 'range') set(f, e.target.value); });
  document.addEventListener('pointerdown', function (e) {
    var box = e.target.closest && e.target.closest('[data-ba] .ba-box'); if (!box) return;
    var fig = box.parentNode, inp = fig.querySelector('input');
    function mv(ev) { var r = box.getBoundingClientRect(), v = Math.max(0, Math.min(100, (ev.clientX - r.left) / r.width * 100)); inp.value = Math.round(v); set(fig, v); }
    mv(e); box.setPointerCapture && box.setPointerCapture(e.pointerId);
    box.addEventListener('pointermove', mv);
    box.addEventListener('pointerup', function up() { box.removeEventListener('pointermove', mv); box.removeEventListener('pointerup', up); });
  });
  // la încărcare, cutia ia proporțiile pozei livrate și pornește de la 50%
  document.addEventListener('load', function (e) {
    if (e.target.classList && e.target.classList.contains('ba-a')) { var b = e.target.parentNode; b.style.aspectRatio = e.target.naturalWidth + ' / ' + e.target.naturalHeight; set(b.parentNode, b.parentNode.querySelector('input').value); }
  }, true);
  window.AmanBA = { pairs: pairs, html: html, base: base };
})();
