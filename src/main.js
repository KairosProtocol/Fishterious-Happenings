// The game: a boat on a sea that gets deeper to the right, fish swimming below, and a rod to catch them with.
// World coordinates: x grows to the right from the beach, y is px below the sea surface (negative is sky).

import { SPECIES, drawDolphin, drawWhale } from './fish.js';
import { drawGirl, drawRod } from './girl.js';
import { sound } from './sound.js';

const canvas = document.querySelector('canvas');
const c = canvas.getContext('2d');
let W = 0, H = 0;

const WORLD = 12000;     // px from the beach to the far end of the sea
const SHORE = 300;       // the beach ends here
const SURFACE = 0.38;    // the surface sits this far down the screen when the camera is at the top
const GRAVITY = 900;     // px/s² for anything in the air
const PX_PER_M = 10;     // for the depth readout
const DEX_KEY = 'fishing-dex';
const FONT = '"Nunito", ui-rounded, system-ui, sans-serif';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const mix = (a, b, t) => `rgb(${[0, 2, 4].map(i => Math.round(parseInt(a.substr(i + 1, 2), 16) * (1 - t) + parseInt(b.substr(i + 1, 2), 16) * t))})`;

// Sea floor depth at x: a beach on the left, getting deeper to the right with gentle hills
const deepFloor = (x) => 140 + 1900 * clamp((x - SHORE) / (WORLD - SHORE), 0, 1) ** 1.4 + Math.sin(x / 310) * 25 + Math.sin(x / 97) * 8;
export const floorAt = (x) => x < SHORE ? -50 + (deepFloor(SHORE) + 50) * Math.max(0, x) / SHORE : deepFloor(x);
const seaFrac = (x) => clamp(floorAt(x) / 2000, 0, 1); // 0 at the beach, 1 out in the deepest sea
console.assert(Math.abs(floorAt(SHORE - 0.01) - floorAt(SHORE)) < 1, 'beach meets the sea floor');

let time = 0;
// rain: 0 clear … 1 downpour. target is where it's heading; the sea gets choppier as it rains.
const weather = { rain: 0, target: 0, timer: 25, flash: 0, drops: [] };
const wave = (x) => (Math.sin(x * 0.012 + time * 1.6) * 3.5 + Math.sin(x * 0.031 - time * 1.2) * 1.8) * (1 + weather.rain * 1.3);

// --- State ---------------------------------------------------------------------

const keys = new Set();
const cam = { x: 0, y: 0 };
const boat = { x: 520, vx: 0, dir: 1, y: 0, tilt: 0 };
// line.state: idle → cast (hook flying) → out (in the water) → reel (coming back) → idle
const line = { state: 'idle', biter: null, fish: null, seek: 1, jiggle: 0, show: null, tickDist: 0, crank: 0 };
const hook = { x: 0, y: 0, vx: 0, vy: 0, depth: 60 };
const fishes = [];
const visitors = []; // dolphins and whales passing by
let visitorT = 12;
const particles = [];
let toast = null;

let dex = {};
try { dex = JSON.parse(localStorage.getItem(DEX_KEY)) || {}; } catch {}
// For poking at the game from the console: (await import('/src/main.js')).state
export const state = { boat, line, hook, fishes, visitors, weather, get dex() { return dex; } };

// --- Fish ----------------------------------------------------------------------

// Depths a species can swim at above this floor, or null if the water is too shallow for it
function yRange(sp, floor) {
  const lo = Math.max(sp.depth[0], sp.size * 0.7 + 5), hi = Math.min(sp.depth[1], floor - sp.size);
  return hi > lo ? [lo, hi] : null;
}

// Pick a depth first and then a species that lives there, so the whole water column is equally busy
function spawnFish(x) {
  if (x < SHORE + 40 || x > WORLD - 20) return;
  const floor = floorAt(x), y = rand(10, floor - 10);
  const options = SPECIES.filter(sp => { const r = yRange(sp, floor); return r && y >= r[0] && y <= r[1]; });
  if (!options.length) return;
  let r = Math.random() * options.reduce((a, sp) => a + sp.weight, 0), sp = options[0];
  for (const o of options) { r -= o.weight; if (r <= 0) { sp = o; break; } }
  fishes.push({
    sp, s: sp.size * rand(0.8, 1.2), x, y, ty: y, dir: Math.random() < 0.5 ? -1 : 1,
    pace: rand(0.6, 1.1), phase: rand(0, 9), turnT: rand(2, 8), state: 'swim', t: 0, vx: 0, vy: 0, puff: 0,
    tilt: 0, snap: 0, full: rand(0, 10),
  });
}

function flee(f) {
  f.state = 'flee'; f.t = 2; f.from = null;
  f.dir = Math.sign(f.x - hook.x) || 1;
}

function jump(f) {
  f.state = 'air';
  f.vy = -Math.sqrt(2 * GRAVITY * (f.y + rand(40, 150)));
  f.vx = f.dir * f.sp.speed * 1.6;
}

const biteWindow = (sp) => Math.max(0.4, 1.2 - sp.size / 150); // seconds to strike; big fish are quicker
const onScreen = (x, y) => Math.abs(x - cam.x) < W / 2 + 50 && Math.abs(y - cam.y - H * (0.5 - SURFACE)) < H / 2 + 50;
const keepInWater = (f) => {
  f.x = clamp(f.x, SHORE + 20, WORLD - 20);
  f.y = clamp(f.y, f.s * 0.6 + 4, floorAt(f.x) - f.s * 0.6);
};

// Predators hunt more the deeper the sea is, and only from about 40 m of water
const huntRate = (x) => 0.06 * clamp((floorAt(x) - 400) / 1000, 0, 1);

function startHunt(f) {
  let prey = null, best = 320;
  for (const p of fishes) {
    if (p === f || p.state !== 'swim' || p.s > f.s * 0.6) continue;
    const d = Math.hypot(p.x - f.x, p.y - f.y);
    if (d < best) { best = d; prey = p; }
  }
  if (!prey) { f.full = 3; return; }
  f.state = 'chase'; f.prey = prey; f.t = 4;
  prey.state = 'flee'; prey.t = 4; prey.from = f;
}

function eat(f, p) {
  p.dead = true;
  if (line.biter === p) line.biter = null;
  f.state = 'swim'; f.full = rand(15, 30); f.snap = 1;
  for (let i = 0; i < 8; i++) particles.push({ kind: 'bubble', x: p.x + rand(-6, 6), y: p.y + rand(-6, 6), r: rand(1.5, 3.5), phase: rand(0, 9), life: 99 });
  if (onScreen(p.x, p.y)) sound.chomp();
}

function updateFish(f, dt) {
  const sp = f.sp;
  f.phase += dt * (f.state === 'hooked' ? 30 : f.state === 'chase' || f.state === 'flee' ? 14 : 4 + sp.speed / 12);
  f.puff += ((f.state === 'hooked' || f.from ? 1 : 0) - f.puff) * Math.min(1, dt * 4);
  f.snap = Math.max(0, f.snap - dt * 4);

  if (f.state === 'air') {
    const wasBelow = f.y > 0;
    f.vy += GRAVITY * dt; f.x += f.vx * dt; f.y += f.vy * dt;
    if (wasBelow && f.y <= 0) splash(f.x, f.s * 0.5, false);
    if (f.y > 0 && f.vy > 0) { splash(f.x, f.s, false); sound.note(); f.state = 'swim'; f.vy = 0; }
    return;
  }
  if (f.state === 'hooked') { f.x = hook.x; f.y = hook.y + f.s * 0.9; return; }

  if (f.state === 'chase') {
    const p = f.prey;
    if (p.dead || p.state !== 'flee' || p.from !== f) { f.state = 'swim'; f.full = 6; return; }
    const dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy) || 1;
    if (Math.abs(dx) > 2) f.dir = Math.sign(dx);
    f.x += dx / d * sp.speed * 1.8 * dt; f.y += dy / d * sp.speed * 1.8 * dt;
    keepInWater(f);
    f.t -= dt;
    if (d < f.s * 0.8) eat(f, p);
    else if (f.t < 0) { f.state = 'swim'; f.full = 6; }
    return;
  }

  if (f.state === 'approach' || f.state === 'nibble' || f.state === 'bite') {
    if (f.state === 'approach' && Math.abs(hook.x - f.x) > f.s) f.dir = Math.sign(hook.x - f.x);
    const mx = hook.x - f.dir * f.s * 0.85, my = hook.y + 3; // where the fish's centre is when its mouth is on the hook
    const dx = mx - f.x, dy = my - f.y, d = Math.hypot(dx, dy);
    if (f.state === 'approach') {
      const step = Math.min(d, sp.speed * 0.9 * dt);
      if (d > 0) { f.x += dx / d * step; f.y += dy / d * step; }
      f.t -= dt;
      if (d < 3) { f.state = 'nibble'; f.t = rand(0.3, 0.7); f.nibbles = 1 + Math.floor(Math.random() * 3); }
      else if (f.t < 0) { flee(f); line.biter = null; } // gave up
      return;
    }
    const peck = f.peck = Math.max(0, (f.peck || 0) - dt * 5); // darts in a little on each nibble
    f.x += (mx + f.dir * peck * 4 - f.x) * Math.min(1, dt * 10);
    f.y += (my - f.y) * Math.min(1, dt * 10);
    f.t -= dt;
    if (f.state === 'nibble' && f.t < 0) {
      if (f.nibbles-- > 0) { sound.nibble(); line.jiggle = 0.6; f.peck = 1; f.t = rand(0.4, 0.9); }
      else { f.state = 'bite'; f.t = biteWindow(sp); sound.bite(); line.jiggle = 1.5; }
    } else if (f.state === 'bite' && f.t < 0) { flee(f); line.biter = null; sound.miss(); }
    return;
  }

  // swimming about, or fleeing from the hook or a predator
  let speed = sp.speed * f.pace;
  if (f.state === 'flee') {
    speed *= 2.5;
    if (f.from && !f.from.dead) { // dodge away from the hunter, up or down as well as sideways
      f.dir = Math.sign(f.x - f.from.x) || f.dir;
      f.y += Math.sign(f.y - f.from.y) * speed * 0.4 * dt;
      f.ty = f.y;
    }
    f.t -= dt;
    if (f.t < 0) { f.state = 'swim'; f.from = null; }
  } else if ((f.turnT -= dt) < 0) {
    f.turnT = rand(3, 10);
    if (Math.random() < 0.5) f.dir *= -1;
    const r = yRange(sp, floorAt(f.x));
    if (r) f.ty = rand(r[0], r[1]);
    f.pace = rand(0.6, 1.1);
  }
  const ahead = f.x + f.dir * f.s * 2;
  if (ahead < SHORE || ahead > WORLD || floorAt(ahead) < f.y + f.s) f.dir *= -1;
  f.x += f.dir * speed * dt;
  f.y += (f.ty - f.y) * Math.min(1, dt * 0.5) + Math.sin(f.phase * 0.3) * 4 * dt;
  keepInWater(f);
  if (f.state !== 'swim') return;
  if (f.s < 30 && f.y < 120 && Math.random() < 0.015 * dt) jump(f);
  f.full -= dt;
  if (sp.eats && f.full < 0 && Math.random() < huntRate(f.x) * dt) startHunt(f);
}

// Keep a crowd of fish around the camera: drop eaten and far-away ones, add new ones just off screen
function manageFish() {
  for (let i = fishes.length - 1; i >= 0; i--) {
    const f = fishes[i];
    if (f.dead || (Math.abs(f.x - cam.x) > W * 1.6 && f.state !== 'hooked' && f !== line.biter)) fishes.splice(i, 1);
  }
  const target = 25 + floorAt(cam.x) / 25;
  for (let n = 0; n < 4 && fishes.length < target; n++) {
    spawnFish(cam.x + (Math.random() < 0.5 ? -1 : 1) * rand(W * 0.6, W * 1.2));
  }
}

// --- Dolphins and whales -------------------------------------------------------

// Now and then something big passes by; further out to sea it's more likely, and whales only come out deep
function spawnVisitors() {
  const frac = seaFrac(boat.x), side = Math.random() < 0.5 ? -1 : 1, dir = -side;
  const x0 = cam.x + side * (W / 2 + 300);
  if (frac > 0.4 && Math.random() < 0.15) {
    visitors.push({ kind: 'whale', x: x0 + side * 300, y: 95, dir, s: 260, phase: 0, t: 0, spoutT: rand(3, 6), seen: false });
  } else if (frac > 0.12 && Math.random() < 0.4) {
    const n = 3 + Math.floor(Math.random() * 3), vx = dir * rand(190, 240);
    for (let i = 0; i < n; i++) {
      visitors.push({ kind: 'dolphin', x: x0 + side * i * rand(50, 110), y: rand(30, 80), dir, s: rand(36, 46), vx, vy: 0,
        air: false, leapT: rand(0.5, 3), phase: rand(0, 9), seen: false });
    }
  }
}

function updateVisitors(dt) {
  if (!visitors.length && (visitorT -= dt) < 0) { visitorT = rand(10, 20); spawnVisitors(); }
  for (let i = visitors.length - 1; i >= 0; i--) {
    const v = visitors[i];
    v.phase += dt * (v.kind === 'whale' ? 1.2 : 6);
    if (v.kind === 'whale') {
      v.t += dt;
      v.x += v.dir * 45 * dt;
      v.y = 95 + Math.sin(v.t * 0.3) * 15;
      if ((v.spoutT -= dt) < 0) { // blows a spout of spray from its blowhole
        v.spoutT = rand(5, 8);
        const bx = v.x + v.dir * v.s * 0.5;
        for (let k = 0; k < 30; k++) particles.push({ kind: 'drop', x: bx + rand(-6, 6), y: -4, vx: rand(-45, 45), vy: -rand(250, 430), life: 2 });
        if (onScreen(bx, 0)) sound.blow();
      }
    } else if (v.air) {
      v.vy += GRAVITY * dt; v.x += v.vx * dt; v.y += v.vy * dt;
      if (v.y > 0 && v.vy > 0) { v.air = false; splash(v.x, 18, onScreen(v.x, 0)); v.leapT = rand(1, 3.5); }
    } else {
      v.x += v.vx * dt;
      v.y += (55 + Math.sin(v.phase * 0.2) * 20 - v.y) * Math.min(1, dt * 1.5);
      if ((v.leapT -= dt) < 0) { // leap out in an arc
        v.air = true; v.vy = -Math.sqrt(2 * GRAVITY * (v.y + rand(60, 150)));
        splash(v.x, 12, false);
      }
    }
    const dx = v.x - cam.x;
    if (!v.seen && Math.abs(dx) < W / 2) {
      for (const o of visitors) o.seen = true;
      toast = { text: v.kind === 'whale' ? 'A whale!' : 'Dolphins!', t: 2.5 };
      v.kind === 'whale' ? sound.whale() : sound.dolphin();
    }
    if (Math.abs(dx) > W * 1.6 && Math.sign(dx) === v.dir) visitors.splice(i, 1); // gone past
  }
}

function drawVisitor(v) {
  c.save(); c.translate(v.x, v.y); c.scale(v.dir, 1);
  if (v.kind === 'whale') { c.rotate(Math.cos(v.t * 0.3) * 0.03); drawWhale(c, v.s, Math.sin(v.phase) * v.s * 0.05); }
  else { if (v.air) c.rotate(Math.atan2(v.vy, Math.abs(v.vx))); drawDolphin(c, v.s, Math.sin(v.phase) * v.s * 0.08); }
  c.restore();
}

// --- Weather -------------------------------------------------------------------

function updateWeather(dt) {
  if ((weather.timer -= dt) < 0) {
    weather.timer = rand(25, 50);
    weather.target = Math.random() < 0.1 + 0.6 * seaFrac(boat.x) ? rand(0.4, 1) : 0; // rainier out at sea
  }
  weather.rain += clamp(weather.target - weather.rain, -dt * 0.08, dt * 0.08);
  if (weather.rain > 0.75 && Math.random() < dt * 0.04) {
    weather.flash = 1;
    setTimeout(() => sound.thunder(), rand(200, 1200));
  }
  weather.flash = Math.max(0, weather.flash - dt * 2.5);
  sound.rain(weather.rain);
  // Raindrops live in screen space and stop at the surface, leaving a little ripple
  const drops = weather.drops, want = Math.floor(weather.rain * 260);
  while (drops.length < want) drops.push({ x: rand(0, W + 200), y: rand(-H, 0), v: rand(700, 1000) });
  drops.length = want;
  const surf = H * SURFACE - cam.y;
  for (const d of drops) {
    d.y += d.v * dt; d.x -= d.v * 0.18 * dt;
    const wx = d.x - W / 2 + cam.x;
    if (d.y > surf + wave(wx) || d.y > H) {
      if (d.y < H && Math.random() < 0.1) particles.push({ kind: 'ripple', x: wx, y: 0, r: 1, life: 0.5, max: 0.5 });
      d.y = rand(-60, 0); d.x = rand(0, W + 200);
    }
  }
}

// --- Particles -----------------------------------------------------------------

function splash(x, size, loud = true) {
  for (let i = 0; i < 5 + size / 3; i++) {
    particles.push({ kind: 'drop', x: x + rand(-size, size) * 0.5, y: -2, vx: rand(-90, 90), vy: -rand(120, 280 + size * 4), life: 1.2 });
  }
  particles.push({ kind: 'ripple', x, y: 0, r: size * 0.5, life: 1.2, max: 1.2 });
  if (loud) sound.splash(clamp(size / 20, 0.6, 2));
}

function sparkle(x, y) {
  for (let i = 0; i < 14; i++) {
    const a = rand(0, Math.PI * 2), v = rand(40, 140);
    particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: rand(0.6, 1.1) });
  }
}

function updateParticles(dt) {
  if (Math.random() < dt * 5) { // ambient bubbles rising from the floor
    const x = cam.x + rand(-W / 2, W / 2);
    if (x > SHORE) particles.push({ kind: 'bubble', x, y: floorAt(x) - 4, r: rand(1.5, 4), phase: rand(0, 9), life: 99 });
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.kind === 'drop' || p.kind === 'spark') {
      p.vy += (p.kind === 'drop' ? GRAVITY : 120) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'drop' && p.y > 0 && p.vy > 0) p.life = 0;
    } else if (p.kind === 'ripple') p.r += dt * 40;
    else if (p.kind === 'bubble') {
      p.y -= (30 + p.r * 8) * dt; p.phase += dt * 3; p.x += Math.sin(p.phase) * 10 * dt;
      if (p.y < 0) { p.life = 0; if (Math.random() < 0.15 && Math.abs(p.x - cam.x) < W / 2) sound.bloop(); }
    }
    if (p.life <= 0 || Math.abs(p.x - cam.x) > W * 1.5) particles.splice(i, 1);
  }
}

// --- The boat, the rod and the line ---------------------------------------------

// The rod tip in the boat's own coordinates (facing right, deck at y = 0); it bends down when a fish pulls
const tipLocal = (bend) => ({ x: 62 + bend * 6, y: -84 + bend * 26 });
const toWorld = (p) => {
  const cs = Math.cos(boat.tilt), sn = Math.sin(boat.tilt), lx = p.x * boat.dir;
  return { x: boat.x + cs * lx - sn * p.y, y: boat.y + sn * lx + cs * p.y };
};
const rodBend = () => line.state === 'reel' && line.fish ? 0.8 : clamp(line.jiggle, 0, 1);

function cast() {
  const tip = toWorld(tipLocal(0));
  Object.assign(hook, { x: tip.x, y: tip.y, vx: boat.dir * 300, vy: -220, depth: 60 });
  line.state = 'cast';
  sound.whoosh();
}

function action() {
  if (line.state === 'idle' && !line.show) cast();
  else if (line.state === 'out') {
    const f = line.biter;
    if (f && f.state === 'bite') { f.state = 'hooked'; line.fish = f; sound.hooked(); line.jiggle = 1; }
    else if (f) { flee(f); sound.miss(); } // struck too early
    line.biter = null;
    line.state = 'reel';
  }
}

function landFish(f) {
  fishes.splice(fishes.indexOf(f), 1);
  const cm = Math.round(f.s * 2 * 1.3), isNew = !dex[f.sp.id];
  dex[f.sp.id] = Math.max(dex[f.sp.id] || 0, cm);
  try { localStorage.setItem(DEX_KEY, JSON.stringify(dex)); } catch {}
  toast = { text: `${isNew ? 'New! ' : ''}${f.sp.name} · ${cm} cm`, t: 3 };
  line.show = { f, t: 1.8 };
  sound.jingle(isNew);
  const tip = toWorld(tipLocal(0));
  sparkle(boat.x + boat.dir * 20, tip.y - 20);
}

function updateLine(dt) {
  line.jiggle = Math.max(0, line.jiggle - dt * 3);
  if (line.show && (line.show.t -= dt) < 0) line.show = null;
  const tip = toWorld(tipLocal(rodBend()));

  if (line.state === 'cast') {
    hook.vy += GRAVITY * dt; hook.x += hook.vx * dt; hook.y += hook.vy * dt;
    hook.x = Math.max(hook.x, SHORE + 20);
    if (hook.y >= 0 && hook.vy > 0) { hook.y = 0; line.state = 'out'; splash(hook.x, 6, false); sound.plop(); }
  } else if (line.state === 'out') {
    const updown = (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('w') ? 1 : 0);
    const floor = Math.max(0, floorAt(hook.x) - 6);
    hook.depth = clamp(hook.depth + updown * 170 * dt, 0, floor);
    hook.y += clamp(hook.depth - hook.y, -200 * dt, 200 * dt);
    if (updown) line.crank += dt * 10 * -updown;
    // Now and then a nearby fish that lives at this depth comes to look
    if (!line.biter && (line.seek -= dt) < 0) {
      line.seek = rand(0.6, 1.5);
      const near = fishes.filter(f => f.state === 'swim' && Math.hypot(f.x - hook.x, f.y - hook.y) < 260 &&
        hook.y > f.sp.depth[0] - 50 && hook.y < f.sp.depth[1] + 50);
      if (near.length && Math.random() < 0.5) {
        const f = near[Math.floor(Math.random() * near.length)];
        f.state = 'approach'; f.t = 6; line.biter = f;
      }
    }
  } else if (line.state === 'reel') {
    const dx = tip.x - hook.x, dy = tip.y - hook.y, d = Math.hypot(dx, dy);
    const step = Math.min(d, (300 + d * 0.6) * dt);
    const wasBelow = hook.y > 0;
    hook.x += dx / d * step || 0; hook.y += dy / d * step || 0;
    line.crank += dt * 18;
    if ((line.tickDist += step) > 30) { line.tickDist = 0; sound.tick(); }
    if (wasBelow && hook.y <= 0 && line.fish) splash(hook.x, line.fish.s);
    if (d < 12) {
      if (line.fish) landFish(line.fish);
      line.fish = null;
      line.state = 'idle';
    }
  }
}

// --- Update --------------------------------------------------------------------

function update(dt) {
  time += dt;
  const lr = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0);
  const canSail = line.state === 'idle';
  boat.vx += (canSail ? lr : 0) * 500 * dt;
  boat.vx *= Math.exp(-dt * 2.2);
  boat.vx = clamp(boat.vx, -220, 220);
  if (canSail && lr) boat.dir = lr;
  boat.x = clamp(boat.x + boat.vx * dt, SHORE + 80, WORLD - 100);
  if (boat.x === SHORE + 80 || boat.x === WORLD - 100) boat.vx = 0;
  boat.y = wave(boat.x) - 2;
  boat.tilt = Math.atan((wave(boat.x + 20) - wave(boat.x - 20)) / 40) * 0.8 - boat.vx / 220 * 0.05;

  updateLine(dt);
  for (const f of fishes) {
    const px = f.x, py = f.y;
    updateFish(f, dt);
    // lean into the direction of travel, nose up or down
    const mdx = f.x - px, mdy = f.y - py;
    const lean = f.state === 'air' || f.state === 'hooked' || !(mdx || mdy) ? 0 : clamp(Math.atan2(mdy, Math.abs(mdx)), -0.6, 0.6);
    f.tilt += (lean - f.tilt) * Math.min(1, dt * 5);
  }
  manageFish();
  updateVisitors(dt);
  updateParticles(dt);
  updateWeather(dt);
  if (toast && (toast.t -= dt) < 0) toast = null;

  // Camera follows the boat, and follows the hook down when it goes deep
  const tx = clamp(boat.x + boat.dir * W * 0.12, W / 2, WORLD - W / 2);
  cam.x += (tx - cam.x) * Math.min(1, dt * 3);
  const ty = line.state === 'out' || line.state === 'reel' ? Math.max(0, hook.y - H * 0.3) : 0;
  cam.y += (ty - cam.y) * Math.min(1, dt * 2.5);
}

// --- Drawing -------------------------------------------------------------------

function drawSky() {
  const horizon = H * SURFACE - cam.y, rain = weather.rain;
  const g = c.createLinearGradient(0, horizon - H * 0.6, 0, horizon);
  g.addColorStop(0, mix('#8fd3ff', '#6d7b8c', rain)); g.addColorStop(1, mix('#fde7d2', '#aab3bd', rain));
  c.fillStyle = g; c.fillRect(0, 0, W, Math.max(0, horizon + 10));
  c.globalAlpha = 1 - rain; // the sun fades behind the rain clouds
  c.fillStyle = '#fff6c9';
  c.beginPath(); c.arc(W * 0.78, horizon - H * 0.24, 34, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,246,201,.3)';
  c.beginPath(); c.arc(W * 0.78, horizon - H * 0.24, 50, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 1;
  // Far islands, barely moving
  c.fillStyle = mix('#b6c6e6', '#8592a3', rain);
  c.beginPath(); c.moveTo(0, horizon);
  for (let x = 0; x <= W + 20; x += 20) {
    const wx = x + cam.x * 0.08;
    c.lineTo(x, horizon - Math.max(0, Math.sin(wx / 230) * 40 + Math.sin(wx / 87) * 12 - 8));
  }
  c.lineTo(W, horizon); c.fill();
  // Clouds, a little faster; more and greyer as it rains
  c.fillStyle = rain > 0.01 ? mix('#ffffff', '#8d97a3', rain) : '#ffffff';
  const n = 6 + Math.round(rain * 8);
  for (let i = 0; i < n; i++) {
    const span = W + 300;
    const x = ((i * 397 - cam.x * 0.2 + time * (6 + rain * 14)) % span + span) % span - 150;
    const y = horizon - H * (0.22 + hash(i) * 0.3) * (1 - rain * 0.35);
    const k = (0.8 + hash(i + 3) * 0.5) * (1 + rain * 0.6);
    for (const [ox, oy, r] of [[0, 0, 22], [24, -10, 26], [50, 0, 20], [24, 6, 22]]) {
      c.beginPath(); c.arc(x + ox * k, y + oy * k, r * k, 0, Math.PI * 2); c.fill();
    }
  }
}

function drawWater(L, R, T, B) {
  const g = c.createLinearGradient(0, 0, 0, 400);
  g.addColorStop(0, mix('#7fd6ea', '#6a9fb0', weather.rain)); g.addColorStop(1, mix('#2a86b8', '#2a6688', weather.rain));
  c.fillStyle = g;
  c.beginPath(); c.moveTo(L, B);
  for (let x = L; x <= R + 16; x += 16) c.lineTo(x, wave(x));
  c.lineTo(R + 16, B); c.fill();
  // Light rays from the surface, dimmer under rain clouds
  for (let x = Math.floor(L / 260) * 260; x < R + 260; x += 260) {
    const sway = Math.sin(time * 0.5 + x) * 30, w = 30 + hash(x) * 50;
    const rg = c.createLinearGradient(0, 0, 0, 420);
    rg.addColorStop(0, `rgba(255,255,255,${0.16 * (1 - weather.rain * 0.8)})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = rg;
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x + w, 0); c.lineTo(x + w + 90 + sway, 420); c.lineTo(x + 40 + sway, 420); c.fill();
  }
}

function drawFloor(L, R, B) {
  const g = c.createLinearGradient(0, -50, 0, 2200);
  g.addColorStop(0, '#f3d9a4'); g.addColorStop(0.15, '#d9b77a'); g.addColorStop(1, '#5e5040');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(L - 20, B + 50);
  for (let x = L - 20; x <= R + 20; x += 12) c.lineTo(x, floorAt(x));
  c.lineTo(R + 20, B + 50); c.fill();
  // Seaweed and rocks, placed by a hash of their slot so they stay put
  for (let x = Math.floor(L / 70) * 70; x < R + 70; x += 70) {
    if (x < SHORE + 20) continue;
    const h = hash(x), fy = floorAt(x);
    if (h < 0.45) {
      c.strokeStyle = h < 0.2 ? '#3f9a5a' : '#5fb86a'; c.lineWidth = 4; c.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const len = 30 + hash(x + k) * 70, sx = x + k * 7, sw = Math.sin(time * 1.3 + x + k) * 10;
        c.beginPath(); c.moveTo(sx, fy + 4);
        c.quadraticCurveTo(sx - sw, fy - len * 0.5, sx + sw, fy - len); c.stroke();
      }
    } else if (h > 0.8) {
      c.fillStyle = '#8b8a90';
      c.beginPath(); c.ellipse(x, fy + 4, 14 + h * 12, 10 + h * 6, 0, Math.PI, 0); c.fill();
    }
  }
}

function fishTransform(f) {
  c.translate(f.x, f.y);
  c.scale(f.dir, 1);
  if (f.state === 'hooked') c.rotate(-Math.PI / 2 + Math.sin(f.phase) * 0.3);
  else if (f.state === 'air') c.rotate(Math.atan2(f.vy, Math.abs(f.vx)));
  else c.rotate(f.tilt);
  if (f.snap) c.scale(1 + f.snap * 0.18, 1 - f.snap * 0.1); // gulp
}

function drawFishBody(f) {
  c.save();
  fishTransform(f);
  f.sp.draw(c, f.s, Math.sin(f.phase) * f.s * 0.12, f);
  c.restore();
}

function drawGlows(L, R, T, B) {
  for (const f of fishes) {
    if (!f.sp.glow || f.x < L - 200 || f.x > R + 200 || f.y < T - 200 || f.y > B + 200) continue;
    c.save(); fishTransform(f); f.sp.glow(c, f.s); c.restore();
  }
}

function drawBoat(tip) {
  c.save();
  c.translate(boat.x, boat.y); c.rotate(boat.tilt); c.scale(boat.dir, 1);
  drawRod(c, tip, line.crank);
  drawGirl(c, {
    t: time, crank: line.crank, hood: weather.rain > 0.3 ? 1 : 0,
    mood: line.show ? 'happy' : line.biter?.state === 'bite' ? 'alert' : 'calm',
    sway: Math.sin(time * 2.2) * 3 - boat.vx / 220 * 6 * boat.dir,
  });
  // hull
  c.fillStyle = '#c8693c';
  c.beginPath(); c.moveTo(-66, -8); c.lineTo(68, -8); c.quadraticCurveTo(60, 18, 38, 22); c.lineTo(-46, 22); c.quadraticCurveTo(-64, 14, -66, -8); c.fill();
  c.fillStyle = '#f6e7c8'; c.fillRect(-66, -8, 134, 5);
  c.fillStyle = '#9d4826'; c.fillRect(-60, 6, 116, 4);
  c.fillStyle = '#7fd6ea'; c.beginPath(); c.arc(32, 0, 3.5, 0, Math.PI * 2); c.fill(); // porthole
  c.restore();
}

function drawLine(tip) {
  if (line.state === 'idle') return;
  const t = toWorld(tip);
  const taut = line.state === 'reel' || line.biter?.state === 'bite';
  const jx = line.jiggle * Math.sin(time * 60) * 2;
  c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(t.x, t.y);
  c.quadraticCurveTo((t.x + hook.x) / 2, Math.max(t.y, hook.y) + (taut ? 0 : 30), hook.x + jx, hook.y);
  c.stroke();
  // hook with a pink worm on it
  c.strokeStyle = '#d8dde3'; c.lineWidth = 1.6;
  c.beginPath(); c.arc(hook.x + jx, hook.y + 5, 4, 0, Math.PI); c.stroke();
  if (!line.fish) { c.fillStyle = '#ff8fab'; c.beginPath(); c.ellipse(hook.x + jx + 3, hook.y + 8, 3.5, 2, 0.6, 0, Math.PI * 2); c.fill(); }
}

function drawParticles(kinds) {
  for (const p of particles) {
    if (!kinds.includes(p.kind)) continue;
    if (p.kind === 'drop') { c.fillStyle = 'rgba(220,245,255,.9)'; c.beginPath(); c.arc(p.x, p.y, 2, 0, Math.PI * 2); c.fill(); }
    else if (p.kind === 'ripple') {
      c.strokeStyle = `rgba(255,255,255,${0.7 * p.life / p.max})`; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(p.x, wave(p.x), p.r, p.r * 0.25, 0, 0, Math.PI * 2); c.stroke();
    } else if (p.kind === 'bubble') {
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1;
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.stroke();
    } else if (p.kind === 'spark') {
      c.fillStyle = `rgba(255,236,140,${clamp(p.life, 0, 1)})`;
      c.beginPath(); c.arc(p.x, p.y, 2.5, 0, Math.PI * 2); c.fill();
    }
  }
}

function drawRain() {
  if (weather.rain > 0.01) {
    c.fillStyle = `rgba(40,50,70,${weather.rain * 0.22})`; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(220,232,245,.55)'; c.lineWidth = 1.2;
    c.beginPath();
    for (const d of weather.drops) { c.moveTo(d.x, d.y); c.lineTo(d.x + 2.5, d.y - 14); }
    c.stroke();
  }
  if (weather.flash) { c.fillStyle = `rgba(255,255,255,${weather.flash * 0.5})`; c.fillRect(0, 0, W, H); }
}

function drawHUD() {
  c.textBaseline = 'middle';
  // Fishdex: every species, a dark shape until you catch one
  const cell = 34, cols = Math.min(SPECIES.length, Math.floor((W - 32) / cell));
  const rows = Math.ceil(SPECIES.length / cols), pw = cols * cell + 16, px = W - pw - 16;
  c.fillStyle = 'rgba(255,255,255,.55)';
  c.beginPath(); c.roundRect(px, 16, pw, rows * cell + 34, 12); c.fill();
  c.fillStyle = '#29425a'; c.font = `800 13px ${FONT}`; c.textAlign = 'left';
  c.fillText(`Fishdex ${Object.keys(dex).length}/${SPECIES.length}`, px + 10, 31);
  SPECIES.forEach((sp, i) => {
    const x = px + 8 + (i % cols) * cell + cell / 2, y = 46 + Math.floor(i / cols) * cell + cell / 2;
    c.save(); c.translate(x, y);
    const k = 11 / sp.size; c.scale(k, k);
    // shortcut: canvas filter isn't supported in older Safari, which shows uncaught fish in colour; fine for now
    if (!dex[sp.id]) c.filter = 'brightness(0) opacity(.3)';
    sp.draw(c, sp.size, 0, null);
    c.restore();
  });
  // depth readout
  c.fillStyle = 'rgba(255,255,255,.85)'; c.font = `700 14px ${FONT}`; c.textAlign = 'left';
  const hookTxt = line.state === 'out' ? ` · hook ${(hook.y / PX_PER_M).toFixed(0)} m` : '';
  c.fillText(`Sea depth ${(floorAt(boat.x) / PX_PER_M).toFixed(0)} m${hookTxt}`, 16, H - 20);
  // hint
  const hint = line.state === 'idle' ? '← → sail · Space cast' :
    line.state === 'out' ? (line.biter?.state === 'bite' ? '' : '↑ ↓ move the hook · Space reel in') : '';
  c.textAlign = 'center';
  if (hint) c.fillText(hint, W / 2, H - 20);
  c.textAlign = 'right'; c.fillText(`M sound ${sound.on ? 'on' : 'off'}`, W - 16, H - 20);
  // the "!" when a fish bites
  if (line.biter?.state === 'bite') {
    const p = toWorld({ x: -10, y: -100 }), sx = p.x - cam.x + W / 2, sy = p.y - cam.y + H * SURFACE;
    const pop = 1 + Math.sin(time * 20) * 0.08;
    c.save(); c.translate(sx, sy); c.scale(pop, pop);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 16, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ff4d6d'; c.font = `900 22px ${FONT}`; c.textAlign = 'center'; c.fillText('!', 0, 1);
    c.restore();
    c.fillStyle = '#fff'; c.font = `900 20px ${FONT}`; c.fillText('Space!', W / 2, H - 22);
  }
  if (toast) {
    c.globalAlpha = clamp(toast.t, 0, 1);
    c.font = `800 20px ${FONT}`; c.textAlign = 'center';
    const w = c.measureText(toast.text).width + 36, ty = 16 + rows * cell + 34 + 12; // just under the Fishdex
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.roundRect(W / 2 - w / 2, ty, w, 40, 20); c.fill();
    c.fillStyle = '#29425a'; c.fillText(toast.text, W / 2, ty + 21);
    c.globalAlpha = 1;
  }
}

function draw() {
  const dpr = window.devicePixelRatio || 1;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawSky();
  const L = cam.x - W / 2, R = cam.x + W / 2, T = cam.y - H * SURFACE, B = T + H;
  c.save();
  c.translate(W / 2 - cam.x, H * SURFACE - cam.y);
  drawWater(L, R, T, B);
  drawFloor(L, R, B);
  drawParticles(['bubble']);
  for (const v of visitors) if (v.kind === 'whale') drawVisitor(v); // behind everything else in the water
  const visible = fishes.filter(f => f.x > L - 250 && f.x < R + 250 && f.y > T - 250 && f.y < B + 250);
  for (const f of visible) if (f.state !== 'air') drawFishBody(f);
  for (const v of visitors) if (v.kind === 'dolphin' && !v.air) drawVisitor(v);
  // The deep gets darker
  const dark = c.createLinearGradient(0, 0, 0, 2100);
  dark.addColorStop(0, 'rgba(6,20,50,0)'); dark.addColorStop(0.15, 'rgba(6,20,50,.3)');
  dark.addColorStop(0.5, 'rgba(6,20,50,.7)'); dark.addColorStop(1, 'rgba(4,10,30,.9)');
  c.fillStyle = dark; c.fillRect(L, Math.max(0, T), W, B - Math.max(0, T));
  drawGlows(L, R, T, B);
  const tip = tipLocal(rodBend());
  drawLine(tip);
  // shimmer along the surface
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2;
  c.beginPath(); for (let x = L; x <= R + 16; x += 16) c.lineTo(x, wave(x)); c.stroke();
  drawBoat(tip);
  for (const f of visible) if (f.state === 'air') drawFishBody(f);
  for (const v of visitors) if (v.kind === 'dolphin' && v.air) drawVisitor(v);
  if (line.show) { // the catch, held up for a moment
    const f = line.show.f, up = Math.min(1, (1.8 - line.show.t) * 4);
    const p = toWorld({ x: 16, y: -92 - f.s * 0.3 - up * 10 });
    c.save(); c.translate(p.x, p.y); c.scale(boat.dir, 1);
    f.sp.draw(c, f.s, Math.sin(time * 18) * f.s * 0.1, f); c.restore();
  }
  drawParticles(['drop', 'ripple', 'spark']);
  c.restore();
  drawRain();
  drawHUD();
}

// --- Setup ---------------------------------------------------------------------

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
}
window.addEventListener('resize', resize);
resize();

window.addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === ' ' || k.startsWith('Arrow')) e.preventDefault();
  if (k === ' ' && !e.repeat) action();
  if (k === 'm' && !e.repeat) sound.toggle();
  keys.add(k);
});
window.addEventListener('keyup', (e) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
window.addEventListener('blur', () => keys.clear());
canvas.addEventListener('pointerdown', action);

cam.x = clamp(boat.x + W * 0.12, W / 2, WORLD - W / 2);
for (let i = 0; i < 40; i++) spawnFish(cam.x + rand(-W, W));

let last = performance.now();
function frame(now) {
  // The first frame's timestamp can be earlier than `last`; a negative step would push the rain below zero
  update(clamp((now - last) / 1000, 0, 0.05));
  last = now;
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
