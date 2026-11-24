// ring-world — inside a hollow world. From a warm sandstone ledge we look down a long river valley, but the land
// does not stop at a horizon: it curves up on every side and closes overhead, so forests, fields, towns, rivers and
// snowy ranges hang sideways and upside down across the whole sky, every one of them pointing at a small soft sun
// that floats on the world's axis. Clouds circle slowly around the sun, its halo breathes, the rivers glint, the
// waterfalls pour and a few windows glow.
//
// The world is a long cylinder seen from inside, looking along its axis. Every pixel casts a ray at the cylinder
// once at load to find where it lands (angle around the axis, distance along it); the ground is painted from that.
// Mountains, hills, cliffs, trees and houses are flat cut-outs standing on the surface, pointing at the axis, drawn
// far to near. Far land fades into the sky colour. The only motion is per frame on top of that static picture.
import { diorama } from '../lib/runtime.js';
import { TAU, clamp, smoothstep, fract, noise2, fbm, rng } from '../lib/util.js';
import { createPix, R, mixc } from '../lib/pix.js';

const W = 480, H = 270, S = 4;
const T = 60, FPS = 30;
const P = createPix({ W, H, S, canvas: document.getElementById('out'),
  grade: { from: [52.5, 14.2, -2.3, 4.6, 3.2, 10.8, 10.9], to: [66.2, 12.2, -2.5, 6.5, 8.5, 11.3, 13.0], kL: 0.9, kC: 0.5, kW: 0.8,
    sel: [[272, 34, -8, 0.55, 8], [135, 40, -16, 1.4, 6]] }, grain: 0.08, glow: [0.8, 0.55] });
const { buf, gl } = P;
const NP = W * H;

const THR = new Float32Array(NP);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) THR[y * W + x] = P.thr(x, y);
const dv = (i, v, ramp) => {
  const n = ramp.length - 1; v = v < 0 ? 0 : v > n ? n : v;
  const k = v | 0;
  return (k < n && v - k > THR[i]) ? ramp[k + 1] : ramp[k];
};
const mod = (a, n) => ((a % n) + n) % n;
const hsh = (n) => { const s = Math.sin(n * 91.3458 + 17.17) * 47453.5453; return s - Math.floor(s); };

// ---------------------------------------------------------------- colour: dusty blue, sage, cream, warm stone, one orange
const SKY = R(['#4f5f88', '#56678e', '#5e6f94', '#67789a', '#7181a0', '#7b8ba6', '#8695ab', '#929fb0', '#9fa9b4', '#acb3b7',
  '#b9bdb9', '#c6c6bb', '#d2cebd', '#ddd6c0', '#e6ddc4', '#eee4ca', '#f4ebd2', '#f9f2de', '#fcf8eb']);
const GRASS = R(['#36433b', '#3d4a3f', '#455243', '#4d5a46', '#566249', '#5f6a4c', '#697350', '#747c54', '#7f8559', '#8b8e5f',
  '#979766', '#a3a06e', '#aeaa78', '#b9b383', '#c3bd90']);
const FOREST = R(['#1a2629', '#1f2d2d', '#253431', '#2b3b35', '#324339', '#394a3d', '#415242', '#4a5b47', '#53644c', '#5d6d51']);
const LEAF = R(['#2b372f', '#323f33', '#3a4737', '#424f3b', '#4b5840', '#556145', '#606a4a', '#6b7450', '#777e56', '#83885d']);
const WHEAT = R(['#7d7350', '#8b8058', '#998d60', '#a69a69', '#b3a673', '#bfb27e', '#cabd8a', '#d4c797']);
const PLOW = R(['#56473c', '#635143', '#705c4b', '#7e6854', '#8b745e', '#987f68']);
const SAND = R(['#7f7565', '#8e8370', '#9d917b', '#ab9f87', '#b9ad93', '#c6ba9f', '#d2c6ac', '#ddd2ba']);
const WATER = R(['#465b7d', '#4e6485', '#576e8d', '#617894', '#6c839b', '#788ea2', '#8499a9', '#91a4af', '#9fafb6', '#adbabc',
  '#bcc5c2', '#cad0c9', '#d8dbd1']);
const GLINT = R(['#e3e2d3', '#f4efdc', '#fffbea']);
const ROCK = R(['#353844', '#3f424e', '#4a4c58', '#565762', '#63626c', '#706e76', '#7e7a80', '#8c878a', '#9a9494', '#a8a29f', '#b6b0ab', '#c4beb8']);
const SNOW = R(['#8d97ae', '#9ea7bc', '#afb6c8', '#c0c5d3', '#d0d3dd', '#dee0e5', '#eaeaec', '#f4f3f0', '#fcfaf5']);
const CLIFF = R(['#5a4c47', '#685851', '#76645b', '#847166', '#927e70', '#9f8b7b', '#ac9887', '#b8a593', '#c4b2a0', '#cfbfad']);
const WALL = R(['#8c8782', '#9e9891', '#afa9a0', '#c0b9ae', '#cec7bb', '#dbd5c8', '#e6e1d5', '#efebe1', '#f8f5ed']);
const ROOF = R(['#683a31', '#7c4537', '#90523d', '#a26044', '#b36f4c', '#c27f56', '#cf8f61']);
const WIN = R(['#c48446', '#df9f55', '#f1bd6a', '#fdd68e', '#ffefc2']);
const LEDGE = R(['#372c2c', '#443631', '#524038', '#604c40', '#6f5848', '#7e6551', '#8d725b', '#9b8065', '#a88d70', '#b49a7c',
  '#c0a789', '#cbb497', '#d5c1a6', '#dfcfb6']);
const FGLEAF = R(['#18221f', '#1e2925', '#25312b', '#2c3a31', '#344437', '#3d4e3d', '#475944', '#52644b', '#5e6f52']);
const CLOUD = R(['#8a93ab', '#979eb2', '#a4a9b9', '#b1b4bf', '#bdbec3', '#c9c8c7', '#d3d1cb', '#dddace', '#e6e2d4', '#eeeadb',
  '#f5f1e4', '#fbf8ee']);
const SUN = R(['#d5703c', '#e2834a', '#ed9758', '#f5ad69', '#fbc37f', '#ffd99c']);

// ---------------------------------------------------------------- camera: inside a long cylinder, looking down its axis
const RC = 100;                       // the world's radius
const ETA = 0.36;                     // the ledge's height above the valley floor, as a fraction of the radius
const EYE = RC * (1 - ETA);           // the eye's distance from the axis
const SUNX = 240, SUNY = 96;          // the sun sits on the axis here
const KH = 92, ZS = 300, ASP = 1.42;  // ring radius at the sun's depth (px), the sun's depth, horizontal stretch
const FY = KH * ZS / RC, FX = FY * ASP;
const VX = SUNX, VY = SUNY + KH * (1 - ETA);
const SC = FY * 1.08;                 // cut-out scale: px per world unit at depth 1
const UC = TAU * RC;                  // circumference: the ground's u axis runs around the world, 0 = straight below us
const ZEND = 1500;
const wrapU = (d) => d - UC * Math.round(d / UC);
// a point on the surface at angle al (0 = below us), depth z, height h above the ground, to screen
function surf(al, z, h) { const r = RC - h; return [VX + FX * r * Math.sin(al) / z, VY - FY * (EYE - r * Math.cos(al)) / z]; }
const hazeZ = (z) => { const k = Math.max(0, z - 90) / 265; return 1 - Math.exp(-(k ** 1.8)); };

// noise that wraps around the world without a seam
function pn(u, z, s, oct = 3, seed = 0) {
  const al = u / RC, k = RC / s;
  const a = fbm(Math.cos(al) * k + seed * 7.1, z / s + seed * 3.3, oct);
  const b = fbm(Math.sin(al) * k + 50 + seed * 5.7, z / s + 31 - seed, oct);
  return (a + b - 1) * 0.8 + 0.5;
}

// ---------------------------------------------------------------- the world map, in (u around, z along)
const RIVERS = [
  { z0: 30, z1: 1400, u: (z) => 8 + 6 * Math.sin(z / 17) + 11 * Math.sin(z / 53 + 1.3), w: (z) => 5.8 + 1.6 * Math.sin(z / 37) },
  { z0: 137, z1: 214, u: (z) => -62 + (z - 137) * 0.72 + 4 * Math.sin(z / 9), w: () => 2.6 },
  { z0: 153, z1: 232, u: (z) => 60 - (z - 153) * 0.7 + 3.5 * Math.sin(z / 8), w: () => 2.4 },
  { z0: 160, z1: 1300, u: (z) => 296 + 26 * Math.sin(z / 43 + 0.7) + 8 * Math.sin(z / 14), w: () => 4.6 },
  { z0: 150, z1: 1200, u: (z) => -232 + 22 * Math.sin(z / 37 + 2.1) + 7 * Math.sin(z / 11), w: () => 3.8 },
  { z0: 140, z1: 1100, u: (z) => 172 + 18 * Math.sin(z / 31 + 1) + 5 * Math.sin(z / 9), w: () => 3.2 },
];
const LAKES = [[-2, 178, 15, 20], [262, 360, 26, 38], [-150, 300, 18, 30], [140, 430, 16, 26], [-30, 560, 30, 40]];
const ISLANDS = [[11, 128, 3.4, 6], [-3, 181, 6, 8], [5, 292, 2.8, 6], [286, 520, 6, 10], [262, 352, 7, 10]];
// u, z, houses, radius, height of the ground under it (the cliff-top town sits on a plateau)
const TOWNS = [
  [-20, 150, 13, 7, 0], [28, 152, 10, 6, 0], [67, 103, 16, 8, 10], [37, 70, 5, 4, 0], [-12, 246, 9, 6, 0], [6, 430, 9, 8, 0],
  [-100, 205, 11, 7, 0], [116, 246, 10, 7, 0], [222, 214, 12, 8, 0], [-220, 228, 11, 8, 0], [258, 300, 10, 8, 0],
  [-286, 330, 10, 8, 0], [310, 425, 9, 9, 0], [176, 330, 8, 7, 0], [-162, 420, 8, 7, 0], [-60, 330, 7, 6, 0], [92, 380, 7, 7, 0],
  [176, 192, 11, 8, 0], [-178, 200, 11, 8, 0], [236, 262, 10, 8, 0], [-240, 268, 10, 8, 0],
];

function wdist(u, z) {
  let dw = 1e9;
  for (const rv of RIVERS) {
    if (z < rv.z0 - 6 || z > rv.z1) continue;
    const uc = rv.u(z), sl = rv.u(z + 0.5) - rv.u(z - 0.5);
    let d = Math.abs(wrapU(u - uc)) / Math.sqrt(1 + sl * sl) - rv.w(z) * 0.5;
    if (z < rv.z0) d += (rv.z0 - z) * 1.5;
    if (d < dw) dw = d;
  }
  for (const [lu, lz, ru, rz] of LAKES) {
    const du = wrapU(u - lu) / ru, dz = (z - lz) / rz;
    if (Math.abs(du) > 3 || Math.abs(dz) > 3) continue;
    const d = (Math.hypot(du, dz) - 1) * Math.min(ru, rz) + (pn(u, z, 9, 2, 4) - 0.5) * 5;
    if (d < dw) dw = d;
  }
  for (const [lu, lz, ru, rz] of ISLANDS) {
    const du = wrapU(u - lu) / ru, dz = (z - lz) / rz, d = (Math.hypot(du, dz) - 1) * Math.min(ru, rz);
    if (d < 0) dw = Math.max(dw, -d - 0.5);
  }
  return dw;
}
function townNear(u, z) {
  let best = 0;
  for (const [tu, tz, , rad] of TOWNS) {
    const d = Math.hypot(wrapU(u - tu), (z - tz) * 0.8) / (rad * 1.9);
    if (d < 1) best = Math.max(best, 1 - d);
  }
  return best;
}
function forestAt(u, z) {
  const au = Math.abs(wrapU(u));
  let f = pn(u, z, 26, 3, 2);
  f += 0.1 * smoothstep(26, 60, au) - 0.3 * (1 - smoothstep(16, 34, au)) * (1 - smoothstep(500, 700, z));
  return f - townNear(u, z) * 0.6;
}

// ---------------------------------------------------------------- per-pixel buffers
const LAND = new Uint32Array(NP);       // unhazed colour
const ZB = new Float32Array(NP);        // depth of what is drawn
const FL = new Uint8Array(NP);          // what it is, for animation
const FP = new Float32Array(NP), FQ = new Float32Array(NP);
const F_SKY = 1, F_WATER = 2, F_WIN = 3, F_FALL = 4, F_FOAM = 5, F_FG = 9;

// ---------------------------------------------------------------- the ground
function ground(i, u, z, sig) {
  const dw = wdist(u, z);
  const fine = 1 - smoothstep(0.25, 0.9, sig);       // how much small detail survives at this distance
  if (dw < 0) {
    let v = 6.4 - clamp(-dw / 5) * 1.4 + Math.min(3.2, z / 240);
    v += 0.8 * Math.sin(z * 1.7 + 1.4 * Math.sin(u * 0.55)) * fine;
    if (dw > -0.7 - sig * 0.8) v += 1.6;               // pale shallows along the bank
    LAND[i] = dv(i, v, WATER); FL[i] = F_WATER; FP[i] = u; FQ[i] = z;
    return;
  }
  const h1 = pn(u, z, 20, 4, 1), h2 = pn(u - 1.3, z + 1.8, 20, 4, 1);
  const sl = (h1 - h2) * 16;                          // rolling-hill shading
  const grain = noise2(u * 1.3, z * 1.3) - 0.5;
  if (dw < 0.8 + sig * 0.7) {
    LAND[i] = dv(i, 4.2 + dw * 2.2 + grain * 2 * fine + sl, SAND);
    return;
  }
  const au = Math.abs(wrapU(u));
  const fz = forestAt(u, z), tn = townNear(u, z);
  const valley = 1 - smoothstep(26, 54, au);
  if (fz > 0.56) {
    // canopy: jittered crowns when they're big enough to see, mottling when not
    let v = 3.6 + sl * 1.6 + (fz - 0.56) * 2;
    if (sig < 1.4) {
      const cu = (u + UC) / 2.3, cz = z / 2.3, iu = Math.floor(cu), iz = Math.floor(cz);
      let best = 9, by = 0;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const gu = iu + a, gz = iz + b, gw = mod(gu, Math.round(UC / 2.3));
        const px = gu + 0.2 + hsh(gw * 3.1 + gz * 7.7) * 0.6, pz = gz + 0.2 + hsh(gw * 5.3 + gz * 1.9) * 0.6;
        const d = Math.hypot(cu - px, cz - pz);
        if (d < best) { best = d; by = cz - pz; }
      }
      v += (0.55 - best) * 2.6 * (1 - smoothstep(0.6, 1.4, sig)) - by * 1.2 * fine;
    } else v += (pn(u, z, 3, 2, 6) - 0.5) * 1.6;
    LAND[i] = dv(i, v, FOREST);
    return;
  }
  const patch = smoothstep(0.45, 0.55, pn(u, z, 34, 2, 12)) * (au > 40 ? 1 : 0);
  const farm = Math.max(valley * (1 - smoothstep(380, 560, z)) * (au < 70 ? 1 : 0), smoothstep(0.05, 0.4, tn), patch);
  if (farm > 0.35 && pn(u, z, 14, 2, 8) > 0.3) {
    const NCU = 64, CZ = 7.5;
    const row = Math.floor(z / CZ), fu = mod(u, UC) / UC * NCU + hsh(row) * 3;
    const col = mod(Math.floor(fu), NCU), fx = fract(fu), fzz = fract(z / CZ);
    const hh = hsh(col * 13.7 + row * 7.31);
    if (fine > 0.45 && (fx < 0.04 + sig * 0.02 || fzz < 0.05 + sig * 0.02)) { LAND[i] = dv(i, 5 + sl, FOREST); return; }
    const fur = fine * (fract((hh > 0.5 ? fx * 9 : fzz * 7)) < 0.5 ? 0.45 : -0.45);
    let c;
    if (hh < 0.3) c = dv(i, 4.6 + sl + fur + grain, WHEAT);
    else if (hh < 0.5) c = dv(i, 8.6 + sl * 1.5 + fur, GRASS);
    else if (hh < 0.64) c = dv(i, 5.6 + sl * 1.5 + fur, GRASS);
    else if (hh < 0.76) c = dv(i, 2.6 + sl + fur * 1.5, PLOW);
    else c = dv(i, 6.2 + sl * 1.8 + grain, GRASS);
    LAND[i] = c;
    return;
  }
  const rocky = smoothstep(0.62, 0.74, h1) * smoothstep(60, 90, au) * (1 - tn);
  if (rocky > THR[i] * 0.6 + 0.3) { LAND[i] = dv(i, 5 + sl * 2 + grain * 2, ROCK); return; }
  let v = 7 + sl * 2.2 + grain * 1.8 * fine + (pn(u, z, 7, 2, 9) - 0.5) * 2;
  LAND[i] = dv(i, v, GRASS);
}

// ---------------------------------------------------------------- cast every pixel at the world
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x;
  const a = (x + 0.5 - VX) / FX, b = (VY - y - 0.5) / FY;
  const A = a * a + b * b, B = -2 * EYE * b, Cq = EYE * EYE - RC * RC;
  const t = (-B + Math.sqrt(B * B - 4 * A * Cq)) / (2 * A);
  ZB[i] = t;
  if (t > ZEND) { FL[i] = F_SKY; continue; }
  const X = a * t, Y = -EYE + b * t, u = Math.atan2(X, -Y) * RC;
  const cs = Math.abs(a * X + b * Y) / RC / Math.sqrt(A + 1);
  ground(i, u, t, t / FY / Math.max(cs, 0.1));
}

// ---------------------------------------------------------------- cut-outs standing on the surface
let OF = 0, OP = 0, OQ = 0;             // a shape can tag the pixel it returns
function bill(u0, z0, alt0, hw, ht, fn) {
  const al = u0 / RC;
  const B = surf(al, z0, alt0), Tp = surf(al, z0, alt0 + 1);
  let ux = Tp[0] - B[0], uy = Tp[1] - B[1]; const ul = Math.hypot(ux, uy); ux /= ul; uy /= ul;
  const rx = -uy, ry = ux, s = SC / z0;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const cu of [-hw, hw]) for (const cv of [-1, ht]) {
    const px = B[0] + (cu * rx + cv * ux) * s, py = B[1] + (cu * ry + cv * uy) * s;
    x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
  }
  x0 = Math.max(0, Math.floor(x0)); x1 = Math.min(W - 1, Math.ceil(x1)); y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(H - 1, Math.ceil(y1));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = x + 0.5 - B[0], dy = y + 0.5 - B[1];
    const u = (dx * rx + dy * ry) / s, v = (dx * ux + dy * uy) / s;
    if (u < -hw || u > hw || v < -1 || v > ht) continue;
    const i = y * W + x;
    OF = 0;
    const c = fn(u, v, i, s);
    if (c) { LAND[i] = c; ZB[i] = z0; FL[i] = OF; FP[i] = OP; FQ[i] = OQ; }
  }
}
const items = [];
const add = (z, f) => items.push([z, f]);

function conifer(u0, z0, h, tone) {
  const hw = h * 0.3 + 0.2;
  add(z0, () => bill(u0, z0, 0, hw + 0.3, h + 0.4, (u, v, i, s) => {
    if (v < 0.5) return (Math.abs(u) < Math.max(0.14, 0.45 / s) && v > -0.3) ? FOREST[0] : 0;
    const f = (v - 0.5) / (h - 0.5);
    if (f > 1) return 0;
    const tier = fract(f * 3.2), wv = hw * (1 - f) * (0.7 + 0.3 * (1 - tier)) + 0.4 / s;
    if (Math.abs(u) > wv) return 0;
    return dv(i, 3.4 + tone - u / wv * 1.3 + f * 1.4 + (1 - tier) * 0.5, FOREST);
  }));
}
function roundTree(u0, z0, r, tone) {
  add(z0, () => bill(u0, z0, 0, r + 0.3, 2 * r + 1.2, (u, v, i, s) => {
    const cy = 0.8 + r, dx = u, dy = v - cy, d = Math.hypot(dx, dy * 1.08);
    const lump = r * (0.9 + 0.14 * Math.sin(Math.atan2(dy, dx) * 5 + u0));
    if (d < lump) return dv(i, 4.2 + tone - dx / r * 1.5 + dy / r * 1.5 + (noise2(u * 3 + u0, v * 3) - 0.5) * 1.4 * Math.min(1, s / 2), LEAF);
    if (Math.abs(u) < Math.max(0.14, 0.45 / s) && v > -0.3 && v < cy) return FOREST[1];
    return 0;
  }));
}
function house(u0, z0, alt, w, h, seed) {
  const hw = w / 2, rh = hw * 0.8 + 0.4, lit = hsh(seed) < 0.75;
  add(z0, () => bill(u0, z0, alt, hw + 0.5, h + rh + 0.2, (u, v, i, s) => {
    const au = Math.abs(u);
    if (au <= hw && v >= -0.4 && v < h) {
      const ws = Math.max(0.24, 0.52 / s);
      if (lit && s > 0.9 && Math.abs(v - h * 0.55) < ws && (Math.abs(u - hw * 0.45) < ws || (w > 2.6 && Math.abs(u + hw * 0.45) < ws))) {
        OF = F_WIN; OP = seed; return WIN[2];
      }
      if (s > 1.6 && Math.abs(u + hw * 0.1) < 0.35 && v < h * 0.5) return WALL[1];
      return dv(i, (u > hw * 0.35 ? 3.4 : 6.6) + (v > h - 0.5 ? 0.8 : 0) - (v < 0.3 ? 1 : 0), WALL);
    }
    const top = h + (hw + 0.45 - au) * 0.8;
    if (v >= h && v < top && au <= hw + 0.45) return dv(i, u < 0 ? 4.8 : 2.2, ROOF);
    return 0;
  }));
}
function tower(u0, z0, alt, h, seed) {
  add(z0, () => bill(u0, z0, alt, 1.4, h + 2.2, (u, v, i, s) => {
    const au = Math.abs(u);
    if (au <= 0.8 && v >= -0.4 && v < h) {
      if (s > 1 && Math.abs(v - h + 1) < Math.max(0.3, 0.55 / s) && au < Math.max(0.25, 0.5 / s)) return WALL[1];
      return dv(i, u > 0.25 ? 3.6 : 6.8, WALL);
    }
    if (v >= h && v < h + (1.05 - au) * 2 && au < 1.05) return dv(i, u < 0 ? 4.6 : 2, ROOF);
    return 0;
  }));
}
function mountain(u0, z0, hgt, wid, seed) {
  const r = rng(seed), hw = wid / 2;
  const peaks = [[0, hgt, hw * 0.9]];
  const ns = 1 + Math.floor(r() * 2);
  for (let k = 0; k < ns; k++) { const side = (k === 0) === (r() < 0.5) ? 1 : -1; peaks.push([side * hw * (0.28 + r() * 0.3), hgt * (0.5 + r() * 0.28), hw * (0.45 + r() * 0.2)]); }
  const snow0 = 0.6 + r() * 0.1, tilt = (r() - 0.5) * 0.3;
  add(z0, () => bill(u0, z0, 0, hw, hgt + 1, (u, v, i, s) => {
    let top = 0, pk = peaks[0];
    for (const p of peaks) { const t = p[1] * (1 - Math.abs(u - p[0] - (v - p[1]) * tilt) / p[2]); if (t > top) { top = t; pk = p; } }
    const jag = (noise2(u * 0.45 + seed, seed) - 0.5) * hgt * 0.06 + (noise2(u * 1.6 + seed, 3) - 0.5) * Math.min(1.2, 2.4 / s);
    top += jag;
    if (v > top || v < -0.6) return 0;
    const pu = pk[0] + (v - pk[1]) * tilt;
    const ridge = pu + (pk[1] - v) * 0.1 * Math.sin(v * 0.25 + seed) + (noise2(v * 0.5, seed) - 0.5) * 1.2;
    const lit = u < ridge;
    const across = (u - pu) * (lit ? -1 : 1) / pk[2];                   // 0 at the ridge, 1 at the flank
    const gully = fract((across * pk[1] * 0.5 + v * 0.55) / 3.4 + noise2(u * 0.25, v * 0.12) * 0.7) < 0.16;
    const snowAt = pk[1] * (snow0 + (noise2(u * 0.35 + seed, v * 0.08) - 0.5) * 0.28) - (gully ? pk[1] * 0.14 : 0);
    const edge = top - v < Math.max(0.5, 1 / s);
    if (v > snowAt) return dv(i, (lit ? 7 : 2) + (gully ? -0.8 : 0) + (edge && lit ? 1.2 : 0) - across * 0.9, SNOW);
    const foot = v + (noise2(u * 0.3, seed) - 0.5) * hgt * 0.16;
    if (foot < hgt * 0.2) return dv(i, (lit ? 4.4 : 2.6) + foot / hgt * 3 + (noise2(u * 1.2, v * 1.2) - 0.5) * 1.4 * Math.min(1, s), FOREST);
    return dv(i, (lit ? 7.6 : 2.4) + (gully ? -1.3 : 0) + v / hgt * 1.6 - across * 1.2 + (edge && lit ? 1.4 : 0), ROCK);
  }));
}
function hill(u0, z0, hgt, wid, wooded, seed) {
  const hw = wid / 2, cs = 1.5;                                         // crown size, in world units
  add(z0, () => bill(u0, z0, 0, hw, hgt + 1.6, (u, v, i, s) => {
    const q = 1 - (u / hw) ** 2;
    if (q <= 0) return 0;
    let top = hgt * Math.pow(q, 0.65) + (noise2(u * 0.22 + seed, seed) - 0.5) * hgt * 0.3;
    const big = s * cs >= 2.6;
    if (wooded && big) {
      const f = fract(u / cs + 0.5) - 0.5;
      top += Math.sqrt(Math.max(0, 0.25 - f * f)) * cs * 0.9 - cs * 0.2;
    } else if (wooded) top += (noise2(u * 1.7, seed) - 0.5) * 0.8;
    if (v > top || v < -0.6) return 0;
    const lit = -u / hw * 1.2 + (v / Math.max(1, top)) * 1.2;
    if (wooded) {
      let k = 0;
      if (big) {
        // rows of crowns, each lit on its upper left
        const row = Math.floor((top - v) / (cs * 0.8)), off = (row % 2) * 0.5;
        const fu = fract(u / cs + off) - 0.5, fv = fract((top - v) / (cs * 0.8)) - 0.5;
        k = (-fu - fv) * 1.6 - (fu * fu + fv * fv) * 2;
      } else k = (noise2(u * 1.3 + seed, v * 1.3) - 0.5) * 1.6;
      return dv(i, 3.8 + lit + k + (top - v < Math.max(0.5, 1 / s) ? 0.8 : 0), FOREST);
    }
    // a few trees dotted over the slope, big enough to see up close
    if (s > 1.4) {
      const gu = Math.floor(u / 2.6), gv = Math.floor(v / 2.2), hh = hsh(gu * 7.3 + gv * 3.1 + seed);
      if (hh < 0.22) {
        const cu = (gu + 0.5 + (hsh(hh * 91) - 0.5) * 0.6) * 2.6, cv = (gv + 0.5) * 2.2, d = Math.hypot(u - cu, (v - cv) * 1.1);
        if (d < 0.75) return dv(i, 4.6 - (u - cu) * 1.6 + (v - cv) * 1.6, LEAF);
        if (d < 1.15 && v < cv && u > cu - 0.3) return dv(i, 4.6 + lit, GRASS);   // its shadow
      }
    }
    const band = fract((v - top * 0.3 + noise2(u * 0.2, seed) * 2) / 2.4) < 0.5 ? 0.45 : -0.45;
    return dv(i, 6.6 + lit * 1.5 + band * Math.min(1, s / 2) + (noise2(u * 0.7 + seed, v * 0.7) - 0.5) * 1.6 + (top - v < Math.max(0.5, 1 / s) ? 1.2 : 0), GRASS);
  }));
}
// a wooded hill with a bare rock face in it; flat ones are plateaus (a town can sit on top); some have a waterfall
function bluff(u0, z0, wid, hgt, face, flat, fallU, seed) {
  const hw = wid / 2, cs = 1.5;
  add(z0, () => bill(u0, z0, 0, hw, hgt + 2.4, (u, v, i, s) => {
    const au = Math.abs(u) / hw;
    if (au >= 1) return 0;
    let top = flat ? hgt * (1 - Math.pow(smoothstep(0.6, 1, au), 1.4)) : hgt * Math.pow(1 - au * au, 0.6);
    top += (noise2(u * 0.4 + seed, seed) - 0.5) * 1.4;
    const fw = hw * face * (flat ? 1.15 - 0.55 * v / hgt : 0.8 + 0.5 * v / hgt) + (noise2(v * 0.45, seed) - 0.5) * (flat ? 3 : 1.6) + (noise2(v * 1.3, seed + 4) - 0.5) * 1.2;
    const inFace = Math.abs(u) < fw;
    const big = s * cs >= 2.6;
    const f = fract(u / cs + 0.5) - 0.5;
    const crown = big && (!inFace || !flat) ? Math.sqrt(Math.max(0, 0.25 - f * f)) * cs * 0.9 - cs * 0.15 : 0;
    if (v > top + crown || v < -0.6) return 0;
    if (fallU !== null && Math.abs(u - fallU) < 0.75 + (top - v) * 0.03 && v < top + 0.3) { OF = F_FALL; OP = top - v; OQ = (u - fallU) * s; return WATER[11]; }
    if (fallU !== null && Math.abs(u - fallU) < 3.4 - v * 0.7 && v < 2.6) { OF = F_FOAM; OP = u; OQ = v; return GLINT[0]; }
    const lit = -u / hw * 1.2;
    if (!inFace || v > top - 0.6) {
      if (flat && v > top - 0.8 && inFace) return dv(i, 7.4 + lit, GRASS);
      let k;
      if (big) {
        const row = Math.floor((top - v) / (cs * 0.8)), off = (row % 2) * 0.5;
        const fu = fract(u / cs + off) - 0.5, fv = fract((top - v) / (cs * 0.8)) - 0.5;
        k = (-fu - fv) * 1.6 - (fu * fu + fv * fv) * 2;
      } else k = (noise2(u * 1.3 + seed, v * 1.3) - 0.5) * 1.6;
      return dv(i, 4.4 + lit * 1.3 + k + v / hgt * 1.4, FOREST);
    }
    const wav = noise2(u * 0.18, seed) * 2.4;
    const band = Math.floor((v + wav) / 1.5), bt = fract((v + wav) / 1.5);
    const col = Math.floor(u / 2.1 + hsh(band + seed) * 0.8);
    const crack = fract(u / 2.1 + hsh(band + seed) * 0.8) < 0.1;
    const litSide = u < fw * 0.2 + Math.sin(v * 0.5 + seed) * 1.2;
    const dark = flat ? 0 : 2.6;
    return dv(i, (litSide ? 6.8 : 3.4) - dark + (hsh(col * 3.3 + band * 1.7 + seed) - 0.5) * 1.6 - (crack ? 2 : 0) - (bt < 0.16 ? 1.4 : bt > 0.84 ? -0.6 : 0)
      - (Math.abs(u) > fw - 0.8 ? 1.2 : 0) + v / hgt * 1.2 - 0.6, CLIFF);
  }));
}
function bridge(u0, z0, wid, hgt, n) {
  const hw = wid / 2, cw = wid / n, ar = cw * 0.36;
  add(z0, () => bill(u0, z0, 0, hw + 0.4, hgt + 0.5, (u, v, i, s) => {
    if (v < -0.6 || v > hgt) return 0;
    const au = Math.abs(u);
    if (au > hw + (v > hgt - 0.6 ? 0.4 : 0)) return 0;
    const cu = (fract((u + hw) / cw) - 0.5) * cw;
    if (v < hgt - ar - 0.7 && Math.abs(cu) < ar) return 0;
    if (Math.hypot(cu, v - (hgt - ar - 0.7)) < ar && v >= hgt - ar - 0.7) return 0;
    if (v > hgt - 0.5) return dv(i, 7.6 - u / hw * 0.6, CLIFF);
    const ring = Math.abs(Math.hypot(cu, v - (hgt - ar - 0.7)) - ar - 0.25) < Math.max(0.2, 0.5 / s);
    return dv(i, 5.8 - u / hw * 0.8 - (ring ? 1.4 : 0) + (hsh(Math.floor(u * 1.4) + Math.floor(v * 2) * 7) - 0.5) * 1.2, CLIFF);
  }));
}

// ---- place everything
{
  const r = rng(7);
  // big ranges on both sides and overhead, a far range closing the valley
  const ranges = [
    [-132, -56, 180, 430, 11, 16, 36], [56, 132, 180, 430, 11, 16, 36], [-34, 34, 330, 540, 10, 20, 44],
    [132, 228, 240, 460, 8, 14, 30], [-228, -132, 240, 460, 8, 14, 30],
  ];
  for (const [a0, a1, z0, z1, n, h0, h1] of ranges) {
    for (let k = 0; k < n; k++) {
      const al = (a0 + (a1 - a0) * (k + r()) / n) * Math.PI / 180, z = z0 + (z1 - z0) * r();
      const hgt = h0 + (h1 - h0) * r();
      mountain(wrapU(al * RC), z, hgt, hgt * (1.5 + r() * 0.7), 100 + k + a0);
    }
  }
  // hills everywhere but the valley floor
  for (let k = 0; k < 170; k++) {
    const u = wrapU((r() - 0.5) * UC), z = 70 + Math.pow(r(), 1.3) * 520;
    if (Math.abs(u) < 26 || wdist(u, z) < 4 || townNear(u, z) > 0.3) continue;
    const hgt = (3 + r() * 9) * Math.min(1, 0.35 + z / 220);
    hill(u, z, hgt, hgt * (3 + r() * 2.5), forestAt(u, z) > 0.45 || r() < 0.3, k * 3.7);
  }
  // the valley's own walls: low hills either side, receding to the far range
  for (let z = 85; z < 640; z *= 1.09) for (const side of [-1, 1]) {
    const u = side * (30 + r() * 16), hgt = 4 + r() * 6;
    if (wdist(u, z) < 3 || townNear(u, z) > 0.3) continue;
    hill(u, z, hgt, hgt * (3.5 + r() * 2), r() < 0.6, z + side);
  }
  // cliffs, waterfalls and the aqueduct
  bluff(-62, 136, 30, 24, 0.17, false, 0.3, 11);
  bluff(64, 97, 34, 10, 0.72, true, null, 12);
  bluff(58, 152, 26, 15, 0.18, false, -0.4, 13);
  bluff(282, 330, 26, 15, 0.18, false, 0.4, 14);
  bluff(-196, 260, 26, 14, 0.18, false, 0.3, 15);
  bridge(8.4, 122, 11, 2.6, 3);
  // trees: crowds of them in the forests, a scatter in the open
  const NT = Math.round(UC / 2.4);
  for (let z = 44; z < 340; z += 2.4) for (let c = 0; c < NT; c++) {
    const u = wrapU((c + hsh(c * 1.7 + z) * 0.8) * (UC / NT)), zz = z + hsh(c * 3.1 + z * 0.7) * 2.2;
    const f = forestAt(u, zz), open = hsh(c * 7.3 + z * 1.3);
    const hedge = zz < 260 && Math.abs(wrapU(u)) < 60 && (fract(zz / 7.5) < 0.16 || fract(mod(u, UC) / UC * 64 + hsh(Math.floor(zz / 7.5)) * 3) < 0.12) && open < 0.35;
    if (!(f > 0.56 + (hsh(c + z * 9.1) - 0.5) * 0.06 || (f > 0.36 && open < 0.04) || open < 0.008 || hedge)) continue;
    if (wdist(u, zz) < 1.4 || townNear(u, zz) > 0.55) continue;
    const kind = hsh(c * 2.9 + z * 4.1), hgt = 2.2 + hsh(c + z) * 1.4;
    if (f > 0.56 ? kind < 0.72 : kind < 0.3) conifer(u, zz, hgt + 0.6, (hsh(c * 5 + z) - 0.5) * 1.2);
    else roundTree(u, zz, 0.9 + hsh(c * 11 + z) * 0.5, (hsh(c * 5 + z) - 0.5) * 1.2);
  }
  // towns: little crowds of houses and a bell tower
  for (const [tu, tz, n, rad, alt] of TOWNS) {
    const tr = rng(Math.round(tu * 13 + tz * 7) + 991);
    const big = tz < 170 ? 1 : 1.55;
    for (let k = 0; k < n; k++) {
      const a = tr() * TAU, d = Math.sqrt(tr()) * rad;
      const u = tu + Math.cos(a) * d * 1.3, z = tz + Math.sin(a) * d * 0.8;
      if (alt === 0 && wdist(u, z) < 1.2) continue;
      house(u, z, alt, (2.2 + tr() * 1.6) * big, (1.6 + tr() * 1.2) * big, Math.floor(tr() * 9973));
    }
    tower(tu + 0.5, tz + 0.3, alt, 5.5 * big, tu);
  }
  items.sort((a, b) => b[0] - a[0]);
  for (const [, f] of items) f();
}

// ---------------------------------------------------------------- haze into the sky, around the sun
const SKYV = new Float32Array(NP), HK = new Float32Array(NP), HQ = new Float32Array(NP), RE = new Float32Array(NP);
const STATIC = new Uint32Array(NP);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x, re = Math.hypot((x + 0.5 - SUNX) / ASP, y + 0.5 - SUNY);
  RE[i] = re;
  SKYV[i] = 2.6 + 11 * Math.exp(-re / 34) + 4.4 * Math.exp(-re / 10) + (fbm(x * 0.03, y * 0.05, 3) - 0.5) * 0.8;
  HK[i] = 2.4 * Math.exp(-re / 22);
  let hz = FL[i] === F_SKY ? 1 : hazeZ(ZB[i]);
  hz += (1 - hz) * 0.55 * Math.exp(-re / 34);
  const hq = Math.min(1, Math.floor(hz * 8 + THR[i]) / 8);
  HQ[i] = hq;
  STATIC[i] = mixc(LAND[i], dv(i, SKYV[i], SKY), hq);
}

// ---------------------------------------------------------------- the ledge in the foreground
{
  const back = (x) => 204 + 3 * (x / 60) + 10 * Math.pow(Math.max(0, x - 105) / 92, 2) + (noise2(x * 0.13, 3) - 0.5) * 3.4;
  const lip = (x) => back(x) + 21 - 15 * Math.pow(x / 198, 1.3) + (noise2(x * 0.17, 7) - 0.5) * 2.4;
  const right = (y) => y < 233 ? 198 + (noise2(y * 0.3, 2) - 0.5) * 2 : 198 - (y - 233) * 0.7 + (noise2(y * 0.18, 9) - 0.5) * 5;
  // facets: the top is broken into flat slabs, the face into blocks between the strata
  const fr = rng(55), seeds = [];
  for (let k = 0; k < 70; k++) seeds.push([fr() * 205, 196 + fr() * 76, fr()]);
  const facet = (x, y) => {
    let d1 = 1e9, d2 = 1e9, id = 0;
    for (const [sx, sy, sv] of seeds) { const d = Math.hypot((x - sx) * 0.7, y - sy); if (d < d1) { d2 = d1; d1 = d; id = sv; } else if (d < d2) d2 = d; }
    return [id, d2 - d1];
  };
  for (let y = 190; y < H; y++) for (let x = 0; x < 215; x++) {
    const i = y * W + x;
    if (x > right(y) || y < back(x)) continue;
    const by = back(x), ly = lip(x), n1 = noise2(x * 0.4, y * 0.4) - 0.5, n2 = noise2(x * 0.07 + 5, y * 0.1) - 0.5;
    const [fid, fe] = facet(x, y);
    let v;
    if (y < ly) {
      // the top: warm slabs, lit, darker toward the back where it drops away
      v = 9.8 + (fid - 0.5) * 1.2 + n1 * 1.1 + n2 * 1.6 + (y - by) * 0.05 + x * 0.004;
      if (fe < 0.7 && fid > 0.78) v -= 2.4;                          // a few cracks between slabs
      if (y - by < 1.2) v += 1.8;                                    // the far rim catches the sun
      if (y > ly - 1.4) v += 1.4;                                    // and so does the lip
    } else {
      // the face: wavy strata, blocky joints, shadowed under the lip, lighter where it turns toward the sun
      const d = y - ly, wav = y + n2 * 7 + Math.sin(x * 0.045) * 2.5;
      const band = Math.floor(wav / 4.2), bt = fract(wav / 4.2);
      v = 6.6 + (fid - 0.5) * 2.4 + [0.7, -0.4, 0.4, -0.7, 0.1, 0.9][mod(band, 6)] + n1 * 1.2 - (bt < 0.14 ? 1.2 : 0);
      if (fe < 0.8 && fid > 0.6) v -= 1.5;
      v -= d < 2.5 ? 2.2 : d < 5 ? 0.8 : 0;
      v += smoothstep(right(y) - 7, right(y), x) * 2.6;
      v -= smoothstep(240, 270, y) * 1.2;
    }
    STATIC[i] = dv(i, v, LEDGE); FL[i] = F_FG; ZB[i] = 0; HQ[i] = 0;
  }
  // a little cairn on the ledge
  const stones = [[126, 13, 4], [126.6, 11, 3.6], [125.6, 8.6, 3.2], [126.4, 6.4, 2.8], [126, 4, 2.4]];
  let sy = back(126) + 9;
  for (const [cx, w, h] of stones) {
    for (let y = Math.floor(sy - h); y <= sy; y++) for (let x = Math.floor(cx - w / 2 - 1); x <= cx + w / 2 + 1; x++) {
      const e = ((x + 0.5 - cx) / (w / 2)) ** 2 + ((y + 0.5 - (sy - h / 2)) / (h / 2 + 0.2)) ** 2;
      if (e > 1) continue;
      const i = y * W + x;
      STATIC[i] = dv(i, 8.4 + (x - cx) / w * 4.4 - (y - (sy - h)) / h * 3 + (y < sy - h + 1.2 ? 1.2 : 0), LEDGE); FL[i] = F_FG; ZB[i] = 0;
    }
    sy -= h - 0.4;
  }
  // grass tufts along the ledge and leafy scrub in the corner
  const r = rng(77);
  for (let k = 0; k < 14; k++) {
    const x0 = Math.floor(10 + r() * 150), y0 = Math.round(back(x0)) + 2;
    for (let b = 0; b < 4; b++) {
      const hgt = 1 + Math.floor(r() * 3), lean = (b - 1.5) * 0.45;
      for (let j = 0; j < hgt; j++) { const xx = Math.round(x0 + b * 0.8 + lean * j), i = (y0 - j) * W + xx; STATIC[i] = FGLEAF[Math.min(8, 4 + j * 2)]; FL[i] = F_FG; ZB[i] = 0; }
    }
  }
  const leaves = [];
  const clumps = [[8, 196, 16], [24, 236, 14], [4, 252, 18], [40, 262, 12], [14, 222, 12]];
  for (const [cx, cy, cr] of clumps) for (let k = 0; k < 46; k++) {
    const a = r() * TAU, d = Math.sqrt(r()) * cr;
    leaves.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, 2.2 + r() * 2.2, a + (r() - 0.5) * 1.2]);
  }
  leaves.sort((a, b) => a[1] - b[1]);
  for (const [lx, ly, lr, la] of leaves) {
    const ca = Math.cos(la), sa = Math.sin(la);
    for (let y = Math.floor(ly - lr - 1); y <= ly + lr + 1; y++) for (let x = Math.floor(lx - lr - 1); x <= lx + lr + 1; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const dx = x + 0.5 - lx, dy = y + 0.5 - ly, pu = dx * ca + dy * sa, pv = -dx * sa + dy * ca;
      if ((pu / lr) ** 2 + (pv / (lr * 0.5)) ** 2 > 1) continue;
      const i = y * W + x;
      STATIC[i] = dv(i, 3.4 + (dx - dy) / lr * 1.8 + (Math.abs(pv) < 0.5 ? 0.8 : 0) - (ly - 190) * 0.025 + hsh(lx * 3.1 + ly) * 1.6, FGLEAF); FL[i] = F_FG; ZB[i] = 0;
    }
  }
}

// ---------------------------------------------------------------- animated pixel lists
const LW = [], LF = [], LO = [], LN = [];
for (let i = 0; i < NP; i++) {
  if (FL[i] === F_WATER && HQ[i] < 1) LW.push(i);
  else if (FL[i] === F_FALL) LF.push(i);
  else if (FL[i] === F_FOAM) LO.push(i);
  else if (FL[i] === F_WIN) LN.push(i);
}
const LH = [];
for (let i = 0; i < NP; i++) if (RE[i] < 70 && FL[i] !== F_FG) LH.push(i);

// ---------------------------------------------------------------- clouds circling the sun
// Flat-bottomed cumulus: a row of puffs sitting on a flat base that faces the land, lit on the side facing the sun.
const CLOUDS = [];
{
  const r = rng(2024);
  const N = 24;
  for (let k = 0; k < N; k++) {
    const rho = 24 + Math.pow(r(), 1.25) * 88;
    const sz = 11 + rho * 0.21 + r() * 8;                    // width of the cloud, px
    const np = 3 + Math.floor(r() * 3), puffs = [];
    for (let j = 0; j < np; j++) {
      const x = (j / (np - 1) - 0.5) * 0.62 + (r() - 0.5) * 0.06;
      const big = 1 - Math.abs(x) * 1.7;
      const pr = (0.11 + 0.19 * big) * (0.8 + r() * 0.4);
      puffs.push([x, pr * 0.56, pr]);
    }
    puffs.sort((a, b) => a[2] - b[2]);                      // small ones behind
    CLOUDS.push({ th: (k / N) * TAU + (r() - 0.5) * 0.4, rho, sz, puffs, base: 0.38 });
  }
}
function cloudAt(cl, u, v) {                                 // shade, or -9 outside
  if (v < 0) return -9;
  let hit = -1, sh = 0, crease = false;
  for (let j = 0; j < cl.puffs.length; j++) {
    const [pu, pv, pr] = cl.puffs[j], du = (u - pu) / pr, dq = (v - pv) / pr, d2 = du * du + dq * dq;
    if (d2 < 1) { crease = hit >= 0 && d2 > 0.7; hit = j; sh = -du * 0.4 + dq * 0.95; }
  }
  if (hit < 0) return (Math.abs(u) < cl.base && v < 0.07) ? -0.6 : -9;
  return sh - (crease ? 1.1 : 0);
}
function drawClouds(t) {
  for (const cl of CLOUDS) {
    const th = cl.th + TAU * t / T;
    const db = Math.abs(Math.atan2(Math.sin(th - Math.PI / 2), Math.cos(th - Math.PI / 2)));   // 0 = straight below the sun
    const vis = smoothstep(0.8, 1.5, db);
    if (vis < 0.08) continue;
    const sz = cl.sz * vis;
    const ex = Math.cos(th) * ASP, ey = Math.sin(th);
    const cx = SUNX + cl.rho * ex, cy = SUNY + cl.rho * ey;
    let qx = -ex, qy = -ey; const ql = Math.hypot(qx, qy); qx /= ql; qy /= ql;   // q points at the sun
    const px_ = -qy, py_ = qx;
    const zc = FY * 40 / cl.rho, hz = Math.min(0.75, Math.floor(hazeZ(zc * 1.25) * 8) / 8);
    const ext = sz * 0.56;
    for (let y = Math.max(0, Math.floor(cy - ext)); y <= Math.min(H - 1, Math.ceil(cy + ext)); y++)
      for (let x = Math.max(0, Math.floor(cx - ext)); x <= Math.min(W - 1, Math.ceil(cx + ext)); x++) {
        const i = y * W + x;
        if (ZB[i] < zc) continue;
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        const u = (dx * px_ + dy * py_) / sz, v = (dx * qx + dy * qy) / sz + 0.14;
        const sh = cloudAt(cl, u, v);
        if (sh < -5) continue;
        const rim = cloudAt(cl, u + 0.8 / sz, v + 1.2 / sz) < -5;
        const val = 6.2 + sh * 2.6 + v * 5 + (rim ? 1.4 : 0) - (v < 1.5 / sz ? 2 : 0);
        const c = dv(i, val, CLOUD);
        buf[i] = hz > 0 ? mixc(c, dv(i, SKYV[i], SKY), hz) : c;
      }
  }
}

// ---------------------------------------------------------------- motes
const MOTES = [];
{
  const r = rng(31337);
  for (let k = 0; k < 16; k++) MOTES.push({ x: 40 + r() * 420, y: 150 + r() * 110, ax: 6 + r() * 14, ay: 3 + r() * 8,
    k1: 1 + Math.floor(r() * 3), k2: 2 + Math.floor(r() * 3), k3: 3 + Math.floor(r() * 5), p1: r() * TAU, p2: r() * TAU, p3: r() * TAU });
}

// ---------------------------------------------------------------- frame
function render(t) {
  buf.set(STATIC); gl.fill(0);
  const br = 0.5 + 0.5 * Math.sin(TAU * 6 * t / T);

  // the sun's halo breathes through the haze around it
  for (let n = 0; n < LH.length; n++) {
    const i = LH[n], sky = dv(i, SKYV[i] + br * HK[i], SKY);
    buf[i] = HQ[i] >= 1 ? sky : mixc(LAND[i], sky, HQ[i]);
  }
  // rivers and lakes glint
  for (let n = 0; n < LW.length; n++) {
    const i = LW[n], u = FP[i], z = FQ[i];
    // little sparkles that come and go, drifting downstream
    const cu = Math.floor(u * 1.4), cz = Math.floor(z * 1.1 + u * 0.3), h = hsh(cu * 12.9898 + cz * 78.233);
    if (h > 0.42) continue;
    const m = 2 + Math.floor(h * 14);
    const sp = Math.sin(TAU * (m * t / T + h * 7.31) + z * 0.35);
    if (sp > 0.8) {
      const c = GLINT[sp > 0.96 ? 2 : sp > 0.88 ? 1 : 0];
      buf[i] = HQ[i] > 0 ? mixc(c, dv(i, SKYV[i], SKY), HQ[i]) : c;
      if (sp > 0.94 && HQ[i] < 0.4) gl[i] = 1;
    }
  }
  // waterfalls pour, their feet foam
  for (let n = 0; n < LF.length; n++) {
    const i = LF[n], col = Math.round(FQ[i]), f = fract(FP[i] / 3.2 - 75 * t / T + hsh(col * 7.7) * 0.9);
    const c = f < 0.3 ? GLINT[2] : f < 0.7 ? GLINT[0] : WATER[10];
    buf[i] = mixc(c, dv(i, SKYV[i], SKY), HQ[i]);
  }
  for (let n = 0; n < LO.length; n++) {
    const i = LO[n], f = Math.sin(FP[i] * 3.1 + TAU * 12 * t / T) * Math.sin(FQ[i] * 4.3 - TAU * 9 * t / T);
    buf[i] = mixc(f > 0.2 ? GLINT[2] : f > -0.4 ? GLINT[0] : WATER[10], dv(i, SKYV[i], SKY), HQ[i]);
  }
  // windows
  for (let n = 0; n < LN.length; n++) {
    const i = LN[n], sd = FP[i], k = 1 + (sd % 3);
    const fl = 0.5 + 0.5 * Math.sin(TAU * (k * t / T + hsh(sd)));
    const c = dv(i, 1.6 + fl * 2.6, WIN);
    buf[i] = HQ[i] > 0 ? mixc(c, dv(i, SKYV[i], SKY), HQ[i]) : c;
    if (fl > 0.55 && HQ[i] < 0.5) gl[i] = 1;
  }

  drawClouds(t);

  // a few motes of light drifting over the valley
  for (const m of MOTES) {
    const x = m.x + m.ax * Math.sin(TAU * (m.k1 * t / T) + m.p1), y = m.y + m.ay * Math.sin(TAU * (m.k2 * t / T) + m.p2);
    const b = 0.5 + 0.5 * Math.sin(TAU * (m.k3 * t / T) + m.p3);
    if (b < 0.3) continue;
    const xi = Math.floor(x), yi = Math.floor(y);
    if (xi < 0 || yi < 0 || xi >= W || yi >= H) continue;
    const i = yi * W + xi;
    buf[i] = b > 0.75 ? GLINT[2] : GLINT[0]; gl[i] = b > 0.6 ? 1 : 0;
  }

  // the sun: a small orange disc in a soft ring of light
  const sr = 5.2;
  for (let y = SUNY - 12; y <= SUNY + 12; y++) for (let x = SUNX - 12; x <= SUNX + 12; x++) {
    const i = y * W + x, d = Math.hypot(x + 0.5 - SUNX, y + 0.5 - SUNY);
    if (d < sr) {
      buf[i] = dv(i, 2.2 + (1 - d / sr) * 1.6 - (x + y - SUNX - SUNY) * 0.06, SUN); gl[i] = 1;
    } else if (d < sr + 2.5 + br * 2.5) {
      gl[i] = THR[i] < 1 - (d - sr) / (2.5 + br * 2.5) ? 1 : 0;
    }
  }

  P.present(Math.floor(t * FPS));
}

diorama({ width: P.OW, height: P.OH, fps: FPS, duration: T, render });
