// dunes-to-stars — the last of the sun on the far horizon, a dune field seen from a rocky hillside. A long ridge
// of dunes climbs away to the right, and all along its crest the sand lifts off in fine glowing grains. They rise
// in slow curling streams, brighten and slow as they climb, and settle into the sky as its stars: the band of
// stars sweeping up to the right is fed by the dunes. Flat clouds catch the light on the left; wind ripples, low
// veils of blown sand; a granite boulder among poppies and grass in the foreground.
//
// Composition follows the reference painting (ledges/v4/dunes-to-stars.png), mapped into 480 x 270:
//   x = 37.5 + 0.2637 * xRef,  y = 0.2637 * yRef   (the 3:2 frame, widened a little at both sides).
//
// Loop: every grain has a periodic phase fract(seed + k t / T) with integer k; ground veils and hopping specks
// wrap by exact multiples of the frame width; twinkles and sway use integer cycles over T.
import { diorama } from '../lib/runtime.js';
import { TAU, clamp, lerp, smoothstep, fract, noise2, fbm, rng, hash2 } from '../lib/util.js';
import { createPix, R, mixc } from '../lib/pix.js';

const W = 480, H = 270, S = 4, T = 22, FPS = 30;
const P = createPix({ W, H, S, canvas: document.getElementById('out'),
  grade: { from: [50.2, 20.9, 10.4, 6.3, 7.4, 20.5, 23.2], to: [56.3, 13.7, 13.8, 11.0, 12.7, 22.5, 28.1], kL: 0.6, kC: 0.5, kW: 0.8,
    sel: [[290, 35, -14, 0.95, 6], [66, 28, -10, 1.05, -2]] }, grain: 0.08, glow: [0.8, 0.55] });
const { put, dith, thr, buf, gl } = P;
const rx = (x) => 37.5 + 0.2637 * x, ry = (y) => 0.2637 * y;   // reference painting -> pixels

// ---------------------------------------------------------------- colour
const SKY = R(['#151d3a', '#18213f', '#1c2645', '#202b4b', '#253051', '#2a3657', '#303c5d', '#374263', '#3f4868',
  '#494e6c', '#545470', '#605a72', '#6d6073', '#7b6673', '#8a6c72', '#9a7270', '#ab786c', '#bc7f67', '#cc8762',
  '#da905d', '#e69b5a', '#eea85c', '#f4b766', '#f8c674']);
const SKY_N = SKY.length - 1;
// sand, from slip-face rose up to sunlit apricot
const SAND = R(['#4f2f3e', '#5c3644', '#6a3d4a', '#78454f', '#874e53', '#965757', '#a3615a', '#af6b5d', '#ba7660',
  '#c48164', '#cc8c69', '#d4986f', '#dba476', '#e1b07e', '#e7bc88', '#ecc893', '#f1d3a0', '#f5ddae']);
const SN = SAND.length - 1;
const HILL = R(['#3e2a33', '#4b3139', '#58393e', '#664244', '#744b49', '#82554e', '#905f53', '#9d6a58', '#a9755e',
  '#b48164', '#be8c6b', '#c79873']);
const ROCK = R(['#2c2a33', '#38353e', '#45414a', '#524d55', '#605a61', '#6e676d', '#7d7579', '#8c8385', '#9b9191',
  '#aa9f9d', '#b8aca7', '#c5b9b1']);
const CLOUD = R(['#7d6878', '#927880', '#a88988', '#bb9a90', '#cdac99', '#dbbda4', '#e7cdb0', '#f0dcbe', '#f7e8cd']);
const CLOUDO = R(['#8e5f5e', '#a96c5c', '#c27c5c', '#d68e5e', '#e4a066', '#ecb274']);
const MTN = R(['#5f5878', '#6a617f', '#756986', '#81728c', '#8d7b91']);
const SUN = R(['#d85e2e', '#e66f34', '#f0823a', '#f69844', '#fbb052']);
const GOLD = R(['#b86f36', '#d48b42', '#eaa94f', '#f6c463', '#fddc86', '#fff0b8', '#fff9e4']);
const STAR = R(['#5a5a74', '#8a8183', '#bba88e', '#e2cb9c', '#f8e6b6', '#fff6dc', '#ffffff']);
const STARC = R(['#4f5878', '#7881a2', '#a6adc8', '#d2d6e8', '#eff1fa', '#ffffff']);
const GRASS = R(['#2e3524', '#3d462c', '#4f5934', '#636b3d', '#7b7f48', '#949354']);
const POPPY = R(['#8a3418', '#c0501e', '#e06a24', '#f3872c', '#fca63e']);
const VEIL = R(['#f8dcb6'])[0];
const HAZEC = R(['#6a7398'])[0];

// ---------------------------------------------------------------- helpers
const hsh = (n) => { const s = Math.sin(n * 91.3458 + 17.17) * 47453.5453; return s - Math.floor(s); };
const h21 = (x, y) => hash2(x * 1.37 + 0.21, y * 0.91 + 3.7);
const mod = (a, n) => ((a % n) + n) % n;
const fl = Math.floor;
function pnoise(x, y, per) {                          // value noise that wraps in x with an integer period
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const x0 = mod(xi, per), x1 = (x0 + 1) % per;
  return lerp(lerp(hash2(x0, yi), hash2(x1, yi), u), lerp(hash2(x0, yi + 1), hash2(x1, yi + 1), u), v);
}
function pwl(pts, x) {                                 // piecewise-linear through [[x, y], ...]
  if (x <= pts[0][0]) return pts[0][1];
  for (let k = 1; k < pts.length; k++) if (x <= pts[k][0]) { const [a, b] = [pts[k - 1], pts[k]]; return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0])); }
  return pts[pts.length - 1][1];
}

// ---------------------------------------------------------------- layout
const HZ = Math.round(ry(603));                        // horizon
const SUNX = rx(232), SUNY = ry(584), SUNR = 9;
function skyV(x, y) {
  const yy = clamp(y / HZ, 0, 1.1), dx = x - SUNX;
  const sd = Math.hypot(dx, (y - SUNY) * 1.6);
  return Math.pow(yy, 1.3) * 10.8
    + Math.exp(-((dx / 150) ** 2)) * Math.pow(yy, 4.2) * 10.5
    + Math.exp(-((dx / 420) ** 2)) * Math.pow(yy, 2.6) * 2.2
    + Math.exp(-sd / 22) * 2.4
    + (fbm(x * 0.012, y * 0.03, 3) - 0.5) * 0.9;
}
const hzc = new Uint32Array(W);
for (let x = 0; x < W; x++) hzc[x] = SKY[clamp(Math.round(skyV(x, HZ - 2)), 0, SKY_N)];
const sunWarm = (x) => Math.exp(-(((x - SUNX) / 230) ** 2));

// A dune seen side-on with the wind from the sun's side: a rounded windward back, a sharp brink, a straight slip
// face. The brink snakes down from the summit toward us; left of it is the sunlit face, right of it shadow.
function mkDune(o) {
  const d = Object.assign({ rim: 2.2, blend: 0, rough: 0.8, rip: 0, lv: 13, sv: 5, bottom: H - 1, bend: 0.8, snake: 1.5, haze: 0, layer: 5, seed: hsh(o.px * 1.7 + o.py) * 50 }, o);
  if (d.fh === undefined) d.fh = d.dl * 0.35 + 4;
  return d;
}
function prof(d, x) {
  if (d.top) return d.top(x);
  let y;
  if (d.pointed) {
    y = x < d.px ? d.py + d.dl * Math.pow((d.px - x) / d.wl, 1.35) : d.py + d.dr * Math.pow((x - d.px) / d.wr, 0.9);
  } else if (x < d.px) { const s = (d.px - x) / d.wl; y = d.py + d.dl * (s < 1 ? s * s * (1.6 - 0.6 * s) : 1 + (s - 1) * 1.4); }
  else { const s = (x - d.px) / d.wr; y = d.py + d.dr * (s < 1 ? s * (1.2 - 0.2 * s) : 1 + (s - 1) * 0.8); }
  return y + (noise2(x * 0.07, d.seed) - 0.5) * d.rough * smoothstep(2, 16, Math.abs(x - d.px));
}
function brink(d, y) {
  if (d.allShadow) return -1e9;
  if (d.allLit) return 1e9;
  const s = Math.max(0, y - d.py) / d.rdy;
  return d.px + d.rdx * Math.pow(s, d.bend) + Math.sin(s * 3.4 + d.seed) * d.snake * Math.min(1, s * 1.5);
}

// ---- the main ridge, climbing to the right (reference peaks at x 470, 651, 906, 1226, 1406). Each dune's slip
// face shows between its own brink and the windward slope of the next, nearer one. The summit (D5) sits behind D4.
const RIDGE = [
  mkDune({ px: rx(470), py: ry(578), wl: 22, dl: 5, wr: 12, dr: 7, rdx: 3, rdy: 9, lv: 12.6, haze: 0.3, bottom: 162, blend: 4 }),
  mkDune({ px: rx(651), py: ry(524), wl: 38, dl: 18, wr: 24, dr: 20, rdx: 8, rdy: 28, snake: 2, lv: 13, haze: 0.16, rip: 3, bottom: 172, blend: 6 }),
  mkDune({ px: rx(906), py: ry(472), wl: 48, dl: 25, wr: 34, dr: 28, rdx: 10, rdy: 38, snake: 2.5, lv: 13.6, haze: 0.08, rip: 3.5, bottom: 184, blend: 6 }),
  mkDune({ px: rx(1406), py: ry(355), wl: 40, dl: 18, wr: 90, dr: 18, allShadow: true, sv: 4.4, haze: 0.02, bottom: 190, key: 180 }),
  mkDune({ px: rx(1226), py: ry(395), wl: 58, dl: 44, wr: 28, dr: 24, rdx: 13, rdy: 52, snake: 3, lv: 14.2, haze: 0.04, rip: 4, bottom: 200, blend: 6 }),
];
const crestY = (x) => { let m = 1e9; for (const d of RIDGE) m = Math.min(m, prof(d, x)); return m; };

// ---- a nearer dune whose crescent slip face turns toward us, below the high crests (reference x 836..1536)
const N1 = mkDune({
  px: rx(1126), py: ry(490), layer: 6, allShadow: true, sv: 5.6, rough: 0, bottom: 214, key: 207,
  top: (x) => x >= rx(1126) ? ry(490) + (x - rx(1126)) * 0.1 - 5 * Math.sin(Math.PI * clamp((x - rx(1126)) / (W + 30 - rx(1126)))) + 1.8 * Math.sin((x - rx(1126)) * 0.05) + Math.sin(x * 0.13) * 0.5 : ry(490) + 66 * Math.pow((rx(1126) - x) / (rx(1126) - rx(836)), 1.45),
});
// ---- the broad lit slope below it, running down to the valley floor
const N2 = mkDune({
  px: rx(1100), py: ry(620), layer: 7, allLit: true, lv: 13.4, fh: 20, rip: 4.4, rough: 0, key: 230,
  blendL: [rx(1000), rx(800)], top: (x) => x >= rx(836) ? ry(740) - (x - rx(836)) * 0.236 + Math.sin(x * 0.05) * 1.2 : ry(740) + (rx(836) - x) * 0.8,
});
// ---- the hillside in the foreground, rising to the right toward the boulder
const HILLPTS = [[-10, 300], [rx(640), 276], [rx(760), 262], [rx(900), 248], [rx(1060), 232], [rx(1200), 214], [rx(1340), 198], [rx(1536), 184], [490, 174]];
const hillTop = (x) => pwl(HILLPTS, x) + (noise2(x * 0.08, 3) - 0.5) * 3;

// ---------------------------------------------------------------- static layers
const base = new Uint32Array(W * H), baseGl = new Uint8Array(W * H), depth = new Uint8Array(W * H);
const L_CLOUD = 1, L_MTN = 1, L_FAR = 2, L_NEAR = 4, L_RIDGE = 5, L_N1 = 6, L_N2 = 7, L_HILL = 8, L_ROCK = 9;

// sky
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const v = skyV(x, y);
  base[y * W + x] = dith(x, y, v + (h21(x, y) - 0.5) * 0.35, SKY);
  if (y > HZ - 16 && v > SKY_N - 1.4) baseGl[y * W + x] = 1;
}

// flat clouds on the sun's side: lobed tops, flat bases, cream where the light catches, orange low down
const CLOUDS = [
  [-30, 300, 232, 1.7], [170, 450, 296, 1.3], [-20, 220, 320, 1.0], [200, 380, 398, 1.4], [-40, 640, 438, 1.2],
  [630, 730, 398, 0.5], [-30, 430, 516, 0.9], [440, 565, 496, 0.6], [-40, 160, 556, 0.6], [660, 760, 486, 0.4],
];
for (const [a, b, base0, sz] of CLOUDS) {
  const x0 = rx(a), x1 = rx(b), yb = ry(base0), len = x1 - x0;
  const near = clamp((yb - 78) / 70);                                    // lower clouds glow orange
  const r = rng(Math.round(a * 7 + base0));
  const bumps = [];
  for (let x = x0 + 3; x < x1 - 3; x += 6 + r() * 11) {
    const u = (x - x0) / len, env = Math.pow(Math.sin(Math.PI * clamp(u)), 0.5);
    const w = 5 + r() * 9;
    bumps.push([x + r() * 3, (3 + r() * 7) * sz * env + 0.8, w]);
  }
  const top = new Float32Array(W).fill(1e9);
  for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(W - 1, Math.ceil(x1)); x++) {
    for (const [bx, bh, bw] of bumps) { const t = 1 - ((x - bx) / bw) ** 2; if (t > 0) top[x] = Math.min(top[x], yb - bh * Math.pow(t, 0.45)); }
    if (Math.min(x - x0, x1 - x) > 0) top[x] = Math.min(top[x], yb - 0.6);
  }
  for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(W - 1, Math.ceil(x1)); x++) {
    const tp = top[x];
    if (tp > yb - 0.5) continue;
    for (let y = Math.max(0, Math.floor(tp + 0.5)); y <= Math.round(yb); y++) {
      const i = y * W + x, k = (y - tp) / Math.max(1.5, yb - tp);        // 0 top .. 1 base
      // light from the low sun on the left: lobes facing left and up are brightest
      const lit = clamp(1 - k * 1.25) + (top[Math.max(0, x - 2)] > tp + 0.8 ? 0.3 : 0);
      let v = 2.6 + lit * 5.6 + (y - tp < 1 ? 0.8 : 0) + (fbm(x * 0.09, y * 0.25, 2) - 0.5) * 1.2 + (h21(x, y) - 0.5) * 0.5;
      if (y === Math.round(yb)) v -= 1;
      let c = dith(x, y, v, CLOUD);
      if (near > 0) c = mixc(c, dith(x, y, 0.8 + lit * 4.6 + (fbm(x * 0.09, y * 0.25, 2) - 0.5), CLOUDO), near * 0.9);
      base[i] = c; depth[i] = L_CLOUD;
    }
  }
}

// the sun, half set behind the far mountains
for (let y = Math.floor(SUNY - SUNR - 1); y <= Math.ceil(SUNY + SUNR); y++) for (let x = Math.floor(SUNX - SUNR - 1); x <= Math.ceil(SUNX + SUNR + 1); x++) {
  const dd = Math.hypot(x + 0.5 - SUNX, y + 0.5 - SUNY);
  if (dd > SUNR) continue;
  const i = y * W + x;
  base[i] = dith(x, y, 1.5 - (y - SUNY) / SUNR * 0.7 - (dd > SUNR - 1 ? 0.6 : 0) + (dd < SUNR * 0.45 ? 0.5 : 0), SUN); baseGl[i] = dd > SUNR - 1.2 ? 1 : 0;
}
// far mountains: two low, hazy blue-violet ranges, with the sun resting in the dip between them
{
  const pk = (x, c, w, h) => h * Math.exp(-(((x - c) / w) ** 2));
  const ranges = [
    { h: (x) => pk(x, rx(150), 30, 5) + pk(x, rx(470), 26, 4.5) + pk(x, rx(640), 30, 3) + pk(x, rx(-80), 24, 4) + 1.2 + (fbm(x * 0.08, 7, 3) - 0.5) * 2.6, v: 3.0, hz: 0.42 },
    { h: (x) => pk(x, rx(70), 20, 7.5) + pk(x, rx(12), 16, 4) + pk(x, rx(335), 16, 4.5) + pk(x, rx(400), 22, 3.2) + 0.6 + (fbm(x * 0.11, 3, 3) - 0.5) * 2.2, v: 2.0, hz: 0.24 },
  ];
  for (const rg of ranges) for (let x = 0; x < W; x++) {
    const top = HZ - Math.max(0.5, rg.h(x));
    for (let y = Math.ceil(top); y <= HZ + 1; y++) {
      const i = y * W + x, k = y - top;
      const c = dith(x, y, rg.v - k * 0.25 + (k < 1 ? 0.9 : 0) + (fbm(x * 0.12, y * 0.3, 2) - 0.5) * 1.2, MTN);
      base[i] = mixc(c, hzc[x], rg.hz + 0.25 * clamp(k / 7)); baseGl[i] = 0; depth[i] = L_MTN;
    }
  }
}

// draw one dune into the base layer
function plainV(x, y) {
  return 12.4 + sunWarm(x) * 1.0 + (fbm(x * 0.014, y * 0.05, 3) - 0.5) * 2.4
    - smoothstep(0.5, 0.78, fbm(x * 0.008 + 4, y * 0.04, 3)) * 3.2 + smoothstep(0.55, 0.8, fbm(x * 0.012 + 9, y * 0.05, 2)) * 1.2 - smoothstep(215, 270, y) * 1.3;
}
const plainHaze = (y) => 0.72 * Math.pow(clamp(1 - (y - HZ) / 42), 1.5);
function drawDune(d) {
  const x0 = Math.max(0, Math.floor(d.top ? 0 : d.px - d.wl * 4)), x1 = Math.min(W - 1, Math.ceil(d.top ? W : d.px + d.wr * 4));
  const warm = sunWarm(d.px);
  const rw = (x, y, top) => (y - top) / (d.rip * 1.25) + noise2(x * 0.035 + d.seed, y * 0.06) * 1.9 + Math.sin(x * 0.05 + y * 0.02 + d.seed) * 0.5 + (x - d.px) * 0.02;
  for (let x = x0; x <= x1; x++) {
    const top = prof(d, x), topL = prof(d, x - 1);
    if (top >= d.bottom) continue;
    for (let y = Math.max(0, Math.ceil(top)); y <= d.bottom; y++) {
      const i = y * W + x, below = y - top, xr = brink(d, y);
      let v;
      if (x < xr) {
        // sunlit windward face: a band of light along the crest, settling to apricot below
        v = d.lv + warm * 1.2 - 4.6 * (1 - Math.exp(-below / d.fh)) + 1.3 * Math.exp(-(xr - x) / 4);
        v += below < 1 ? d.rim : below < 2 ? d.rim * 0.36 : 0;
        v += (fbm(x * 0.022 + d.seed, y * 0.04, 3) - 0.5) * 2.6 + (h21(x, y) - 0.5) * 1.0;
        if (d.rip > 0) {
          const amp = smoothstep(0.45, 0.7, noise2(x * 0.03 + d.seed * 3, y * 0.05)) * smoothstep(3, 8, below) * smoothstep(2, 6, xr - x);
          if (amp > 0.5) {
            const r0 = fl(rw(x, y, top));
            if (r0 !== fl(rw(x, y - 1, top)) || r0 !== fl(rw(x - 1, y, topL))) v = fl(v) - 1.3;
            else if (r0 !== fl(rw(x, y + 1, top))) v += 0.7;
          }
        }
        if (h21(y + 7, x) > 0.992) v += 2.5;                                  // single grains catching the light
      } else {
        // slip face in shadow: rose, deepest just under the brink, warming with bounce light lower down
        v = d.sv + clamp((x - xr) / 40) * 1.2 + clamp(below / 36) * 2.2 - Math.exp(-Math.min(x - xr, below) / 3) * 1.2;
        v += Math.max(0, Math.sin((x - xr) * 0.09 + below * 0.05 + d.seed) - 0.6) * 2.2 * smoothstep(4, 14, x - xr);   // soft secondary ridges
        if (below < 1 && y > 0 && depth[i - W] <= L_CLOUD) v += 2.4;
        v += (fbm(x * 0.025 + d.seed, y * 0.04, 2) - 0.5) * 1.6 + (fbm(x * 0.06 + d.seed, y * 0.015, 2) - 0.5) * 1.2 + (h21(x, y) - 0.5) * 0.7;
      }
      let hz = d.haze;
      if (d.blendL) {                                                        // dissolve into the plain sideways
        const b = smoothstep(d.blendL[0], d.blendL[1], x);
        if (b > 0) { v = lerp(v, plainV(x, y) + (below < 1 ? 1.5 * (1 - b) : 0), b); hz = lerp(hz, plainHaze(y), b); }
      }
      if (d.blend) {                                                         // settle into the ground at the base
        const b = smoothstep(d.bottom - d.blend, d.bottom + 0.5, y);
        if (b > 0) { v = lerp(v, d.blendTo ? d.blendTo(x, y) : plainV(x, y), b); hz = lerp(hz, d.blendTo ? 0 : plainHaze(y), b); }
      }
      let c = dith(x, y, v, SAND);
      if (hz > 0) c = mixc(c, hzc[x], hz);
      base[i] = c; baseGl[i] = 0; depth[i] = d.layer;
    }
  }
}

// the plain beneath everything: hazy at the horizon, soft swales and ripples nearer
{
  const fr = (x, y) => (1100 + (x - 240) * 1.6) / (y - HZ + 3) + Math.sin(x * 0.045 + y * 0.11) * 0.35 + (noise2(x * 0.03, y * 0.08) - 0.5) * 1.4;
  for (let y = HZ; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    let v = plainV(x, y) + (h21(x, y) - 0.5) * 1.0;
    if (y > 196 && noise2(x * 0.035 + 7, y * 0.08) > 0.5) {
      const r0 = fl(fr(x, y));
      if (r0 !== fl(fr(x, y - 1)) || r0 !== fl(fr(x - 1, y))) v = fl(v) - 1.5;
      else if (r0 !== fl(fr(x, y + 1))) v += 0.8;
    }
    if (h21(y + 3, x) > 0.992) v += 2.4;
    base[i] = mixc(dith(x, y, v, SAND), hzc[x], plainHaze(y)); baseGl[i] = 0; depth[i] = L_FAR;
  }
}

// every dune, far to near: the scattered field, the ridge, the crescent, the lit slope and its small dunes
const DUNES = [...RIDGE, N1, N2];
{
  const r = rng(11);
  // overlapping rows, so each row's silhouette rolls continuously; rows thin and haze toward the horizon
  const NR = 10;
  for (let row = 0; row < NR; row++) {
    const f = row / (NR - 1), ybRow = HZ + 2 + Math.pow(f, 1.6) * 46, sc = ybRow - HZ + 4;
    const xMax = f > 0.45 ? rx(860) + (1 - f) * 60 : W + 30;
    for (let x = -50 + r() * 30; x < xMax;) {
      const wid = Math.min(120, sc * (1.5 + r() * 1.5)), dl = Math.min(12, Math.max(1.2, wid * (0.1 + r() * 0.08)));
      const yb = ybRow + (r() - 0.5) * sc * 0.18;
      if (r() > 0.1) {
        DUNES.push(mkDune({ px: x + wid * 0.55, py: yb - dl, wl: wid * (0.5 + r() * 0.25), dl, wr: wid * (0.24 + r() * 0.14), dr: dl * 1.08 + 0.4, rdx: wid * 0.12, rdy: dl + 2,
          pointed: true, bottom: Math.round(yb), key: yb, blend: Math.min(5, dl * 0.7 + 1), layer: yb < HZ + 8 ? L_FAR : L_NEAR, haze: plainHaze(yb) * 0.9,
          lv: 13.2, sv: 6.6 + (1 - f) * 0.8, fh: dl * 0.7 + 2, rim: 0.6 + f * 0.8, rip: sc > 28 ? 3 : 0, rough: 0.25, snake: Math.min(1.8, dl * 0.2) }));
      }
      x += wid * (0.5 + r() * 0.35);
    }
  }
  for (const o of [
    { px: rx(150), py: ry(800), wl: 120, dl: 9, wr: 70, dr: 11, rdx: 22, rdy: 16, snake: 3 },
    { px: rx(560), py: ry(868), wl: 130, dl: 8, wr: 80, dr: 10, rdx: 26, rdy: 15, snake: 3 },
    { px: rx(-60), py: ry(930), wl: 90, dl: 7, wr: 90, dr: 9, rdx: 30, rdy: 14, snake: 2 },
  ]) DUNES.push(mkDune(Object.assign({ layer: L_N2, lv: 13.2, sv: 8.4, rip: 4.5, fh: 7, haze: 0, rim: 1.2, bottom: Math.round(o.py + o.dl), key: o.py + o.dl, blend: 6, rough: 0.4 }, o)));
  for (const o of [
    { px: rx(1430), py: ry(600), wl: 44, dl: 9, wr: 22, dr: 11, rdx: 6, rdy: 14, key: 231 },
    { px: rx(1090), py: ry(690), wl: 52, dl: 8, wr: 26, dr: 10, rdx: 7, rdy: 13, key: 232 },
    { px: rx(780), py: ry(772), wl: 60, dl: 6, wr: 30, dr: 8, rdx: 8, rdy: 11, key: 233 },
  ]) DUNES.push(mkDune(Object.assign({ layer: L_N2, lv: 13.6, sv: 6.4, rip: 3.5, fh: 6, haze: 0, bottom: Math.round(o.py + o.dl), blend: 5,
    blendTo: (x, y) => N2.lv + sunWarm(N2.px) * 1.2 - 4.6 * (1 - Math.exp(-(y - prof(N2, x)) / N2.fh)) + (fbm(x * 0.022 + N2.seed, y * 0.04, 3) - 0.5) * 2.6 }, o)));
  for (const d of DUNES) if (d.key === undefined) d.key = d.bottom;
  DUNES.sort((a, b) => a.key - b.key);
}
for (const d of DUNES) drawDune(d);

// golden light along the high crests
for (let x = Math.floor(rx(440)); x < W; x++) {
  const y = Math.ceil(crestY(x));
  if (y < 0 || y >= H) continue;
  for (let k = 0; k < 3; k++) {
    const i = (y + k) * W + x;
    if (depth[i] !== L_RIDGE) continue;
    const a = (k === 0 ? 0.85 : k === 1 ? 0.45 : 0.2) * smoothstep(rx(440), rx(700), x);
    base[i] = mixc(base[i], GOLD[k === 0 ? 4 : 3], a); if (k === 0) baseGl[i] = 1;
  }
}
{
  const roots = [[rx(650), 26], [rx(870), 40], [rx(1090), 40], [rx(1310), 34], [rx(1560), 60]];
  for (let x = Math.floor(rx(520)); x < W; x++) {
    let k0 = 0.35 * smoothstep(rx(520), rx(760), x);
    for (const [c, w] of roots) k0 += 0.75 * Math.exp(-(((x - c) / w) ** 2));
    const yc = Math.ceil(crestY(x));
    for (let k = 1; k <= 9; k++) {
      const y = yc - k;
      if (y < 0) break;
      const i = y * W + x;
      if (depth[i] > L_CLOUD) continue;
      const a = clamp(k0 * Math.exp(-k / 2.6) * (0.75 + 0.5 * noise2(x * 0.15, k * 0.4)), 0, 0.9);
      const q = Math.floor(a * 4 + thr(x, y)) / 4;
      if (q > 0) { base[i] = mixc(base[i], GOLD[3], q * 0.42); if (q >= 0.75) baseGl[i] = 1; }
    }
  }
}
for (let x = Math.floor(rx(1240)); x < W; x++) {
  const y = Math.ceil(prof(N1, x)), i = y * W + x;
  if (depth[i] === L_N1) { base[i] = mixc(base[i], GOLD[3], 0.5 * smoothstep(rx(1240), rx(1400), x)); baseGl[i] = h21(x, 1) > 0.6 ? 1 : 0; }
}

// the hillside: coarse sand and gravel catching the last light along its brow, with a fringe of dry grass
{
  for (let x = 0; x < W; x++) {
    const top = hillTop(x);
    for (let y = Math.max(0, Math.ceil(top)); y < H; y++) {
      const i = y * W + x, below = y - top;
      let v = 9.8 - clamp(below / 34) * 3.6 + (fbm(x * 0.03, y * 0.06, 3) - 0.5) * 2.4 + (h21(x, y) - 0.5) * 1.6;
      v += below < 1 ? 1.8 : below < 2.5 ? 0.8 : 0;
      v -= smoothstep(0.55, 0.75, fbm(x * 0.05 + 9, y * 0.09, 2)) * 1.6;      // patches of darker grit
      if (h21(y + 11, x) > 0.955) v -= 2.4;                                   // gravel
      else if (h21(y + 17, x) > 0.965) v += 2.2;
      base[i] = dith(x, y, v, HILL); baseGl[i] = 0; depth[i] = L_HILL;
    }
  }
  // pebbles with a lit top-left
  const r = rng(616);
  for (let n = 0; n < 70; n++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * H), i = y * W + x;
    if (depth[i] !== L_HILL || y < hillTop(x) + 3) continue;
    const big = r() < 0.3;
    base[i] = HILL[big ? 2 : 3]; if (x + 1 < W && depth[i + 1] === L_HILL) base[i + 1] = HILL[big ? 1 : 2];
    if (y > 0 && depth[i - W] === L_HILL) base[i - W] = big ? ROCK[7] : HILL[9];
    if (big && x + 1 < W && y > 0 && depth[i - W + 1] === L_HILL) base[i - W + 1] = ROCK[5];
  }
  // a fringe of short dry grass along the brow
  for (let x = 0; x < W; x++) {
    const top = Math.ceil(hillTop(x));
    if (top >= H || h21(x, 77) > 0.15 + 0.75 * smoothstep(0.45, 0.7, noise2(x * 0.09, 5))) continue;
    const hgt = 1 + Math.floor(h21(x, 78) * 3), lean = h21(x, 79) > 0.5 ? 1 : 0;
    for (let k = 1; k <= hgt; k++) {
      const yy = top - k + 1, xx = x + (k === hgt ? lean : 0);
      if (yy < 0 || xx >= W) continue;
      base[yy * W + xx] = GRASS[k === hgt ? 3 : 2]; depth[yy * W + xx] = L_HILL;
    }
  }
}

// granite rocks: low-poly facets, lit from the low sun on the left
const LIGHT = (() => { const l = [-0.8, -0.38, 0.5], n = Math.hypot(...l); return l.map((v) => v / n); })();
function inPoly(px, py, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi + 1e-9) + xi)) c = !c;
  }
  return c;
}
function rockPoly(pts, seed, nf = 8) {
  const r = rng(seed);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + (y1 - y0) * 0.15, hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
  const seeds = [];
  for (let k = 0, tries = 0; k < nf && tries < 400; tries++) {
    const sx = x0 + r() * (x1 - x0), sy = y0 + r() * (y1 - y0);
    if (!inPoly(sx, sy, pts)) continue;
    const u = (sx - cx) / hw, w = (sy - cy) / hh;
    let n = [u * 0.85 + (r() - 0.5) * 0.5, w * 0.7 - 0.45 + (r() - 0.5) * 0.5, 0.75];
    const m = Math.hypot(...n); n = n.map((v) => v / m);
    seeds.push({ sx, sy, lam: n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2] });
    k++;
  }
  const inside = (x, y) => inPoly(x + 0.5, y + 0.5, pts);
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
    if (x < 0 || x >= W || y < 0 || y >= H || !inside(x, y)) continue;
    let d1 = 1e9, d2 = 1e9, a = null, b = null;
    for (const s of seeds) {
      const d = Math.hypot((x - s.sx) * 0.8, y - s.sy);
      if (d < d1) { d2 = d1; b = a; d1 = d; a = s; } else if (d < d2) { d2 = d; b = s; }
    }
    let v = 3.4 + a.lam * 6.6 + (h21(x, y) - 0.5) * 1.5 + (fbm(x * 0.2 + seed, y * 0.2, 2) - 0.5) * 1.2;
    if (b && d2 - d1 < 0.9) v += a.lam > b.lam ? 1.0 : -1.0;                // facet edges
    if (!inside(x - 1, y) || !inside(x, y - 1)) v += 1.0;                    // lit rim, top and left
    if (!inside(x + 1, y) || !inside(x, y + 1)) v -= 1.6;
    v -= smoothstep(y1 - 4, y1, y) * 2.2;                                    // ground contact
    if (h21(y + 5, x + seed) > 0.94) v += 1.6;                               // granite speckle
    else if (h21(y + 9, x + seed) > 0.95) v -= 1.4;
    if (Math.abs(noise2(x * 0.11 + seed * 2, y * 0.28) - 0.5) < 0.018 && y < y1 - 3) v -= 2.6;   // a crack
    base[y * W + x] = dith(x, y, v, ROCK); baseGl[y * W + x] = 0; depth[y * W + x] = L_ROCK;
  }
  // contact shadow on the hillside, to the right
  for (let y = Math.floor(y1 - hh * 0.4); y <= Math.ceil(y1 + 2); y++) for (let x = Math.floor(cx); x <= Math.ceil(x1 + hw * 0.4); x++) {
    if (x < 0 || x >= W || y < 0 || y >= H) continue;
    const i = y * W + x;
    if (depth[i] !== L_HILL) continue;
    const e = ((x - x1 + hw * 0.1) / (hw * 0.6)) ** 2 + ((y - y1) / 3) ** 2;
    if (e < 1) base[i] = mixc(base[i], HILL[0], 0.4 * (1 - e) + 0.1);
  }
}
function rockBlob(cx, cy, rX, rY, seed, nf) {
  const r = rng(seed * 31 + 1), pts = [], n = 9;
  for (let k = 0; k < n; k++) {
    const a = Math.PI + (k / (n - 1)) * Math.PI, rr = 0.8 + r() * 0.3;             // upper half, left to right
    pts.push([cx + Math.cos(a) * rX * rr, cy + Math.sin(a) * rY * rr * (k > 0 && k < n - 1 ? 1 : 0.4)]);
  }
  pts.push([cx + rX * 0.95, cy + rY * 0.5], [cx - rX * 0.95, cy + rY * 0.5]);
  rockPoly(pts, seed, nf || Math.max(4, Math.round(rX / 3)));
}
rockPoly([[1212, 882], [1216, 818], [1236, 780], [1282, 756], [1352, 740], [1424, 726], [1478, 731], [1502, 752], [1513, 800], [1509, 850], [1497, 884]].map(([x, y]) => [rx(x), ry(y)]), 7, 11);
rockBlob(rx(1156), ry(860), 12, 7, 3);
rockBlob(rx(815), ry(936), 12, 7, 5);
rockBlob(rx(1100), ry(990), 26, 14, 9);
rockBlob(rx(1405), ry(880), 7, 5, 11);
rockBlob(rx(625), ry(978), 7, 4, 13);
rockBlob(rx(1490), ry(995), 17, 11, 17);
rockBlob(rx(1612), ry(862), 10, 7, 19);
rockBlob(rx(965), ry(1025), 9, 5, 23);

// grass tufts and poppies, drawn each frame so they can nod
const TUFTS = [], POPPIES = [];
{
  const r = rng(99);
  for (const [cx, cy, n] of [[rx(1020), ry(872), 10], [rx(1505), ry(744), 9], [rx(1325), ry(928), 8], [rx(1238), ry(908), 6], [rx(760), ry(994), 7], [rx(1600), ry(806), 8], [rx(1440), ry(1012), 7], [rx(580), ry(1018), 5], [rx(1180), ry(800), 5], [rx(870), ry(948), 5], [rx(1660), ry(760), 6]]) {
    for (let k = 0; k < n; k++) {
      const bx = cx + (r() - 0.5) * 5, by = Math.round(cy + (r() - 0.5) * 2);
      TUFTS.push({ x: bx, y: by, h: 4 + r() * 6, lean: (k - n / 2) * 0.4 + (r() - 0.5) * 0.5, c: 1 + Math.floor(r() * 4), ph: r() });
    }
  }
  const spots = [[rx(1215), ry(856), 20, 18], [rx(1465), ry(805), 36, 34], [rx(935), ry(926), 26, 18], [rx(1380), ry(1008), 30, 24], [rx(1300), ry(888), 16, 12],
    [rx(1565), ry(764), 18, 14], [rx(1075), ry(872), 14, 9], [rx(1630), ry(912), 16, 14], [rx(850), ry(984), 14, 9], [rx(1180), ry(1040), 18, 12], [rx(1530), ry(880), 14, 10], [rx(700), ry(1010), 12, 6]];
  for (const [cx, cy, sx, n] of spots) {
    for (let k = 0, tries = 0; k < n && tries < 200; tries++) {
      const x = cx + (r() - 0.5) * sx, y = cy + (r() - 0.5) * sx * 0.35;
      const i = Math.round(y) * W + Math.round(x);
      if (y >= H - 1 || depth[i] !== L_HILL) continue;
      POPPIES.push({ x, y, stem: 1 + Math.floor(r() * 3), big: r() < 0.45, ph: r(), tone: r() });
      k++;
    }
  }
  POPPIES.sort((a, b) => a.y - b.y);
}

// ---------------------------------------------------------------- grains: dune sand that becomes stars
// Grains leave the crest in curling plumes (each grain follows its plume's S-curve with a little scatter), slow,
// and land on their own stars in the band sweeping up to the right. A star flares when its grain arrives, then
// cools to a resting glimmer until the next one feeds it.
const PLUMES = [
  { span: [600, 700], p1: [780, 400], p2: [740, 300], end: [940, 232], spread: 24, n: 70 },
  { span: [780, 960], p1: [1060, 350], p2: [985, 222], end: [1180, 140], spread: 30, n: 130 },
  { span: [1000, 1180], p1: [1210, 260], p2: [1135, 165], end: [1330, 92], spread: 30, n: 90 },
  { span: [1240, 1380], p1: [1470, 300], p2: [1425, 172], end: [1500, 52], spread: 24, n: 120 },
  { span: [1430, 1690], p1: [1650, 250], p2: [1600, 130], end: [1650, 40], spread: 18, n: 70 },
].map((p) => ({ span: p.span.map(rx), p1: [rx(p.p1[0]), ry(p.p1[1])], p2: [rx(p.p2[0]), ry(p.p2[1])], end: [rx(p.end[0]), ry(p.end[1])], spread: p.spread, n: p.n }));
for (const p of PLUMES) { p.span[1] = Math.min(p.span[1], W - 3); const m = (p.span[0] + p.span[1]) / 2; p.p0 = [m, Math.ceil(crestY(m)) - 1]; }
const GRAINS = [];
{
  const r = rng(2024);
  const g3 = () => (r() + r() + r() - 1.5) * 1.15;
  for (const pl of PLUMES) {
    const mid = (pl.span[0] + pl.span[1]) / 2;
    for (let n = 0; n < pl.n; n++) {
      const x0 = lerp(pl.span[0], pl.span[1], r()), y0 = Math.ceil(crestY(x0)) - 1, off = x0 - mid;
      let tx, ty, tries = 0;
      do {
        if (r() < 0.8) { tx = pl.end[0] + g3() * pl.spread; ty = pl.end[1] + g3() * pl.spread * 0.7; }
        else { tx = rx(500) + r() * (W - rx(500)); ty = 3 + r() * 84; }
        tries++;
      } while (tries < 50 && (tx < 1 || tx > W - 2 || ty < 1 || ty > y0 - 24 || depth[Math.round(ty) * W + Math.round(tx)] !== 0));
      GRAINS.push({
        x0, y0, x1: pl.p1[0] + off * 0.55 + g3() * 4, y1: pl.p1[1] + g3() * 4, x2: pl.p2[0] + off * 0.3 + g3() * 7, y2: pl.p2[1] + g3() * 6, x3: Math.round(tx), y3: Math.round(ty),
        ph: r(), k: r() < 0.5 ? 1 : 2, rise: 0.56 + (r() - 0.5) * 0.12,
        rest: 0.12 + r() * 0.36, big: r() < 0.07, cool: r() < 0.15,
        mf: 1 + Math.floor(r() * 3), mp: r(), ma: 0.4 + r() * 1.2, tk: 1 + Math.floor(r() * 4), tp: r(),
      });
    }
  }
}
// glitter riding each plume's lower half, so the ribbons read as dense near the crest and thin out above
const PDUST = [];
{
  const r = rng(4040);
  for (const pl of PLUMES) for (let n = 0; n < pl.n * 2; n++) {
    PDUST.push({ pl, k: 2 + Math.floor(r() * 3), ph: r(), umax: 0.2 + Math.pow(r(), 1.3) * 0.6, off: (r() + r() - 1) * 3.2, dy: (r() - 0.5) * 3 });
  }
}
// spindrift all along the crests: grains blown off the brink that hang a moment and fade
const DRIFT = [];
{
  const r = rng(808);
  for (let n = 0; n < 560; n++) {
    const x0 = rx(470) + Math.pow(r(), 0.8) * (W - rx(470));
    DRIFT.push({ x0, y0: Math.ceil(crestY(x0)) - 1, k: 3 + Math.floor(r() * 4), ph: r(), dx: 3 + r() * 18, up: 2 + r() * 12 * smoothstep(rx(440), rx(900), x0), layer: L_RIDGE });
  }
  for (let n = 0; n < 70; n++) {
    const x0 = rx(1270) + r() * (W - rx(1270));
    DRIFT.push({ x0, y0: Math.ceil(prof(N1, x0)) - 1, k: 3 + Math.floor(r() * 4), ph: r(), dx: 3 + r() * 10, up: 1 + r() * 5, layer: L_N1 });
  }
}
// background stars over the whole sky: varied in size, colour and twinkle
const BGSTARS = [];
{
  const r = rng(909);
  for (let n = 0; n < 440; n++) {
    const x = Math.floor(r() * W), y = Math.floor(Math.pow(r(), 1.15) * 132);
    if (depth[y * W + x] !== 0) continue;
    const b = r();
    BGSTARS.push({ x, y, b: 0.24 + Math.pow(b, 2.4) * 0.78 - y / 128 * 0.22, big: b > 0.955, cool: r() < 0.3, tk: 1 + Math.floor(r() * 5), tp: r() });
  }
}
// where the grains fan out: a faint haze and a dust of tiny stars, so the field reads as fed from below
{
  const dens = new Float32Array(W * H);
  const splat = (cx, cy, rad, a) => {
    const R2 = Math.ceil(rad * 2.5);
    for (let y = Math.max(0, Math.round(cy) - R2); y <= Math.min(H - 1, Math.round(cy) + R2); y++)
      for (let x = Math.max(0, Math.round(cx) - R2); x <= Math.min(W - 1, Math.round(cx) + R2); x++)
        dens[y * W + x] += a * Math.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (2 * rad * rad)));
  };
  for (const g of GRAINS) splat(g.x3, g.y3, 10, 0.045);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (depth[i] !== 0) continue;
    const a = clamp(dens[i] * 0.4 * (0.75 + (fbm(x * 0.05, y * 0.07, 3) - 0.5) * 1.1), 0, 0.8);
    const q = Math.floor(a * 5 + thr(x, y)) / 5;
    if (q > 0) base[i] = mixc(base[i], HAZEC, q * 0.4);
  }
  const r = rng(5);
  for (let n = 0; n < 2600; n++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * 140), i = y * W + x;
    if (depth[i] !== 0) continue;
    if (r() > 0.1 + clamp(dens[i] * 0.5, 0, 0.9)) continue;
    base[i] = mixc(base[i], STAR[Math.min(3, Math.floor(r() * r() * 3 + dens[i] * 0.4))], 0.45 + 0.35 * (1 - y / 140));
  }
}

// low veils of blown sand: a tile that wraps every W pixels
const VY0 = 168, VY1 = 250, VH = VY1 - VY0;
const VEIL1 = new Float32Array(W * VH), VEIL2 = new Float32Array(W * VH);
for (let y = 0; y < VH; y++) for (let x = 0; x < W; x++) {
  VEIL1[y * W + x] = pnoise(x / 30, y / 5, 16) * 0.65 + pnoise(x / 12, y / 2.4 + 9, 40) * 0.35;
  VEIL2[y * W + x] = pnoise(x / 20, y / 3.2 + 31, 24) * 0.6 + pnoise(x / 8, y / 1.7 + 5, 60) * 0.4;
}
const veilFall = new Float32Array(VH);
for (let y = 0; y < VH; y++) { const yy = y + VY0; veilFall[y] = smoothstep(VY0, VY0 + 22, yy) * (1 - smoothstep(236, 250, yy)); }

// hopping specks on the valley floor
const SPECKS = [];
{
  const r = rng(321);
  for (let n = 0; n < 50; n++) SPECKS.push({ x: r() * W, y: 205 + r() * 40, k: 1 + Math.floor(r() * 2), hop: 3 + Math.floor(r() * 4), amp: 1 + r() * 2.5, ph: r(), vis: 1 + Math.floor(r() * 3) });
}

// ---------------------------------------------------------------- frame
function drawStar(x, y, b, cool, big) {
  if (b < 0.16) return;
  const i = y * W + x;
  if (i < 0 || i >= W * H || depth[i] !== 0) return;
  const ramp = cool ? STARC : STAR, n = ramp.length - 1;
  const idx = clamp(Math.round(b * n), 0, n);
  buf[i] = ramp[idx]; gl[i] = b > 0.58 ? 1 : 0;
  if (big && b > 0.6) {
    const c1 = ramp[Math.max(0, idx - 2)];
    put(x - 1, y, c1); put(x + 1, y, c1); put(x, y - 1, c1); put(x, y + 1, c1);
    if (b > 0.85) { const c2 = ramp[Math.max(0, idx - 4)]; put(x - 2, y, c2); put(x + 2, y, c2); put(x, y - 2, c2); put(x, y + 2, c2); }
  }
}
let BX = 0, BY = 0;
function grainAt(g, p) {
  const e = 1 - Math.pow(1 - p, 2.0), u = 1 - e;
  const a = u * u * u, b = 3 * u * u * e, c = 3 * u * e * e, d = e * e * e;
  BX = a * g.x0 + b * g.x1 + c * g.x2 + d * g.x3 + Math.sin(TAU * (p * g.mf + g.mp)) * g.ma * 4 * e * (1 - e);
  BY = a * g.y0 + b * g.y1 + c * g.y2 + d * g.y3;
  return e;
}

function render(t) {
  buf.set(base); gl.set(baseGl);
  const tt = t / T;

  for (const s of BGSTARS) drawStar(s.x, s.y, s.b * (0.74 + 0.26 * Math.sin(TAU * (s.tk * tt + s.tp))), s.cool, s.big);

  // star slots and the grains that feed them
  for (const g of GRAINS) {
    const q = fract(g.ph + g.k * tt), tw = 0.84 + 0.16 * Math.sin(TAU * (g.tk * tt + g.tp));
    if (q >= g.rise) {
      const s = (q - g.rise) / (1 - g.rise);
      drawStar(g.x3, g.y3, (g.rest + (1 - g.rest) * Math.pow(1 - s, 2.4)) * tw, g.cool, g.big);
      continue;
    }
    drawStar(g.x3, g.y3, g.rest * tw, g.cool, false);
    const p = q / g.rise;
    if (p > 0.035) {                                                         // short dim trail
      const e2 = grainAt(g, p - 0.035);
      const xi = Math.round(BX), yi = Math.round(BY);
      if (xi >= 0 && xi < W && yi >= 0 && yi < H) {
        const i = yi * W + xi;
        if (depth[i] < L_RIDGE) buf[i] = mixc(buf[i], GOLD[clamp(Math.round(1 + e2 * 4), 0, 6)], 0.5);
      }
    }
    const e = grainAt(g, p);
    const xi = Math.round(BX), yi = Math.round(BY);
    if (xi < 0 || xi >= W || yi < 0 || yi >= H) continue;
    const i = yi * W + xi;
    if (depth[i] >= L_RIDGE) continue;
    const fade = smoothstep(0, 0.05, p);
    if (fade < 1 && thr(xi, yi) > fade) continue;
    buf[i] = GOLD[clamp(Math.round(2.6 + e * 4), 0, 6)]; gl[i] = 1;
    if (g.big && e > 0.7) { const c = GOLD[clamp(Math.round(1.6 + e * 4) - 1, 0, 6)]; put(xi + 1, yi, c); put(xi, yi - 1, c); }
  }
  // glitter along the plumes
  for (const s of PDUST) {
    const q = fract(s.ph + s.k * tt), u = q * s.umax, pl = s.pl, w = 1 - u;
    const a3 = w * w * w, b3 = 3 * w * w * u, c3 = 3 * w * u * u, d3 = u * u * u;
    const x = a3 * pl.p0[0] + b3 * pl.p1[0] + c3 * pl.p2[0] + d3 * pl.end[0] + s.off * (1 + u * 7);
    const y = a3 * pl.p0[1] + b3 * pl.p1[1] + c3 * pl.p2[1] + d3 * pl.end[1] + s.dy * u;
    const xi = Math.round(x), yi = Math.round(y);
    if (xi < 0 || xi >= W || yi < 0 || yi >= H) continue;
    const i = yi * W + xi;
    if (depth[i] >= L_RIDGE) continue;
    const al = smoothstep(0, 0.08, q) * (1 - smoothstep(0.5, 1, q));
    if (al < thr(xi, yi) * 0.95) continue;
    buf[i] = GOLD[al > 0.7 ? 5 : al > 0.4 ? 4 : 3]; gl[i] = 1;
  }

  // spindrift off the crests
  for (const s of DRIFT) {
    const q = fract(s.ph + s.k * tt);
    const x = s.x0 + s.dx * q, y = s.y0 - s.up * (1 - (1 - q) * (1 - q));
    const xi = Math.round(x), yi = Math.round(y);
    if (xi < 0 || xi >= W || yi < 0 || yi >= H) continue;
    const i = yi * W + xi;
    if (depth[i] >= s.layer) continue;
    const a = smoothstep(0, 0.08, q) * (1 - smoothstep(0.4, 1, q));
    if (a < thr(xi, yi) * 0.9) continue;
    buf[i] = GOLD[a > 0.65 ? 5 : a > 0.35 ? 4 : 3]; gl[i] = 1;
  }

  // veils of blown sand drifting low across the valley
  const o1 = Math.floor(W * tt), o2 = Math.floor(2 * W * tt);
  for (let y = 0; y < VH; y++) {
    const fall = veilFall[y];
    if (fall <= 0) continue;
    const yy = y + VY0, row = y * W;
    for (let x = 0; x < W; x++) {
      const i = yy * W + x;
      if (depth[i] >= L_HILL || depth[i] < L_FAR) continue;
      const n = VEIL1[row + mod(x - o1, W)] * 0.55 + VEIL2[row + mod(x - o2, W)] * 0.45;
      const a = smoothstep(0.5, 0.82, n) * fall;
      if (a <= 0.02) continue;
      const q = Math.floor(a * 4 + thr(x, yy)) / 4;
      if (q > 0) buf[i] = mixc(buf[i], VEIL, q * 0.34);
    }
  }

  // hopping specks
  for (const s of SPECKS) {
    if (fract(s.ph + s.vis * tt) > 0.45) continue;
    const x = mod(s.x + s.k * W * tt, W), hop = Math.abs(Math.sin(Math.PI * (s.hop * 2 * tt + s.ph)));
    const xi = Math.round(x), yi = Math.round(s.y - hop * s.amp);
    const dd = depth[yi * W + xi]; if (dd === L_FAR || dd === L_N2) put(xi, yi, SAND[16]);
  }

  // grass and poppies, nodding in the breeze
  const sw = Math.sin(TAU * 2 * tt);
  for (const g of TUFTS) {
    const bend = g.lean + (sw * 0.6 + Math.sin(TAU * (3 * tt + g.ph)) * 0.3) * 0.5;
    for (let k = 0; k < g.h; k++) {
      const f = k / g.h;
      put(g.x + bend * f * f * g.h * 0.5, g.y - k, GRASS[clamp(g.c + (f > 0.6 ? 1 : 0) - (k === 0 ? 1 : 0), 0, 5)]);
    }
  }
  for (const p of POPPIES) {
    const dx = Math.round((sw * 0.5 + Math.sin(TAU * (2 * tt + p.ph)) * 0.35) * 0.9 + 0.1);
    const x = Math.round(p.x), y = Math.round(p.y);
    for (let k = 0; k < p.stem; k++) put(x + (k === p.stem - 1 ? dx : 0), y - k, GRASS[k === 0 ? 1 : 2]);
    const hx = x + dx, hy = y - p.stem;
    const c = POPPY[p.tone > 0.5 ? 3 : 2], hi = POPPY[4], lo = POPPY[1];
    if (p.big) {
      // a cupped bloom, three wide: bright rim on the sun side, dark heart
      put(hx - 1, hy - 1, hi); put(hx + 1, hy - 1, c);
      put(hx - 1, hy, c); put(hx, hy, POPPY[0]); put(hx + 1, hy, lo);
      put(hx, hy + 1, lo);
    } else { put(hx, hy, c); put(hx + 1, hy, p.tone > 0.7 ? hi : lo); put(hx, hy - 1, hi); }
  }

  P.present(Math.floor(t * FPS));
}

diorama({ width: P.OW, height: P.OH, fps: FPS, duration: T, render });
