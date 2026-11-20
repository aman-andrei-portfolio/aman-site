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
  // q = poziția în imaginea finală (0…1), folosită pentru vignetă și granulație, ca să arate la fel în vizor și în poză
  var VS = 'attribute vec2 p;varying vec2 v;varying vec2 q;uniform vec2 sc;uniform vec2 of;uniform float mir;void main(){vec2 t=p*0.5+0.5;t.y=1.0-t.y;q=t;t=(t-0.5)*sc+0.5+of;if(mir>0.5)t.x=1.0-t.x;v=t;gl_Position=vec4(p,0.0,1.0);}';
  var FS = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nvarying vec2 v;varying vec2 q;uniform sampler2D img;uniform sampler2D lut;uniform float amt;uniform float n;' +
    'uniform float ex;uniform float tp;uniform float ct;uniform float st;uniform float vg;uniform float gr;uniform float asp;uniform float sd;uniform float orig;' +
    'vec3 look(vec3 c){float b=c.b*(n-1.0);float b0=floor(b);float b1=min(b0+1.0,n-1.0);float x=c.r*(n-1.0)+0.5;float y=(c.g*(n-1.0)+0.5)/n;' +
    'vec3 a=texture2D(lut,vec2((b0*n+x)/(n*n),y)).rgb;vec3 z=texture2D(lut,vec2((b1*n+x)/(n*n),y)).rgb;return mix(a,z,b-b0);}' +
    'float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+sd)*43758.5453);}' +
    'void main(){vec3 c=texture2D(img,v).rgb;if(orig>0.5){gl_FragColor=vec4(c,1.0);return;}' +
    'c=mix(c,look(c),amt);c*=exp2(ex);c.r*=1.0+tp*0.12;c.b*=1.0-tp*0.12;' +
    'c=(c-0.5)*(1.0+ct)+0.5;float l=dot(c,vec3(0.2126,0.7152,0.0722));c=mix(vec3(l),c,1.0+st);' +
    'vec2 d=(q-0.5)*vec2(asp,1.0);c*=1.0-vg*smoothstep(0.25,0.95,length(d)/max(asp,1.0)*1.25);' +
    'c+=(h(floor(q*vec2(1100.0*asp,1100.0)))-0.5)*gr*0.16;' +
    'gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);}';
  var canvas = $('gl'), gl = null, prog, texV, texL, U = {}, video = d.createElement('video');
  video.setAttribute('playsinline', ''); video.setAttribute('muted', ''); video.muted = true; video.autoplay = true;
  // în pagină (invizibil, nu display:none), altfel Safari pe iPhone poate da cadre negre
  video.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:0;top:0';
  d.body.appendChild(video);
  var IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

  function initGL() {
    gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false }) || canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
    if (!gl) return false;
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['sc', 'of', 'mir', 'img', 'lut', 'amt', 'n', 'ex', 'tp', 'ct', 'st', 'vg', 'gr', 'asp', 'sd', 'orig'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
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
  var mode = 'camera', photo = null;            // sursa: camera live sau o poză din galerie (canvas)
  var RATIOS = [['Full', 0], ['4:5', 4 / 5], ['1:1', 1], ['9:16', 9 / 16], ['3:4', 3 / 4]], ri = 0;
  var ADJ = { exp: 0, temp: 0, con: 0, sat: 0, vig: 0, grain: 0 }, hold = false, seed = Math.random() * 100;
  function srcW() { return mode === 'photo' ? photo.width : video.videoWidth; }
  function srcH() { return mode === 'photo' ? photo.height : video.videoHeight; }
  function ready() { return mode === 'photo' ? !!photo : video.readyState >= 2 && video.videoWidth > 0; }
  // formatul ales; „Full” = cât se vede pe ecran (camera) sau toată poza (galerie)
  function aspect() {
    if (RATIOS[ri][1]) return RATIOS[ri][1];
    if (mode === 'photo') return srcW() / srcH();
    var r = canvas.getBoundingClientRect(); return r.width / r.height;
  }

  // desenează sursa decupată la formatul A într-un dreptunghi (x,y,w,h) al canvasului
  function draw(W, H, rect) {
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(rect[0], H - rect[1] - rect[3], rect[2], rect[3]);
    var A = rect[2] / rect[3], sa = srcW() / srcH(), sx = 1, sy = 1;
    if (sa > A) sx = A / sa; else sy = sa / A;
    gl.uniform2f(U.sc, sx, sy); gl.uniform2f(U.of, 0, 0); gl.uniform1f(U.mir, mode === 'camera' && facing === 'user' ? 1 : 0);
    gl.uniform1f(U.amt, amt); gl.uniform1f(U.orig, hold ? 1 : 0);
    gl.uniform1f(U.ex, ADJ.exp * 1.2); gl.uniform1f(U.tp, ADJ.temp); gl.uniform1f(U.ct, ADJ.con * 0.6); gl.uniform1f(U.st, ADJ.sat);
    gl.uniform1f(U.vg, ADJ.vig * 0.75); gl.uniform1f(U.gr, ADJ.grain); gl.uniform1f(U.asp, A); gl.uniform1f(U.sd, seed);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texV);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mode === 'photo' ? photo : video);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  // vizorul arată exact cadrul care se salvează (cu benzi negre dacă formatul diferă de ecran)
  function viewRect(W, H) {
    var A = aspect(), w = W, h = W / A; if (h > H) { h = H; w = H * A; }
    return [Math.round((W - w) / 2), Math.round((H - h) / 2), Math.round(w), Math.round(h)];
  }
  function placeFrame() {
    var r = canvas.getBoundingClientRect(), v = viewRect(r.width, r.height), f = $('frame');
    f.style.left = v[0] + 'px'; f.style.top = v[1] + 'px'; f.style.width = v[2] + 'px'; f.style.height = v[3] + 'px';
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    if (busy || !ready()) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), r = canvas.getBoundingClientRect();
    var W = Math.round(r.width * dpr), H = Math.round(r.height * dpr), k = Math.min(1, 1600 / Math.max(W, H));
    W = Math.round(W * k); H = Math.round(H * k);
    draw(W, H, viewRect(W, H));
    if (mode === 'photo') { cancelAnimationFrame(raf); raf = 0; } // poză fixă: redesenăm doar la schimbări
  }
  function redraw() { if (mode === 'photo' && !raf) loop(); }

  async function start() {
    $('err').hidden = true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return fail(tr('Browserul tău nu permite camera. Deschide pagina în Safari sau Chrome.', 'Your browser does not allow the camera. Open the page in Safari or Chrome.'));
    if (!gl && !initGL()) return fail(tr('Telefonul nu suportă procesarea culorilor (WebGL).', 'Your phone does not support colour processing (WebGL).'));
    try {
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing }, width: { ideal: 3840 }, height: { ideal: 2160 } } });
    } catch (e) {
      if (/Instagram|FBAN|FBAV|TikTok/i.test(navigator.userAgent)) return fail(tr('Aplicația din care ai deschis linkul (ex. Instagram) blochează camera. Apasă „⋯” și alege „Deschide în browser” (Safari sau Chrome). Sau editează o poză din galerie.', 'The app you opened this link in (e.g. Instagram) blocks the camera. Tap “⋯” and choose “Open in browser” (Safari or Chrome). Or edit a photo from your gallery.'));
      return fail(e && e.name === 'NotAllowedError' ? tr('Ai refuzat accesul la cameră. Permite-l din setările browserului și încearcă din nou. Dacă ai deschis linkul din Instagram, deschide-l în Safari sau Chrome.', 'Camera access was denied. Allow it in the browser settings and try again. If you opened the link from Instagram, open it in Safari or Chrome.') : tr('Camera nu a putut porni. Încearcă în Safari sau Chrome.', 'The camera could not start. Try Safari or Chrome.'));
    }
    mode = 'camera'; photo = null;
    video.srcObject = stream; await video.play().catch(function () {});
    enter();
    hardware();
  }
  function enter() {
    $('start').hidden = true;
    var cam = mode === 'camera';
    $('flip').style.visibility = cam ? 'visible' : 'hidden'; $('ttimer').hidden = !cam; $('tnew').hidden = cam; $('hint').classList.remove('off');
    $('shutter').setAttribute('aria-label', cam ? tr('Fă poza', 'Take the photo') : tr('Salvează poza editată', 'Export the edited photo'));
    var saved = cur; try { var id = localStorage.getItem('cam.look'); LOOKS.forEach(function (L, i) { if (L.id === id) saved = i; }); } catch (e) {}
    setLook(saved); placeFrame();
    cancelAnimationFrame(raf); raf = 0; loop();
    setTimeout(function () { $('hint').classList.add('off'); }, 4000);
  }
  function fail(m) { var e = $('err'); e.textContent = m; e.hidden = false; $('start').hidden = false; }

  // ---------- poză din galerie ----------
  // micșorăm prin canvas 2D (pozele de 24–48 MP blochează Safari); <img> aplică singur rotația EXIF
  function openPhoto(f) {
    if (!f || !/^image\//.test(f.type)) return;
    if (!gl && !initGL()) return fail(tr('Telefonul nu suportă procesarea culorilor (WebGL).', 'Your phone does not support colour processing (WebGL).'));
    var url = URL.createObjectURL(f), im = new Image();
    im.onload = function () {
      var cap = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096, 4096), k = Math.min(1, cap / Math.max(im.naturalWidth, im.naturalHeight));
      var c = d.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      photo = c; mode = 'photo'; srcName = (f.name || 'poza').replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').slice(0, 40);
      $('ttorch').hidden = true; $('zoomRow').hidden = true; $('sugg').hidden = true;
      enter();
    };
    im.onerror = function () { URL.revokeObjectURL(url); fail(tr('Poza nu a putut fi deschisă. Încearcă alt fișier (JPG, PNG).', 'The photo could not be opened. Try another file (JPG, PNG).')); };
    im.src = url;
  }
  var srcName = '';

  // ---------- poza ----------
  var busy = false, file = null, lastUrl = '', shotAt = 0;
  function stamp() { var t = new Date(), z = function (x) { return String(x).padStart(2, '0'); }; return t.getFullYear() + z(t.getMonth() + 1) + z(t.getDate()) + '-' + z(t.getHours()) + z(t.getMinutes()) + z(t.getSeconds()); }
  function capture() {
    if (busy || !ready()) return;
    busy = true; shotAt = Date.now();
    if (mode === 'camera') { var f = $('flash'); f.classList.add('on'); setTimeout(function () { f.classList.remove('on'); }, 60); if (navigator.vibrate) navigator.vibrate(15); }
    // cadrul din vizor, la rezoluția maximă a sursei
    var A = aspect(), sw = srcW(), sh = srcH();
    var cw = sw / sh > A ? sh * A : sw, ch = sw / sh > A ? sh : sw / A;
    var max = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096, 4096), k = Math.min(1, max / Math.max(cw, ch));
    var W = Math.round(cw * k), H = Math.round(ch * k);
    draw(W, H, [0, 0, W, H]);
    canvas.toBlob(function (blob) {
      busy = false; raf = 0; loop();
      if (!blob) return;
      file = new File([blob], 'aman-' + (mode === 'photo' && srcName ? srcName + '-' : '') + stamp() + '.jpg', { type: 'image/jpeg' });
      if (lastUrl) URL.revokeObjectURL(lastUrl);
      lastUrl = URL.createObjectURL(blob);
      $('shot').src = lastUrl; $('thumb').style.backgroundImage = 'url("' + lastUrl + '")'; $('thumb').hidden = false;
      $('saveMsg').textContent = tr('Poza rămâne pe telefonul tău. Nu se urcă nimic pe site.', 'The photo stays on your phone. Nothing is uploaded to the site.');
      $('again').textContent = mode === 'photo' ? tr('Înapoi la editare', 'Back to editing') : tr('Încă una', 'Another one');
      $('sheet').hidden = false;
    }, 'image/jpeg', 0.95);
  }
  // temporizator: 0, 3 sau 10 secunde, cu numărătoare pe ecran
  var TIMERS = [0, 3, 10], ti = 0, counting = 0;
  function shoot() {
    if (counting || busy) return;
    var n = mode === 'camera' ? TIMERS[ti] : 0;
    if (!n) return capture();
    // după ceas (nu după numărul de intervale), ca să nu întârzie când telefonul e ocupat
    var el = $('count'), end = Date.now() + n * 1000; el.hidden = false; el.textContent = n;
    counting = setInterval(function () {
      var left = Math.ceil((end - Date.now()) / 1000);
      if (left > 0) { el.textContent = left; return; }
      clearInterval(counting); counting = 0; el.hidden = true; capture();
    }, 100);
  }
  // „Salvează”: fișierul e deja gata, deci share() pornește direct din atingere (cerință iOS).
  function save() {
    if (!file) return;
    var msg = $('saveMsg');
    // iPhone: meniul de distribuire are „Salvează imaginea”. Android/calculator: descărcare (apare în Galerie).
    if (IOS && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: file.name }).then(function () {
        msg.textContent = tr('Gata. Alege „Salvează imaginea” în meniu, dacă n-ai făcut-o deja.', 'Done. Choose “Save image” in the menu if you have not already.');
      }).catch(function (e) { if (e && e.name !== 'AbortError') download(); });
    } else download();
  }
  function download() {
    var a = d.createElement('a'); a.href = lastUrl; a.download = file.name; d.body.appendChild(a); a.click(); a.remove();
    $('saveMsg').textContent = tr('Poza s-a salvat. O găsești în Galerie (sau în Descărcări).', 'The photo was saved. You will find it in your Gallery (or Downloads).');
  }

  // ---------- zoom, lanternă, focalizare: doar dacă telefonul le oferă ----------
  var caps = {}, torchOn = false, zoomVal = 1;
  function track() { return stream && stream.getVideoTracks()[0]; }
  function hardware() {
    var t = track(); caps = (t && t.getCapabilities) ? t.getCapabilities() : {};
    var z = caps.zoom, zr = $('zoomRow'), zi = $('zoom');
    if (z && z.max > z.min) { zr.hidden = false; zi.min = z.min; zi.max = Math.min(z.max, 10); zi.step = z.step || 0.1; zoomVal = Math.max(z.min, Math.min(zoomVal, zi.max)); zi.value = zoomVal; $('zoomv').textContent = (+zoomVal).toFixed(1) + '×'; if (zoomVal !== 1) apply({ zoom: zoomVal }); }
    else zr.hidden = true;
    $('ttorch').hidden = !caps.torch; if (caps.torch && torchOn) apply({ torch: true });
  }
  function apply(c) { var t = track(); if (t && t.applyConstraints) t.applyConstraints({ advanced: [c] }).catch(function () {}); }
  function focusAt(x, y) {
    var fm = caps.focusMode || [];
    if (!(fm.indexOf('single-shot') >= 0 || fm.indexOf('continuous') >= 0)) return false;
    var r = canvas.getBoundingClientRect(), px = (x - r.left) / r.width, py = (y - r.top) / r.height;
    apply({ pointsOfInterest: [{ x: px, y: py }], focusMode: fm.indexOf('single-shot') >= 0 ? 'single-shot' : 'continuous', exposureMode: (caps.exposureMode || []).indexOf('single-shot') >= 0 ? 'single-shot' : undefined });
    var f = $('focus'); f.hidden = true; void f.offsetWidth; f.style.left = (x - r.left) + 'px'; f.style.top = (y - r.top) + 'px'; f.hidden = false;
    return true;
  }

  // ---------- sugestie de stil după lumina din cadru (reguli simple, nu schimbă singur) ----------
  var probe = d.createElement('canvas'); probe.width = 32; probe.height = 18;
  function suggest() {
    var b = $('sugg');
    if (mode !== 'camera' || !ready() || d.hidden || !$('sheet').hidden) return;
    var x = probe.getContext('2d', { willReadFrequently: true }); x.drawImage(video, 0, 0, 32, 18);
    var px = x.getImageData(0, 0, 32, 18).data, r = 0, g = 0, bl = 0, sat = 0, n = px.length / 4;
    for (var i = 0; i < px.length; i += 4) { r += px[i]; g += px[i + 1]; bl += px[i + 2]; sat += Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]); }
    r /= n * 255; g /= n * 255; bl /= n * 255; sat /= n * 255;
    var L = 0.2126 * r + 0.7152 * g + 0.0722 * bl, id = null;
    if (L < 0.2) id = 'night';
    else if (g > r + 0.04 && g > bl + 0.04) id = 'nature';
    else if (r > bl + 0.08 && L > 0.3) id = 'golden';
    else if (sat < 0.06) id = 'bw';
    var k = -1; LOOKS.forEach(function (Lk, j) { if (Lk.id === id) k = j; });
    if (k < 0 || k === cur) { b.hidden = true; return; }
    b.dataset.k = k; b.textContent = tr('Sugestie: ', 'Suggestion: ') + (EN ? LOOKS[k].en : LOOKS[k].ro) + ' ›'; b.hidden = false;
  }
  setInterval(suggest, 2500);

  // ---------- gesturi pe vizor: glisare = alt stil, apăsare lungă = original, atingere = focalizare ----------
  (function () {
    var v = $('view'), sx = 0, sy = 0, st = 0, lp = 0, moved = false, active = false;
    v.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button,a,input,.tip')) return;
      active = true; moved = false; sx = e.clientX; sy = e.clientY; st = Date.now();
      lp = setTimeout(function () { if (!moved) { hold = true; redraw(); } }, 280);
    });
    v.addEventListener('pointermove', function (e) { if (active && (Math.abs(e.clientX - sx) > 12 || Math.abs(e.clientY - sy) > 12)) { moved = true; clearTimeout(lp); } });
    function end(e) {
      if (!active) return; active = false; clearTimeout(lp);
      if (hold) { hold = false; redraw(); return; }
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { setLook((cur + (dx < 0 ? 1 : -1) + LOOKS.length) % LOOKS.length); redraw(); return; }
      if (!moved && Date.now() - st < 280 && mode === 'camera') focusAt(e.clientX, e.clientY);
    }
    v.addEventListener('pointerup', end); v.addEventListener('pointercancel', end);
    v.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  })();

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
  // pe calculator camera nu e disponibilă: pagina e făcută pentru telefon
  var PHONE = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  if (!PHONE) {
    $('go').hidden = true; $('pickLbl').hidden = true; d.querySelector('.start ul').hidden = true;
    var m = d.createElement('p'); m.className = 'sub'; m.style.color = '#f5f5f7';
    m.textContent = tr('Camera e făcută pentru telefon. Deschide costi1andrei.site/camera.html pe telefonul tău.', 'The camera is made for phones. Open costi1andrei.site/camera.html on your phone.');
    $('go').insertAdjacentElement('afterend', m);
  }
  $('looks').innerHTML = LOOKS.map(function (L, i) { return '<button type="button" role="radio" data-i="' + i + '" aria-pressed="false">' + (EN ? L.en : L.ro) + '</button>'; }).join('');
  d.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.id === 'go') return start();
    if (t.dataset.i !== undefined && gl) { setLook(+t.dataset.i); return redraw(); }
    if (t.id === 'shutter') return shoot();
    if (t.id === 'flip') { facing = facing === 'environment' ? 'user' : 'environment'; return start(); }
    if (t.id === 'save') return save();
    if (t.id === 'again') { $('sheet').hidden = true; return redraw(); }
    if (t.id === 'thumb') { $('sheet').hidden = false; return; }
    if (t.id === 'tratio') { ri = (ri + 1) % RATIOS.length; t.textContent = RATIOS[ri][0]; placeFrame(); return redraw(); }
    if (t.id === 'ttimer') { ti = (ti + 1) % TIMERS.length; t.textContent = '⏱ ' + (TIMERS[ti] ? TIMERS[ti] + 's' : tr('Fără', 'Off')); t.setAttribute('aria-pressed', String(!!TIMERS[ti])); return; }
    if (t.id === 'ttorch') { torchOn = !torchOn; t.setAttribute('aria-pressed', String(torchOn)); return apply({ torch: torchOn }); }
    if (t.id === 'tpro' || t.id === 'prox') { var pr = $('pro'), on = pr.hidden; pr.hidden = !on; $('tpro').setAttribute('aria-pressed', String(on)); return; }
    if (t.id === 'reset') { Object.keys(ADJ).forEach(function (k) { ADJ[k] = 0; }); d.querySelectorAll('[data-adj]').forEach(function (i) { i.value = 0; i.nextElementSibling.textContent = '0'; }); return redraw(); }
    if (t.id === 'sugg') { setLook(+t.dataset.k); t.hidden = true; return redraw(); }
    if (t.id === 'tgrid') { var g = $('grid'); g.hidden = !g.hidden; t.setAttribute('aria-pressed', String(!g.hidden)); return; }
    if (t.id === 'tlevel') return toggleLevel(t);
    if (t.id === 'ttip' || t.id === 'tipx') { var tp = $('tip'), on2 = tp.hidden; tp.hidden = !on2; $('ttip').setAttribute('aria-pressed', String(on2)); return; }
  });
  ['pick', 'pick2'].forEach(function (id) { $(id).addEventListener('change', function (e) { openPhoto(e.target.files && e.target.files[0]); e.target.value = ''; }); });
  $('amt').addEventListener('input', function (e) { amt = e.target.value / 100; $('amtv').textContent = e.target.value; redraw(); });
  d.querySelectorAll('[data-adj]').forEach(function (i) { i.addEventListener('input', function () { ADJ[i.dataset.adj] = i.value / 100; i.nextElementSibling.textContent = i.value; redraw(); }); });
  $('zoom').addEventListener('input', function (e) { zoomVal = +e.target.value; $('zoomv').textContent = zoomVal.toFixed(1) + '×'; apply({ zoom: zoomVal }); });
  addEventListener('resize', function () { placeFrame(); redraw(); });
  d.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && $('start').hidden && $('sheet').hidden && e.target === d.body) { e.preventDefault(); shoot(); } });
  // camera se oprește când ieși din pagină și repornește când revii (cu zoom/lanternă reaplicate)
  var wasOn = false;
  d.addEventListener('visibilitychange', function () {
    if (d.hidden) { wasOn = !!stream; if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } }
    else if (wasOn && !stream && mode === 'camera') start();
  });

  // pentru teste: stilurile și calculul culorilor
  window.AmanCamera = { LOOKS: LOOKS, grade: grade, caps: function () { return caps; }, adj: ADJ, shotAt: function () { return shotAt; } };

})();
