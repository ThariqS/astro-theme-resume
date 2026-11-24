// moon-pour — composed after the gouache "cracked moon" image (lab/ledges/v2/cracked-moon.png), without the figure.
// Evening over a calm sea. An enormous moon hangs low on the right, cracked across like an egg, and gold pours
// from the crack in a wide slow waterfall into the sea. The light spreads over the water in long wavy streaks.
// A stone pier on arches runs in from the left and ends, empty, facing it. Chalk cliffs on the left, puffy clouds.
import { diorama } from '../lib/runtime.js';
import { TAU, clamp, smoothstep, fract, fbm, noise2, lerp } from '../lib/util.js';
import { createPix, C, R, mixc } from '../lib/pix.js';

const W = 480, H = 270, S = 4, T = 20, FPS = 30;
const P = createPix({ W, H, S, canvas: document.getElementById('out'),
  grade: { from: [55.7, 22.3, -1.2, 3.5, -3.9, 15.4, 14.0], to: [61.9, 15.8, -1.9, 6.8, 9.3, 18.2, 18.3], kL: 0.9, kC: 0.5, kW: 0.6,
    sel: [[278, 40, -36, 0.75, 6], [172, 40, -60, 1.0, 12], [98, 18, -16, 1.0, -4]] }, grain: 0.1, glow: [0.8, 0.55] });
const { put, dith, thr, buf, gl } = P;

// ---------------------------------------------------------------- colour (evening blue, cream, gold)
const SKY = R(['#1f3155', '#23375c', '#283d63', '#2d446b', '#334b72', '#3a5379', '#425b80', '#4a6487', '#536d8d', '#5d7692', '#688097', '#748a9c', '#8094a1']);
const CLOUD = R(['#3f5570', '#4d627a', '#5c6f84', '#6c7c8e', '#7e8b98', '#919aa3', '#a5aaae', '#b8bab8', '#cac9c1', '#dad7cc', '#e7e3d6', '#f1ede1']);
const MOON = R(['#6f767a', '#838985', '#979b94', '#abada3', '#bebfb2', '#cfcfc0', '#dedccd', '#eae7d8', '#f3f0e2', '#faf8ee']);
const GOLD = R(['#8a4a24', '#a85e2b', '#c47634', '#d98f40', '#e8a74f', '#f2bd62', '#f8d17e', '#fbe2a6']);
const SEA = R(['#102a43', '#14304a', '#183651', '#1d3d59', '#224460', '#284b67', '#2f536e', '#365b75', '#3f647b', '#486c81', '#527587', '#5e7f8d', '#6b8993']);
const FOAM = R(['#5d7e8d', '#7593a0', '#90a9b2', '#acc0c4']);
const HAZE = R(['#4f6a84', '#5a7389', '#667d8f', '#728795']);
const GREEN = R(['#24403f', '#2c4a47', '#355450', '#3f5f58', '#4a6a61', '#56766a', '#628173']);
const CHALK = R(['#6f7d7c', '#848f8b', '#99a39b', '#aeb5ab', '#c2c7bb', '#d5d7ca', '#e3e3d6']);
const STONE = R(['#3e3633', '#4f4440', '#61534c', '#736358', '#867465', '#998573', '#ac9682', '#bea791', '#cdb7a0', '#dac6b0', '#e6d4bf']);
const STONE_W = R(['#9b7f62', '#b08f6c', '#c39f78']);       // the warm, gold-lit stones toward the end

// ---------------------------------------------------------------- layout (reference 3:2 mapped to 16:9: x' = x*405/1536 + 37.5)
const HZ = 171;
const MX = 297, MY = 64, MR = 99;
const hsh = (n) => { const s = Math.sin(n * 91.3458 + 17.17) * 47453.5453; return s - Math.floor(s); };
const mod = (a, n) => ((a % n) + n) % n;
// the crack: a jagged line rising left to right across the lower right of the moon
const CRACK = [[226, 116], [236, 108], [244, 110], [252, 100], [262, 98], [271, 91], [284, 92], [296, 86], [308, 88], [318, 79], [330, 77], [342, 66], [352, 63], [362, 50], [372, 46], [384, 32], [394, 26]];
function crackY(x) {
  for (let i = 0; i < CRACK.length - 1; i++) {
    const [ax, ay] = CRACK[i], [bx, by] = CRACK[i + 1];
    if (x >= ax && x <= bx) return lerp(ay, by, (x - ax) / (bx - ax));
  }
  return x < CRACK[0][0] ? CRACK[0][1] : CRACK[CRACK.length - 1][1];
}
const FALL0 = 258, FALL1 = 334;                               // the stretch of crack the waterfall pours from
const crackW = (x) => 3 + 5 * Math.exp(-(((x - 300) / 50) ** 2)) + 1.2 * Math.sin(x * 0.9) * Math.sin(x * 0.31);

// ---------------------------------------------------------------- static: sky, clouds, moon, cliffs
const base = new Uint32Array(W * H), baseGlow = new Uint8Array(W * H);
for (let y = 0; y < HZ; y++) for (let x = 0; x < W; x++) {
  const g = Math.pow(y / HZ, 1.2) * 11 + Math.exp(-(((x - 300) / 140) ** 2) - (((y - HZ) / 40) ** 2)) * 1.5;
  base[y * W + x] = dith(x, y, g + (fbm(x * 0.02, y * 0.04, 3) - 0.5) * 0.8, SKY);
}
// clouds: flat-bottomed puffs, cream tops, blue-grey undersides (gouache)
const CLOUDS = [
  { cx: 120, cy: 46, puffs: [[-110, 6, 34, 22], [-70, -6, 40, 30], [-20, -16, 34, 30], [20, -2, 36, 24], [60, 8, 30, 16], [0, 10, 70, 12], [96, 12, 46, 6]], ph: 0.1 },
  { cx: 110, cy: 106, puffs: [[-74, 2, 30, 14], [-36, -6, 30, 18], [4, -2, 26, 14], [40, 4, 40, 9], [-10, 6, 70, 7]], ph: 0.4 },
  { cx: 430, cy: 82, puffs: [[-44, 6, 34, 10], [-8, -6, 26, 16], [24, -14, 22, 18], [52, -4, 28, 16], [10, 8, 60, 8]], ph: 0.7 },
  { cx: 428, cy: 142, puffs: [[-30, 0, 30, 5], [6, -2, 24, 6], [36, 1, 22, 4]], ph: 0.2 },
];
for (const cl of CLOUDS) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [ox, oy, rx, ry] of cl.puffs) { x0 = Math.min(x0, ox - rx); x1 = Math.max(x1, ox + rx); y0 = Math.min(y0, oy - ry); y1 = Math.max(y1, oy + ry); }
  cl.box = [Math.floor(x0), Math.ceil(x1), Math.floor(y0), Math.ceil(y1)];
  const w = cl.box[1] - cl.box[0] + 1, h = cl.box[3] - cl.box[2] + 1;
  cl.w = w; cl.h = h; cl.e = new Float32Array(w * h); cl.v = new Float32Array(w * h);
  const bottom = Math.max(...cl.puffs.map(([, oy, , ry]) => oy + ry * 0.35));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const X = x + cl.box[0], Y = y + cl.box[2];
    if (Y > bottom) continue;                                                   // flat bottoms
    let e = 0, ny = 0;
    for (const [ox, oy, rx, ry] of cl.puffs) { const d = 1 - Math.hypot((X - ox) / rx, (Y - oy) / ry); if (d > e) { e = d; ny = (Y - oy) / ry; } }
    cl.e[y * w + x] = e;
    cl.v[y * w + x] = 2 + (1 - ny) * 3.6 + (1 - (Y - cl.box[2]) / h) * 3 + (fbm(X * 0.1 + cl.cx, Y * 0.1, 2) - 0.5) * 1.6;
  }
}
// the moon
for (let y = 0; y < HZ; y++) for (let x = 0; x < W; x++) {
  const rx = x + 0.5 - MX, ry = y + 0.5 - MY, dm = Math.hypot(rx, ry);
  if (dm > MR) continue;
  const i = y * W + x;
  const limb = Math.pow(dm / MR, 3);
  const maria = fbm(rx * 0.028 + 5, ry * 0.028 + 2, 5), speck = fbm(rx * 0.16, ry * 0.16, 2);
  let v = 8 - limb * 2.6 - smoothstep(0.44, 0.62, maria) * 3.2 + (speck - 0.5) * 1.4;
  // craters: dark floors, rims lit from upper left
  for (let k = 0; k < 26; k++) {
    const cx = (hsh(k * 3.1) - 0.5) * 160, cy = (hsh(k * 5.7) - 0.5) * 160, cr = 2 + hsh(k * 7.3) * 7;
    const d = Math.hypot(rx - cx, ry - cy) / cr;
    if (d < 1) v -= 1.4 * (1 - d * 0.4);
    else if (d < 1.3) v += (rx - cx) + (ry - cy) < 0 ? 0.9 : -0.7;
  }
  let c = dith(x, y, v, MOON);
  const cyk = crackY(x), w = crackW(x), dy = y - cyk;
  if (dy > -1 && dy < w) {                                                       // inside the crack: its glowing inner wall
    const f = dy / w;
    c = dith(x, y, 2.6 + f * 4.4, GOLD); baseGlow[i] = 1;
    if (dy < 0.5) c = MOON[9];                                                   // the lit lip of the upper shell
  } else if (dy >= w && dy < w + 1.4) c = dith(x, y, 3, MOON);                   // shadowed lower lip
  else if (dy > 0 && dy < w + 9) c = mixc(c, GOLD[5], 0.45 * (1 - (dy - w) / 9)); // gold seeping onto the lower shell
  if (dm > MR - 1.2) c = mixc(c, SKY[8], 0.4);
  base[i] = c;
}
// cliffs: a far hazy range, then green slopes with chalk faces dropping to the water
const ridge = (x, a, b, h, seed) => {
  let v = 0; for (let k = 1; k <= 4; k++) v += Math.sin(x * 0.02 * k + hsh(seed + k) * 6) / k;
  return h * smoothstep(a, a + 30, x) * (1 - smoothstep(b - 40, b, x)) * (0.7 + 0.3 * v);
};
for (let x = 0; x < W; x++) {
  const far = Math.max(ridge(x, -40, 230, 30, 1), ridge(x, 330, 520, 14, 4));
  for (let y = Math.round(HZ - far); y < HZ; y++) base[y * W + x] = dith(x, y, 1.6 + (HZ - y) / far * 1.4, HAZE);
}
const peakL = (x) => x < 0 ? 0 : 52 * Math.exp(-(((x - 86) / 42) ** 2)) + 30 * Math.exp(-(((x - 30) / 34) ** 2)) + 18 * smoothstep(150, 70, x) * smoothstep(0, 30, x) + (noise2(x * 0.12, 7) - 0.5) * 4;
const peakR = (x) => x < 380 ? 0 : 20 * Math.exp(-(((x - 446) / 34) ** 2)) + 12 * smoothstep(380, 420, x) + (noise2(x * 0.15, 9) - 0.5) * 3;
const faceH = (x) => 10 + 9 * noise2(x * 0.045, 2) + 6 * Math.exp(-(((x - 96) / 30) ** 2));
for (let x = 0; x < W; x++) {
  const h = Math.max(x < 190 ? peakL(x) * smoothstep(190, 150, x) : 0, peakR(x));
  if (h < 1) continue;
  const fh = Math.min(h * 0.75, faceH(x) * (x > 380 ? 0.7 : 1));
  const slope = (Math.max(x < 190 ? peakL(x + 1) * smoothstep(190, 150, x + 1) : 0, peakR(x + 1)) - h);
  for (let y = Math.round(HZ - h); y < HZ; y++) {
    const up = HZ - y, i = y * W + x;
    if (up < fh) {
      // chalk face: brighter where it turns toward the light, a few dark vertical fissures, darker at the waterline
      let v = 3.4 + clamp(-slope, -1.5, 1.5) * 0.9 + (fbm(x * 0.4, y * 0.05, 2) - 0.5) * 2 - (up < 2 ? 1.6 : 0) + (up > fh - 2 ? 0.8 : 0);
      if (hsh(Math.floor(x / 2) * 3.7) > 0.86 && up < fh - 1) v -= 1.4;
      base[i] = dith(x, y, v, CHALK);
    } else {
      const fromTop = y - (HZ - h);
      base[i] = dith(x, y, 2 + fromTop * 0.05 + clamp(-slope, -1, 1) * 0.8 + (fbm(x * 0.12, y * 0.12, 3) - 0.5) * 2.2, GREEN);
    }
  }
}

// ---------------------------------------------------------------- static: the pier (deck slabs, arched front face, end face)
// back edge of the deck, front edge, and the waterline under the front face, as functions of x (end at x = PX1)
const PX1 = 202;
const backY = (x) => lerp(224, 202, x / PX1), frontY = (x) => lerp(278, 211, Math.pow(x / PX1, 0.85)), waterL = (x) => lerp(340, 231, Math.pow(x / PX1, 0.8));
const pier = new Uint32Array(W * H), pierM = new Uint8Array(W * H), archM = new Uint8Array(W * H);
// arches are spaced evenly along the pier in depth, so they shrink toward the end
const ARCH = [];
for (let k = 0; k < 7; k++) { const u = 0.36 + k * 0.105; ARCH.push(PX1 * Math.pow(u, 1.25)); }
for (let x = 0; x <= PX1 + 1; x++) {
  const yb = backY(x), yf = frontY(x), yw = waterL(x);
  for (let y = Math.ceil(yb); y < H; y++) {
    const i = y * W + x;
    if (y <= yf) {
      // deck: irregular slabs in perspective
      const u = (y - yb) / Math.max(1, yf - yb), along = x / PX1;
      // two rows of big flagstones, narrower toward the back; a dark lip where the deck meets the face
      const ur = Math.pow(u, 0.8) * 2, row = Math.floor(ur);
      const cu = (along * 6.5 + row * 0.5 + hsh(row) * 0.4) * (1 + along * 0.5), col = Math.floor(cu);
      const joint = fract(ur) < 0.08 || fract(cu) < 0.035 * (1 + u);
      let v = 7.6 + (hsh(row * 17 + col * 3.3) - 0.5) * 2 + along * 1.6 - u * 0.4 + (fbm(x * 0.15, y * 0.25, 2) - 0.5) * 1.4;
      if (joint) v -= 2.2;
      if (yf - y < 1.2) v = 1.4;
      pier[i] = along > 0.72 && hsh(row * 5 + col) > 0.55 ? dith(x, y, v * 0.25, STONE_W) : dith(x, y, v, STONE);
      pierM[i] = 1;
    } else if (y <= yw) {
      // front face of blocks with arches
      const hgt = yw - yf, f = (y - yf) / hgt;
      let inArch = false;
      for (const ax of ARCH) {
        const s = Math.max(4, (ax / PX1) * 15 + 2), dx = (x - ax) / (s * 0.5);
        if (Math.abs(dx) < 1 && (f > 0.42 || Math.hypot(dx, (f - 0.42) / 0.3) < 1) && f > 0.12) inArch = true;
      }
      if (inArch) { archM[i] = 1; pierM[i] = 1; continue; }
      const blockRow = Math.floor(f * 4), joint = fract(f * 4) < 0.14 || fract(x / 7 + blockRow * 0.5) < 0.1;
      let v = 2.4 + (x / PX1) * 2 - f * 1.2 + (hsh(blockRow * 13 + Math.floor(x / 7)) - 0.5) * 1.6;
      if (joint) v -= 1.6;
      pier[i] = dith(x, y, v, STONE); pierM[i] = 1;
    }
  }
}
// the end face, lit by the gold
for (let y = Math.round(backY(PX1)); y <= Math.round(waterL(PX1)); y++) for (let x = PX1 + 1; x <= PX1 + 3; x++) {
  const i = y * W + x; pier[i] = dith(x, y, 7.5 - (y - backY(PX1)) * 0.12, STONE); pierM[i] = 1;
}

// ---------------------------------------------------------------- frame
function render(t) {
  buf.set(base); gl.set(baseGlow);

  // clouds, drifting a few pixels and back
  for (const cl of CLOUDS) {
    const ox = Math.round(cl.cx + cl.box[0] + 3 * Math.sin(TAU * (t / T + cl.ph))), oy = cl.cy + cl.box[2];
    for (let y = 0; y < cl.h; y++) for (let x = 0; x < cl.w; x++) {
      const e = cl.e[y * cl.w + x];
      if (e <= 0) continue;
      const X = ox + x, Y = oy + y;
      if (X < 0 || X >= W || Y < 0 || Y >= HZ) continue;
      if (e < 0.08 && e / 0.08 < thr(X, Y)) continue;
      const i = Y * W + X, inMoon = Math.hypot(X - MX, Y - MY) < MR;
      const c = dith(X, Y, cl.v[y * cl.w + x] + (e < 0.12 ? 0.8 : 0), CLOUD);
      buf[i] = inMoon ? mixc(buf[i], c, 0.75) : c; gl[i] = 0;
    }
  }

  // the waterfall: separate strands of gold pouring from the crack, spreading a little and thinning as they fall
  for (let sx = FALL0 - 12; sx <= FALL1 + 8; sx++) {
    const core = sx >= FALL0 && sx <= FALL1;
    const sh = hsh(Math.floor(sx / 2) * 1.37);
    if (core ? sh < 0.12 : sh < 0.72) continue;                                   // gaps between strands
    const top = core ? crackY(sx) + crackW(sx) - 1 : MY + Math.sqrt(Math.max(0, MR * MR - (sx - MX) ** 2)) - 3;
    const bright = core ? 0.6 + 0.4 * Math.sin(sx * 0.7 + sh * 6) : 0.2;
    for (let y = Math.ceil(top); y <= HZ; y++) {
      const fall = (y - top) / (HZ - top);
      const x = Math.round(sx + (sx - (FALL0 + FALL1) / 2) * fall * 0.12);         // spreads out toward the bottom
      const flow = 0.5 + 0.5 * Math.sin(TAU * ((y - top) / 10 - 10 * t / T) + sh * 9);
      if (!core && thr(x, y) > 0.55 - fall * 0.25) continue;
      if (core && flow < 0.18 && thr(x, y) > 0.7) continue;                         // the fall breathes; moon shows through
      const v = 2.2 + bright * 2.8 + flow * 1.6 - fall * 0.5;
      put(x, y, dith(x, y, v, GOLD), 1);
    }
  }

  // sea: calm swells in depth, light streaks, and the wide wavy gold path
  for (let y = HZ; y < H; y++) {
    const dz = y - HZ + 0.6, zw = 80 / dz, persp = 1 / (0.07 + dz * 0.04);
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (pierM[i] && !archM[i]) { buf[i] = pier[i]; gl[i] = 0; continue; }
      const xw = (x - 300) * zw / 80;
      const wave = Math.sin(zw * 4.6 + xw * 0.4 + TAU * 2 * t / T) * 0.5 + Math.sin(zw * 7.9 - xw * 0.7 - TAU * 3 * t / T) * 0.32 + (noise2(xw * 0.6, zw * 3.8) - 0.5) * 0.9;
      let v = 9.5 - Math.pow(dz / (H - HZ), 0.55) * 7.4 + wave * 1.2;
      if (archM[i]) v -= 4.5;                                                     // shade under the arches
      let c = dith(x, y, v, SEA), glow = 0;
      // light streaks: wavy horizontal dashes, longer up close
      const st = Math.sin(x * 0.18 * persp + Math.sin(dz * 0.9 + x * 0.05) * 2 + dz * 1.7 - TAU * 2 * t / T);
      if (st > 0.86 && wave > 0.1 && !archM[i]) c = FOAM[clamp(Math.round(1 + wave), 0, 3)];
      // the gold path, widening toward us
      const gc = 300 + (dz) * -0.25, hw = 14 + dz * 0.62, dg = Math.abs(x - gc) / hw;
      if (dg < 1 && !archM[i]) {
        const g = Math.sin(x * 0.42 * persp + Math.sin(dz * 0.6 + x * 0.04) * 2.6 + dz * 1.9 - TAU * 3 * t / T) + wave * 0.6;
        if (g > 0.25 + dg * 1.2) { c = dith(x, y, 2.4 + (1 - dg) * 4 - dz * 0.012, GOLD); glow = 1; }
      }
      buf[i] = c; gl[i] = glow;
    }
  }
  // the bright pool and mist where it lands
  for (let y = HZ - 3; y <= HZ + 4; y++) for (let x = FALL0 - 22; x <= FALL1 + 22; x++) {
    const e = 1 - Math.hypot((x - (FALL0 + FALL1) / 2) / ((FALL1 - FALL0) / 2 + 20), (y - HZ) / 3.4);
    if (e > 0 && e * 1.8 > thr(x, y)) put(x, y, dith(x, y, 3.6 + e * 3.6, GOLD), 1);
  }
  for (let i = 0; i < 70; i++) {
    const k = 1 + (i % 3), q = fract(hsh(i * 3.7) + k * t / T);
    const x0 = FALL0 + hsh(i * 1.9) * (FALL1 - FALL0), vx = (hsh(i * 1.1) - 0.5) * 30, up = 5 + hsh(i * 2.9) * 14;
    if (q < 0.95) put(x0 + vx * q, HZ - (up * q - up * q * q) * 2.4, GOLD[q < 0.45 ? 6 : 5], 1);
  }
  // the pier's reflection, broken by the swell
  for (let x = 0; x <= PX1 + 3; x++) {
    const yw = Math.round(waterL(Math.min(x, PX1)));
    for (let k = 1; k < 14; k++) {
      const y = yw + k, wob = Math.round(Math.sin(TAU * 2 * t / T + y * 0.8) * 1.3);
      const X = x + wob;
      if (y >= H || X < 0 || X >= W || pierM[y * W + X]) continue;
      if (thr(X, y) < 0.75 - k * 0.05) put(X, y, dith(X, y, 2.4 + (x / PX1) * 1.5, SEA));
    }
  }

  P.present(Math.floor(t * FPS));
}

diorama({ width: P.OW, height: P.OH, fps: FPS, duration: T, render });
