/* The peeking checker — an original little character for this site (not IBM's Bob). Bob builds and people approve;
   this one is the third part of the motto: it checks. It sneaks in from an edge of the screen now and then, follows
   the pointer with its eyes, inspects the reader through a magnifying glass and says something short.
   Decorative only: hidden from screen readers, off when the reader prefers reduced motion, and the × hides it for
   good on this browser. Add ?peek=now to a page's address to see it at once. */
(() => {
  'use strict';
  const KEY = 'tw-peek-off';
  try { if (localStorage.getItem(KEY) === '1') return; } catch (e) { /* storage blocked: carry on */ }
  if (!window.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const now = new URLSearchParams(location.search).get('peek') === 'now';
  const atlas = !!document.getElementById('side');           // the Atlas has a side menu on the left
  const touch = matchMedia('(hover: none)').matches;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rnd = (a, b) => a + Math.random() * (b - a);

  const LINES = ['Just checking. 👀', 'Spec signed? Good.', 'Four eyes are better than two.', 'No secrets on this page. I looked.',
    'Tests first, I hope.', 'Routine inspection. Carry on.', 'Bob builds. People approve. I check.', 'Nice scrolling. Very compliant.'];
  const GLASS = ['Hmm. Looks compliant.', 'Zooming in… all checks pass.', 'Let me verify that.'];
  const SCROLLED = ['I saw that.', 'Still here. Still checking.', 'Scrolling past the specs? Bold.'];

  const css = `
.pk{position:fixed;z-index:40;width:var(--pks);height:var(--pks);--pks:76px;transition:transform .6s cubic-bezier(.2,.9,.3,1.15),left 1.8s ease-in-out,top 1.8s ease-in-out;will-change:transform}
@media (max-width:640px){.pk{--pks:60px}}
.pk svg{display:block;width:100%;height:100%;cursor:pointer;overflow:visible}
.pk[data-edge=bottom]{transform:translateY(110%)}.pk[data-edge=bottom].on{transform:translateY(40%)}.pk[data-edge=bottom].up{transform:translateY(6%)}
.pk[data-edge=right]{transform:translateX(110%) rotate(-90deg)}.pk[data-edge=right].on{transform:translateX(40%) rotate(-90deg)}.pk[data-edge=right].up{transform:translateX(6%) rotate(-90deg)}
.pk[data-edge=left]{transform:translateX(-110%) rotate(90deg)}.pk[data-edge=left].on{transform:translateX(-40%) rotate(90deg)}.pk[data-edge=left].up{transform:translateX(-6%) rotate(90deg)}
.pk .pk-pupil{transition:transform .18s ease-out}
.pk .pk-pz,.pk .pk-eye,.pk .pk-lid{transform-box:fill-box;transform-origin:center}
.pk .pk-pz{transition:transform .35s ease}
.pk .pk-lid{transform-origin:top;transform:scaleY(0);transition:transform .08s ease}
.pk.blink .pk-lid{transform:scaleY(1)}
.pk .pk-eye{transition:transform .25s cubic-bezier(.3,1.6,.5,1)}
.pk.wide .pk-eye{transform:scale(1.22)}
.pk .pk-glass{transform:translate(34px,46px) rotate(25deg);opacity:0;transition:transform .5s cubic-bezier(.2,.9,.3,1.2),opacity .3s}
.pk.glass .pk-glass{transform:none;opacity:1}
.pk.glass .pk-right .pk-pz{transform:scale(1.75)}
.pk.sneak svg{animation:pk-wob .45s ease-in-out infinite alternate}
@keyframes pk-wob{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}
.pk .pk-bulb{animation:pk-bulb 2.4s ease-in-out infinite}
@keyframes pk-bulb{50%{opacity:.35}}
.pk-x{position:absolute;top:-2px;right:-6px;width:22px;height:22px;border-radius:50%;border:1px solid #8d8d8d;background:#fff;color:#161616;
 font:600 14px/20px system-ui,sans-serif;padding:0;cursor:pointer;opacity:.85}
.pk-x:hover{opacity:1}.pk-x:focus-visible{outline:2px solid #0f62fe;outline-offset:2px;opacity:1}
.pk-say{position:fixed;z-index:41;max-width:230px;background:#fff;color:#161616;border:2px solid #004144;border-radius:14px;font:500 14px/1.4 'IBM Plex Sans',system-ui,sans-serif;
 padding:8px 12px;box-shadow:0 3px 10px rgba(0,0,0,.25);opacity:0;transform:translateY(4px) scale(.96);transition:opacity .2s,transform .2s;pointer-events:none}
.pk-say.on{opacity:1;transform:none}`;

  const svg = `<svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
<line x1="40" y1="15" x2="40" y2="5" stroke="#004144" stroke-width="2.5" stroke-linecap="round"/><circle class="pk-bulb" cx="40" cy="5" r="4" fill="#ee5396"/>
<rect x="8" y="14" width="64" height="74" rx="26" fill="#08bdba" stroke="#004144" stroke-width="2.5"/>
<path d="M16 30q3-10 12-12" fill="none" stroke="#9ef0f0" stroke-width="3" stroke-linecap="round" opacity=".8"/>
<g transform="translate(28 38)"><g class="pk-eye"><circle r="10" fill="#fff" stroke="#004144" stroke-width="2"/><g class="pk-pupil"><g class="pk-pz"><circle r="4.6" fill="#161616"/><circle cx="1.6" cy="-1.7" r="1.4" fill="#fff"/></g></g><rect class="pk-lid" x="-11" y="-11" width="22" height="22" rx="10" fill="#08bdba"/></g></g>
<g transform="translate(52 38)" class="pk-right"><g class="pk-eye"><circle r="10" fill="#fff" stroke="#004144" stroke-width="2"/><g class="pk-pupil"><g class="pk-pz"><circle r="4.6" fill="#161616"/><circle cx="1.6" cy="-1.7" r="1.4" fill="#fff"/></g></g><rect class="pk-lid" x="-11" y="-11" width="22" height="22" rx="10" fill="#08bdba"/></g></g>
<path d="M33 57q7 5 14 0" fill="none" stroke="#004144" stroke-width="2.5" stroke-linecap="round"/>
<g class="pk-glass"><line x1="61" y1="48" x2="72" y2="62" stroke="#525252" stroke-width="4.5" stroke-linecap="round"/><circle cx="52" cy="38" r="13" fill="rgba(208,226,255,.28)" stroke="#393939" stroke-width="3"/></g>
<circle cx="12" cy="47" r="6.5" fill="#08bdba" stroke="#004144" stroke-width="2.5"/><circle cx="68" cy="47" r="6.5" fill="#08bdba" stroke="#004144" stroke-width="2.5"/>
</svg>`;

  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
  const el = document.createElement('div'); el.className = 'pk'; el.dataset.edge = 'bottom'; el.innerHTML = svg;
  const x = document.createElement('button'); x.type = 'button'; x.className = 'pk-x'; x.textContent = '×';
  x.setAttribute('aria-label', 'Hide the peeking checker'); x.title = 'Hide'; x.hidden = true; el.appendChild(x);
  const say = document.createElement('div'); say.className = 'pk-say'; say.setAttribute('aria-hidden', 'true');
  document.body.append(el, say);
  const pupils = [...el.querySelectorAll('.pk-pupil')];
  const ROT = { bottom: 0, right: -90, left: 90 };

  let shown = false, edge = 'bottom', timers = [], peeks = 0, sayT = 0, scrollT = 0, caught = false;
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const clear = () => { timers.forEach(clearTimeout); timers = []; };

  function place(e) {
    edge = e; el.dataset.edge = e;
    const s = el.offsetWidth || 76, vw = innerWidth, vh = innerHeight;
    el.style.left = el.style.right = el.style.top = el.style.bottom = '';
    if (e === 'bottom') {
      const lo = Math.max(vw * (vw < 640 ? 0.5 : 0.55), atlas && vw > 1056 ? 300 : 16);
      el.style.left = Math.round(rnd(lo, Math.max(lo, vw - s - 28))) + 'px'; el.style.bottom = '0';
    } else {
      el.style.top = Math.round(rnd(vh * 0.38, Math.max(vh * 0.38, vh * 0.78 - s))) + 'px';
      el.style[e] = '0';
    }
  }
  // move to a new spot off screen without animating there
  function jump(e) { el.style.transition = 'none'; place(e); void el.offsetWidth; el.style.transition = ''; void el.offsetWidth; }
  function speak(text, ms = 2800) {
    clearTimeout(sayT); say.textContent = text; say.style.left = say.style.right = say.style.top = say.style.bottom = '';
    const r = el.getBoundingClientRect(), vw = innerWidth, vh = innerHeight, w = Math.min(230, vw - 24);
    say.style.maxWidth = w + 'px';
    const seen = el.offsetWidth * (el.classList.contains('up') ? 0.94 : 0.6);   // how much of it is on screen
    if (edge === 'bottom') {
      say.style.bottom = Math.round(seen + 10) + 'px';
      say.style.left = Math.round(Math.min(Math.max(12, r.left + r.width / 2 - w / 2), vw - w - 12)) + 'px';
    } else {
      say.style.top = Math.round(r.top + r.height / 2 - 20) + 'px';
      if (edge === 'right') say.style.right = Math.round(seen + 10) + 'px';
      else say.style.left = Math.round(seen + 10) + 'px';
    }
    say.classList.add('on'); sayT = setTimeout(() => say.classList.remove('on'), ms);
  }
  function blink() { el.classList.add('blink'); setTimeout(() => el.classList.remove('blink'), 140); }
  function look(dx, dy) {
    const a = -ROT[edge] * Math.PI / 180, lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    const d = Math.hypot(lx, ly) || 1, m = Math.min(4, d / 40);
    pupils.forEach((p) => { p.style.transform = `translate(${(lx / d * m).toFixed(2)}px,${(ly / d * m).toFixed(2)}px)`; });
  }
  function sneak() {
    if (!shown) return;
    el.classList.add('sneak');
    const s = el.offsetWidth, d = pick([-1, 1]) * rnd(50, 110);
    if (edge === 'bottom') {
      const lo = atlas && innerWidth > 1056 ? 300 : 12;
      el.style.left = Math.round(Math.min(Math.max(lo, parseFloat(el.style.left) + d), innerWidth - s - 12)) + 'px';
    } else {
      el.style.top = Math.round(Math.min(Math.max(70, parseFloat(el.style.top) + d), innerHeight - s - 12)) + 'px';
    }
    later(() => el.classList.remove('sneak'), 1800);
  }
  function inspect() {
    if (!shown) return;
    el.classList.add('glass'); later(() => speak(pick(GLASS)), 450);
    later(() => el.classList.remove('glass'), 3000);
  }
  function show(e, line) {
    clear(); jump(e); x.hidden = false;
    el.classList.remove('up', 'wide'); el.classList.add('on'); shown = true; peeks++;
    if (touch) later(function wander() { look(rnd(-1, 1), rnd(-1, 1)); later(wander, rnd(900, 1600)); }, 600);
    later(blink, rnd(900, 1800)); later(blink, rnd(3200, 4600));
    const plan = line ? [() => speak(line)] : pick([[() => speak(pick(LINES)), sneak], [inspect], [sneak, () => speak(pick(LINES))], [() => speak(pick(LINES)), inspect]]);
    plan.forEach((f, i) => later(f, 900 + i * 2600));
    later(hide, rnd(8000, 10500));
  }
  function hide(next) {
    clear(); shown = false; el.classList.remove('on', 'up', 'wide', 'glass', 'sneak'); say.classList.remove('on');
    setTimeout(() => { if (!shown) x.hidden = true; }, 600);
    if (next !== false) later(() => show(otherEdge()), typeof next === 'number' ? next : (peeks > 6 ? rnd(60000, 90000) : rnd(18000, 32000)));
  }
  function otherEdge() {
    const edges = ['bottom', 'right'].concat(atlas && innerWidth > 1056 ? [] : ['left']);
    return pick(edges.filter((e) => e !== edge)) || 'bottom';
  }

  // the eyes follow the pointer
  let raf = 0, px = 0, py = 0;
  addEventListener('pointermove', (ev) => {
    if (touch || ev.pointerType === 'touch') return; px = ev.clientX; py = ev.clientY;
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (!shown) return; const r = el.getBoundingClientRect(); look(px - (r.left + r.width / 2), py - (r.top + r.height / 2)); });
  }, { passive: true });
  // caught peeking while the reader scrolls: duck, then come back somewhere else
  addEventListener('scroll', () => {
    if (shown) { caught = true; hide(false); }
    clearTimeout(scrollT);
    if (caught) scrollT = setTimeout(() => { caught = false; show(otherEdge(), pick(SCROLLED)); }, 1500);
  }, { passive: true });
  // a click or tap startles it
  el.querySelector('svg').addEventListener('click', () => {
    if (!shown) return; clear(); el.classList.add('up', 'wide'); speak('You found me! ✔ Check passed.', 2200);
    later(() => hide(45000), 2100);
  });
  x.addEventListener('click', () => {
    try { localStorage.setItem(KEY, '1'); } catch (e) { /* not kept: it will come back next visit */ }
    clear(); speak('Fine. I’ll check from afar.', 1600); el.classList.remove('on'); x.hidden = true;
    setTimeout(() => { el.remove(); say.remove(); style.remove(); }, 1800);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (shown) hide(false); clear(); } else if (!shown) later(() => show(otherEdge()), rnd(4000, 8000)); });

  jump('bottom');
  later(() => show(atlas ? 'bottom' : pick(['bottom', 'right'])), now ? 300 : rnd(5000, 8000));
})();
