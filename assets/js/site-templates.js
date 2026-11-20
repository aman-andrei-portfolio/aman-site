/* Șabloanele editorului de site-uri. Același cod generează previzualizarea din browser
   și fișierele finale de pe server, ca ce vede clientul să fie exact ce descarcă.
   Tot textul introdus de client e curățat (normalize) și scăpat (esc) înainte de afișare. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SiteTemplates = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DAYS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

  // Fonturi de sistem (fără descărcări externe), ca previzualizarea și site-ul final să arate la fel.
  // Fiecare font are fișiere proprii (assets/fonts/tpl, licență OFL); lista de mai jos e rezerva dacă nu se încarcă.
  var FONTS = {
    condensed: { label: 'Condensat', css: '"Oswald","Bebas Neue","Arial Narrow","Helvetica Neue Condensed","Roboto Condensed","sans-serif-condensed",Impact,sans-serif', upper: true },
    serif: { label: 'Clasic', css: '"Playfair Display",Georgia,"Times New Roman",serif' },
    didone: { label: 'Elegant', css: '"Bodoni Moda","Didot","Bodoni MT","Bodoni 72",Georgia,serif', italic: true },
    sans: { label: 'Modern', css: '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif' },
    black: { label: 'Puternic', css: '"Archivo Black","Arial Black","Helvetica Neue",Arial,sans-serif', upper: true },
    mono: { label: 'Tehnic', css: '"JetBrains Mono",ui-monospace,"SF Mono",Menlo,Consolas,"Roboto Mono",monospace' },
  };
  var CORNERS = { sharp: { label: 'Drepte', r: '4px', b: '4px' }, soft: { label: 'Rotunjite', r: '14px', b: '10px' }, round: { label: 'Foarte rotunde', r: '26px', b: '999px' } };
  var LAYOUTS = { split: 'Text + card', center: 'Centrat', poster: 'Poster' };
  var FONT_FAMILY = { condensed: 'Oswald', serif: 'Playfair Display', didone: 'Bodoni Moda', sans: 'Inter', black: 'Archivo Black', mono: 'JetBrains Mono' };
  var HAS_ITALIC = { serif: true, didone: true };
  var LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
  var LATIN_EXT = 'U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
  // fișierele de font folosite de un site (pentru arhiva ZIP)
  function fontFiles(key) {
    var out = [key + '-latin.woff2', key + '-latin-ext.woff2'];
    if (HAS_ITALIC[key]) out.push(key + '-latin-italic.woff2', key + '-latin-ext-italic.woff2');
    return out;
  }
  function fontFace(key, base) {
    var fam = FONT_FAMILY[key], w = key === 'sans' ? '100 900' : key === 'black' ? '400' : '700', css = '';
    [['latin', LATIN], ['latin-ext', LATIN_EXT]].forEach(function (sub) {
      css += '@font-face{font-family:"' + fam + '";font-style:normal;font-weight:' + w + ';font-display:swap;src:url("' + base + key + '-' + sub[0] + '.woff2") format("woff2");unicode-range:' + sub[1] + '}';
      if (HAS_ITALIC[key]) css += '@font-face{font-family:"' + fam + '";font-style:italic;font-weight:' + w + ';font-display:swap;src:url("' + base + key + '-' + sub[0] + '-italic.woff2") format("woff2");unicode-range:' + sub[1] + '}';
    });
    return css;
  }

  var TEMPLATES = {
    barber: {
      label: 'Frizerie', itemsLabel: 'Servicii', itemsHint: 'Tunsori, barbă, pachete', cta: 'Programează-te',
      fontKey: 'condensed',
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
      fontKey: 'serif',
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
      fontKey: 'didone',
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
      label: 'Portofoliu personal', itemsLabel: 'Servicii', itemsHint: 'Proiecte, servicii sau colaborări', cta: 'Hai să lucrăm împreună',
      fontKey: 'sans',
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

  TEMPLATES.fitness = {
    label: 'Sală / Antrenor', itemsLabel: 'Abonamente', itemsHint: 'Abonamente, ședințe, programe', cta: 'Începe azi', fontKey: 'condensed',
    defaults: {
      name: 'Forța Gym', tagline: 'Antrenamente cu plan, nu la întâmplare.',
      about: 'Sală de cartier cu aparatură nouă și antrenori care îți fac un plan pe măsura ta. Contează progresul, nu cât de bine arăți în prima zi.',
      accent: '#d4ff3a', theme: 'dark',
      items: [
        { name: 'Abonament lunar', price: '180 lei', desc: 'Acces nelimitat, 06:00–23:00' },
        { name: 'Ședință cu antrenor', price: '80 lei', desc: '60 de minute, plan personalizat' },
        { name: 'Pachet 10 ședințe', price: '650 lei', desc: 'Cu antrenor, valabil 2 luni' },
        { name: 'Plan alimentar', price: '150 lei', desc: 'Adaptat obiectivului tău' },
      ],
      hours: ['06:00–23:00', '06:00–23:00', '06:00–23:00', '06:00–23:00', '06:00–23:00', '08:00–20:00', '09:00–18:00'],
      phone: '0740 000 000', whatsapp: '0740 000 000', instagram: 'fortagym', address: 'Strada Exemplu 21, Iași',
    },
  };
  TEMPLATES.auto = {
    label: 'Auto / Detailing', itemsLabel: 'Servicii', itemsHint: 'Spălare, detailing, reparații', cta: 'Programează mașina', fontKey: 'black',
    defaults: {
      name: 'Detailing Pro', tagline: 'Mașina ta, ca nouă. Interior și exterior.',
      about: 'Lucrăm doar pe programare, cu produse profesionale, și îți predăm mașina la ora stabilită. Îți spunem dinainte cât costă, fără surprize.',
      accent: '#e63946', theme: 'dark',
      items: [
        { name: 'Spălare exterior', price: '50 lei', desc: 'Prespălare, spumă activă, uscare' },
        { name: 'Curățare interior', price: '150 lei', desc: 'Aspirare, plastice, geamuri' },
        { name: 'Polish faruri', price: '120 lei', desc: 'Faruri clare, ca noi' },
        { name: 'Detailing complet', price: 'de la 600 lei', desc: 'Polish, protecție ceramică, interior' },
      ],
      hours: ['08:00–19:00', '08:00–19:00', '08:00–19:00', '08:00–19:00', '08:00–19:00', '09:00–15:00', 'Închis'],
      phone: '0740 000 000', whatsapp: '0740 000 000', instagram: 'detailingpro', address: 'Șoseaua Exemplu 40, Iași',
    },
  };
  TEMPLATES.clinic = {
    label: 'Cabinet / Clinică', itemsLabel: 'Tratamente', itemsHint: 'Consultații, tratamente, pachete', cta: 'Programează o consultație', fontKey: 'sans',
    defaults: {
      name: 'Clinica Zâmbet', tagline: 'Stomatologie modernă, cu grijă și răbdare.',
      about: 'Îți explicăm fiecare pas înainte să începem și primești planul de tratament cu prețuri, în scris. Lucrăm pe programare, ca să nu aștepți.',
      accent: '#0e8f8a', theme: 'light',
      items: [
        { name: 'Consultație', price: '100 lei', desc: 'Examinare și plan de tratament' },
        { name: 'Igienizare', price: '250 lei', desc: 'Detartraj, periaj profesional, airflow' },
        { name: 'Obturație', price: 'de la 250 lei', desc: 'Plombă estetică' },
        { name: 'Albire profesională', price: '900 lei', desc: 'În cabinet, o ședință' },
      ],
      hours: ['09:00–19:00', '09:00–19:00', '09:00–19:00', '09:00–19:00', '09:00–17:00', 'Închis', 'Închis'],
      phone: '0740 000 000', whatsapp: '', instagram: 'clinicazambet', address: 'Strada Exemplu 7, Iași',
    },
  };
  // compatibilitate: font, upper, italic din cheia fontului
  Object.keys(TEMPLATES).forEach(function (k) { var t = TEMPLATES[k], f = FONTS[t.fontKey]; t.font = f.css; t.upper = !!f.upper; t.italic = !!f.italic; });

  var LIMITS = { name: 60, tagline: 120, about: 800, cta: 40, phone: 20, whatsapp: 20, instagram: 40, address: 120, email: 80, itemName: 60, itemPrice: 24, itemDesc: 160, hours: 30, items: 20, gallery: 6, mapsUrl: 400, notice: 120, reviews: 6, reviewName: 40, reviewText: 300, faq: 8, faqQ: 120, faqA: 500 };

  // Întrebări sugerate pe domenii (clientul le adaugă cu un buton și le modifică).
  var SUGGEST_FAQ = {
    barber: [['Trebuie să fac programare?', 'Da, lucrăm pe programare, ca să nu aștepți. Ne scrii pe WhatsApp sau ne suni.'], ['Cât durează un tuns?', 'Aproximativ 30–45 de minute, cu tot cu aranjat.'], ['Se poate plăti cu cardul?', 'Da, cu cardul sau cash.']],
    cafe: [['Pot rezerva o masă?', 'Da, pentru grupuri ne scrii sau ne suni dinainte.'], ['Aveți opțiuni vegane?', 'Da, avem lapte vegetal și câteva deserturi fără produse animale.'], ['Aveți Wi-Fi?', 'Da, parola e la bar.']],
    salon: [['Cât rezistă manichiura semipermanentă?', 'De obicei 2–3 săptămâni, în funcție de îngrijire.'], ['Cum fac o programare?', 'Ne scrii pe WhatsApp sau ne suni și stabilim ora.'], ['Ce se întâmplă dacă întârzii?', 'Te rugăm să ne anunți. Dacă întârzii mult, s-ar putea să reprogramăm.']],
    portfolio: [['Cât costă?', 'Prețul depinde de proiect. Îmi scrii ce ai nevoie și îți trimit o ofertă clară.'], ['În cât timp primesc rezultatul?', 'Termenul îl stabilim de la început, în funcție de proiect.'], ['Lucrezi și în alte orașe?', 'Da, scrie-mi unde și când.']],
    fitness: [['Am nevoie de experiență?', 'Nu. Pornim de la nivelul tău și creștem treptat.'], ['Ce program aveți?', 'Programul complet e mai jos, la Contact.'], ['Pot veni cu un prieten?', 'Da, scrie-ne dinainte și vă așteptăm.']],
    auto: [['Cât durează un detailing complet?', 'De obicei o zi. Îți spunem exact când programezi.'], ['Trebuie să las mașina?', 'Pentru detailing, da. Spălarea simplă o poți aștepta.'], ['Ce produse folosiți?', 'Doar produse profesionale, sigure pentru vopsea și interior.']],
    clinic: [['Primesc un plan de tratament?', 'Da, după consultație primești planul și prețurile în scris.'], ['Lucrați cu programare?', 'Da, ca să nu aștepți. Ne suni sau ne scrii pe WhatsApp.'], ['Se poate plăti în rate?', 'Întreabă-ne la consultație și găsim împreună o variantă.']],
  };

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
      notice: str(d.notice, LIMITS.notice),
      reviews: (Array.isArray(d.reviews) ? d.reviews.slice(0, LIMITS.reviews) : []).map(function (r) { r = r || {}; return { name: str(r.name, LIMITS.reviewName), text: str(r.text, LIMITS.reviewText) }; }).filter(function (r) { return r.text; }),
      faq: (Array.isArray(d.faq) ? d.faq.slice(0, LIMITS.faq) : []).map(function (f) { f = f || {}; return { q: str(f.q, LIMITS.faqQ), a: str(f.a, LIMITS.faqA) }; }).filter(function (f) { return f.q && f.a; }),
      font: FONTS[d.font] ? d.font : '', corners: CORNERS[d.corners] ? d.corners : '', layout: LAYOUTS[d.layout] ? d.layout : '',
      accent: color(d.accent, def.accent), theme: d.theme === 'dark' ? 'dark' : d.theme === 'light' ? 'light' : def.theme,
      phone: str(d.phone, LIMITS.phone), whatsapp: str(d.whatsapp, LIMITS.whatsapp),
      instagram: str(d.instagram, LIMITS.instagram).replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, ''),
      email: /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(str(d.email, LIMITS.email)) ? str(d.email, LIMITS.email) : '',
      address: str(d.address, LIMITS.address),
      mapsUrl: mapsUrl(d.mapsUrl), geo: geo(d.geo),
      items: items.map(function (i) { i = i || {}; return { name: str(i.name, LIMITS.itemName), price: str(i.price, LIMITS.itemPrice), desc: str(i.desc, LIMITS.itemDesc) }; }).filter(function (i) { return i.name; }),
      hours: DAYS.map(function (_, k) { return str(hours[k], LIMITS.hours); }),
      logo: asset(d.logo), hero: asset(d.hero),
      gallery: (Array.isArray(d.gallery) ? d.gallery : []).map(asset).filter(Boolean).slice(0, LIMITS.gallery),
    };
  }

  // Locația: link Google Maps (doar de pe domeniile Google) și coordonate „lat,lng”.
  function mapsUrl(v) {
    v = str(v, LIMITS.mapsUrl);
    return /^https:\/\/((www\.|maps\.)?google\.[a-z.]{2,6}\/maps|maps\.app\.goo\.gl\/|goo\.gl\/maps\/)[^\s"'<>]*$/i.test(v) ? v : '';
  }
  function geo(v) {
    var m = String(v || '').match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
    if (!m || Math.abs(+m[1]) > 90 || Math.abs(+m[2]) > 180) return '';
    return (+m[1]).toFixed(6) + ',' + (+m[2]).toFixed(6);
  }
  // Ce arată harta: coordonatele, apoi pinul din linkul Google Maps, apoi adresa.
  function mapQuery(d) {
    if (d.geo) return d.geo;
    var m = (d.mapsUrl || '').match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || (d.mapsUrl || '').match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) return m[1] + ',' + m[2];
    var pl = (d.mapsUrl || '').match(/\/maps\/place\/([^/@?]+)/);
    if (pl) { try { return decodeURIComponent(pl[1].replace(/\+/g, ' ')); } catch (e) {} }
    return d.address || '';
  }
  function mapEmbed(q) { return q ? 'https://maps.google.com/maps?q=' + encodeURIComponent(q) + '&z=16&hl=ro&output=embed' : ''; }
  function mapLinks(d) {
    var q = mapQuery(d);
    return { open: d.mapsUrl || (q ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : ''), dir: q ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(q) : '' };
  }

  // „Deschis acum”: din programul zilei (format 09:00–18:00). Aceeași logică rulează și pe site-ul final, în browser.
  function openStatus(h, now) {
    var D = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
    function p(s) { var m = String(s || '').match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/); return m ? [+m[1] * 60 + +m[2], +m[3] * 60 + +m[4], (m[3].length < 2 ? '0' : '') + m[3] + ':' + m[4]] : null; }
    function hm(x) { var a = Math.floor(x / 60), b = x % 60; return (a < 10 ? '0' : '') + a + ':' + (b < 10 ? '0' : '') + b; }
    var k = (now.getDay() + 6) % 7, t = now.getHours() * 60 + now.getMinutes(), r = p(h[k]);
    if (r && t >= r[0] && t < r[1]) return [1, 'Deschis acum · până la ' + r[2]];
    for (var i = 0; i < 7; i++) {
      var j = (k + i) % 7, q = p(h[j]);
      if (q && (i > 0 || t < q[0])) return [0, 'Închis acum · deschide ' + (i === 0 ? 'azi' : i === 1 ? 'mâine' : D[j].toLowerCase()) + ' la ' + hm(q[0])];
    }
    return null;
  }
  var OPEN_JS = String(openStatus); // același cod rulează și pe site-ul final

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

  // Program comprimat: „Luni–Vineri 10:00–20:00 · Sâmbătă 10:00–16:00”.
  function hoursSummary(h) {
    var out = [], i = 0;
    while (i < 7) {
      var j = i; while (j + 1 < 7 && h[j + 1] === h[i]) j++;
      if (h[i]) out.push((i === j ? DAYS[i] : DAYS[i] + '–' + DAYS[j]) + ' ' + h[i]);
      i = j + 1;
    }
    return out;
  }
  function city(addr) { var p = String(addr || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); return p.length ? p[p.length - 1] : ''; }

  // Ce e diferit la fiecare șablon: ton, pași, titluri, decor.
  var STYLE = {
    barber: { kind: 'Frizerie', items: 'Lista de prețuri', side: 'Prețuri', about: 'Despre noi', gal: 'Din salon', steps: [['Programezi', 'Online, pe WhatsApp sau la telefon, la ora care îți convine.'], ['Vii fără să aștepți', 'Locul e al tău la ora stabilită. Fără cozi.'], ['Pleci aranjat', 'Tunsoare, contur și sfaturi pentru acasă.']], band: 'Rezervă-ți locul.', bandP: 'Programările se ocupă repede, mai ales în weekend.', radius: '6px', btnR: '4px', tint: false },
    cafe: { kind: 'Cafenea', items: 'Meniu', side: 'Recomandările casei', about: 'Povestea noastră', gal: 'Atmosfera', steps: [['Treci pe la noi', 'Sau rezervă o masă dinainte, pentru grupuri.'], ['Alegi din meniu', 'Cafea de specialitate, gustări și deserturi proaspete.'], ['Rămâi cât vrei', 'Wi-Fi, prize și liniște. Te așteptăm oricând.']], band: 'Te așteptăm la o cafea.', bandP: 'Rezervă o masă sau treci direct pe la noi.', radius: '18px', btnR: '999px', tint: true },
    salon: { kind: 'Salon', items: 'Servicii', side: 'Cele mai cerute', about: 'Despre salon', gal: 'Lucrările noastre', steps: [['Alegi serviciul', 'Din lista de mai sus sau ne întrebi ce ți se potrivește.'], ['Programezi', 'Pe WhatsApp sau la telefon, la ora potrivită pentru tine.'], ['Te răsfeți', 'Produse profesionale, instrumente sterilizate, rezultat impecabil.']], band: 'Fă-ți o programare.', bandP: 'Locurile din săptămâna asta se ocupă repede.', radius: '26px', btnR: '999px', tint: true },
    portfolio: { kind: 'Portofoliu', items: 'Ce ofer', side: 'Ce fac', about: 'Despre mine', gal: 'Lucrări', steps: [['Îmi scrii', 'Spune-mi pe scurt ce ai nevoie și când.'], ['Stabilim detaliile', 'Preț clar, termen clar, fără surprize.'], ['Primești rezultatul', 'La timp și exact cum am stabilit.']], band: 'Hai să lucrăm împreună.', bandP: 'Spune-mi ce ai în minte. Îți răspund în aceeași zi.', radius: '14px', btnR: '999px', tint: false },
  };

  STYLE.fitness = { kind: 'Sală de fitness', items: 'Abonamente și prețuri', side: 'Abonamente', about: 'Despre noi', gal: 'Sala', steps: [['Ne scrii', 'Spune-ne obiectivul tău: forță, slăbit sau formă generală.'], ['Facem un plan', 'Antrenamente și alimentație, pe ritmul tău.'], ['Te antrenezi', 'Cu progres măsurat, săptămână de săptămână.']], band: 'Începe chiar de azi.', bandP: 'Primul pas e cel mai greu. Restul îl facem împreună.', radius: '4px', btnR: '4px', tint: false };
  STYLE.auto = { kind: 'Auto detailing', items: 'Servicii și prețuri', side: 'Cele mai cerute', about: 'Despre noi', gal: 'Înainte și după', steps: [['Programezi', 'Alegi serviciul și ora, pe WhatsApp sau la telefon.'], ['Lași mașina', 'Îți spunem dinainte cât durează și cât costă.'], ['O iei ca nouă', 'Predare la ora stabilită, fără întârzieri.']], band: 'Programează mașina.', bandP: 'Locurile din weekend se ocupă primele.', radius: '10px', btnR: '6px', tint: false };
  STYLE.clinic = { kind: 'Cabinet', items: 'Tratamente și prețuri', side: 'Tratamente', about: 'Despre clinică', gal: 'Clinica', steps: [['Programezi', 'Telefonic sau pe WhatsApp, la ora potrivită.'], ['Consultație', 'Îți explicăm tot și primești planul în scris.'], ['Tratament', 'Fără grabă, cu explicații la fiecare pas.']], band: 'Programează o consultație.', bandP: 'Îți răspundem în aceeași zi.', radius: '20px', btnR: '999px', tint: true };

  // Date structurate pentru Google (afacere locală): nume, adresă, telefon, program.
  var LD_TYPE = { barber: 'HairSalon', cafe: 'CafeOrCoffeeShop', salon: 'BeautySalon', portfolio: 'ProfessionalService', fitness: 'ExerciseGym', auto: 'AutoWash', clinic: 'Dentist' };
  var LD_DAY = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  function jsonld(tpl, d, name, hero) {
    var o = { '@context': 'https://schema.org', '@type': LD_TYPE[tpl] || 'LocalBusiness', name: name };
    if (d.tagline) o.description = d.tagline;
    if (d.phone) o.telephone = d.phone;
    if (d.email) o.email = d.email;
    if (d.address) o.address = { '@type': 'PostalAddress', streetAddress: d.address, addressCountry: 'RO' };
    if (hero) o.image = hero;
    var oh = [];
    d.hours.forEach(function (h, k) { var m = String(h).match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/); if (m) oh.push(LD_DAY[k] + ' ' + m[1].padStart(2, '0') + ':' + m[2] + '-' + m[3].padStart(2, '0') + ':' + m[4]); });
    if (oh.length) o.openingHours = oh;
    var pr = d.items.filter(function (i) { return i.price; }).slice(0, 10);
    if (pr.length) o.makesOffer = pr.map(function (i) { return { '@type': 'Offer', name: i.name, description: i.price }; });
    if (d.instagram) o.sameAs = ['https://www.instagram.com/' + d.instagram + '/'];
    return '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, '\\u003c') + '</script>';
  }

  // Generatorul de design: o combinație aleatoare, dar mereu armonioasă (palete alese de mână).
  var PALETTES = [
    { accent: '#c8a24a', theme: 'dark' }, { accent: '#8a5a3b', theme: 'light' }, { accent: '#c56b8a', theme: 'light' }, { accent: '#2b59ff', theme: 'light' },
    { accent: '#d4ff3a', theme: 'dark' }, { accent: '#e63946', theme: 'dark' }, { accent: '#0e8f8a', theme: 'light' }, { accent: '#e8590c', theme: 'light' },
    { accent: '#8b5cf6', theme: 'dark' }, { accent: '#10b981', theme: 'dark' }, { accent: '#1e3a8a', theme: 'light' }, { accent: '#111111', theme: 'light' },
    { accent: '#ff6b5b', theme: 'light' }, { accent: '#d6b48a', theme: 'dark' }, { accent: '#38bdf8', theme: 'dark' }, { accent: '#b45309', theme: 'light' },
  ];
  function pick(a, rnd) { return a[Math.floor((rnd || Math.random)() * a.length)]; }
  function randomLook(cur, rnd) {
    cur = cur || {};
    for (var i = 0; i < 20; i++) {
      var p = pick(PALETTES, rnd);
      var look = { accent: p.accent, theme: p.theme, font: pick(Object.keys(FONTS), rnd), corners: pick(Object.keys(CORNERS), rnd), layout: pick(Object.keys(LAYOUTS), rnd) };
      if (look.accent !== cur.accent || look.font !== cur.font) return look;
    }
    return look;
  }

  // opt.img(id) → adresa pozei (în previzualizare: link temporar; la export: assets/fișier)
  // opt.preview → adaugă bandă și watermark „Previzualizare · Creat cu Aman”
  function render(tpl, data, opt) {
    opt = opt || {};
    if (!TEMPLATES[tpl]) tpl = 'barber';
    var T = TEMPLATES[tpl], X = STYLE[tpl], d = normalize(tpl, data);
    var img = function (id) { return id && opt.img ? opt.img(id) : ''; };
    var dark = d.theme === 'dark', A = d.accent, on = onAccent(A);
    var bg = dark ? '#0d0d0e' : X.tint ? mix(A, 0.965) : '#ffffff';
    var bg2 = dark ? '#161618' : X.tint ? '#ffffff' : mix(A, 0.955);
    var card = dark ? '#18181b' : '#ffffff';
    var fg = dark ? '#f4f4f5' : '#141416', fg2 = dark ? '#a1a1aa' : '#5b5b63', line = dark ? '#2a2a2e' : (X.tint ? mix(A, 0.86) : '#e7e7ec');
    var name = d.name || T.defaults.name, cta = d.cta || T.cta;
    var ctaHref = d.whatsapp ? 'https://wa.me/' + wa(d.whatsapp) : d.phone ? 'tel:' + digits(d.phone) : d.instagram ? 'https://www.instagram.com/' + d.instagram + '/' : '#contact';
    var ext = function (h) { return /^https/.test(h) ? ' target="_blank" rel="noopener"' : ''; };
    var hero = img(d.hero), logo = img(d.logo), gallery = d.gallery.map(img).filter(Boolean);
    var year = new Date().getFullYear(), town = city(d.address), hs = hoursSummary(d.hours);
    var F = FONTS[d.font || T.fontKey], CO = d.corners ? CORNERS[d.corners] : { r: X.radius, b: X.btnR };
    T = Object.assign({}, T, { font: F.css, upper: !!F.upper, italic: !!F.italic });
    var head = (T.upper ? 'text-transform:uppercase;letter-spacing:.01em;' : 'letter-spacing:-.02em;') + (T.italic ? 'font-style:italic;' : '');
    var R = CO.r, BR = CO.b, center = d.layout === 'center', poster = d.layout === 'poster';
    var fontKey = d.font || TEMPLATES[tpl].fontKey;

    // decor de fundal pentru prima secțiune, când nu există poză
    var deco = {
      barber: 'background:repeating-linear-gradient(-45deg,' + A + '0d 0 2px,transparent 2px 22px),radial-gradient(80% 60% at 85% 10%,' + A + '26,transparent 60%),' + bg + ';',
      cafe: 'background:radial-gradient(60% 70% at 100% 0%,' + mix(A, dark ? -0.4 : 0.8) + ',transparent 70%),radial-gradient(50% 60% at 0% 100%,' + mix(A, dark ? -0.6 : 0.88) + ',transparent 70%),' + bg + ';',
      salon: 'background:radial-gradient(45% 55% at 90% 15%,' + A + (dark ? '33' : '40') + ',transparent 70%),radial-gradient(40% 50% at 10% 90%,' + mix(A, dark ? -0.3 : 0.6) + (dark ? '55' : '') + ',transparent 70%),' + bg + ';',
      portfolio: 'background:linear-gradient(' + line + ' 1px,transparent 1px) 0 0/48px 48px,linear-gradient(90deg,' + line + ' 1px,transparent 1px) 0 0/48px 48px,' + bg + ';',
      fitness: 'background:linear-gradient(115deg,transparent 62%,' + A + '1f 62% 70%,transparent 70% 74%,' + A + '14 74% 78%,transparent 78%),' + bg + ';',
      auto: 'background:radial-gradient(70% 90% at 100% 0%,' + A + '2e,transparent 60%),repeating-radial-gradient(circle at 0 0,' + (dark ? '#ffffff08' : '#00000008') + ' 0 2px,transparent 2px 6px),' + bg + ';',
      clinic: 'background:radial-gradient(50% 60% at 95% 10%,' + A + (dark ? '30' : '24') + ',transparent 70%),radial-gradient(35% 45% at 5% 95%,' + A + '18,transparent 70%),' + bg + ';',
    }[tpl];

    var css = fontFace(fontKey, opt.fontBase == null ? 'assets/fonts/' : opt.fontBase) + ':root{--a:' + A + ';--on:' + on + ';--bg:' + bg + ';--bg2:' + bg2 + ';--card:' + card + ';--fg:' + fg + ';--fg2:' + fg2 + ';--line:' + line + '}' +
      '*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;touch-action:manipulation}a,button,summary{touch-action:manipulation}body{margin:0;background:var(--bg);color:var(--fg);font:400 17px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}' +
      'img{max-width:100%;display:block}a{color:inherit}.w{max-width:1120px;margin:0 auto;padding:0 22px}' +
      'h1,h2,h3,.disp{font-family:' + T.font + ';font-weight:700;line-height:1.04;margin:0;' + head + 'text-wrap:balance}' +
      '.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--a);color:var(--on);text-decoration:none;font-weight:600;border-radius:' + BR + ';padding:14px 26px;font-size:16px;border:1.5px solid var(--a);transition:transform .2s,box-shadow .2s;white-space:nowrap}' +
      '.btn:hover{transform:translateY(-2px);box-shadow:0 12px 28px -12px var(--a)}.btn.sm{padding:9px 18px;font-size:14px;flex:none}' +
      '.btn.ghost{background:transparent;color:inherit;border-color:currentColor}.btn.ghost:hover{box-shadow:none;background:rgba(127,127,127,.12)}' +
      '.eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:12.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--a);margin:0 0 14px}.eyebrow::before{content:"";width:22px;height:2px;background:currentColor}' +
      // antet
      'header{position:sticky;top:0;z-index:20;background:' + bg + 'e0;backdrop-filter:saturate(160%) blur(14px);-webkit-backdrop-filter:saturate(160%) blur(14px);border-bottom:1px solid var(--line)}' +
      'header .w{display:flex;align-items:center;gap:28px;height:68px}.brand{display:flex;align-items:center;gap:10px;font-family:' + T.font + ';font-weight:700;font-size:21px;text-decoration:none;min-width:0;margin-right:auto;' + head + '}.brand span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.brand img{width:38px;height:38px;border-radius:' + (tpl === 'barber' ? '6px' : '50%') + ';object-fit:cover}.brand i{width:10px;height:10px;border-radius:50%;background:var(--a);flex:none}' +
      'nav{display:flex;gap:26px;font-size:15px}nav a{text-decoration:none;color:var(--fg2);transition:color .2s}nav a:hover{color:var(--fg)}@media(max-width:820px){nav{display:none}}' +
      // prima secțiune
      '.hero{position:relative;overflow:hidden;' + (hero ? 'background:#000 url("' + cssUrl(hero) + '") center/cover no-repeat;color:#fff' : deco) + '}' +
      (hero ? '.hero::before{content:"";position:absolute;inset:0;background:linear-gradient(100deg,rgba(0,0,0,.78) 0%,rgba(0,0,0,.45) 55%,rgba(0,0,0,.25))}' : '') +
      '.hero .w{position:relative;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,.85fr);gap:clamp(28px,5vw,64px);align-items:center;padding-top:clamp(56px,9vw,120px);padding-bottom:clamp(56px,9vw,120px)}' +
      '@media(max-width:860px){.hero .w{grid-template-columns:1fr}}' +
      '.hero h1{font-size:clamp(46px,8.4vw,104px)}' + (tpl === 'barber' ? '.hero h1 em{font-style:normal;color:var(--a)}' : '.hero h1 em{font-style:' + (T.italic || tpl === 'cafe' ? 'italic' : 'normal') + ';color:var(--a)}') +
      '.hero .lead{font-size:clamp(18px,2.1vw,22px);max-width:32em;margin:22px 0 32px;color:' + (hero ? 'rgba(255,255,255,.86)' : 'var(--fg2)') + '}' +
      '.ctas{display:flex;flex-wrap:wrap;gap:12px;align-items:center}' +
      '.chips{display:flex;flex-wrap:wrap;gap:10px 22px;margin-top:34px;font-size:14px;color:' + (hero ? 'rgba(255,255,255,.8)' : 'var(--fg2)') + '}.chips span{display:inline-flex;align-items:center;gap:8px}.chips span::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--a)}' +
      '.side{background:' + (hero ? 'rgba(20,20,22,.55)' : 'var(--card)') + ';' + (hero ? 'color:#fff;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.16);' : 'border:1px solid var(--line);') + 'border-radius:' + R + ';padding:26px 26px 22px;box-shadow:0 30px 60px -30px rgba(0,0,0,' + (dark || hero ? '.6' : '.22') + ')}' +
      '.side h3{font-size:14px;font-family:inherit;font-style:normal;text-transform:uppercase;letter-spacing:.14em;color:var(--a);margin-bottom:14px}' +
      '.side ul{list-style:none;margin:0 0 18px;padding:0}.side li{display:flex;align-items:baseline;gap:10px;padding:11px 0;border-bottom:1px solid ' + (hero ? 'rgba(255,255,255,.14)' : 'var(--line)') + '}.side li:last-child{border-bottom:0}' +
      '.side li b{font-weight:600}.side li i{flex:1;border-bottom:1px dotted ' + (hero ? 'rgba(255,255,255,.35)' : 'var(--line)') + ';transform:translateY(-4px)}.side li span{font-weight:700;color:var(--a);white-space:nowrap}' +
      '.side .btn{width:100%}' +
      (center ? '.hero .w{grid-template-columns:1fr;text-align:center;justify-items:center}.hero .w>div:first-child{display:flex;flex-direction:column;align-items:center}.hero h1{max-width:14ch}.hero .lead{margin-left:auto;margin-right:auto}.hero .ctas,.hero .chips{justify-content:center}.hero .eyebrow::before{display:none}.side{width:100%;max-width:540px;text-align:left}' : '') +
      (poster ? '.hero .w{grid-template-columns:1fr;gap:clamp(28px,4vw,48px)}.hero h1{font-size:clamp(60px,13.5vw,190px);max-width:none;line-height:.92}.hero .lead{font-size:clamp(19px,2.4vw,26px)}' +
        '.side{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 28px;align-items:center}.side h3{grid-column:1/-1;margin:0}.side ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0 28px;margin:0}.side li:last-child{border-bottom:1px solid ' + (hero ? 'rgba(255,255,255,.14)' : 'var(--line)') + '}.side .btn{width:auto}@media(max-width:700px){.side{grid-template-columns:1fr}.side .btn{width:100%}}' : '') +
      // anunț, recenzii, întrebări
      '.notice{background:var(--a);color:var(--on);text-align:center;font-size:14px;font-weight:600;padding:9px 16px}' +
      '.revs{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}.rev{margin:0;background:var(--card);border:1px solid var(--line);border-radius:' + R + ';padding:28px;display:flex;flex-direction:column;gap:18px}' +
      '.rev::before{content:"“";font-family:' + T.font + ';font-size:64px;line-height:.6;color:var(--a);height:24px}.rev blockquote{margin:0;font-size:17px;line-height:1.6}.rev figcaption{margin-top:auto;font-weight:700;font-size:15px;display:flex;align-items:center;gap:10px}.rev figcaption::before{content:"";width:22px;height:2px;background:var(--a)}' +
      '.faq{max-width:820px}.faq details{border-bottom:1px solid var(--line)}.faq summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;gap:20px;padding:22px 0;font-size:clamp(17px,1.8vw,20px);font-weight:600}.faq summary::-webkit-details-marker{display:none}' +
      '.faq summary::after{content:"+";font-size:26px;line-height:1;color:var(--a);transition:transform .25s;flex:none}.faq details[open] summary::after{transform:rotate(45deg)}.faq details p{margin:0 0 22px;color:var(--fg2);max-width:40em}' +
      // apariție la scroll, fără JavaScript (doar unde browserul știe)
      '@supports (animation-timeline:view()){@media(prefers-reduced-motion:no-preference){section .sh,.items li,.steps li,.rev,.gal img,.band,.contact>*,.faq details{animation:up linear both;animation-timeline:view();animation-range:entry 0% cover 22%}}}' +
      '@keyframes up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}.hero .w>*{animation:up .8s cubic-bezier(.2,.7,.2,1) both}.hero .w>*+*{animation-delay:.15s}@media(prefers-reduced-motion:reduce){.hero .w>*{animation:none}}' +
      // secțiuni
      'section{padding:clamp(64px,9vw,112px) 0}.alt{background:var(--bg2)}' +
      '.sh{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap;margin-bottom:clamp(28px,4vw,48px)}.sh p{margin:0;max-width:30em;color:var(--fg2)}' +
      'h2{font-size:clamp(34px,5.2vw,60px)}' +
      // listă servicii / meniu
      '.items{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 clamp(28px,5vw,64px)}@media(max-width:760px){.items{grid-template-columns:1fr}}' +
      '.items li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:baseline;gap:4px 14px;padding:22px 0;border-bottom:1px solid var(--line)}' +
      '.items .n{font-size:13px;font-weight:700;color:var(--a);font-variant-numeric:tabular-nums;min-width:22px}' +
      '.items b{font-size:clamp(18px,2vw,21px);font-weight:600;display:flex;align-items:baseline;gap:12px}.items b::after{content:"";flex:1;border-bottom:1px dotted var(--line);transform:translateY(-5px);min-width:20px}' +
      '.items .p{font-weight:700;font-size:18px;color:var(--a);white-space:nowrap}.items small{grid-column:2/-1;color:var(--fg2);font-size:15px}' +
      // pași
      '.steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;counter-reset:s}@media(max-width:760px){.steps{grid-template-columns:1fr}}' +
      '.steps li{background:var(--card);border:1px solid var(--line);border-radius:' + R + ';padding:30px 28px;counter-increment:s;position:relative;overflow:hidden}' +
      '.steps li::before{content:"0" counter(s);display:block;font-family:' + T.font + ';font-size:54px;font-weight:700;line-height:1;color:var(--a);opacity:.9;margin-bottom:18px;' + head + '}' +
      '.steps h3{font-size:23px;margin-bottom:8px}.steps p{margin:0;color:var(--fg2);font-size:16px}' +
      // despre
      '.about{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:clamp(32px,6vw,88px);align-items:start}@media(max-width:860px){.about{grid-template-columns:1fr}}' +
      '.about .txt p{font-size:clamp(18px,1.8vw,20px);color:var(--fg2);margin:0 0 18px}' +
      '.quote{font-family:' + T.font + ';font-size:clamp(26px,3.4vw,40px);line-height:1.15;margin:22px 0 0;padding-left:22px;border-left:3px solid var(--a);' + head + '}' +
      '.facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:28px}.facts div{background:var(--card);border:1px solid var(--line);border-radius:' + R + ';padding:18px 20px}.facts b{display:block;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--a);margin-bottom:4px}.facts span{font-size:15px;color:var(--fg)}' +
      // galerie mozaic
      // mozaic fără goluri, după numărul de poze (1–6)
      '.gal{display:grid;gap:12px;grid-auto-rows:clamp(150px,19vw,250px)}.gal img{width:100%;height:100%;object-fit:cover;border-radius:' + R + ';transition:transform .5s}.gal img:hover{transform:scale(1.02)}' +
      '.g1{grid-template-columns:1fr;grid-auto-rows:clamp(220px,40vw,480px)}.g2{grid-template-columns:1fr 1fr;grid-auto-rows:clamp(200px,30vw,400px)}' +
      '.g3,.g4,.g5{grid-template-columns:repeat(4,minmax(0,1fr))}.g3 img:first-child,.g4 img:first-child,.g5 img:first-child{grid-column:span 2;grid-row:span 2}.g3 img:not(:first-child){grid-column:span 2}.g4 img:nth-child(2){grid-column:span 2}' +
      '.g6{grid-template-columns:repeat(3,minmax(0,1fr))}.g6 img:first-child{grid-column:span 2;grid-row:span 2}' +
      '@media(max-width:700px){.gal.gal{grid-template-columns:1fr 1fr;grid-auto-rows:150px}.gal.gal img{grid-column:auto;grid-row:auto}.gal.gal img:first-child{grid-column:span 2;grid-row:span 2}.gal.gal img:last-child:nth-child(even){grid-column:span 2}}' +
      // bandă finală
      '.band{background:var(--a);color:var(--on);border-radius:' + R + ';padding:clamp(40px,6vw,72px);display:flex;justify-content:space-between;align-items:center;gap:28px;flex-wrap:wrap;position:relative;overflow:hidden}' +
      '.band::after{content:"";position:absolute;right:-80px;top:-80px;width:280px;height:280px;border-radius:50%;border:40px solid rgba(255,255,255,.12)}' +
      '.band h2{font-size:clamp(32px,4.6vw,54px);margin:0 0 8px}.band p{margin:0;opacity:.85;font-size:18px}.band .btn{background:var(--on);color:var(--a);border-color:var(--on);position:relative;z-index:1}' +
      // contact
      '.contact{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}' +
      '.card{background:var(--card);border:1px solid var(--line);border-radius:' + R + ';padding:28px}.card h3{font-size:24px;margin-bottom:18px}' +
      '.hours{width:100%;border-collapse:collapse;font-size:16px}.hours td{padding:9px 0;border-bottom:1px solid var(--line)}.hours tr:last-child td{border-bottom:0}.hours td:last-child{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}' +
      '.links{display:flex;flex-direction:column;gap:4px;margin:0;padding:0;list-style:none}.links a{display:block;text-decoration:none;font-weight:600;font-size:17px;padding:10px 0;border-bottom:1px solid var(--line)}.links li:last-child a{border-bottom:0}.links a:hover{color:var(--a)}.links span{display:block;font-size:12.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--fg2);margin-bottom:2px}' +
      '.map{display:flex;flex-direction:column;justify-content:space-between;gap:22px;background:' + (dark ? '#111113' : mix(A, 0.9)) + ';border-color:transparent;' +
        'background-image:linear-gradient(' + (dark ? '#ffffff0d' : '#ffffff99') + ' 2px,transparent 2px),linear-gradient(90deg,' + (dark ? '#ffffff0d' : '#ffffff99') + ' 2px,transparent 2px);background-size:34px 34px}' +
      '.open{display:inline-flex;align-items:center;gap:8px;font-weight:600;color:' + (hero ? '#fff' : 'var(--fg)') + ';padding:5px 12px 5px 10px;border-radius:999px;background:' + (hero ? 'rgba(255,255,255,.14)' : 'rgba(127,127,127,.12)') + '}.open::before{content:"";width:8px;height:8px;border-radius:50%;background:#e5484d}.open.on::before{background:#30a46c;box-shadow:0 0 0 4px rgba(48,164,108,.25)}' +
      '.mapbox{position:relative;margin-top:16px;border-radius:' + R + ';overflow:hidden;border:1px solid var(--line);min-height:340px;background:' + (dark ? '#111113' : mix(A, 0.9)) + '}.mapbox iframe{display:block;width:100%;height:420px;border:0;filter:' + (dark ? 'grayscale(.4) invert(.9) hue-rotate(180deg)' : 'grayscale(.15)') + '}' +
      '.mapph{height:420px;background-image:linear-gradient(' + (dark ? '#ffffff0d' : '#ffffff99') + ' 2px,transparent 2px),linear-gradient(90deg,' + (dark ? '#ffffff0d' : '#ffffff99') + ' 2px,transparent 2px);background-size:34px 34px;display:grid;place-items:center}.mapph .pin{transform:rotate(-45deg) scale(1.3)}' +
      '.mapinfo{position:absolute;left:16px;bottom:16px;right:16px;max-width:440px;background:var(--card);border:1px solid var(--line);border-radius:' + R + ';padding:18px 20px;box-shadow:0 18px 40px -18px rgba(0,0,0,.45);display:flex;flex-direction:column;gap:12px}.mapinfo p{margin:0;font-size:18px;font-weight:700}.mapinfo .ctas{gap:8px}.mapinfo .btn{padding:10px 16px;font-size:14px}.mapinfo small{color:var(--fg2);font-size:13px}' +
      '@media(max-width:600px){.mapinfo{position:static;max-width:none;border-radius:0;border:0;border-top:1px solid var(--line)}.mapbox iframe,.mapph{height:300px}}' +
      '.pin{width:46px;height:46px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--a);display:grid;place-items:center}.pin::after{content:"";width:16px;height:16px;border-radius:50%;background:var(--on)}' +
      '.map p{margin:0;font-size:20px;font-weight:600}' +
      // subsol
      'footer{background:' + (dark ? '#080809' : '#111113') + ';color:#d4d4d8;padding:56px 0 28px;font-size:15px}footer .w{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:32px}@media(max-width:760px){footer .w{grid-template-columns:1fr}}' +
      'footer .disp{font-size:26px;color:#fff;margin-bottom:10px}footer p{margin:0;color:#a1a1aa}footer h4{margin:0 0 10px;font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;color:#71717a}footer a{color:#e4e4e7;text-decoration:none}footer a:hover{color:#fff}footer ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}' +
      'footer .copy{grid-column:1/-1;border-top:1px solid #27272a;padding-top:22px;margin-top:8px;color:#71717a;font-size:13px}' +
      // bară de acțiuni pe telefon
      '.dock{display:none}@media(max-width:700px){.dock{display:flex;position:fixed;left:12px;right:12px;bottom:' + (opt.preview ? '50px' : '12px') + ';z-index:30;gap:8px;padding:8px;border-radius:' + (BR === '999px' ? '999px' : '10px') + ';background:' + (dark ? 'rgba(24,24,27,.86)' : 'rgba(255,255,255,.88)') + ';backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 12px 34px rgba(0,0,0,.22)}.dock a{flex:1;padding:12px}body{padding-bottom:' + (opt.preview ? '120px' : '84px') + '}}' +
      (opt.preview ? '.pv{position:fixed;left:0;right:0;bottom:0;z-index:50;background:#111;color:#fff;text-align:center;font:600 13px/1.2 -apple-system,sans-serif;padding:10px}.wm{position:fixed;inset:0;z-index:40;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'380\' height=\'200\'%3E%3Ctext x=\'10\' y=\'115\' transform=\'rotate(-22 190 100)\' fill=\'rgba(127,127,127,0.18)\' font-family=\'Arial\' font-size=\'21\' font-weight=\'700\'%3ECreat cu Aman Web Builder%3C/text%3E%3C/svg%3E")}@media(min-width:701px){body{padding-bottom:40px}}' : '');

    // titlul mare: ultimul cuvânt evidențiat cu accentul
    var words = esc(name).split(' ');
    var h1 = words.length > 1 ? words.slice(0, -1).join(' ') + ' <em>' + words[words.length - 1] + '</em>' : '<em>' + words[0] + '</em>';

    var links = [];
    if (d.phone) links.push('<li><a href="tel:' + esc(digits(d.phone)) + '"><span>Telefon</span>' + esc(d.phone) + '</a></li>');
    if (d.whatsapp) links.push('<li><a href="https://wa.me/' + esc(wa(d.whatsapp)) + '" target="_blank" rel="noopener"><span>WhatsApp</span>' + esc(d.whatsapp) + '</a></li>');
    if (d.instagram) links.push('<li><a href="https://www.instagram.com/' + esc(d.instagram) + '/" target="_blank" rel="noopener"><span>Instagram</span>@' + esc(d.instagram) + '</a></li>');
    if (d.email) links.push('<li><a href="mailto:' + esc(d.email) + '"><span>Email</span>' + esc(d.email) + '</a></li>');
    var mq = mapQuery(d), ml = mapLinks(d);
    var mapBlock = mq ? '<div class="mapbox">' + (opt.preview
        ? '<div class="mapph"><span class="pin" aria-hidden="true"></span></div>'
        : '<iframe src="' + esc(mapEmbed(mq)) + '" title="Hartă: ' + esc(d.address || name) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>') +
      '<div class="mapinfo"><p>' + esc(d.address || 'Locația noastră') + '</p>' + (opt.preview ? '<small>Harta Google interactivă apare aici pe site-ul publicat.</small>' : '') +
      '<div class="ctas"><a class="btn" href="' + esc(ml.dir) + '" target="_blank" rel="noopener">Indicații</a><a class="btn ghost" href="' + esc(ml.open) + '" target="_blank" rel="noopener">Deschide în Google Maps</a></div></div></div>' : '';
    var hoursT = d.hours.some(Boolean) ? '<div class="card"><h3>Program</h3><table class="hours">' + DAYS.map(function (day, k) { return '<tr><td>' + day + '</td><td>' + (d.hours[k] ? esc(d.hours[k]) : '—') + '</td></tr>'; }).join('') + '</table></div>' : '';

    var chips = [], st = openStatus(d.hours, new Date());
    if (st) chips.push('<b class="open' + (st[0] ? ' on' : '') + '" id="open-now">' + esc(st[1]) + '</b>');
    if (d.address) chips.push(esc(d.address));
    if (hs.length) chips.push(esc(hs[0]));
    if (d.phone) chips.push(esc(d.phone));
    var top = d.items.slice(0, 4);
    var side = top.length ? '<aside class="side"><h3>' + X.side + '</h3><ul>' + top.map(function (i) { return '<li><b>' + esc(i.name) + '</b><i></i>' + (i.price ? '<span>' + esc(i.price) + '</span>' : '') + '</li>'; }).join('') + '</ul><a class="btn" href="' + esc(ctaHref) + '"' + ext(ctaHref) + '>' + esc(cta) + '</a></aside>' : '';

    var nav = (d.items.length ? '<a href="#servicii">' + T.itemsLabel + '</a>' : '') + (d.about ? '<a href="#despre">Despre</a>' : '') + (gallery.length ? '<a href="#galerie">' + (tpl === 'portfolio' ? 'Lucrări' : 'Galerie') + '</a>' : '') + (d.reviews.length ? '<a href="#recenzii">Recenzii</a>' : '') + '<a href="#contact">Contact</a>';
    var facts = [];
    if (town) facts.push('<div><b>Unde</b><span>' + esc(town) + '</span></div>');
    if (hs.length) facts.push('<div><b>Program</b><span>' + esc(hs[0]) + '</span></div>');

    return '<!DOCTYPE html><html lang="ro"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>' +
      '<title>' + esc(name) + (d.tagline ? ' · ' + esc(d.tagline) : '') + '</title><meta name="description" content="' + esc(d.tagline || d.about.slice(0, 150)) + '"/>' +
      '<meta property="og:title" content="' + esc(name) + '"/><meta property="og:description" content="' + esc(d.tagline || d.about.slice(0, 150)) + '"/>' + (hero ? '<meta property="og:image" content="' + esc(hero) + '"/>' : '') +
      '<meta name="theme-color" content="' + bg + '"/>' + (logo ? '<link rel="icon" href="' + esc(logo) + '"/>' : '') + (opt.preview ? '' : jsonld(tpl, d, name, hero)) + '<style>' + css + '</style></head><body>' +
      (d.notice ? '<div class="notice">' + esc(d.notice) + '</div>' : '') +
      '<header><div class="w"><a class="brand" href="#">' + (logo ? '<img src="' + esc(logo) + '" alt=""/>' : '<i></i>') + '<span>' + esc(name) + '</span></a><nav aria-label="Meniu">' + nav + '</nav><a class="btn sm" href="' + esc(ctaHref) + '"' + ext(ctaHref) + '>' + esc(cta) + '</a></div></header>' +
      '<main><div class="hero"><div class="w"><div><p class="eyebrow">' + X.kind + (town ? ' · ' + esc(town) : '') + '</p><h1>' + h1 + '</h1>' + (d.tagline ? '<p class="lead">' + esc(d.tagline) + '</p>' : '<p class="lead"></p>') +
        '<div class="ctas"><a class="btn" href="' + esc(ctaHref) + '"' + ext(ctaHref) + '>' + esc(cta) + '</a>' + (d.items.length ? '<a class="btn ghost" href="#servicii">Vezi ' + T.itemsLabel.toLowerCase() + '</a>' : '') + '</div>' +
        (chips.length ? '<div class="chips">' + chips.map(function (c) { return /^<b/.test(c) ? c : '<span>' + c + '</span>'; }).join('') + '</div>' : '') + '</div>' + side + '</div></div>' +
      (d.items.length ? '<section id="servicii"><div class="w"><div class="sh"><div><p class="eyebrow">' + T.itemsLabel + '</p><h2>' + X.items + '</h2></div>' + (hs.length ? '<p>' + esc(hs.join(' · ')) + '</p>' : '') + '</div><ul class="items">' +
        d.items.map(function (i, k) { return '<li><span class="n">' + (k < 9 ? '0' : '') + (k + 1) + '</span><b>' + esc(i.name) + '</b>' + (i.price ? '<span class="p">' + esc(i.price) + '</span>' : '<span></span>') + (i.desc ? '<small>' + esc(i.desc) + '</small>' : '') + '</li>'; }).join('') + '</ul></div></section>' : '') +
      '<section class="alt"><div class="w"><div class="sh"><div><p class="eyebrow">Cum funcționează</p><h2>Simplu, în trei pași.</h2></div></div><ol class="steps">' + X.steps.map(function (s) { return '<li><h3>' + s[0] + '</h3><p>' + s[1] + '</p></li>'; }).join('') + '</ol></div></section>' +
      (d.about ? '<section id="despre"><div class="w about"><div><p class="eyebrow">' + X.about + '</p><h2>' + (tpl === 'portfolio' ? 'Câteva cuvinte despre mine.' : 'Cine suntem.') + '</h2>' + (d.tagline ? '<p class="quote">' + esc(d.tagline) + '</p>' : '') + '</div><div class="txt"><p>' + esc(d.about).replace(/\n/g, '</p><p>') + '</p>' + (facts.length ? '<div class="facts">' + facts.join('') + '</div>' : '') + '</div></div></section>' : '') +
      (gallery.length ? '<section id="galerie" class="alt"><div class="w"><div class="sh"><div><p class="eyebrow">Galerie</p><h2>' + X.gal + '</h2></div>' + (d.instagram ? '<p><a href="https://www.instagram.com/' + esc(d.instagram) + '/" target="_blank" rel="noopener">Mai multe pe Instagram @' + esc(d.instagram) + ' →</a></p>' : '') + '</div><div class="gal g' + gallery.length + '">' + gallery.map(function (u) { return '<img src="' + esc(u) + '" alt="" loading="lazy"/>'; }).join('') + '</div></div></section>' : '') +
      (d.reviews.length ? '<section id="recenzii"' + (gallery.length ? '' : ' class="alt"') + '><div class="w"><div class="sh"><div><p class="eyebrow">Recenzii</p><h2>' + (tpl === 'portfolio' ? 'Ce spun clienții mei.' : 'Ce spun clienții noștri.') + '</h2></div></div><div class="revs">' +
        d.reviews.map(function (r) { return '<figure class="rev"><blockquote>' + esc(r.text) + '</blockquote>' + (r.name ? '<figcaption>' + esc(r.name) + '</figcaption>' : '') + '</figure>'; }).join('') + '</div></div></section>' : '') +
      (d.faq.length ? '<section id="intrebari"><div class="w"><div class="sh"><div><p class="eyebrow">Întrebări frecvente</p><h2>Întrebări și răspunsuri.</h2></div></div><div class="faq">' +
        d.faq.map(function (f, k) { return '<details' + (k ? '' : ' open') + '><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; }).join('') + '</div></div></section>' : '') +
      '<section><div class="w"><div class="band"><div><h2>' + X.band + '</h2><p>' + X.bandP + '</p></div><a class="btn" href="' + esc(ctaHref) + '"' + ext(ctaHref) + '>' + esc(cta) + '</a></div></div></section>' +
      '<section id="contact" class="alt"><div class="w"><div class="sh"><div><p class="eyebrow">Contact</p><h2>' + (tpl === 'portfolio' ? 'Hai să vorbim.' : 'Ne găsești aici.') + '</h2></div></div><div class="contact">' +
        (links.length ? '<div class="card"><h3>' + (tpl === 'portfolio' ? 'Scrie-mi' : 'Scrie-ne sau sună-ne') + '</h3><ul class="links">' + links.join('') + '</ul></div>' : '') + hoursT +
      '</div>' + mapBlock + '</div></section></main>' +
      '<footer><div class="w"><div><div class="disp">' + esc(name) + '</div>' + (d.tagline ? '<p>' + esc(d.tagline) + '</p>' : '') + '</div>' +
        '<div><h4>Pagini</h4><ul>' + nav.replace(/<a /g, '<li><a ').replace(/<\/a>/g, '</a></li>') + '</ul></div>' +
        '<div><h4>Contact</h4><ul>' + (d.phone ? '<li><a href="tel:' + esc(digits(d.phone)) + '">' + esc(d.phone) + '</a></li>' : '') + (d.email ? '<li><a href="mailto:' + esc(d.email) + '">' + esc(d.email) + '</a></li>' : '') + (d.address ? '<li>' + esc(d.address) + '</li>' : '') + (d.instagram ? '<li><a href="https://www.instagram.com/' + esc(d.instagram) + '/" target="_blank" rel="noopener">Instagram</a></li>' : '') + '</ul></div>' +
        '<div class="copy">© ' + year + ' ' + esc(name) + '. Toate drepturile rezervate.</div></div></footer>' +
      ((d.phone || d.whatsapp) ? '<div class="dock">' + (d.phone ? '<a class="btn ghost" href="tel:' + esc(digits(d.phone)) + '">Sună</a>' : '') + '<a class="btn" href="' + esc(ctaHref) + '"' + ext(ctaHref) + '>' + (d.whatsapp ? 'WhatsApp' : esc(cta)) + '</a></div>' : '') +
      (!opt.preview && st ? '<script>(function(){var e=document.getElementById("open-now");if(!e)return;var r=(' + OPEN_JS + ')(' + JSON.stringify(d.hours).replace(/</g, '\\u003c') + ',new Date());if(!r)return;e.textContent=r[1];e.className="open"+(r[0]?" on":"")})()</script>' : '') +
      (opt.preview ? '<div class="wm" aria-hidden="true"></div><div class="pv">Previzualizare · Creat cu Aman Web Builder · costi1andrei.site</div>' : '') +
      '</body></html>';
  }

  function siteFonts(tpl, data) { var d = normalize(tpl, data); return fontFiles(d.font || (TEMPLATES[tpl] || TEMPLATES.barber).fontKey); }
  return { TEMPLATES: TEMPLATES, DAYS: DAYS, LIMITS: LIMITS, FONTS: FONTS, CORNERS: CORNERS, LAYOUTS: LAYOUTS, SUGGEST_FAQ: SUGGEST_FAQ, normalize: normalize, starter: starter, render: render, randomLook: randomLook, siteFonts: siteFonts, mapEmbed: mapEmbed, mapQuery: mapQuery, geo: geo, openStatus: openStatus };
});
