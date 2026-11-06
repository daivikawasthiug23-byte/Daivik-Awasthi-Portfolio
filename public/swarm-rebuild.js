/* Swarm Rebuild: a crew of cursor agents rebuilds the page as the visitor scrolls.
   Options (data-attributes on the script tag): agents, speed, line, bg, accent, path.
   Page hooks: data-sr-skip, data-sr-logo, data-sr-replay, data-sr-stat. */
(function () {
  'use strict';
  var W = window, D = document, HTML = D.documentElement;
  if (W.SwarmRebuild) return;
  var NOOP = { replay: function () {}, skip: function () {}, setSpeed: function () {}, tour: function () {}, layers: function () { return []; } };

  var cs0 = D.currentScript || D.querySelector('script[src*="swarm-rebuild"]');
  var ds = (cs0 && cs0.dataset) || {};
  if ((W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) || (ds.path && ds.path !== location.pathname)) {
    W.SwarmRebuild = NOOP;
    return;
  }

  /* ---------- config ---------- */
  var N = Math.max(1, parseInt(ds.agents, 10) || 14);
  if (W.innerWidth < 640) N = Math.min(N, 8);
  N = Math.min(N, 16);
  var speed = [1, 2, 4].indexOf(+ds.speed) >= 0 ? +ds.speed : 1;
  var PACE = 0.85; // build tempo: lower is slower (the 1×/2×/4× button multiplies it)
  var LINE = parseFloat(ds.line) || 0.88;
  var ACCENT = ds.accent || '#3D8BFF';
  var COLORS = ['#FF5C8A', '#FFC233', '#A970FF', '#2DD4BF', '#4ADE80', '#FF8A3D', '#38BDF8', '#F43F5E', '#C084FC', '#FACC15', '#34D399', '#60A5FA', '#FB7185', '#F97316', '#22D3EE', '#A3E635'];
  var NAMES = ['Ada', 'Bo', 'Cyd', 'Dex', 'Eli', 'Fen', 'Gus', 'Hal', 'Ivy', 'Jun', 'Kai', 'Lux', 'Mo', 'Nia', 'Oz', 'Pip'];
  var Z = 2147483000;

  /* ---------- helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function hyp(x, y) { return Math.sqrt(x * x + y * y); }
  function fmt(n) { return Number(n).toLocaleString(); }
  function el(tag, cls, parent) { var e = D.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
  function angDiff(a, b) { var d = (b - a) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; }

  /* ---------- state ---------- */
  var phase = 'boot'; // boot | scan | build | done | leaving | gone
  var layers = [], unfinished = [], doneCount = 0, layersReady = false;
  var agents = [], frames = [];
  var scanT = 0, buildT0 = 0, elapsed = 0, tourOn = false, tourY = 0, needCheck = true, lastCheck = 0, lastScroll = 0;
  var tourRun = 0, lastBusy = 0, doneAt = 0, guideAlpha = 0, lastWork = 0, leaveT = 0;
  var mouse = { on: false, x: 0, y: 0, t: 0, dx: 1, dy: 0 };
  var vw = W.innerWidth, vh = W.innerHeight;

  try { history.scrollRestoration = 'manual'; } catch (e) {}

  /* ---------- CSS ---------- */
  var INK = 'var(--ink,#111)', PAPER = 'var(--bg,#f6f2ea)', CARD = 'var(--card,#fff)', SH = 'var(--shadow,#111)', MONO = 'var(--font-jetbrains),ui-monospace,Menlo,monospace', SANS = 'var(--font-jakarta),system-ui,sans-serif';
  var css = [
    'html.sr-lock{overflow:hidden!important}',
    '#sr-root,#sr-agents{position:fixed;inset:0;pointer-events:none}',
    '#sr-root{z-index:' + (Z - 3) + '}#sr-agents{z-index:' + (Z - 1) + '}',
    '#sr-root canvas{position:absolute;inset:0;width:100%;height:100%}',
    '.sr-frame{position:absolute;left:0;top:0;border:2px solid ' + INK + ';box-sizing:border-box;transition:opacity .25s}',
    '.sr-frame.sr-out{opacity:0}',
    '.sr-h{position:absolute;width:9px;height:9px;background:var(--sr-accent);border:2px solid ' + INK + ';box-sizing:border-box}',
    '.sr-lbl{position:absolute;left:0;top:0;padding:1px 6px;border:2px solid ' + INK + ';border-radius:4px;background:var(--sr-accent);color:var(--on-accent,#111);box-shadow:2px 2px 0 ' + SH + ';font:700 10px/1.4 ' + MONO + ';white-space:nowrap}',
    '.sr-caret{position:absolute;left:0;top:0;width:3px;display:none;outline:1px solid ' + INK + '}',
    '#sr-scan{position:fixed;inset:0;z-index:' + (Z - 2) + ';display:flex;align-items:center;justify-content:center;color:' + INK + ';transition:opacity .55s ease;background-image:linear-gradient(var(--grid,#1111110f) 1px,transparent 1px),linear-gradient(90deg,var(--grid,#1111110f) 1px,transparent 1px);background-size:28px 28px}',
    '#sr-scan.sr-out{opacity:0;pointer-events:none}',
    '.sr-tile{width:68px;height:68px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--sr-accent);border:2.5px solid ' + INK + ';box-shadow:5px 5px 0 ' + SH + ';animation:sr-bob 1.2s steps(2,end) infinite}',
    '.sr-tile>*{width:32px;height:32px;max-width:32px;max-height:32px;color:var(--on-accent,#111)}',
    '@keyframes sr-bob{0%{transform:translate(0,0)}50%{transform:translate(-2px,-2px)}100%{transform:translate(0,0)}}',
    '.sr-agent{position:absolute;left:0;top:0;will-change:transform;transition:opacity .3s}',
    '.sr-arrow{position:absolute;left:0;top:0;overflow:visible;transform-origin:0 0;filter:drop-shadow(2px 2px 0 ' + SH + ')}',
    '.sr-beam{position:absolute;left:-4px;top:0;width:8px;height:18px;display:none;box-sizing:border-box;border-top:2px solid;border-bottom:2px solid}',
    '.sr-beam:before{content:"";position:absolute;left:3px;top:0;bottom:0;width:2px;background:currentColor}',
    '.sr-tag{position:absolute;left:12px;top:20px;padding:0 6px;border:2px solid ' + INK + ';border-radius:4px;box-shadow:2px 2px 0 ' + SH + ';color:#111;font:700 10px/1.5 ' + MONO + ';white-space:nowrap;display:none}',
    '.sr-working .sr-tag{display:block}.sr-typing .sr-beam{display:block}.sr-typing .sr-arrow{display:none}',
    '.sr-hide-paint{background:transparent!important;background-image:none!important;border-color:transparent!important;box-shadow:none!important;outline-color:transparent!important}',
    '.sr-hide-media{opacity:0!important}',
    '.sr-reveal{transition:background-color .35s,border-color .35s,box-shadow .45s,opacity .35s!important}',
    '.sr-rest{color:transparent!important;-webkit-text-fill-color:transparent!important}',
    '#sr-hud{position:fixed;z-index:' + Z + ';left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:6px 6px 6px 12px;border:2.5px solid ' + INK + ';border-radius:8px;background:' + CARD + ';box-shadow:4px 4px 0 ' + SH + ';color:' + INK + ';font:700 12px/1 ' + MONO + ';pointer-events:auto;white-space:nowrap;max-width:calc(100vw - 16px)}',
    '.sr-cap{position:absolute;left:0;right:0;top:calc(50% + 62px);text-align:center;font:700 12px/1.4 ' + MONO + ';color:' + INK + ';padding:0 16px}',
    '.sr-hint{position:fixed;z-index:' + Z + ';left:50%;bottom:calc(76px + env(safe-area-inset-bottom));transform:translate(-50%,8px);max-width:calc(100vw - 32px);padding:8px 12px;border:2px solid ' + INK + ';border-radius:8px;background:var(--sr-accent);color:var(--on-accent,#111);box-shadow:3px 3px 0 ' + SH + ';font:700 12px/1.4 ' + MONO + ';text-align:center;opacity:0;pointer-events:none;transition:opacity .35s,transform .35s}',
    '.sr-hint.sr-on{opacity:1;transform:translate(-50%,0)}',
    '#sr-hud{transition:opacity .4s}#sr-hud.sr-idle{opacity:.35}#sr-hud.sr-idle:hover,#sr-hud.sr-idle:focus-within{opacity:1}',
    '#sr-hud button{all:unset;cursor:pointer;padding:6px 10px;border:2px solid ' + INK + ';border-radius:6px;background:' + PAPER + ';color:' + INK + ';font:700 12px/1 ' + MONO + ';transition:transform .12s,background-color .12s}',
    '#sr-hud button:hover{background:var(--sr-accent);color:var(--on-accent,#111)}#sr-hud button:active{transform:translate(2px,2px)}',
    '#sr-hud button:focus-visible{outline:3px solid var(--sr-accent);outline-offset:2px}',
    '.sr-av{display:flex}.sr-av i{width:20px;height:20px;border-radius:50%;margin-left:-6px;border:2px solid ' + INK + ';box-sizing:border-box;font:700 9px/16px ' + MONO + ';text-align:center;color:#111;font-style:normal}.sr-av i:first-child{margin-left:0}',
    '.sr-bar{width:64px;height:10px;border:2px solid ' + INK + ';border-radius:3px;background:' + PAPER + ';overflow:hidden}.sr-bar b{display:block;height:100%;width:0;background:var(--sr-accent)}',
    '#sr-hud.sr-done .sr-bar,#sr-hud.sr-done .sr-av,#sr-hud.sr-scanning .sr-av,#sr-hud.sr-scanning .sr-bar{display:none}',
    '@media(max-width:559px){#sr-hud .sr-av,#sr-hud .sr-bar,#sr-hud .sr-ag{display:none!important}}'
  ].join('');

  /* ---------- boot DOM ---------- */
  var style = el('style'); style.id = 'sr-style'; style.textContent = css;
  HTML.appendChild(style);
  HTML.style.setProperty('--sr-accent', ACCENT);
  var rootEl = el('div'); rootEl.id = 'sr-root';
  var canvas = el('canvas', '', rootEl); var ctx = canvas.getContext('2d');
  var agentsEl = el('div'); agentsEl.id = 'sr-agents';
  var scanEl = el('div'); scanEl.id = 'sr-scan'; scanEl.style.backgroundColor = ds.bg || 'var(--bg,#000)';
  var tile = el('div', 'sr-tile', scanEl);
  tile.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/></svg>';
  var cap = el('div', 'sr-cap', scanEl);
  cap.textContent = N + ' tiny agents are building this site. No pressure.';
  var hint = el('div', 'sr-hint'), hintT = 0;
  function showHint(text, ms) {
    hint.textContent = text; hint.classList.add('sr-on');
    clearTimeout(hintT); hintT = setTimeout(hideHint, ms);
  }
  function hideHint() { clearTimeout(hintT); hint.classList.remove('sr-on'); }
  var hud = el('div'); hud.id = 'sr-hud';
  var hAv = el('div', 'sr-av', hud), hLbl = el('span', '', hud);
  var hAg = el('span', 'sr-ag', hud);
  var hBarW = el('div', 'sr-bar', hud), hBar = el('b', '', hBarW);
  var bTour = el('button', '', hud), bSpeed = el('button', '', hud), bX = el('button', '', hud);
  hLbl.appendChild(hAg);
  bTour.textContent = 'Tour'; bSpeed.textContent = speed + '×'; bX.textContent = '×'; bX.title = 'Skip'; bX.setAttribute('aria-label', 'Skip animation');
  [rootEl, scanEl, agentsEl, hint, hud].forEach(function (n) { HTML.appendChild(n); });
  HTML.classList.add('sr-lock');
  phase = 'scan';

  var labelOnly = D.createTextNode('');
  hLbl.appendChild(labelOnly);

  /* ---------- agents ---------- */
  var ARROW = 'M0 0V16.5L4.6 12.4L7.6 19L10.4 17.8L7.5 11.3H13.4Z';
  for (var ai = 0; ai < N; ai++) (function (i) {
    var color = COLORS[i % 16];
    var e = el('div', 'sr-agent', agentsEl);
    e.style.color = color;
    e.innerHTML = '<svg class="sr-arrow" width="14" height="20" viewBox="0 0 14 20"><path d="' + ARROW + '" fill="' + color + '" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg><div class="sr-beam"></div><div class="sr-tag" style="background:' + color + '">' + NAMES[i % 16] + '</div>';
    var side = i % 4, x = side < 2 ? (side ? vw + 30 : -30) : Math.random() * vw, y = side < 2 ? Math.random() * vh : (side === 2 ? -30 : vh + 30);
    agents.push({ i: i, e: e, arrow: e.children[0], beam: e.children[1], color: color, x: x, y: y, vx: 0, vy: 0, rot: 0, task: null, wx: Math.random() * vw, wy: Math.random() * vh * LINE, wt: 0 });
    var d = el('i', '', hAv); d.textContent = NAMES[i % 16][0]; d.style.background = color;
    if (i >= 5) d.style.display = 'none';
  })(ai);
  hud.classList.add('sr-scanning');

  /* ---------- layer collection ---------- */
  var SKIP = { SCRIPT: 1, STYLE: 1, TEMPLATE: 1, META: 1, BR: 1, NOSCRIPT: 1, LINK: 1 };
  var MEDIA = { IMG: 1, SVG: 1, CANVAS: 1, VIDEO: 1, AUDIO: 1, PICTURE: 1, INPUT: 1, TEXTAREA: 1, SELECT: 1, IFRAME: 1, HR: 1, PROGRESS: 1, METER: 1, OBJECT: 1, EMBED: 1 };

  function alpha(c) {
    if (!c || c === 'transparent') return 0;
    var m = c.match(/^rgba?\(([^)]+)\)/);
    if (m) { var p = m[1].split(/[ ,\/]+/).filter(Boolean); if (p.length > 3) { var a = parseFloat(p[3]); return /%/.test(p[3]) ? a / 100 : a; } return 1; }
    m = c.match(/\/\s*([\d.]+%?)/);
    if (m) { var v = parseFloat(m[1]); return /%/.test(m[1]) ? v / 100 : v; }
    return 1;
  }
  function hasPaint(cs) {
    if (alpha(cs.backgroundColor) > 0) return true;
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
    var sh = cs.boxShadow;
    if (sh && sh !== 'none' && /rgb|color\(|#|oklch|lab/.test(sh.replace(/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\)/g, ''))) return true;
    var sides = ['Top', 'Right', 'Bottom', 'Left'];
    for (var i = 0; i < 4; i++) {
      var s = sides[i];
      if (parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none' && alpha(cs['border' + s + 'Color']) > 0) return true;
    }
    return false;
  }

  function collect() {
    layers = [];
    walk(D.body, null);
    function walk(node, parent) {
      for (var c = node.firstElementChild; c; c = c.nextElementSibling) visit(c, parent);
    }
    function visit(e, parent) {
      var tag = e.tagName.toUpperCase();
      if (SKIP[tag]) return;
      if (e.id && e.id.indexOf('sr-') === 0) return;
      if (e.hasAttribute('data-sr-skip') || e.hasAttribute('data-count')) return;
      var cs = getComputedStyle(e);
      if (cs.display === 'none') return;
      if (MEDIA[tag]) { layers.push(mk(e, parent, false, true, false)); return; }
      var box = hasPaint(cs);
      if (e.children.length) {
        // text nodes next to child elements become their own spans
        for (var n = e.firstChild, nx; n; n = nx) {
          nx = n.nextSibling;
          if (n.nodeType === 3 && n.nodeValue.trim()) {
            var sp = D.createElement('span'); sp.className = 'sr-tn';
            e.replaceChild(sp, n); sp.appendChild(n);
          }
        }
        var me = box ? mk(e, parent, true, false, false) : null;
        if (me) layers.push(me);
        walk(e, me || parent);
      } else {
        var txt = e.textContent;
        var t = txt ? txt.trim() : '';
        var isText = t !== '';
        if (box || isText) layers.push(mk(e, parent, box, false, isText));
      }
    }
    function mk(e, parent, box, media, text) {
      return { el: e, parent: parent, isBox: box, isMedia: media, isText: text, state: 0, trig: false, r: null, orig: null, txt: '', w: null, typed: null, rest: null };
    }
  }

  function hideText(l) {
    if (!l.w) {
      l.orig = Array.prototype.slice.call(l.el.childNodes);
      l.txt = l.el.textContent;
      l.w = el('span', 'sr-w'); l.typed = el('span', 'sr-typed', l.w); l.rest = el('span', 'sr-rest', l.w);
    }
    l.typed.textContent = ''; l.rest.textContent = l.txt;
    l.el.textContent = '';
    l.el.appendChild(l.w);
  }
  function restoreText(l) {
    if (!l.w || l.el.firstChild !== l.w) return;
    l.el.textContent = '';
    for (var i = 0; i < l.orig.length; i++) l.el.appendChild(l.orig[i]);
  }
  function hide(l) {
    if (l.isBox) l.el.classList.add('sr-hide-paint');
    if (l.isMedia) l.el.classList.add('sr-hide-media');
    if (l.isText) hideText(l);
  }
  function unhide(l) {
    l.el.classList.remove('sr-hide-paint', 'sr-hide-media', 'sr-reveal');
    if (l.isText) restoreText(l);
  }

  function fillStats() {
    var t = 0, f = 0;
    layers.forEach(function (l) { if (l.isText) t++; if (l.isBox || l.isMedia) f++; });
    var vals = { layers: layers.length, texts: t, frames: f, agents: N };
    D.querySelectorAll('[data-sr-stat]').forEach(function (s) {
      var v = vals[s.getAttribute('data-sr-stat')];
      if (v != null) s.textContent = fmt(v);
    });
  }

  function prepare() {
    if (!ds.accent) {
      var a = getComputedStyle(HTML).getPropertyValue('--accent').trim();
      if (a) { ACCENT = a; HTML.style.setProperty('--sr-accent', a); }
    }
    var logo = D.querySelector('[data-sr-logo]');
    if (logo) { var c = logo.cloneNode(true); c.removeAttribute('data-sr-logo'); tile.textContent = ''; tile.appendChild(c); }
    collect();
    fillStats();
    layers.forEach(hide);
    unfinished = layers.slice();
    layersReady = true;
    needCheck = true;
  }

  function whenReady(cb) {
    function go() {
      var fired = false;
      function fin() { if (fired) return; fired = true; requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(cb, 350); }); }); }
      setTimeout(fin, 1200);
      if (D.fonts && D.fonts.ready) D.fonts.ready.then(fin, fin); else fin();
    }
    if (D.readyState === 'complete') go(); else W.addEventListener('load', go);
  }
  // Frameworks that hydrate must finish before the DOM is touched: data-wait names an
  // attribute on <html> that the app sets once it is hydrated (gives up after 8s).
  function whenHydrated(cb) {
    if (!ds.wait) return cb();
    var t0 = performance.now();
    (function poll() {
      if (HTML.hasAttribute(ds.wait) || performance.now() - t0 > 8000) cb(); else setTimeout(poll, 50);
    })();
  }
  whenReady(function () { whenHydrated(prepare); });

  /* ---------- finishing ---------- */
  function freeAgent(a) {
    if (!a.task) return;
    var k = a.task;
    if (k.frame) removeFrame(k.frame);
    a.task = null;
    a.e.classList.remove('sr-working', 'sr-typing');
    if (k.caret) k.caret.style.display = 'none';
  }
  function finishLayer(l) {
    if (l.state === 2) return;
    unhide(l);
    l.state = 2; doneCount++;
  }
  function finishNow(l) {
    agents.forEach(function (a) { if (a.task && a.task.l === l) freeAgent(a); });
    finishLayer(l);
  }
  function removeFrame(f) {
    f.el.classList.add('sr-out');
    var i = frames.indexOf(f); if (i >= 0) frames.splice(i, 1);
    f.dead = true;
    setTimeout(function () { if (f.el.parentNode) f.el.parentNode.removeChild(f.el); if (f.lbl.parentNode) f.lbl.parentNode.removeChild(f.lbl); }, 300);
  }
  function newFrame(handles) {
    var f = { el: el('div', 'sr-frame', rootEl), lbl: null, x: 0, y: 0, w: 0, h: 0, dead: false };
    if (handles) for (var i = 0; i < 4; i++) { var h = el('div', 'sr-h', f.el); h.style.left = i % 2 ? 'auto' : '-4px'; h.style.right = i % 2 ? '-4px' : 'auto'; h.style.top = i < 2 ? '-4px' : 'auto'; h.style.bottom = i < 2 ? 'auto' : '-4px'; }
    f.lbl = el('div', 'sr-lbl', rootEl);
    frames.push(f);
    return f;
  }
  function setFrame(f, x, y, w, h, label) {
    f.x = x; f.y = y; f.w = w; f.h = h;
    f.el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    f.el.style.width = w + 'px'; f.el.style.height = h + 'px';
    f.lbl.textContent = label;
    f.lbl.style.display = label ? '' : 'none';
    f.lbl.style.transform = 'translate(' + (x + w / 2) + 'px,' + (y + h + 8) + 'px) translateX(-50%)';
    f.lbl.style.left = '0';
  }

  /* ---------- checking which layers are triggered ---------- */
  function check() {
    var lineY = vh * LINE, atBottom = W.scrollY + vh >= HTML.scrollHeight - 2;
    var keep = [];
    for (var i = 0; i < unfinished.length; i++) {
      var l = unfinished[i];
      if (l.state === 2) continue;
      var r = l.el.getBoundingClientRect();
      l.r = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      if (r.bottom < -60) { finishNow(l); continue; }
      if (!l.trig && (r.top < lineY || atBottom)) l.trig = true;
      if (l.trig && l.state === 0 && (r.width < 1 || r.height < 1 || r.right < 0 || r.left > vw)) { finishNow(l); continue; }
      keep.push(l);
    }
    unfinished = keep;
  }

  /* ---------- agent movement ---------- */
  function moveTo(a, tx, ty, k, dt) {
    var f = 1 - Math.exp(-k * dt), nx = a.x + (tx - a.x) * f, ny = a.y + (ty - a.y) * f;
    a.vx += ((nx - a.x) / dt - a.vx) * Math.min(1, dt * 12);
    a.vy += ((ny - a.y) / dt - a.vy) * Math.min(1, dt * 12);
    a.x = nx; a.y = ny;
  }
  function pointRot(a, dt, deg) {
    a.rot += angDiff(a.rot, deg) * (1 - Math.exp(-12 * dt));
  }
  function velRot(a, dt) {
    if (hyp(a.vx, a.vy) > 25) pointRot(a, dt, Math.atan2(a.vy, a.vx) * 180 / Math.PI + 115);
  }
  function render(a) {
    a.e.style.transform = 'translate3d(' + a.x.toFixed(1) + 'px,' + a.y.toFixed(1) + 'px,0)';
    a.arrow.style.transform = 'rotate(' + a.rot.toFixed(1) + 'deg)';
  }

  /* ---------- tasks ---------- */
  function eligible(l) { return l.state === 0 && l.trig && (!l.parent || l.parent.state >= 1); }
  function startTask(a, l) {
    l.state = 1;
    a.task = { l: l, phase: 'travel', t: 0, frame: null, caret: null, typedN: -1 };
    a.e.classList.add('sr-working');
  }
  function target(l, r) {
    if (l.isText && !l.isBox && !l.isMedia && l.w) {
      var fr = l.w.getClientRects()[0];
      if (fr) return { x: fr.left, y: fr.top };
    }
    return { x: r.left, y: r.top };
  }
  function nextAfterFill(a, k) {
    if (k.l.isText) { enterType(a, k); } else { k.phase = 'hold'; k.t = 0; }
  }
  function enterType(a, k) {
    k.phase = 'type'; k.t = 0;
    a.e.classList.add('sr-typing');
    if (!k.caret) { k.caret = el('div', 'sr-caret', rootEl); }
    k.caret.style.background = a.color; k.caret.style.display = 'block';
    k.dur = clamp(k.l.txt.length * 0.01, 0.2, 0.8);
  }

  function stepTask(a, k, r, dt) {
    var l = k.l; k.t += dt;
    var sp = speed * PACE;
    if (k.phase === 'travel') {
      var tp = target(l, r), kk = 6 + 3 * sp;
      moveTo(a, tp.x, tp.y, kk, dt);
      if (hyp(a.x - tp.x, a.y - tp.y) < 4 || k.t > 1.2 / sp) {
        k.frame = newFrame(!(l.isText && !l.isBox && !l.isMedia));
        k.t = 0;
        if (l.isBox || l.isMedia) { k.phase = 'draw'; setFrame(k.frame, r.left, r.top, 0, 0, '0 × 0'); }
        else { k.phase = 'type'; setFrame(k.frame, r.left, r.top, r.width, r.height, ''); enterType(a, k); }
      }
    } else if (k.phase === 'draw') {
      var dur = (0.22 + Math.min(0.34, Math.sqrt(r.width * r.height) / 1600)) / sp;
      var p = easeOut(Math.min(1, k.t / dur)), fw = r.width * p, fh = r.height * p;
      setFrame(k.frame, r.left, r.top, fw, fh, Math.round(fw) + ' × ' + Math.round(fh));
      moveTo(a, r.left + fw, r.top + fh, 30, dt);
      if (k.t >= dur) {
        k.phase = 'fill'; k.t = 0;
        var e = l.el;
        e.classList.add('sr-reveal');
        e.classList.remove('sr-hide-paint', 'sr-hide-media');
        setTimeout(function () { e.classList.remove('sr-reveal'); }, 800);
      }
    } else if (k.phase === 'fill') {
      setFrame(k.frame, r.left, r.top, r.width, r.height, Math.round(r.width) + ' × ' + Math.round(r.height));
      var wob = 0.32 / sp;
      a.x += Math.sin(k.t * 40) * 0.8; a.y += Math.cos(k.t * 34) * 0.8;
      if (k.t >= wob) nextAfterFill(a, k);
    } else if (k.phase === 'type') {
      var len = l.txt.length, p2 = Math.min(1, k.t / (k.dur / sp)), n = Math.floor(len * p2);
      setFrame(k.frame, r.left, r.top, r.width, r.height, (l.isBox || l.isMedia) ? Math.round(r.width) + ' × ' + Math.round(r.height) : '');
      if (n !== k.typedN) { k.typedN = n; l.typed.textContent = l.txt.slice(0, n); l.rest.textContent = l.txt.slice(n); }
      var rects = l.typed.getClientRects(), cr;
      if (rects.length) cr = rects[rects.length - 1]; else cr = l.rest.getClientRects()[0];
      var cx, cy, ch;
      if (cr) { cx = rects.length ? cr.right : cr.left; cy = cr.top; ch = cr.height; } else { cx = r.left; cy = r.top; ch = 16; }
      k.caret.style.height = ch + 'px';
      k.caret.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      a.beam.style.height = ch + 'px';
      moveTo(a, cx, cy, 25, dt);
      if (p2 >= 1) { k.phase = 'hold'; k.t = 0; k.caret.style.display = 'none'; a.e.classList.remove('sr-typing'); }
    } else if (k.phase === 'hold') {
      if (k.t >= 0.16 / sp) {
        var fr = k.frame;
        if (k.caret) { k.caret.parentNode && k.caret.parentNode.removeChild(k.caret); }
        a.task = null; k.frame = null;
        a.e.classList.remove('sr-working', 'sr-typing');
        finishLayer(l);
        if (fr) removeFrame(fr);
      }
    }
  }

  /* ---------- guides canvas ---------- */
  var TH = { ink: '#111', paper: '#f6f2ea', mono: 'monospace' };
  function readTheme() {
    var c = getComputedStyle(HTML);
    TH.ink = c.getPropertyValue('--ink').trim() || TH.ink;
    TH.paper = c.getPropertyValue('--bg').trim() || TH.paper;
    var m = c.getPropertyValue('--font-jetbrains').trim();
    TH.mono = (m ? m + ',' : '') + 'ui-monospace,Menlo,monospace';
  }
  var dpr = Math.min(2, W.devicePixelRatio || 1);
  function sizeCanvas() {
    vw = W.innerWidth; vh = W.innerHeight;
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
  }
  sizeCanvas();

  function drawGuides() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    if (guideAlpha < 0.01) return;
    ctx.globalAlpha = guideAlpha;
    var rulers = vw >= 700, R = 20, act = frames.filter(function (f) { return !f.dead; });
    var ly = vh * LINE;
    ctx.strokeStyle = ACCENT; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, ly + 0.5); ctx.lineTo(vw, ly + 0.5); ctx.stroke();
    ctx.font = '700 10px ' + TH.mono; ctx.fillStyle = ACCENT; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('BUILD LINE', vw - 8, ly - 4);
    if (rulers) {
      ctx.globalAlpha = guideAlpha * 0.8; ctx.fillStyle = TH.paper; ctx.fillRect(0, 0, vw, R); ctx.fillRect(0, 0, R, vh); ctx.globalAlpha = guideAlpha;
      ctx.fillStyle = TH.ink; ctx.fillRect(0, R, vw, 1); ctx.fillRect(R, 0, 1, vh);
      ctx.fillStyle = ACCENT;
      ctx.globalAlpha = guideAlpha * 0.3;
      act.forEach(function (f) { ctx.fillRect(f.x, 0, f.w, R); ctx.fillRect(0, f.y, R, f.h); });
      ctx.globalAlpha = guideAlpha;
      ctx.strokeStyle = TH.ink; ctx.fillStyle = TH.ink; ctx.font = '600 9px ' + TH.mono; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      var sx = W.scrollX, sy = W.scrollY, i, v;
      ctx.beginPath();
      for (v = Math.ceil(sx / 10) * 10; v < sx + vw; v += 10) {
        var x = Math.round(v - sx) + 0.5, len = v % 100 === 0 ? R : v % 50 === 0 ? 7 : 4;
        ctx.moveTo(x, R - len); ctx.lineTo(x, R);
        if (v % 100 === 0) ctx.fillText(String(v), x + 3, 2);
      }
      for (v = Math.ceil(sy / 10) * 10; v < sy + vh; v += 10) {
        var y = Math.round(v - sy) + 0.5, len2 = v % 100 === 0 ? R : v % 50 === 0 ? 7 : 4;
        ctx.moveTo(R - len2, y); ctx.lineTo(R, y);
        if (v % 100 === 0) { ctx.save(); ctx.translate(2, y - 3); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'right'; ctx.fillText(String(v), 0, 0); ctx.restore(); }
      }
      ctx.stroke();
      ctx.strokeStyle = ACCENT; ctx.globalAlpha = guideAlpha * 0.55; ctx.setLineDash([2, 3]);
      ctx.beginPath();
      act.forEach(function (f) { ctx.moveTo(f.x + 0.5, f.y); ctx.lineTo(f.x + 0.5, R); ctx.moveTo(f.x, f.y + 0.5); ctx.lineTo(R, f.y + 0.5); });
      ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- HUD ---------- */
  var lastHud = '';
  function updateHud() {
    var total = layers.length, txt, ag = '';
    hud.classList.toggle('sr-idle', phase === 'done' && performance.now() - doneAt > 3000);
    hud.classList.toggle('sr-scanning', phase === 'scan');
    hud.classList.toggle('sr-done', phase === 'done' || phase === 'leaving');
    if (phase === 'scan') txt = 'Scanning page… ' + fmt(layersReady ? Math.round(total * Math.min(1, scanT / (1.9 / speed))) : 0) + ' layers';
    else if (phase === 'build') { ag = N + ' agents   '; txt = fmt(doneCount) + ' / ' + fmt(total) + ' layers'; }
    else txt = 'Rebuilt ' + fmt(total) + ' layers in ' + elapsed.toFixed(1) + 's';
    var key = ag + txt + phase + tourOn;
    if (key === lastHud) { if (phase === 'build') hBar.style.width = (total ? doneCount / total * 100 : 0) + '%'; return; }
    lastHud = key;
    hAg.textContent = ag; labelOnly.nodeValue = txt;
    hBar.style.width = (total ? doneCount / total * 100 : 0) + '%';
    bTour.textContent = (phase === 'done' || phase === 'leaving') ? 'Replay' : tourOn ? 'Pause' : 'Tour';
    bX.title = phase === 'done' ? 'Dismiss' : 'Skip';
  }

  /* ---------- main loop ---------- */
  var last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
    if (phase === 'gone') return;
    var time = now / 1000, i, a;

    if (phase === 'scan') {
      scanT += dt;
      var cx = vw / 2, cy = vh / 2, rx = Math.min(vw * 0.32, 230), ry = Math.min(vh * 0.28, 170);
      for (i = 0; i < agents.length; i++) {
        a = agents[i];
        var f = i % 3, dir = f === 1 ? -1 : 1, ang = dir * time * 1.7 + f * Math.PI * 2 / 3 + i * 0.25;
        moveTo(a, cx + Math.cos(ang) * rx + Math.sin(time * 3 + i * 1.7) * 10, cy + Math.sin(ang) * ry + Math.cos(time * 2.6 + i * 2.1) * 10, 5, dt);
        velRot(a, dt); render(a);
      }
      if (layersReady && scanT >= 1.9 / speed) endScan();
      updateHud();
      return;
    }

    if (phase === 'leaving') {
      leaveT += dt;
      agents.forEach(function (a) { moveTo(a, a.leaveX, a.y, 2.5, dt); velRot(a, dt); render(a); });
      if (leaveT > 1.8) { agentsEl.style.display = 'none'; hud.style.display = 'none'; phase = 'gone'; }
      return;
    }

    // build / done
    if (needCheck || now - lastCheck > 350) {
      needCheck = false; lastCheck = now; readTheme();
      if (phase === 'build') check();
    }
    if (tourOn && phase === 'build') {
      var pend = 0;
      for (i = 0; i < unfinished.length; i++) if (eligible(unfinished[i])) pend++;
      var atEnd = W.scrollY + vh >= HTML.scrollHeight - 2;
      if (atEnd) tourOn = false;
      // Glide in short runs: once the swarm has been idle for a moment (time to read), scroll a
      // stretch, let it build, then pause again.
      else if (tourRun > 0 || (pend === 0 && now - lastBusy > 500 / speed)) {
        if (tourRun <= 0) tourRun = 450;
        var step = 120 * speed * dt;
        tourRun -= step; tourY = Math.max(tourY, W.scrollY) + step; W.scrollTo({ top: tourY, behavior: 'instant' });
      }
      else tourY = W.scrollY;
    }

    // pending (triggered) layers
    var pending = [];
    for (i = 0; i < unfinished.length; i++) { var u = unfinished[i]; if (u.state === 0 && u.trig) pending.push(u); }

    // assign free agents
    for (i = 0; i < agents.length; i++) {
      a = agents[i];
      if (a.task || phase !== 'build') continue;
      var best = null, bs = 1e12;
      for (var j = 0; j < pending.length; j++) {
        var l = pending[j];
        if (l.state !== 0 || !eligible(l) || !l.r) continue;
        var sc = l.r.top + 0.3 * hyp(a.x - l.r.left, a.y - l.r.top);
        if (sc < bs) { bs = sc; best = l; }
      }
      if (best) startTask(a, best);
    }

    // read pass
    var rects = [];
    for (i = 0; i < agents.length; i++) {
      a = agents[i];
      if (a.task) { var rr = a.task.l.el.getBoundingClientRect(); rects[i] = rr; }
    }

    var working = 0;
    var free = mouse.on && now - lastScroll > 500 && pending.length === 0 && !agents.some(function (x) { return x.task; });
    var idle = [];
    for (i = 0; i < agents.length; i++) {
      a = agents[i];
      if (a.task) {
        working++;
        stepTask(a, a.task, rects[i], dt);
        pointRot(a, dt, 0);
      } else idle.push(a);
    }
    if (working > 0 || pending.length > 0) lastBusy = now;
    if (phase === 'build' && working === 0 && pending.length === 0 && unfinished.length === 0) completeBuild();

    var moving = now - mouse.t < 350;
    for (i = 0; i < idle.length; i++) {
      a = idle[i];
      var ix = a.i;
      if ((phase === 'done' || free) && mouse.on) {
        if (moving) {
          var lag = 34 + (ix % 5) * 11, spread = (((ix * 37) % 60) - 30) * 0.9;
          moveTo(a, mouse.x - mouse.dx * lag - mouse.dy * spread, mouse.y - mouse.dy * lag + mouse.dx * spread, 3.2 + (ix % 4) * 0.9, dt);
          velRot(a, dt);
        } else {
          var rad = Math.max(46, N * 4.4), an = Math.PI * 2 * ix / N + time * 0.35;
          moveTo(a, mouse.x + Math.cos(an) * rad, mouse.y + Math.sin(an) * rad, 5, dt);
          pointRot(a, dt, Math.atan2(mouse.y - a.y, mouse.x - a.x) * 180 / Math.PI + 115);
        }
      } else {
        a.wt -= dt;
        if (a.wt <= 0) { a.wt = 1.2 + Math.random() * 2; a.wx = Math.random() * vw; a.wy = Math.random() * vh * 0.88; }
        moveTo(a, a.wx, a.wy, 1.4, dt);
        velRot(a, dt);
      }
    }
    var following = (phase === 'done' || free) && mouse.on;
    for (i = 0; i < agents.length; i++) {
      a = agents[i];
      var op = (!a.task && following) ? '0.4' : '1';
      if (a.op !== op) { a.op = op; a.e.style.opacity = op; }
      render(a);
    }

    // guides fade
    if (working > 0 && phase === 'build') { lastWork = now; guideAlpha = Math.min(1, guideAlpha + dt * 5); }
    else if (now - lastWork > 1200) guideAlpha = Math.max(0, guideAlpha - dt * 3);
    drawGuides();
    updateHud();
  }

  function endScan() {
    phase = 'build'; buildT0 = performance.now();
    scanEl.classList.add('sr-out');
    HTML.classList.remove('sr-lock');
    setTimeout(function () { if (phase !== 'scan') scanEl.style.display = scanEl.classList.contains('sr-out') ? 'none' : ''; }, 600);
    W.scrollTo({ top: 0, behavior: 'instant' });
    needCheck = true;
    showHint('Keep scrolling. The crew builds just ahead of you. (Esc = skip)', 6500);
  }
  var told = false;
  function completeBuild() {
    elapsed = (performance.now() - buildT0) / 1000; doneAt = performance.now();
    phase = 'done'; tourOn = false;
    if (!told && W.matchMedia('(pointer: fine)').matches) { told = true; showHint('Ta-da! Wiggle your mouse, the crew tags along.', 5000); }
  }

  /* ---------- public controls ---------- */
  function abortAll() { agents.forEach(freeAgent); frames.slice().forEach(removeFrame); }
  function skip() {
    if (phase === 'scan') { if (!layersReady) return; endScan(); }
    if (phase !== 'build') return;
    abortAll();
    layers.forEach(finishLayer);
    unfinished = [];
    hideHint();
    completeBuild();
  }
  function replay() {
    if (!layersReady) return;
    abortAll();
    layers.forEach(function (l) { l.state = 0; l.trig = false; l.r = null; l.el.classList.remove('sr-reveal'); hide(l); });
    unfinished = layers.slice(); doneCount = 0; tourOn = false; scanT = 0;
    agentsEl.style.display = ''; hud.style.display = '';
    scanEl.style.display = ''; void scanEl.offsetWidth; scanEl.classList.remove('sr-out');
    HTML.classList.add('sr-lock');
    W.scrollTo({ top: 0, behavior: 'instant' });
    phase = 'scan'; lastHud = ''; hideHint();
  }
  function dismiss() {
    phase = 'leaving'; leaveT = 0;
    agents.forEach(function (a) { a.leaveX = a.x < vw / 2 ? -60 : vw + 60; });
  }
  function setSpeed(s) { speed = s; bSpeed.textContent = s + '×'; }
  function tour() {
    if (phase !== 'build') return;
    tourOn = !tourOn; tourY = W.scrollY; tourRun = 0; lastHud = '';
  }

  bTour.addEventListener('click', function () { if (phase === 'done') replay(); else tour(); });
  bSpeed.addEventListener('click', function () { setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : 1); });
  bX.addEventListener('click', function () { if (phase === 'done') dismiss(); else skip(); });
  D.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-sr-replay]');
    if (t) { e.preventDefault(); replay(); }
  });
  W.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') skip();
    else if (tourOn && /^(Arrow|Page|Home|End| )/.test(e.key)) { tourOn = false; lastHud = ''; }
  });
  function stopTour() { if (tourOn) { tourOn = false; lastHud = ''; } }
  W.addEventListener('wheel', stopTour, { passive: true });
  W.addEventListener('touchstart', stopTour, { passive: true });
  W.addEventListener('scroll', function () { lastScroll = performance.now(); needCheck = true; }, { passive: true });
  W.addEventListener('resize', function () { sizeCanvas(); needCheck = true; });

  W.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var dx = e.clientX - mouse.x, dy = e.clientY - mouse.y, d = hyp(dx, dy);
    if (mouse.on && d > 2) {
      var k = Math.min(1, d / 40), nx = mouse.dx + (dx / d - mouse.dx) * k, ny = mouse.dy + (dy / d - mouse.dy) * k, nl = hyp(nx, ny) || 1;
      mouse.dx = nx / nl; mouse.dy = ny / nl; mouse.t = performance.now();
    } else if (!mouse.on) mouse.t = performance.now();
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true;
  }, { passive: true });
  HTML.addEventListener('mouseleave', function () { mouse.on = false; });
  W.addEventListener('blur', function () { mouse.on = false; });

  W.SwarmRebuild = {
    replay: replay, skip: skip, setSpeed: setSpeed, tour: tour,
    layers: function () { return layers.map(function (l) { return { el: l.el, box: l.isBox, media: l.isMedia, text: l.isText, done: l.state === 2 }; }); }
  };

  requestAnimationFrame(frame);
  updateHud();
})();
