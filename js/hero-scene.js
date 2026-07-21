// Hero ambient scene — animated layers composited over the untouched hero artwork.
// The artwork is cover-fitted by a JS-sized stage (same math as the browser's
// `object-fit: cover; object-position: center 30%`) so every overlay can be anchored
// in artwork-relative coordinates and stay registered with the painting at any
// viewport. Everything tears itself down when the router removes the view.
import { el } from './components.js';

const ART = { src: 'assets/art/hero-home.webp', w: 1536, h: 1024, focusY: 0.30 };

// The painted ship, extracted into a drift-able sprite + a patch covering its
// original spot (see tools/ship extraction notes in the design doc). The box is
// the crop region (840,230 490x200) in artwork-relative units.
const SHIP = {
  sprite: 'assets/art/hero-ship.webp',
  patch: 'assets/art/hero-sky-patch.webp',
};

// Feature anchors in artwork-relative units (0..1), tuned to hero-home.webp.
const SCENE = {
  zoom: 1.03, // headroom so pointer parallax never reveals stage edges
  moon: { x: 0.23, y: 0.27, r: 0.165 },
  ship: { x0: 0.57, y0: 0.26, x1: 0.84, y1: 0.39 },
  figure: { x0: 0.42, y0: 0.38, x1: 0.58, y1: 0.58 },
  skyMaxY: 0.56,
  cityBand: { y0: 0.635, y1: 0.745, gapX0: 0.40, gapX1: 0.60 },
  beams: [
    { x: 9.6, top: 56.5, h: 15, delay: 0 },
    { x: 33.6, top: 55.5, h: 13, delay: 2.8 },
    { x: 66.2, top: 60.0, h: 13.5, delay: 4.1 },
    { x: 84.6, top: 47.0, h: 26, delay: 1.4 },
    { x: 88.3, top: 60.5, h: 7.5, delay: 5.6 },
  ],
  beacons: [ // red anti-collision lights on the tallest spires
    { u: 0.308, v: 0.566 },
    { u: 0.270, v: 0.602 },
  ],
  lanes: [ // air-traffic corridors hugging each skyline, clear of the figure
    { u0: 0.03, u1: 0.395, v0: 0.615, v1: 0.675 },
    { u0: 0.605, u1: 0.97, v0: 0.672, v1: 0.72 },
  ],
};

const STAR_TINTS = ['255,255,255', '190,214,255', '168,240,224'];
const GLINT_TINTS = ['255,206,140', '255,226,180', '150,205,255'];

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);

export function heroBackdrop() {
  const scene = el('div.hero-scene');
  const placeholder = el('div.hero-bg-placeholder');
  const img = el('img', { alt: '', decoding: 'async', fetchpriority: 'high', src: ART.src });

  if (reducedMotion()) {
    img.className = 'hero-bg';
    scene.append(placeholder);
    img.onload = () => placeholder.replaceWith(img);
    return scene;
  }

  img.className = 'hs-art';
  const patchImg = el('img.hs-skypatch', { src: SHIP.patch, alt: '', decoding: 'async' });
  const shipImg = el('img.hs-ship-img', { src: SHIP.sprite, alt: '', decoding: 'async' });
  const stage = el('div.hs-stage', {},
    img,
    el('div.hs-nebula'),
    el('div.hs-moonglow'),
    patchImg,
    el('div.hs-shipwrap', {},
      el('div.hs-ship', {}, shipImg, el('div.hs-engine'))),
    SCENE.beams.map((b) => {
      const beam = el('div.hs-beam', { style: { left: `${b.x}%`, top: `${b.top}%`, height: `${b.h}%` } });
      beam.style.setProperty('--hs-delay', `${b.delay}s`);
      return beam;
    }),
    el('div.hs-hud.hs-hud-l'),
    el('div.hs-hud.hs-hud-r'));
  const canvas = el('canvas.hs-canvas');
  scene.append(placeholder, stage, canvas);

  // The drifting ship swaps in only when both of its layers are ready; until
  // then (or if either fails) the painted ship in the base art stays visible.
  const loaded = (im) => new Promise((res) => {
    if (im.complete) res();
    else { im.onload = res; im.onerror = res; }
  });
  Promise.all([loaded(patchImg), loaded(shipImg)]).then(() => {
    if (patchImg.naturalWidth && shipImg.naturalWidth) scene.classList.add('hs-ship-live');
  });

  const start = () => {
    scene.classList.add('hs-ready');
    bootScene(scene, stage, canvas, img);
  };
  if (img.complete && img.naturalWidth) start();
  else img.onload = start;
  return scene;
}

function bootScene(scene, stage, canvas, img) {
  const AW = img.naturalWidth || ART.w;
  const AH = img.naturalHeight || ART.h;
  const ctx = canvas.getContext('2d');
  const shipwrap = stage.querySelector('.hs-shipwrap');

  let scale = 1, baseX = 0, baseY = 0, heroH = 1, dpr = 1;
  let dx = 0, dy = 0, tx = 0, ty = 0; // pointer parallax: current / target, screen px
  let visible = true, moved = true, lastSc = -1, content = null;
  let last = performance.now();

  const fit = () => {
    const w = scene.clientWidth, h = scene.clientHeight;
    if (!w || !h) return;
    heroH = h;
    scale = Math.max(w / AW, h / AH) * SCENE.zoom;
    baseX = (w - AW * scale) / 2;
    baseY = (h - AH * scale) * ART.focusY;
    stage.style.width = `${AW * scale}px`;
    stage.style.height = `${AH * scale}px`;
    stage.style.transform = `translate3d(${baseX + dx}px, ${baseY + dy}px, 0)`;
    // Cap the backing store so huge/high-DPR viewports don't burn canvas memory.
    dpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(2.6e6 / (w * h)));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    moved = true;
  };
  fit();

  /* ---- particles (all coordinates in artwork pixels) ---- */
  const inMoon = (u, v) => {
    const du = u - SCENE.moon.x * AW, dv = v - SCENE.moon.y * AH, r = SCENE.moon.r * AW;
    return du * du + dv * dv < r * r;
  };
  const inBox = (b, u, v) =>
    u > b.x0 * AW && u < b.x1 * AW && v > b.y0 * AH && v < b.y1 * AH;

  const stars = [];
  const starCount = Math.round(Math.min(120, Math.max(55, scene.clientWidth / 13)));
  while (stars.length < starCount) {
    const u = Math.random() * AW, v = Math.random() * AH * SCENE.skyMaxY;
    if (inMoon(u, v) || inBox(SCENE.ship, u, v) || inBox(SCENE.figure, u, v)) continue;
    stars.push({
      u, v,
      r: rand(0.5, 1.4), a: rand(0.10, 0.5), amp: rand(0.08, 0.38),
      sp: rand(0.4, 1.6), ph: rand(0, Math.PI * 2),
      css: `rgb(${STAR_TINTS[(Math.random() * STAR_TINTS.length) | 0]})`,
      depth: rand(0.2, 0.9),
    });
  }
  // The brightest few stars get slow cross-shaped sparkle glints.
  [...stars].sort((a, b) => b.r - a.r).slice(0, 6).forEach((s) => { s.sparkle = true; });

  const glints = [];
  const cb = SCENE.cityBand;
  for (let i = 0; i < 9; i++) {
    const left = Math.random() < 0.5;
    glints.push({
      u: (left ? rand(0.03, cb.gapX0) : rand(cb.gapX1, 0.97)) * AW,
      v: rand(cb.y0, cb.y1) * AH,
      r: rand(1, 2.2), a: rand(0.10, 0.28),
      sp: (Math.PI * 2) / rand(3.5, 9), ph: rand(0, Math.PI * 2),
      css: `rgb(${GLINT_TINTS[(Math.random() * GLINT_TINTS.length) | 0]})`,
    });
  }

  // Ambient events: shooting stars, a distant liner crossing the sky,
  // and low city air traffic gliding along the skylines.
  const t0 = performance.now() / 1000;
  const shoots = [];
  let shootAt = t0 + rand(4, 10);
  let linerAt = t0 + rand(12, 30), liner = null;
  const cars = [];
  let carAt = t0 + rand(1, 3);

  const spawnShoot = (t) => {
    const dir = Math.random() < 0.5 ? -1 : 1;
    const ang = rand(0.35, 0.6);
    const speed = rand(500, 760);
    shoots.push({
      t0: t, dur: 0.9,
      u: rand(0.12, 0.88) * AW, v: rand(0.03, 0.30) * AH,
      vx: Math.cos(ang) * dir * speed, vy: Math.sin(ang) * speed,
    });
  };
  const spawnLiner = (t) => {
    const dir = Math.random() < 0.5 ? -1 : 1;
    liner = {
      t0: t, dir,
      v: rand(0.07, 0.19) * AH,
      u: dir > 0 ? -40 : AW + 40,
      speed: AW / rand(16, 26),
    };
  };
  const spawnCar = () => {
    const lane = SCENE.lanes[(Math.random() * SCENE.lanes.length) | 0];
    const dir = Math.random() < 0.5 ? -1 : 1;
    const pick = Math.random();
    cars.push({
      lane, dir,
      u: (dir > 0 ? lane.u0 : lane.u1) * AW,
      v: rand(lane.v0, lane.v1) * AH,
      speed: rand(22, 55),
      r: rand(1, 1.7), a: rand(0.45, 0.8),
      css: pick < 0.6 ? 'rgb(255,220,170)' : pick < 0.8 ? 'rgb(255,120,110)' : 'rgb(150,230,255)',
    });
  };

  const drawShoots = (t) => {
    for (let i = shoots.length - 1; i >= 0; i--) {
      const sh = shoots[i];
      const p = (t - sh.t0) / sh.dur;
      if (p >= 1) { shoots.splice(i, 1); continue; }
      if (p <= 0) continue; // twin scheduled slightly in the future
      const dtp = p * sh.dur;
      const hu = sh.u + sh.vx * dtp, hv = sh.v + sh.vy * dtp;
      const spd = Math.hypot(sh.vx, sh.vy);
      const len = Math.min(150, spd * dtp);
      const nx = sh.vx / spd, ny = sh.vy / spd;
      const g = ctx.createLinearGradient(hu, hv, hu - nx * len, hv - ny * len);
      const a = Math.sin(Math.PI * p);
      g.addColorStop(0, `rgba(235,245,255,${0.9 * a})`);
      g.addColorStop(1, 'rgba(190,214,255,0)');
      ctx.strokeStyle = g;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2.4 / scale;
      ctx.beginPath();
      ctx.moveTo(hu, hv);
      ctx.lineTo(hu - nx * len, hv - ny * len);
      ctx.stroke();
    }
  };

  const drawLiner = (t, dt) => {
    liner.u += liner.dir * liner.speed * dt;
    if (liner.u < -60 || liner.u > AW + 60) { liner = null; linerAt = t + rand(25, 55); return; }
    const trail = 26 / scale;
    const g = ctx.createLinearGradient(liner.u, liner.v, liner.u - liner.dir * trail, liner.v);
    g.addColorStop(0, 'rgba(190,240,255,0.55)');
    g.addColorStop(1, 'rgba(120,200,255,0)');
    ctx.strokeStyle = g;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.6 / scale;
    ctx.beginPath();
    ctx.moveTo(liner.u, liner.v);
    ctx.lineTo(liner.u - liner.dir * trail, liner.v);
    ctx.stroke();
    const blink = Math.pow(Math.max(0, Math.sin(t * 5.2)), 12);
    if (blink > 0.05) {
      ctx.globalAlpha = 0.9 * blink;
      ctx.fillStyle = 'rgb(255,255,255)';
      const r = 2.4 / scale;
      ctx.fillRect(liner.u - r / 2, liner.v - r / 2, r, r);
    }
  };

  const drawCars = (dt) => {
    for (let i = cars.length - 1; i >= 0; i--) {
      const c = cars[i];
      c.u += c.dir * c.speed * dt;
      const uMin = c.lane.u0 * AW, uMax = c.lane.u1 * AW;
      if (c.u < uMin - 1 || c.u > uMax + 1) { cars.splice(i, 1); continue; }
      // fade near corridor ends, as if slipping behind buildings
      const edge = Math.min(c.u - uMin, uMax - c.u);
      const a = c.a * Math.min(1, edge / 55);
      if (a <= 0.02) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = c.css;
      const r = c.r / scale;
      ctx.fillRect(c.u - r / 2, c.v - r / 2, r, r);
    }
  };

  const drawBeacons = (t) => {
    SCENE.beacons.forEach((b, i) => {
      const a = 0.8 * Math.pow(Math.max(0, Math.sin(t * 2.42 + i * 2.1)), 6);
      if (a <= 0.03) return;
      const u = b.u * AW, v = b.v * AH;
      ctx.fillStyle = 'rgb(255,90,80)';
      ctx.globalAlpha = a * 0.3;
      const rg = 5 / scale;
      ctx.fillRect(u - rg / 2, v - rg / 2, rg, rg);
      ctx.globalAlpha = a;
      const r = 1.8 / scale;
      ctx.fillRect(u - r / 2, v - r / 2, r, r);
    });
  };

  /* ---- interaction + lifecycle ---- */
  const finePointer = matchMedia('(pointer: fine)').matches;
  const onMove = (e) => {
    tx = -((e.clientX / innerWidth) - 0.5) * 16;
    ty = -((e.clientY / innerHeight) - 0.5) * 10;
  };
  if (finePointer) addEventListener('pointermove', onMove, { passive: true });

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    scene.classList.toggle('hs-paused', !visible);
  });
  io.observe(scene);
  const ro = new ResizeObserver(fit);
  ro.observe(scene);

  const destroy = () => {
    io.disconnect();
    ro.disconnect();
    if (finePointer) removeEventListener('pointermove', onMove);
  };

  const tick = (now) => {
    if (!scene.isConnected) { destroy(); return; }
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible) return;
    const t = now / 1000;

    // pointer parallax (lerped, transform-only); the ship sits a bit "closer"
    const k = 1 - Math.exp(-dt * 5);
    dx += (tx - dx) * k;
    dy += (ty - dy) * k;
    if (moved || Math.abs(tx - dx) > 0.02 || Math.abs(ty - dy) > 0.02) {
      stage.style.transform = `translate3d(${baseX + dx}px, ${baseY + dy}px, 0)`;
      shipwrap.style.transform = `translate3d(${dx * 0.45}px, ${dy * 0.45}px, 0)`;
      moved = false;
    }

    // hero content recedes + fades as the page scrolls
    if (!content) content = scene.parentElement && scene.parentElement.querySelector('.hero-content');
    const sc = window.scrollY;
    if (content && sc !== lastSc && sc < heroH) {
      content.style.transform = `translate3d(0, ${sc * 0.22}px, 0)`;
      content.style.opacity = String(Math.max(0, 1 - (sc / heroH) * 1.25));
      lastSc = sc;
    }

    // canvas pass, drawn in artwork coordinates via a single transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, (baseX + dx) * dpr, (baseY + dy) * dpr);

    const invS = 1 / scale;
    const pdx = dx * invS * 0.6, pdy = dy * invS * 0.6;
    for (const s of stars) {
      const a = s.a + s.amp * Math.sin(t * s.sp + s.ph);
      if (a <= 0.02) continue;
      ctx.globalAlpha = Math.min(1, a);
      ctx.fillStyle = s.css;
      const r = s.r * invS;
      const px = s.u + pdx * s.depth, py = s.v + pdy * s.depth;
      ctx.fillRect(px - r / 2, py - r / 2, r, r);
      if (s.sparkle) {
        const L = (4 + 9 * a) * invS;
        ctx.globalAlpha = Math.min(0.55, a * 0.55);
        ctx.strokeStyle = s.css;
        ctx.lineWidth = 0.8 * invS;
        ctx.beginPath();
        ctx.moveTo(px - L, py); ctx.lineTo(px + L, py);
        ctx.moveTo(px, py - L); ctx.lineTo(px, py + L);
        ctx.stroke();
      }
    }
    for (const gl of glints) {
      const pulse = Math.max(0, Math.sin(t * gl.sp + gl.ph));
      const a = gl.a * pulse * pulse;
      if (a <= 0.02) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = gl.css;
      const r = gl.r * invS;
      ctx.fillRect(gl.u - r / 2, gl.v - r / 2, r, r);
    }

    if (t > shootAt) {
      spawnShoot(t);
      if (Math.random() < 0.3) spawnShoot(t + 0.25); // occasional twin
      shootAt = t + rand(7, 16);
    }
    drawShoots(t);
    if (liner) drawLiner(t, dt);
    else if (t > linerAt) spawnLiner(t);
    if (t > carAt && cars.length < 5) { spawnCar(); carAt = t + rand(2.5, 6); }
    drawCars(dt);
    drawBeacons(t);
    ctx.globalAlpha = 1;
  };
  requestAnimationFrame(tick);
}

/* ---- typed status line ---- */
const PHRASES = [
  'deploying: web_apps · games · ai',
  'exploring: artificial_intelligence',
  'compiling: next_big_idea',
  'mode: build → ship → repeat',
];

export function heroStatus() {
  const text = el('span.hero-status-text');
  const line = el('p.hero-status', { 'aria-hidden': 'true' },
    el('span.hero-status-prompt', {}, '❯'), text, el('span.hero-status-cursor'));

  if (reducedMotion()) {
    text.textContent = PHRASES[0];
    return line;
  }

  let pi = 0, ci = 0, deleting = false;
  const step = () => {
    if (!line.isConnected) return;
    const phrase = PHRASES[pi];
    let delay;
    if (!deleting) {
      ci++;
      text.textContent = phrase.slice(0, ci);
      if (ci === phrase.length) { deleting = true; delay = 3400; }
      else delay = 34 + Math.random() * 48;
    } else {
      ci--;
      text.textContent = phrase.slice(0, ci);
      if (ci === 0) { deleting = false; pi = (pi + 1) % PHRASES.length; delay = 500; }
      else delay = 18;
    }
    setTimeout(step, delay);
  };
  setTimeout(step, 900);
  return line;
}
