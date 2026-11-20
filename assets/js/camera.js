/* Camera Aman: imaginea camerei trece printr-un LUT 3D (tabel de culori) aplicat pe placa video (WebGL).
   Fiecare stil e calculat din parametri (curbă, balans de alb, nuanțe pentru umbre/lumini, saturație, „mat”)
   și transformat într-un LUT 33×33×33. Pozele se salvează doar pe telefon: nimic nu e trimis pe internet. */
(function () {
  'use strict';
  var d = document, $ = function (id) { return d.getElementById(id); };
  var EN = false; try { EN = localStorage.getItem('lang') === 'en'; } catch (e) {}
  if (EN) { d.documentElement.lang = 'en'; d.querySelectorAll('[data-en]').forEach(function (n) { n.innerHTML = n.dataset.en; }); }
  function tr(ro, en) { return EN ? en : ro; }

  // ---------- stilurile (doar parametri; numele descriu atmosfera) ----------
  // exp: expunere, con: contrast, sat: saturație, temp: cald(+)/rece(-), tint: magenta(+)/verde(-),
  // sh/hi: culoarea umbrelor/luminilor [r,g,b] și cât de tare, fade: negru ridicat (mat), bw: alb-negru, greens: saturația verdelui
  var LOOKS = [
    { id: 'natural', ro: 'Natural', en: 'Natural', p: { con: 0.06, sat: 0.06 },
      tip: ['Lumină din lateral, de la o fereastră, dă volum fără umbre dure.', 'Side light from a window adds depth without harsh shadows.'] },
    { id: 'golden', ro: 'Golden hour', en: 'Golden hour', p: { exp: 0.03, con: 0.08, sat: 0.08, temp: 0.16, tint: 0.02, hi: [1, 0.78, 0.5, 0.12], sh: [0.35, 0.22, 0.25, 0.06], fade: 0.03 },
      tip: ['Cu o oră înainte de apus. Pune soarele în spatele subiectului, puțin în lateral, și expune pentru față.', 'An hour before sunset. Put the sun behind the subject, slightly to the side, and expose for the face.'] },
    { id: 'portrait', ro: 'Portret cald', en: 'Warm portrait', p: { exp: 0.02, con: -0.04, sat: -0.06, temp: 0.08, tint: 0.03, fade: 0.05, greens: -0.3, hi: [1, 0.86, 0.76, 0.06] },
      tip: ['Telefonul la nivelul ochilor sau puțin mai sus. Ochii pe linia de sus a grilei, la 1–2 m de subiect.', 'Phone at eye level or slightly above. Eyes on the top grid line, 1–2 m from the subject.'] },
    { id: 'cine', ro: 'Cinematic', en: 'Cinematic', p: { con: 0.14, sat: -0.04, sh: [0.1, 0.42, 0.5, 0.16], hi: [1, 0.72, 0.45, 0.12], fade: 0.02 },
      tip: ['Încadrează larg, cu mult spațiu în direcția în care privește subiectul. Merge bine orizontal.', 'Frame wide, with space in the direction the subject is looking. Works well in landscape.'] },
    { id: 'night', ro: 'Noapte urbană', en: 'Urban night', p: { exp: 0.04, con: 0.12, sat: 0.1, temp: -0.12, tint: 0.05, sh: [0.15, 0.3, 0.55, 0.14], hi: [1, 0.45, 0.75, 0.06] },
      tip: ['Sprijină telefonul de ceva stabil. Caută neoane, vitrine și reflexii în asfaltul ud.', 'Rest the phone on something steady. Look for neon, shop windows and reflections on wet asphalt.'] },
    { id: 'matte', ro: 'Mat', en: 'Matte', p: { con: -0.1, sat: -0.12, fade: 0.1, temp: 0.03 },
      tip: ['Merge pe lumină moale, de zi înnorată. Fundaluri simple, culori puține.', 'Best in soft, overcast light. Simple backgrounds, few colours.'] },
    { id: 'nordic', ro: 'Rece nordic', en: 'Nordic cool', p: { exp: 0.04, con: 0.02, sat: -0.18, temp: -0.12, tint: -0.02, fade: 0.04 },
      tip: ['Spații mari, mult cer sau zăpadă. Pune orizontul pe linia de jos a grilei.', 'Wide spaces, lots of sky or snow. Put the horizon on the bottom grid line.'] },
    { id: 'vintage', ro: 'Vintage', en: 'Vintage', p: { con: -0.06, sat: -0.2, temp: 0.12, tint: 0.04, fade: 0.09, sh: [0.4, 0.3, 0.15, 0.08], hi: [1, 0.92, 0.7, 0.08] },
      tip: ['Detalii vechi, texturi, lumină caldă de după-amiază. Încadrează centrat, simplu.', 'Old details, textures, warm afternoon light. Frame it centred and simple.'] },
    { id: 'food', ro: 'Mâncare', en: 'Food', p: { exp: 0.05, con: 0.06, sat: 0.14, temp: 0.07, greens: 0.1 },
      tip: ['Lumină de la fereastră, din spate-lateral. Fotografiază de sus (90°) farfuriile plate și din unghi de 45° băuturile.', 'Window light from behind and to the side. Shoot flat plates from above (90°) and drinks from 45°.'] },
    { id: 'nature', ro: 'Natură', en: 'Nature', p: { con: 0.08, sat: 0.1, temp: 0.03, greens: 0.25, hi: [1, 0.95, 0.85, 0.04] },
      tip: ['Ceva în prim-plan (o ramură, o piatră) dă adâncime. Orizontul pe o linie a grilei, niciodată la mijloc.', 'Something in the foreground (a branch, a rock) adds depth. Horizon on a grid line, never in the middle.'] },
    { id: 'bw', ro: 'Alb-negru contrast', en: 'B&W contrast', p: { bw: 1, con: 0.26, exp: 0.01 },
      tip: ['Caută umbre puternice și forme clare. Lumina tare de la amiază e bună aici.', 'Look for strong shadows and clear shapes. Hard midday light works well here.'] },
    { id: 'bwsoft', ro: 'Alb-negru moale', en: 'Soft B&W', p: { bw: 1, con: -0.06, fade: 0.08 },
      tip: ['Portrete liniștite, lumină moale. Fundal simplu, la distanță de subiect.', 'Calm portraits, soft light. A simple background, away from the subject.'] },
  ];

  var N = 33;
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function smooth(x, a, b) { var t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); }
  function grade(r, g, b, p) {
    var e = p.exp || 0; r += e; g += e; b += e;
    var t = p.temp || 0, ti = p.tint || 0;
    r *= 1 + t * 0.35; b *= 1 - t * 0.35; g *= 1 - ti * 0.2; r *= 1 + ti * 0.06; b *= 1 + ti * 0.06;
    var L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (p.greens) { var gx = clamp((g - Math.max(r, b)) * 3); var s0 = 1 + p.greens * gx; r = L + (r - L) * s0; g = L + (g - L) * s0; b = L + (b - L) * s0; }
    var s = 1 + (p.sat || 0); if (p.bw) s = 0;
    r = L + (r - L) * s; g = L + (g - L) * s; b = L + (b - L) * s;
    var c = p.con || 0;
    function curve(x) { x = clamp(x); var sx = x * x * (3 - 2 * x); return x + (sx - x) * c * 2.2; }
    r = curve(r); g = curve(g); b = curve(b);
    L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (p.sh) { var ws = (1 - smooth(L, 0, 0.55)) * p.sh[3]; r += (p.sh[0] - 0.5) * ws; g += (p.sh[1] - 0.5) * ws; b += (p.sh[2] - 0.5) * ws; }
    if (p.hi) { var wh = smooth(L, 0.45, 1) * p.hi[3]; r += (p.hi[0] - 0.5) * wh; g += (p.hi[1] - 0.5) * wh; b += (p.hi[2] - 0.5) * wh; }
    var f = p.fade || 0; r = f + r * (1 - f * 1.15); g = f + g * (1 - f * 1.15); b = f + b * (1 - f * 1.15);
    return [clamp(r), clamp(g), clamp(b)];
  }
  // LUT-ul ca imagine N²×N: felia de albastru k ocupă coloanele k*N … k*N+N-1
  function bake(p) {
    var a = new Uint8Array(N * N * N * 4), i = 0;
    for (var gi = 0; gi < N; gi++) for (var bi = 0; bi < N; bi++) for (var ri = 0; ri < N; ri++) {
      var o = grade(ri / (N - 1), gi / (N - 1), bi / (N - 1), p);
      a[i++] = Math.round(o[0] * 255); a[i++] = Math.round(o[1] * 255); a[i++] = Math.round(o[2] * 255); a[i++] = 255;
    }
    return a;
  }

  // ---------- WebGL ----------
  var VS = 'attribute vec2 p;varying vec2 v;uniform vec2 sc;uniform vec2 of;uniform float mir;void main(){vec2 t=p*0.5+0.5;t.y=1.0-t.y;t=(t-0.5)*sc+0.5+of;if(mir>0.5)t.x=1.0-t.x;v=t;gl_Position=vec4(p,0.0,1.0);}';
  var FS = 'precision mediump float;varying vec2 v;uniform sampler2D img;uniform sampler2D lut;uniform float amt;uniform float n;' +
    'vec3 look(vec3 c){float b=c.b*(n-1.0);float b0=floor(b);float b1=min(b0+1.0,n-1.0);float x=c.r*(n-1.0)+0.5;float y=(c.g*(n-1.0)+0.5)/n;' +
    'vec3 a=texture2D(lut,vec2((b0*n+x)/(n*n),y)).rgb;vec3 z=texture2D(lut,vec2((b1*n+x)/(n*n),y)).rgb;return mix(a,z,b-b0);}' +
    'void main(){vec3 c=texture2D(img,v).rgb;gl_FragColor=vec4(mix(c,look(c),amt),1.0);}';
  var canvas = $('gl'), gl = null, prog, texV, texL, U = {}, video = d.createElement('video');
  video.setAttribute('playsinline', ''); video.setAttribute('muted', ''); video.muted = true; video.autoplay = true;

  function initGL() {
    gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false }) || canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
    if (!gl) return false;
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['sc', 'of', 'mir', 'img', 'lut', 'amt', 'n'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
    function tex() { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); return t; }
    texV = tex(); texL = tex();
    gl.uniform1i(U.img, 0); gl.uniform1i(U.lut, 1); gl.uniform1f(U.n, N);
    return true;
  }
  var cache = {};
  function setLook(i) {
    cur = i;
    var L = LOOKS[i]; if (!cache[L.id]) cache[L.id] = bake(L.p);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texL);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, N * N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, cache[L.id]);
    d.querySelectorAll('#looks button').forEach(function (b, k) { b.setAttribute('aria-pressed', String(k === i)); if (k === i && b.scrollIntoView) b.scrollIntoView({ inline: 'center', block: 'nearest' }); });
    $('tipH').textContent = tr('Sfat · ', 'Tip · ') + (EN ? L.en : L.ro); $('tipT').textContent = L.tip[EN ? 1 : 0];
    try { localStorage.setItem('cam.look', L.id); } catch (e) {}
  }
  var cur = 0, amt = 1, facing = 'environment', stream = null, raf = 0;

  // desenează cadrul curent: în vizor decupat ca să umple ecranul („cover”), la poză tot cadrul
  function draw(w, h, full) {
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    var vw = video.videoWidth || 1, vh = video.videoHeight || 1, sx = 1, sy = 1;
    if (!full) { var ra = (w / h) / (vw / vh); if (ra > 1) sy = 1 / ra; else sx = ra; }
    gl.uniform2f(U.sc, sx, sy); gl.uniform2f(U.of, 0, 0); gl.uniform1f(U.mir, facing === 'user' ? 1 : 0); gl.uniform1f(U.amt, amt);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texV);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    if (busy || video.readyState < 2) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), r = canvas.getBoundingClientRect();
    var w = Math.round(r.width * dpr), h = Math.round(r.height * dpr), k = Math.min(1, 1600 / Math.max(w, h));
    draw(Math.round(w * k), Math.round(h * k), false);
  }

  async function start() {
    $('err').hidden = true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return fail(tr('Browserul tău nu permite camera. Deschide pagina în Safari sau Chrome.', 'Your browser does not allow the camera. Open the page in Safari or Chrome.'));
    if (!gl && !initGL()) return fail(tr('Telefonul nu suportă procesarea culorilor (WebGL).', 'Your phone does not support colour processing (WebGL).'));
    try {
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing }, width: { ideal: 3840 }, height: { ideal: 2160 } } });
    } catch (e) {
      return fail(e && e.name === 'NotAllowedError' ? tr('Ai refuzat accesul la cameră. Permite-l din setările browserului și încearcă din nou.', 'Camera access was denied. Allow it in the browser settings and try again.') : tr('Camera nu a putut porni.', 'The camera could not start.'));
    }
    video.srcObject = stream; await video.play().catch(function () {});
    $('start').hidden = true;
    var saved = 0; try { var id = localStorage.getItem('cam.look'); LOOKS.forEach(function (L, i) { if (L.id === id) saved = i; }); } catch (e) {}
    setLook(saved);
    cancelAnimationFrame(raf); loop();
  }
  function fail(m) { var e = $('err'); e.textContent = m; e.hidden = false; $('start').hidden = false; }

  // ---------- poza ----------
  var busy = false, file = null, lastUrl = '';
  function stamp() { var t = new Date(), z = function (x) { return String(x).padStart(2, '0'); }; return t.getFullYear() + z(t.getMonth() + 1) + z(t.getDate()) + '-' + z(t.getHours()) + z(t.getMinutes()) + z(t.getSeconds()); }
  function shoot() {
    if (!stream || busy || video.readyState < 2) return;
    busy = true;
    var f = $('flash'); f.classList.add('on'); setTimeout(function () { f.classList.remove('on'); }, 60);
    var max = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096, vw = video.videoWidth, vh = video.videoHeight, k = Math.min(1, max / Math.max(vw, vh));
    draw(Math.round(vw * k), Math.round(vh * k), true);
    canvas.toBlob(function (blob) {
      busy = false;
      if (!blob) return;
      file = new File([blob], 'aman-' + stamp() + '.jpg', { type: 'image/jpeg' });
      if (lastUrl) URL.revokeObjectURL(lastUrl);
      lastUrl = URL.createObjectURL(blob);
      $('shot').src = lastUrl; $('thumb').style.backgroundImage = 'url("' + lastUrl + '")'; $('thumb').hidden = false;
      $('saveMsg').textContent = tr('Poza rămâne pe telefonul tău. Nu se urcă nimic pe site.', 'The photo stays on your phone. Nothing is uploaded to the site.');
      $('sheet').hidden = false;
    }, 'image/jpeg', 0.95);
  }
  // „Salvează”: fișierul e deja gata, deci share() pornește direct din atingere (cerință iOS).
  function save() {
    if (!file) return;
    var msg = $('saveMsg');
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: file.name }).then(function () {
        msg.textContent = tr('Gata. Alege „Salvează imaginea” în meniu, dacă n-ai făcut-o deja.', 'Done. Choose “Save image” in the menu if you have not already.');
      }).catch(function (e) { if (e && e.name !== 'AbortError') download(); });
    } else download();
  }
  function download() {
    var a = d.createElement('a'); a.href = lastUrl; a.download = file.name; d.body.appendChild(a); a.click(); a.remove();
    $('saveMsg').textContent = tr('Poza s-a descărcat. O găsești în Galerie (Descărcări).', 'The photo was downloaded. You will find it in your Gallery (Downloads).');
  }

  // ---------- nivela ----------
  var levelOn = false;
  function onTilt(e) {
    var g = e.gamma, b = e.beta; if (g == null) return;
    var ang = window.screen.orientation && window.screen.orientation.angle || window.orientation || 0;
    // ținut vertical: înclinarea stânga-dreapta e gamma; ținut orizontal: beta (cu semnul după partea rotită)
    var roll = ang === 90 ? b : (ang === 270 || ang === -90) ? -b : g;
    var deg = Math.round(roll * 10) / 10;
    $('levelLine').style.transform = 'rotate(' + (-deg) + 'deg)';
    $('levelTxt').textContent = Math.abs(deg).toFixed(0) + '°';
    $('level').classList.toggle('ok', Math.abs(deg) < 1);
  }
  async function toggleLevel(btn) {
    levelOn = !levelOn;
    if (levelOn && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try { if ((await DeviceOrientationEvent.requestPermission()) !== 'granted') levelOn = false; } catch (e) { levelOn = false; }
    }
    btn.setAttribute('aria-pressed', String(levelOn)); $('level').hidden = !levelOn;
    if (levelOn) window.addEventListener('deviceorientation', onTilt); else window.removeEventListener('deviceorientation', onTilt);
  }

  // ---------- interfața ----------
  $('looks').innerHTML = LOOKS.map(function (L, i) { return '<button type="button" role="radio" data-i="' + i + '" aria-pressed="false">' + (EN ? L.en : L.ro) + '</button>'; }).join('');
  d.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.id === 'go') return start();
    if (t.dataset.i !== undefined && gl) return setLook(+t.dataset.i);
    if (t.id === 'shutter') return shoot();
    if (t.id === 'flip') { facing = facing === 'environment' ? 'user' : 'environment'; return start(); }
    if (t.id === 'save') return save();
    if (t.id === 'again') { $('sheet').hidden = true; return; }
    if (t.id === 'thumb') { $('sheet').hidden = false; return; }
    if (t.id === 'tgrid') { var g = $('grid'); g.hidden = !g.hidden; t.setAttribute('aria-pressed', String(!g.hidden)); return; }
    if (t.id === 'tlevel') return toggleLevel(t);
    if (t.id === 'ttip' || t.id === 'tipx') { var tp = $('tip'), on = tp.hidden; tp.hidden = !on; $('ttip').setAttribute('aria-pressed', String(on)); return; }
  });
  $('amt').addEventListener('input', function (e) { amt = e.target.value / 100; $('amtv').textContent = e.target.value; });
  d.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && $('start').hidden && $('sheet').hidden && e.target === d.body) { e.preventDefault(); shoot(); } });
  // camera se oprește când ieși din pagină și repornește când revii
  var wasOn = false;
  d.addEventListener('visibilitychange', function () {
    if (d.hidden) { wasOn = !!stream; if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } }
    else if (wasOn && !stream) start();
  });

  // pentru teste: stilurile și calculul culorilor
  window.AmanCamera = { LOOKS: LOOKS, grade: grade };
})();
