/* Șabloanele editorului de site-uri. Același cod generează previzualizarea din browser
   și fișierele finale de pe server, ca ce vede clientul să fie exact ce descarcă.
   Tot textul introdus de client e curățat (normalize) și scăpat (esc) înainte de afișare. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SiteTemplates = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DAYS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

  var TEMPLATES = {
    barber: {
      label: 'Frizerie', itemsLabel: 'Servicii', itemsHint: 'Tunsori, barbă, pachete', cta: 'Programează-te',
      font: '"Arial Narrow","Helvetica Neue Condensed","Roboto Condensed",Impact,sans-serif', upper: true,
      defaults: {
        name: 'Barber Shop Nord', tagline: 'Tunsori precise, fără grabă.',
        about: 'Suntem o frizerie mică din Iași, cu doi frizeri și multă atenție la detalii. Fără cozi: lucrăm pe bază de programare, ca să ai timpul tău.',
        accent: '#c8a24a', theme: 'dark',
        items: [
          { name: 'Tuns', price: '60 lei', desc: 'Spălat, tuns, aranjat' },
          { name: 'Tuns + barbă', price: '90 lei', desc: 'Contur cu brici și prosop cald' },
          { name: 'Barbă', price: '40 lei', desc: 'Aranjat și contur' },
          { name: 'Tuns copii', price: '50 lei', desc: 'Până la 12 ani' },
        ],
        hours: ['10:00–20:00', '10:00–20:00', '10:00–20:00', '10:00–20:00', '10:00–20:00', '10:00–16:00', 'Închis'],
        phone: '0740 000 000', whatsapp: '0740 000 000', instagram: 'barbershopnord', address: 'Strada Exemplu 10, Iași',
      },
    },
    cafe: {
      label: 'Cafenea / Restaurant', itemsLabel: 'Meniu', itemsHint: 'Băuturi, mâncare, deserturi', cta: 'Rezervă o masă',
      font: 'Georgia,"Times New Roman",serif', upper: false,
      defaults: {
        name: 'Cafeneaua Colț', tagline: 'Cafea de specialitate și deserturi făcute în casă.',
        about: 'Prăjim boabele în fiecare săptămână și coacem dimineața. Un loc liniștit pentru o cafea bună, o carte sau o întâlnire.',
        accent: '#8a5a3b', theme: 'light',
        items: [
          { name: 'Espresso', price: '9 lei', desc: 'Boabe de specialitate, prăjite local' },
          { name: 'Flat white', price: '14 lei', desc: 'Dublu espresso, lapte catifelat' },
          { name: 'Latte', price: '15 lei', desc: 'Cu lapte sau băutură vegetală' },
          { name: 'Croissant cu unt', price: '12 lei', desc: 'Copt în fiecare dimineață' },
          { name: 'Cheesecake', price: '18 lei', desc: 'Cu sos de fructe de pădure' },
        ],
        hours: ['08:00–20:00', '08:00–20:00', '08:00–20:00', '08:00–20:00', '08:00–22:00', '09:00–22:00', '09:00–18:00'],
        phone: '0740 000 000', whatsapp: '', instagram: 'cafeneauacolt', address: 'Bulevardul Exemplu 5, Iași',
      },
    },
    salon: {
      label: 'Salon / Beauty', itemsLabel: 'Servicii', itemsHint: 'Unghii, gene, sprâncene, coafor', cta: 'Fă o programare',
      font: '"Didot","Bodoni MT","Bodoni 72",Georgia,serif', upper: false, italic: true,
      defaults: {
        name: 'Studio Bella', tagline: 'Unghii, gene și sprâncene, cu grijă la detalii.',
        about: 'Un salon mic și luminos, unde lucrăm doar pe programare. Folosim produse profesionale și sterilizăm instrumentele după fiecare clientă.',
        accent: '#c56b8a', theme: 'light',
        items: [
          { name: 'Manichiură semipermanentă', price: '120 lei', desc: 'Pregătire, aplicare, design simplu' },
          { name: 'Extensii gene', price: '180 lei', desc: 'Tehnica fir cu fir' },
          { name: 'Pensat', price: '40 lei', desc: 'Formă și contur' },
          { name: 'Laminare sprâncene', price: '110 lei', desc: 'Rezistă 6–8 săptămâni' },
        ],
        hours: ['09:00–19:00', '09:00–19:00', '09:00–19:00', '09:00–19:00', '09:00–19:00', '10:00–15:00', 'Închis'],
        phone: '0740 000 000', whatsapp: '0740 000 000', instagram: 'studiobella', address: 'Strada Exemplu 3, Iași',
      },
    },
    portfolio: {
      label: 'Portofoliu personal', itemsLabel: 'Lucrări', itemsHint: 'Proiecte, servicii sau colaborări', cta: 'Hai să lucrăm împreună',
      font: '-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif', upper: false,
      defaults: {
        name: 'Andrei Popescu', tagline: 'Fotograf de evenimente și portrete, din Iași.',
        about: 'Fotografiez nunți, botezuri și portrete de 5 ani. Îmi place lumina naturală și momentele care nu sunt regizate.',
        accent: '#2b59ff', theme: 'light',
        items: [
          { name: 'Nunți', price: 'de la 1500 lei', desc: 'Toată ziua, 400+ fotografii editate' },
          { name: 'Botezuri', price: 'de la 800 lei', desc: 'Biserică și petrecere' },
          { name: 'Ședință portret', price: '350 lei', desc: '1 oră, 30 de fotografii editate' },
        ],
        hours: ['', '', '', '', '', '', ''],
        phone: '0740 000 000', whatsapp: '0740 000 000', instagram: 'andrei.foto', address: 'Iași',
      },
    },
  };

  var LIMITS = { name: 60, tagline: 120, about: 800, cta: 40, phone: 20, whatsapp: 20, instagram: 40, address: 120, email: 80, itemName: 60, itemPrice: 24, itemDesc: 160, hours: 30, items: 20, gallery: 6 };

  function str(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max); }
  function asset(v) { v = String(v || ''); return /^[A-Za-z0-9._-]{1,120}$/.test(v) ? v : ''; }
  function color(v, d) { return /^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? String(v).toLowerCase() : d; }

  // Curăță datele clientului: lungimi maxime, tipuri corecte, nimic în plus.
  function normalize(tpl, d) {
    var T = TEMPLATES[tpl] || TEMPLATES.barber; d = d || {};
    var def = T.defaults;
    var items = Array.isArray(d.items) ? d.items.slice(0, LIMITS.items) : [];
    var hours = Array.isArray(d.hours) ? d.hours : [];
    return {
      name: str(d.name, LIMITS.name), tagline: str(d.tagline, LIMITS.tagline), about: str(d.about, LIMITS.about),
      cta: str(d.cta, LIMITS.cta),
      accent: color(d.accent, def.accent), theme: d.theme === 'dark' ? 'dark' : d.theme === 'light' ? 'light' : def.theme,
      phone: str(d.phone, LIMITS.phone), whatsapp: str(d.whatsapp, LIMITS.whatsapp),
      instagram: str(d.instagram, LIMITS.instagram).replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, ''),
      email: /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(str(d.email, LIMITS.email)) ? str(d.email, LIMITS.email) : '',
      address: str(d.address, LIMITS.address),
      items: items.map(function (i) { i = i || {}; return { name: str(i.name, LIMITS.itemName), price: str(i.price, LIMITS.itemPrice), desc: str(i.desc, LIMITS.itemDesc) }; }).filter(function (i) { return i.name; }),
      hours: DAYS.map(function (_, k) { return str(hours[k], LIMITS.hours); }),
      logo: asset(d.logo), hero: asset(d.hero),
      gallery: (Array.isArray(d.gallery) ? d.gallery : []).map(asset).filter(Boolean).slice(0, LIMITS.gallery),
    };
  }

  function starter(tpl) {
    var T = TEMPLATES[tpl] || TEMPLATES.barber;
    return normalize(tpl, JSON.parse(JSON.stringify(Object.assign({ cta: T.cta }, T.defaults))));
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cssUrl(u) { return String(u || '').replace(/["'()\\<>\s]/g, encodeURIComponent); }
  function digits(s) { return String(s || '').replace(/[^\d+]/g, ''); }
  function wa(s) { var n = digits(s).replace(/^\+/, ''); if (/^0\d{9}$/.test(n)) n = '40' + n.slice(1); return n; }
  function mix(hex, amt) { // amestecă culoarea cu alb (amt>0) sau negru (amt<0)
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, t = amt > 0 ? 255 : 0, p = Math.abs(amt);
    function c(x) { return Math.round(x + (t - x) * p).toString(16).padStart(2, '0'); }
    return '#' + c(r) + c(g) + c(b);
  }
  function onAccent(hex) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#111111' : '#ffffff'; }

  // opt.img(id) → adresa pozei (în previzualizare: link temporar; la export: assets/fișier)
  // opt.preview → adaugă bandă și watermark „Previzualizare · Creat cu Aman”
  function render(tpl, data, opt) {
    opt = opt || {};
    var T = TEMPLATES[tpl] || TEMPLATES.barber, d = normalize(tpl, data);
    var img = function (id) { return id && opt.img ? opt.img(id) : ''; };
    var dark = d.theme === 'dark', A = d.accent;
    var bg = dark ? '#0f0f10' : '#ffffff', bg2 = dark ? '#18181a' : mix(A, 0.93), fg = dark ? '#f2f2f2' : '#151515', fg2 = dark ? '#a1a1a6' : '#5c5c63', line = dark ? '#2a2a2d' : '#e6e6ea';
    var name = d.name || T.defaults.name;
    var cta = d.cta || T.cta;
    var ctaHref = d.whatsapp ? 'https://wa.me/' + wa(d.whatsapp) : d.phone ? 'tel:' + digits(d.phone) : d.instagram ? 'https://www.instagram.com/' + d.instagram + '/' : '#contact';
    var hero = img(d.hero), logo = img(d.logo);
    var year = new Date().getFullYear();
    var head = T.upper ? 'text-transform:uppercase;letter-spacing:.02em;' : '';
    var it = T.italic ? 'font-style:italic;' : '';

    var css = '*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:' + bg + ';color:' + fg + ';font:400 17px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}' +
      'img{max-width:100%;display:block}a{color:inherit}.w{max-width:1040px;margin:0 auto;padding:0 20px}' +
      'h1,h2,h3{font-family:' + T.font + ';font-weight:700;line-height:1.08;margin:0;' + head + it + 'text-wrap:balance}' +
      'header{position:sticky;top:0;z-index:5;background:' + bg + 'e6;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid ' + line + '}' +
      'header .w{display:flex;align-items:center;justify-content:space-between;gap:16px;height:64px}.brand{display:flex;align-items:center;gap:10px;font-family:' + T.font + ';font-weight:700;font-size:20px;text-decoration:none;min-width:0;' + head + it + '}.brand span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.brand img{width:36px;height:36px;border-radius:10px;object-fit:cover}' +
      '.btn{display:inline-flex;align-items:center;justify-content:center;background:' + A + ';color:' + onAccent(A) + ';text-decoration:none;font-weight:600;border-radius:999px;padding:12px 22px;font-size:16px}.btn.sm{padding:9px 16px;font-size:14px;white-space:nowrap;flex:none}' +
      '.hero{position:relative;overflow:hidden}.hero .w{padding-top:clamp(56px,10vw,120px);padding-bottom:clamp(56px,10vw,120px)}' +
      (hero ? '.hero{background:#000 url("' + cssUrl(hero) + '") center/cover no-repeat;color:#fff}.hero::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.65))}.hero .w{position:relative}.hero p{color:rgba(255,255,255,.88)}' : '.hero{background:' + bg2 + '}') +
      '.hero h1{font-size:clamp(44px,8vw,88px);max-width:12ch}.hero p{font-size:clamp(18px,2.2vw,22px);max-width:34em;margin:18px 0 28px;color:' + (hero ? 'rgba(255,255,255,.88)' : fg2) + '}' +
      'section{padding:clamp(56px,9vw,96px) 0}.alt{background:' + bg2 + '}.eyebrow{font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:' + A + ';margin:0 0 10px}' +
      'h2{font-size:clamp(32px,5vw,48px);margin-bottom:28px}' +
      '.items{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}' +
      '.items li{background:' + (dark ? '#141416' : bg) + ';border:1px solid ' + line + ';border-radius:16px;padding:18px 20px;display:grid;grid-template-columns:1fr auto;gap:4px 14px;align-items:baseline}' +
      '.items b{font-size:18px}.items .p{font-weight:700;color:' + A + ';white-space:nowrap}.items small{grid-column:1/-1;color:' + fg2 + ';font-size:15px}' +
      '.about{display:grid;grid-template-columns:1fr;gap:24px;max-width:760px}.about p{font-size:19px;color:' + fg2 + ';margin:0}' +
      '.gal{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.gal img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:14px}' +
      '@media(max-width:640px){.gal{grid-template-columns:repeat(2,1fr)}}' +
      '.contact{display:grid;grid-template-columns:1fr 1fr;gap:28px}@media(max-width:720px){.contact{grid-template-columns:1fr}}' +
      '.card{background:' + (dark ? '#141416' : bg) + ';border:1px solid ' + line + ';border-radius:18px;padding:22px 24px}.card h3{font-size:20px;margin-bottom:12px}' +
      '.hours{width:100%;border-collapse:collapse;font-size:16px}.hours td{padding:7px 0;border-bottom:1px solid ' + line + '}.hours td:last-child{text-align:right;font-variant-numeric:tabular-nums}' +
      '.links{display:flex;flex-direction:column;gap:10px;margin:0;padding:0;list-style:none}.links a{text-decoration:none;font-weight:600}.links span{display:block;font-size:13px;font-weight:400;color:' + fg2 + '}' +
      'footer{border-top:1px solid ' + line + ';padding:24px 0;color:' + fg2 + ';font-size:14px}' +
      (opt.preview ? '.pv{position:fixed;left:0;right:0;bottom:0;z-index:50;background:#111;color:#fff;text-align:center;font:600 13px/1.2 -apple-system,sans-serif;padding:10px}.wm{position:fixed;inset:0;z-index:40;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'260\' height=\'160\'%3E%3Ctext x=\'0\' y=\'90\' transform=\'rotate(-24 130 80)\' fill=\'rgba(127,127,127,0.18)\' font-family=\'Arial\' font-size=\'22\' font-weight=\'700\'%3ECreat cu Aman%3C/text%3E%3C/svg%3E")}body{padding-bottom:40px}' : '');

    var hours = d.hours.some(Boolean) ? '<div class="card"><h3>Program</h3><table class="hours">' + DAYS.map(function (day, k) { return d.hours[k] ? '<tr><td>' + day + '</td><td>' + esc(d.hours[k]) + '</td></tr>' : ''; }).join('') + '</table></div>' : '';
    var links = [];
    if (d.phone) links.push('<li><a href="tel:' + esc(digits(d.phone)) + '"><span>Telefon</span>' + esc(d.phone) + '</a></li>');
    if (d.whatsapp) links.push('<li><a href="https://wa.me/' + esc(wa(d.whatsapp)) + '" target="_blank" rel="noopener"><span>WhatsApp</span>' + esc(d.whatsapp) + '</a></li>');
    if (d.instagram) links.push('<li><a href="https://www.instagram.com/' + esc(d.instagram) + '/" target="_blank" rel="noopener"><span>Instagram</span>@' + esc(d.instagram) + '</a></li>');
    if (d.email) links.push('<li><a href="mailto:' + esc(d.email) + '"><span>Email</span>' + esc(d.email) + '</a></li>');
    if (d.address) links.push('<li><a href="https://www.google.com/maps/search/?api=1&amp;query=' + encodeURIComponent(d.address) + '" target="_blank" rel="noopener"><span>Adresă · deschide în hartă</span>' + esc(d.address) + '</a></li>');

    var gallery = d.gallery.map(img).filter(Boolean);

    return '<!DOCTYPE html><html lang="ro"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>' +
      '<title>' + esc(name) + (d.tagline ? ' · ' + esc(d.tagline) : '') + '</title><meta name="description" content="' + esc(d.tagline || d.about.slice(0, 150)) + '"/>' +
      '<meta name="theme-color" content="' + bg + '"/><style>' + css + '</style></head><body>' +
      '<header><div class="w"><a class="brand" href="#">' + (logo ? '<img src="' + esc(logo) + '" alt=""/>' : '') + '<span>' + esc(name) + '</span></a><a class="btn sm" href="' + esc(ctaHref) + '"' + (/^https/.test(ctaHref) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(cta) + '</a></div></header>' +
      '<div class="hero"><div class="w"><h1>' + esc(name) + '</h1>' + (d.tagline ? '<p>' + esc(d.tagline) + '</p>' : '<p></p>') + '<a class="btn" href="' + esc(ctaHref) + '"' + (/^https/.test(ctaHref) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(cta) + '</a></div></div>' +
      (d.items.length ? '<section><div class="w"><p class="eyebrow">' + T.itemsLabel + '</p><h2>' + (tpl === 'cafe' ? 'Ce găsești la noi' : tpl === 'portfolio' ? 'Ce fac' : 'Prețuri') + '</h2><ul class="items">' + d.items.map(function (i) { return '<li><b>' + esc(i.name) + '</b>' + (i.price ? '<span class="p">' + esc(i.price) + '</span>' : '<span></span>') + (i.desc ? '<small>' + esc(i.desc) + '</small>' : '') + '</li>'; }).join('') + '</ul></div></section>' : '') +
      (d.about ? '<section class="alt"><div class="w about"><div><p class="eyebrow">Despre</p><h2>' + (tpl === 'portfolio' ? 'Despre mine' : 'Despre noi') + '</h2></div><p>' + esc(d.about).replace(/\n/g, '<br/>') + '</p></div></section>' : '') +
      (gallery.length ? '<section><div class="w"><p class="eyebrow">Galerie</p><h2>' + (tpl === 'portfolio' ? 'Lucrări' : 'Din atmosfera noastră') + '</h2><div class="gal">' + gallery.map(function (u) { return '<img src="' + esc(u) + '" alt="" loading="lazy"/>'; }).join('') + '</div></div></section>' : '') +
      (links.length || hours ? '<section id="contact" class="alt"><div class="w"><p class="eyebrow">Contact</p><h2>Ne găsești aici</h2><div class="contact">' + (links.length ? '<div class="card"><h3>Scrie-ne sau sună-ne</h3><ul class="links">' + links.join('') + '</ul></div>' : '') + hours + '</div></div></section>' : '') +
      '<footer><div class="w">© ' + year + ' ' + esc(name) + '</div></footer>' +
      (opt.preview ? '<div class="wm" aria-hidden="true"></div><div class="pv">Previzualizare · Creat cu Aman · costi1andrei.site</div>' : '') +
      '</body></html>';
  }

  return { TEMPLATES: TEMPLATES, DAYS: DAYS, LIMITS: LIMITS, normalize: normalize, starter: starter, render: render };
});
