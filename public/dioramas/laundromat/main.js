// laundromat — 2am, rain. A corner laundromat seen at three-quarters from across the road, its big window the only
// warm thing for blocks: a row of still white washers, a pendant lamp, three plastic chairs, a big-leafed plant.
// One washer is turning, and in its round window a tiny galaxy slowly swirls. To the left the cross street runs off
// into the rain between dark blocks with a few lit windows, and the wet road gives everything back in long streaks.
import { diorama } from '../lib/runtime.js';
import { TAU, clamp, smoothstep, fract, noise2, fbm } from '../lib/util.js';
import { createPix, C, R, mixc, pk } from '../lib/pix.js';

const W = 480, H = 270, S = 4, T = 18, FPS = 30;
const P = createPix({ W, H, S, canvas: document.getElementById('out'),
  grade: { from: [28.6, 15.6, 5.1, 5.0, -5.6, 10.4, 12.1], to: [42.6, 15.2, 3.9, 6.0, -2.2, 17.0, 16.5], kL: 0.9, kC: 0.5, kW: 0.8,
    sel: [[286, 30, -14, 1.0, 3], [345, 30, 45, 1.1, 10]] }, grain: 0.08, glow: [0.8, 0.5] });
const { thr, buf, gl } = P;

// ---------------------------------------------------------------- colour
const SKY = R(['#111930', '#151e37', '#1a243f', '#1f2a46', '#25304d', '#2b3654', '#323d5b', '#394461', '#414b67', '#49536d', '#525a72', '#5b6277', '#656a7c', '#6e7281']);
const HAZE = R(['#2c3451', '#323a56', '#38405b', '#3f4660', '#464c65', '#4e536a']);
const CITY = R(['#0c1022', '#0f1428', '#13182e', '#171d34', '#1b223a', '#202740', '#252d46', '#2b334c', '#323a53']);
const ABRK = R(['#0e0d17', '#13121d', '#191723', '#1f1c2a', '#262131', '#2d2738', '#352e40', '#3e3548']);
const STUC = R(['#1f1b26', '#28212d', '#312834', '#3b2f3b', '#463742', '#523f49', '#5f4850', '#6c5257', '#7a5c5e', '#896766', '#98736e', '#a68077']);
const UPB = R(['#12141f', '#171925', '#1c1f2c', '#222533', '#292c3a', '#303341', '#383a48']);
const MTL = R(['#06070b', '#0b0d13', '#11141b', '#181c24', '#21252f', '#2b303b', '#383d49', '#4a4f5b', '#5f6470']);
const WIN = R(['#06080f', '#0a0d16', '#0e121e', '#131927', '#1a2131', '#222a3c', '#2c3547', '#384254']);
const AWN = R(['#2a0f13', '#3a1418', '#4b1b1e', '#5d2224', '#6f2a2a', '#813431', '#913f39', '#a04b42']);
const SIGN = R(['#6f6553', '#8b7f68', '#a6997e', '#bfb194', '#d5c7a9', '#e6d9bc', '#f3e8d0']);
const CEIL = R(['#8a7558', '#9e8865', '#b19a74', '#c2ab84', '#d1bb95']);
const WALL = R(['#7a6044', '#8f7350', '#a3865d', '#b6986b', '#c6a97b', '#d4b98d', '#e0c8a0', '#ead6b3']);
const ENAMEL = R(['#4f4a43', '#666057', '#7d766a', '#948c7e', '#aaa292', '#beb6a5', '#cfc8b7', '#ddd7c7', '#e9e4d6', '#f3efe4']);
const CHROME = R(['#2f2e2d', '#4b4945', '#6d6a64', '#928e85', '#b7b2a7', '#d9d5ca', '#f6f3ea']);
const DRUM = R(['#11141b', '#171b23', '#1e232c', '#262c36', '#303741', '#3c434d', '#4a515b']);
const FLOOR = R(['#4e3d2d', '#5f4b37', '#715a42', '#836a4f', '#957a5c', '#a68a69']);
const FLUO = R(['#d8dccb', '#eef1e2', '#fbfcf3', '#ffffff']);
const PEND = R(['#4a1f0d', '#6b2f12', '#8f4317', '#b85b1d', '#d97a2a', '#f09d45', '#fcc77a', '#fff0d0']);
const CHAIR = R(['#4a2116', '#64301e', '#813f25', '#9e522e', '#ba6a3b', '#cf864f']);
const LEAF = R(['#141f17', '#1b2a1e', '#243625', '#2e442d', '#3a5336', '#486340', '#59744b', '#6e8657', '#859864']);
const POT = R(['#6f675a', '#8b8270', '#a89e89', '#c3b9a2', '#d9d0ba']);
const CLOTH = R(['#2a3247', '#3a4560', '#4e5b78']);
const GALAXY = R(['#04041a', '#080a28', '#0e1139', '#15194d', '#1e2263', '#2a2c7a', '#383891', '#4a47a6', '#5f5ab8', '#7871c7', '#958cd4', '#b4aade', '#d2c8ea', '#ebe4f4', '#fff6f0', '#fffcf8']);
const CORE = R(['#ffd9a8', '#ffeccb', '#fff8ec']);
const LAMP = R(['#4d6582', '#6b86a8', '#90abc9', '#b8cfe5', '#dce9f5', '#f4f9fe', '#ffffff']);
const WARM = R(['#5e331c', '#834724', '#a8602f', '#c97d3f', '#e29c53', '#f3bd71', '#fcd99e', '#fff0d2']);
const PAVE = R(['#0f121b', '#141823', '#1a1e2a', '#202532', '#272c3a', '#2f3443', '#383c4c', '#424556', '#4d4f60']);
const ROAD = R(['#090c16', '#0c101c', '#101522', '#141a29', '#191f30', '#1e2537', '#242b3e', '#2a3245', '#31394d']);
const PUDC = R(['#04060c', '#070a12', '#0a0e18', '#0e121e']);
const RAIN_COOL = C('#8fa2c2'), RAIN_WARM = C('#f1d6a8'), RAIN_LAMP = C('#dfeaf6');
const VIOLET = C('#8c79d6');

// ---------------------------------------------------------------- perspective
// The shop front recedes to a vanishing point far off to the left (VPF); lines on it, and on anything parallel to it,
// are y = 169 + m * (x + 421), so a line is named by its slope m. The cross street runs off to VP2 on the horizon.
const VFX = -421, VFY = 169;
const fy = (m, x) => VFY + m * (x - VFX);
const mAt = (x, y) => (y - VFY) / (x - VFX);
const HZ = 186, V2X = 151;
const ybL = (x) => HZ + (V2X - x) * 0.0877;          // foot of the blocks on the left side of the cross street
const cbL = (x) => HZ + (V2X - x) * 0.17;            // kerb of the left pavement
const ybR = (x) => HZ + (x - V2X) * 0.302;           // foot of the blocks on the right side
const crossKerbX = (y) => 143 + (213.6 - y) / 27.6 * 8;

// shop-front lines
const M_PAR = -0.1326, M_CAP = -0.1265, M_AWA = -0.093, M_AWF = -0.07, M_AWB = -0.0635, M_WT = -0.0625, M_GT = -0.0595;
const M_WB = 0.047, M_BASE = 0.0577, M_CURB = 0.079, M_CURB2 = 0.084;
// interior lines (back wall, parallel to the front)
const M_CEIL = -0.04, M_MT = -0.0214, M_PAN = -0.0112, M_DC = 0.0066, M_MB = 0.0385;
const FX0 = 235;                                      // left edge of the shop front
const WIN_X = [247, 381], MUL = [276, 278], DOOR_X = [390, 424];
const LX = 38, LY = 95;                               // the streetlamp's lens, far left

// washer columns along the back wall, widening toward us
const COLS = [];
for (let x = 236.7; x < 430;) { const w = 24.5 * (x - VFX) / 759; COLS.push({ x0: Math.round(x), x1: Math.round(x + w) - 1, cx: x + w / 2, w }); x += w; }
const GAL = 4;
const GCX = COLS[GAL].cx, GCY = fy(M_DC, COLS[GAL].cx), GRG = 0.375 * COLS[GAL].w, GRR = 0.465 * COLS[GAL].w;
const PUD = { cx: 330, cy: 244, rx: 48, ry: 9 };    // a puddle in the road that holds the galaxy upside down

const hsh = (n) => { const s = Math.sin(n * 91.3458 + 17.17) * 47453.5453; return s - Math.floor(s); };
const h2 = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
const mod = (a, n) => ((a % n) + n) % n;

const THR = new Float32Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) THR[y * W + x] = thr(x, y);
function dq(i, v, ramp) {
  const n = ramp.length - 1;
  if (v <= 0) return ramp[0];
  if (v >= n) return ramp[n];
  const k = v | 0;
  return (v - k > THR[i]) ? ramp[k + 1] : ramp[k];
}
const fq = (i, f, steps) => Math.floor(f * steps + THR[i]) / steps;   // dithered, quantised fraction

// ---------------------------------------------------------------- static drawing
const BASE = [new Uint32Array(W * H), new Uint32Array(W * H)];       // [one ceiling panel off, all lit]
const BGL = [new Uint8Array(W * H), new Uint8Array(W * H)];
const GLASS = new Uint8Array(W * H);                                 // 1 shop window, 2 door
const KIND = new Int8Array(W * H).fill(-1);                          // ground: 0 road, 1 shop pavement, 2 left pavement, 3 kerb top, 4 kerb face
const PUDM = new Uint8Array(W * H), JOINT = new Uint8Array(W * H);
let TB = BASE[1], TG = BGL[1];
function sp(x, y, c, g = 0) { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; TB[i] = c; TG[i] = g; }
function sv(x, y, v, ramp, g = 0) { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; TB[i] = dq(i, v, ramp); TG[i] = g; }
function blend(x, y, c, f) { if (x < 0 || y < 0 || x >= W || y >= H || f <= 0) return; const i = y * W + x; TB[i] = mixc(TB[i], c, f); }
const rect = (x0, y0, x1, y1, fn) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fn(x, y); };

function brick(x, y, seed = 0) {
  const row = Math.floor(y / 3), off = (row & 1) * 3 + seed;
  const bx = Math.floor((x + off) / 7);
  if (y % 3 === 2) return -0.9;
  if ((x + off) % 7 === 0) return -0.7;
  return (h2(bx + seed * 13, row) - 0.5) * 1.1 + (fbm(x * 0.05 + seed, y * 0.05, 3) - 0.5) * 1.2;
}
const plaster = (x, y, seed = 0) => (fbm(x * 0.07 + seed, y * 0.07, 4) - 0.5) * 1.4 + (noise2(x * 0.6, y * 0.6) - 0.5) * 0.35;

// ---------------------------------------------------------------- sky
function sky() {
  for (let y = 0; y < 200; y++) for (let x = 0; x < W; x++) {
    const cl = fbm(x * 0.011 + 3.3, y * 0.032 + 1.1, 5);
    const mass = smoothstep(0.5, 0.68, cl);
    let v = 1.0 + Math.pow(y / HZ, 1.1) * 8.2 + mass * 2.8 - smoothstep(0.42, 0.5, cl) * (1 - mass) * 0.7 + (cl - 0.5) * 1.2;
    v += Math.exp(-(((x - V2X) / 95) ** 2) - (((y - HZ) / 34) ** 2)) * 2.4;     // the street's end glows in the rain
    sv(x, y, v, SKY);
  }
}
// far end of the cross street: hazy blocks with a few lights
function distance() {
  for (let k = 0; k < 16; k++) {
    const x0 = 112 + Math.floor(hsh(k * 1.9) * 80), w = 5 + Math.floor(hsh(k * 2.7) * 10);
    const dfar = 1 - Math.abs(x0 + w / 2 - V2X) / 50;
    const top = Math.round(HZ - 4 - hsh(k * 3.1) * 12 * (1.2 - dfar));
    for (let x = x0; x < x0 + w; x++) for (let y = top; y <= HZ + 1; y++) sv(x, y, 1.0 + (y - top) / 12 * 2 + dfar * 1.4, HAZE);
    if (hsh(k * 5.5) > 0.5) sp(x0 + 1 + Math.floor(hsh(k * 6.1) * (w - 2)), top + 3, WARM[2]);
  }
}
const LITW = [];                                      // lit windows down the cross street: [x, y, foot]
// a block on either side of the cross street: a face toward us, a side face running off to VP2, a grid of windows
function block(b) {
  const L = b.side === 'L';
  const base = L ? ybL(b.x1) : ybR(b.x0);
  const lit = new Set(b.lit || []);
  const face = (x, y, v) => sv(x, y, v + plaster(x, y, b.seed) * 0.7, b.ramp || CITY);
  for (let y = b.top; y <= Math.ceil(base); y++) for (let x = b.x0; x <= b.x1; x++) face(x, y, b.v + (y === b.top ? 1.4 : 0) - (y - b.top) * 0.004);
  const sx0 = L ? b.x1 + 1 : b.x0 - b.sw, sx1 = L ? b.x1 + b.sw : b.x0 - 1;
  for (let x = sx0; x <= sx1; x++) {
    const dx = L ? x - b.x1 : b.x0 - x, span = L ? V2X - b.x1 : b.x0 - V2X;
    const t = b.top + dx * (HZ - b.top) / span, bb = L ? ybL(x) : ybR(x);
    for (let y = Math.round(t); y <= Math.ceil(bb); y++) face(x, y, b.v - 1.3 + (Math.round(t) === y ? 1 : 0));
  }
  // windows on the face toward us
  const [ww, wh, gx, gy] = b.win;
  let n = 0;
  for (let y = b.top + 4; y + wh < base - 3; y += gy) for (let x = b.x0 + 2; x + ww <= b.x1 - 1; x += gx) {
    const on = lit.has(n++);
    if (on) LITW.push([x + (ww - 1) / 2, y + wh / 2, base, ww]);
    for (let yy = y; yy < y + wh; yy++) for (let xx = x; xx < x + ww; xx++) {
      const i = yy * W + xx;
      if (on) { TB[i] = dq(i, 3.6 + (yy - y === 0 ? 1.4 : 0) + (xx - x === 0 ? 0.6 : 0) - (yy - y) * 0.25, WARM); TG[i] = yy - y < 2 ? 1 : 0; }
      else TB[i] = dq(i, 0.5 + (yy === y ? 0.8 : 0), b.ramp || CITY);
    }
  }
  // windows on the side face: narrow slits
  if (b.sideWin) for (const [k, on] of b.sideWin) {
    const x = L ? b.x1 + 2 + k * 3 : b.x0 - 3 - k * 3;
    const dx = L ? x - b.x1 : b.x0 - x, span = L ? V2X - b.x1 : b.x0 - V2X;
    const tt = b.top + dx * (HZ - b.top) / span;
    for (let r = 0; r < 4; r++) {
      const yy = Math.round(tt + 6 + r * 9);
      if (yy + 3 > (L ? ybL(x) : ybR(x)) - 3) break;
      if (on === r) LITW.push([x, yy + 1.5, L ? ybL(x) : ybR(x), 1]);
      for (let q = 0; q < 3; q++) { const i = (yy + q) * W + x; if (on === r) { TB[i] = WARM[q ? 3 : 5]; TG[i] = q ? 0 : 1; } else TB[i] = dq(i, 0.6, b.ramp || CITY); }
    }
  }
}

// ---------------------------------------------------------------- ground
const pudEdge = (x, y) => Math.min(Math.hypot((x + 0.5 - PUD.cx) / PUD.rx, (y + 0.5 - PUD.cy) / PUD.ry), Math.hypot((x + 0.5 - 286) / 20, (y + 0.5 - 249) / 5)) + (noise2(x * 0.07, y * 0.3) - 0.5) * 0.7 + (noise2(x * 0.4, y * 0.8) - 0.5) * 0.16;
function ground(lit) {
  for (let y = HZ + 1; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    let kind = 0;
    const yc = fy(M_CURB, x), cx = crossKerbX(y);
    if (y <= yc + 3 && x >= cx - 1 && y < 214.5) {
      const back = x >= 214 ? fy(M_BASE, x) : ybR(x);
      if (y >= back - 1) {
        if (x < cx) kind = 3;
        else if (y < yc - 0.5) kind = 1;
        else if (y < yc + 0.6) kind = 3;
        else if (y <= fy(M_CURB2, x)) kind = 4;
      }
    } else if (y <= yc + 3 && x >= 140) {
      const back = fy(M_BASE, x);
      if (y >= back - 1) { if (y < yc - 0.5) kind = 1; else if (y < yc + 0.6) kind = 3; else if (y <= fy(M_CURB2, x)) kind = 4; }
    }
    if (kind === 0 && x < V2X && y >= ybL(x) - 1 && y <= cbL(x) + 2) kind = y < cbL(x) - 0.5 ? 2 : y < cbL(x) + 0.6 ? 3 : 4;
    KIND[i] = kind;
    let c;
    if (kind === 1) {
      // tiled pavement: rows run with the shop front, joints run off to the far end of the street
      const m = mAt(x + 0.5, y + 0.5), row = (m - M_BASE) / (M_CURB - M_BASE) * 4;
      const a = (x + 0.5 - V2X) / (y + 0.5 - HZ) * 2.2;
      const fr = row - Math.floor(row), fa = a - Math.floor(a);
      const jr = fr < 0.12 || fr > 0.94, ja = fa < 0.06 * (1 + row * 0.1);
      let v = 3.0 + (h2(Math.floor(a), Math.floor(row)) - 0.5) * 1.2 + (fbm(x * 0.15, y * 0.3, 2) - 0.5) * 0.8 - (jr || ja ? 1.6 : 0);
      if (jr || ja) JOINT[i] = 1;
      if (y <= Math.ceil(fy(M_BASE, x))) v -= 0.8;
      c = dq(i, v, PAVE);
    } else if (kind === 2) c = dq(i, 2.0 + (fbm(x * 0.2, y * 0.4, 2) - 0.5), PAVE);
    else if (kind === 3) c = mixc(dq(i, 7.0 + (noise2(x * 0.3, y) - 0.5) * 0.8, PAVE), WARM[4], 0.3 * smoothstep(225, 260, x) * (1 - smoothstep(430, 470, x)));
    else if (kind === 4) c = dq(i, 1.0, PAVE);
    else {
      const d = (y - HZ) / (H - HZ);
      let v = 3.6 - d * 1.6 + (fbm(x * 0.05 / (0.2 + d), y * 0.22, 4) - 0.5) * 1.6 + (h2(x, y) > 0.94 ? 0.8 : 0);
      // a manhole cover
      const mh = Math.hypot((x + 0.5 - 196) / 11, (y + 0.5 - 254) / 3.2);
      if (mh < 1) v = mh > 0.82 ? 1.2 : 2.6 + ((x + (y & 1)) % 3 === 0 ? -0.8 : 0);
      c = dq(i, v, ROAD);
      if (pudEdge(x, y) < 1) { PUDM[i] = 1; c = dq(i, 1.4 + (fbm(x * 0.1, y * 0.3, 2) - 0.5) * 0.8, PUDC); }
    }
    TB[i] = c; TG[i] = 0;
  }
  // warm light spilling out through the window onto the wet pavement
  for (let y = 196; y < 262; y++) for (let x = 200; x < W; x++) {
    const i = y * W + x, k0 = KIND[i];
    if (k0 < 0) continue;
    const m = mAt(x + 0.5, y + 0.5), dm = (m - M_BASE) / (M_CURB - M_BASE);
    if (dm < 0) continue;
    const xl = 247 - dm * 18, xr = 424 + dm * 22;
    const edge = clamp(Math.min(x - xl + 10, xr + 10 - x) / 18);
    let k = edge * Math.exp(-dm * 0.9) * (k0 === 1 ? 0.34 : k0 === 3 ? 0.5 : 0.14) * (lit ? 1 : 0.85) * (0.55 + 0.8 * fbm(x * 0.09, y * 0.5, 3));
    if (x > 382 && x < 391) k *= 0.6;
    if (k > 0.01) TB[i] = mixc(TB[i], WARM[4], fq(i, k, 8));
  }
  // the streetlamp's pool, cold
  for (let y = 196; y < 250; y++) for (let x = 0; x < 110; x++) {
    const i = y * W + x;
    if (KIND[i] < 0) continue;
    const d = Math.hypot((x - LX - 4) / 46, (y - 214) / 14);
    let k = d < 1 ? Math.pow(1 - d, 1.5) * 0.5 : 0;
    if (KIND[i] === 3) k *= 1.6;
    if (k > 0.01) TB[i] = mixc(TB[i], LAMP[3], fq(i, k, 8));
  }
}

// ---------------------------------------------------------------- the near-left block and the streetlamp
function leftBlock() {
  // face toward us, x 0..28; side running off, 28..42
  const top = 62, base = ybL(28);
  for (let y = top; y <= Math.ceil(base); y++) for (let x = 0; x <= 28; x++) {
    const lampK = Math.exp(-(((x - LX) / 26) ** 2) - (((y - 130) / 60) ** 2)) * 1.6;
    sv(x, y, 3.0 + brick(x, y, 4) * 1.1 + lampK, ABRK);
  }
  for (let x = 0; x <= 28; x++) { sv(x, top, 6, ABRK); sv(x, top + 1, 4.2, ABRK); sv(x, top + 2, 0.6, ABRK); }
  for (let x = 29; x <= 42; x++) {
    const t = top + (x - 28) * (HZ - top) / (V2X - 28);
    for (let y = Math.round(t); y <= Math.ceil(ybL(x)); y++) sv(x, y, 1.8 + brick(x, y, 9) * 0.7 + (y === Math.round(t) ? 1.4 : 0), ABRK);
  }
  // windows, two lit
  const lit = new Set(['1,2', '0,4']);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
    const x0 = 3 + c * 9, y0 = 70 + r * 20;
    const on = lit.has(`${c},${r}`);
    for (let x = x0 - 1; x <= x0 + 5; x++) { sv(x, y0 - 1, 1, ABRK); sv(x, y0 + 9, 6, ABRK); }
    for (let y = y0; y <= y0 + 8; y++) for (let x = x0; x <= x0 + 4; x++) {
      const i = y * W + x;
      if (on) { TB[i] = dq(i, 3.2 + (1 - (y - y0) / 8) * 1.8 + (x === x0 ? 0.6 : 0), WARM); TG[i] = y - y0 < 3 ? 1 : 0; if (x === x0 + 4 || (y === y0 + 4)) TB[i] = WARM[1]; }
      else { TB[i] = dq(i, 1.6 - (y - y0) * 0.12 + (fbm(x * 0.3, y * 0.2, 2) - 0.5), WIN); if (y === y0 + 4) TB[i] = WIN[0]; }
    }
  }
  // a door at the foot
  rect(14, 172, 24, Math.floor(base), (x, y) => sv(x, y, x === 14 || x === 24 || y === 172 ? 0.6 : 1.4 + ((x - 14) % 5 === 0 ? -0.5 : 0), MTL));
  rect(13, 170, 25, 171, (x, y) => sv(x, y, 4.5, ABRK));
}
function streetlamp() {
  for (let y = 98; y <= 207; y++) { sv(22, y, 2.6 + (y < 140 ? 1.2 : 0), MTL); sv(23, y, 1.2, MTL); }
  rect(21, 200, 24, 207, (x, y) => sv(x, y, x === 21 ? 4 : 1.8, MTL));
  for (let k = 0; k <= 20; k++) { const a = k / 20 * Math.PI / 2, x = Math.round(33 - Math.cos(a) * 10), y = Math.round(99 - Math.sin(a) * 6); sv(x, y, 5.2, MTL); sv(x, y + 1, 1.6, MTL); }
  for (let x = LX - 7; x <= LX + 7; x++) { sv(x, LY - 4, 3.4 + (x > LX ? 0.6 : 0), MTL); sv(x, LY - 3, 2.2, MTL); sv(x, LY - 2, 1.4, MTL); }
  for (let x = LX - 6; x <= LX + 6; x++) sp(x, LY - 1, LAMP[Math.abs(x - LX) < 5 ? 6 : 4], 1);
  for (let x = LX - 4; x <= LX + 4; x++) sp(x, LY, LAMP[4], 1);
}
const coneI = (x, y) => {
  if (y <= LY) return 0;
  const dy = y - LY, hw = 4 + dy * 0.4, dx = Math.abs(x + 0.5 - LX);
  return smoothstep(hw, hw * 0.3, dx) * Math.exp(-dy / 90);
};
function lampLight() {
  for (let y = LY + 1; y < 230; y++) for (let x = 0; x <= LX + 70; x++) {
    const i = y * W + x, k = coneI(x, y);
    if (k > 0.01) TB[i] = mixc(TB[i], LAMP[2], fq(i, k * 0.3, 12));
  }
}

// ---------------------------------------------------------------- the laundromat building
function upperBlock() {
  // a taller block set back above the shop, one lit window
  for (let x = 345; x < W; x++) {
    const yt = Math.max(0, Math.ceil(fy(-0.205, x))), yb = Math.ceil(fy(M_PAR, x)) + 1;
    const side = x < 352;
    for (let y = yt; y <= yb; y++) sv(x, y, (side ? 1.4 : 3.0) + brick(x, y, 6) * 0.8 + plaster(x, y, 21) * 0.4 + (y === yt ? 2.4 : y === yt + 1 ? 1.2 : y === yt + 2 ? -1 : 0), UPB);
  }
  const win = (x0, x1, on) => {
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      const t = Math.round(fy(-0.19, x)), b = Math.round(fy(-0.14, x));
      for (let y = t - 1; y <= b + 1; y++) {
        if (y < 0) continue;
        const i = y * W + x;
        if (x < x0 || x > x1 || y < t || y > b) { TB[i] = dq(i, y > b ? 5.5 : 0.8, UPB); continue; }
        const u = (y - t) / (b - t);
        if (on) {
          let c = dq(i, 3.4 + (1 - u) * 1.6 + (x === x0 ? 0.8 : 0) - Math.abs(u - 0.6) * 0.8, WARM);
          if (x === Math.round((x0 + x1) / 2) || Math.abs(u - 0.45) < 0.03) c = WARM[1];
          TB[i] = c; TG[i] = u < 0.4 && x !== Math.round((x0 + x1) / 2) ? 1 : 0;
        } else { TB[i] = dq(i, 2.0 - u * 1.2 + (fbm(x * 0.3, y * 0.1, 2) - 0.5), WIN); if (Math.abs(u - 0.45) < 0.03) TB[i] = WIN[0]; }
      }
    }
  };
  win(372, 382, false); win(414, 425, true); win(452, 463, false);
  for (let y = 0; y < 70; y++) for (let x = 400; x < 442; x++) {
    const i = y * W + x;
    if (TG[i] || (x >= 413 && x <= 426)) continue;
    const d = Math.hypot((x - 419.5) / 18, (y - 34) / 30);
    if (d < 1 && y > fy(-0.205, x) && y < fy(M_PAR, x)) TB[i] = mixc(TB[i], WARM[2], fq(i, (1 - d) * 0.22, 6));
  }
}

function facade() {
  for (let x = FX0; x < W; x++) {
    const yt = Math.ceil(fy(M_PAR, x)), yb = Math.ceil(fy(M_BASE, x)) - 1;
    const stainLen = noise2(x * 0.6, 4.4) > 0.55 ? 6 + Math.floor(noise2(x * 0.2, 9) * 40) : 0;
    for (let y = yt; y <= yb; y++) {
      const m = mAt(x + 0.5, y + 0.5);
      let v = 3.3 + plaster(x, y, 11) * 1.2;
      v += Math.exp(-(((m - M_AWA) / 0.05) ** 2)) * 2.8 * (1 - smoothstep(430, 470, x) * 0.6);   // the window's glow climbs the wall
      v += Math.exp(-(((x - 236) / 18) ** 2) - (((y - 92) / 18) ** 2)) * 2.2;                      // the sign
      if (m > M_WB) v = 2.4 + plaster(x, y, 5) * 0.8 + ((y + x) % 7 === 0 ? -0.4 : 0);               // stall riser
      if (y - yt < stainLen && h2(x, 3) > 0.3) v -= 0.9 * (1 - (y - yt) / stainLen);                  // rain stains from the coping
      if (m < M_CAP) v = y === yt ? 8.6 : 6.4 - (m - M_PAR) / (M_CAP - M_PAR) * 3;
      else if (m < M_CAP + 0.004) v -= 1.6;
      if (x === FX0) v -= 1.2;
      sv(x, y, v, STUC);
    }
  }
  for (const [cx, cy, n] of [[300, 80, 18], [452, 120, 26], [262, 92, 9]]) {
    let x = cx, y = cy;
    for (let k = 0; k < n; k++) { blend(Math.round(x), Math.round(y), STUC[0], 0.5); y += 1; x += (h2(k, cx) - 0.5) * 1.5; }
  }
  for (let y = Math.ceil(fy(M_CAP, 470)); y < Math.ceil(fy(M_BASE, 472)) - 1; y++) { sv(470, y, 3.4, MTL); sv(471, y, 1.6, MTL); if (y % 24 === 0) { sv(469, y, 4, MTL); sv(472, y, 2, MTL); } }
  rect(446, 140, 458, 150, (x, y) => sv(x, y, (y - 140) % 2 ? 0.8 : 2.4, MTL));
}

// interior light: the pendant and two recessed panels
function lint(x, y, lit) {
  let s = 1.1 / (1 + ((x - 334) ** 2 + ((y - 140) ** 2) * 1.3) / 2600);
  s += 0.55 / (1 + ((x - 309) ** 2 + ((y - 130) ** 2) * 1.5) / 1500);
  if (lit) s += 0.55 / (1 + ((x - 362) ** 2 + ((y - 130) ** 2) * 1.5) / 1500);
  return Math.min(1.4, s);
}
function machinePx(x, y, m, i, L) {
  let k = -1;
  for (let q = 0; q < COLS.length; q++) if (x >= COLS[q].x0 && x <= COLS[q].x1) { k = q; break; }
  if (k < 0) return dq(i, 1 + L * 4, WALL);
  const cl = COLS[k];
  const cy = fy(M_DC, cl.cx), rg = 0.375 * cl.w, rr = 0.465 * cl.w;
  const px = x + 0.5 - cl.cx, py = y + 0.5 - cy, r = Math.hypot(px, py), ang = Math.atan2(py, px);
  if (r < rg) {
    let v = 1.6 + L * 1.4 - (py / rg) * 0.9 - (r / rg) * 0.8;
    if (((x * 3 + y * 2) % 5 === 0) && r < rg - 1.6) v += 0.7;
    let c = dq(i, v, DRUM);
    if (k === 2 && py > 2 + Math.sin(px * 0.8) * 0.8) c = dq(i, 1.2 + L - py * 0.12, CLOTH);       // somebody's forgotten load
    if (r > rg - 2.6 && r < rg - 0.9 && ang > -2.75 && ang < -1.6) c = mixc(c, CHROME[6], 0.5);
    if (r > rg - 1.8 && ang > 0.4 && ang < 1.1) c = mixc(c, CHROME[4], 0.22);
    return c;
  }
  if (r < rr) {
    const lt = Math.cos(ang + 2.2);
    return dq(i, 2.4 + lt * 1.8 + L * 1.0 - (r > rr - 0.8 ? 0.9 : 0) + (r < rg + 0.7 ? -0.9 : 0), CHROME);
  }
  let v = 2.4 + L * 4.4;
  if (m < M_MT + 0.0016) v += 1.6;
  if (x === cl.x0) v -= 2.8;
  if (x === cl.x0 + 1) v += 0.4;
  if (x === cl.x1) v -= 1.0;
  if (r < rr + 1.3) v += Math.sin(ang) > 0.2 ? -1.1 : 0.3;
  if (m < M_PAN) v += 0.5;
  else if (m < M_PAN + 0.0016) v -= 1.4;
  if (m > M_MB - 0.0045) v -= 1.4;
  return dq(i, v, ENAMEL);
}
function interior(lit) {
  for (let x = 243; x <= 428; x++) {
    const y0 = Math.floor(fy(M_WT, x)), y1 = Math.ceil(fy(M_WB, x));
    for (let y = y0; y <= y1; y++) {
      const i = y * W + x, m = mAt(x + 0.5, y + 0.5), L = lint(x, y, lit);
      let c;
      if (m < M_CEIL) c = dq(i, 0.6 + L * 2.4 + (m - M_WT) / (M_CEIL - M_WT) * 0.6, CEIL);
      else if (m < M_MT) c = dq(i, 1.0 + L * 4.0 + (noise2(x * 0.3, y * 0.3) - 0.5) * 0.4 - (m < M_CEIL + 0.002 ? 1 : 0), WALL);
      else if (m < M_MB) c = machinePx(x, y, m, i, L);
      else {
        const dz = y - 160, u = (x + 0.5 - 334) / dz * 2.6, w = 260 / dz;
        const iu = Math.floor(u), iw = Math.floor(w);
        c = dq(i, (((iu + iw) & 1) ? 3.0 : 1.3) + L * 1.4 - ((u - iu) < 0.08 ? 0.7 : 0), FLOOR);
      }
      TB[i] = c; TG[i] = 0;
    }
  }
  // glossy floor: a faint copy of the washers
  for (let x = 243; x <= 428; x++) {
    const yb = fy(M_MB, x);
    for (let y = Math.ceil(yb); y <= Math.ceil(fy(M_WB, x)); y++) {
      const sy = Math.round(2 * yb - y - 1);
      blend(x, y, TB[sy * W + x], 0.3 * (1 - (y - yb) / 6));
    }
  }
  // panel details: a slot, a dial, an indicator; hinge and handle
  COLS.forEach((cl) => {
    const py = Math.round(fy((M_MT + M_PAN) / 2, cl.cx));
    for (let x = cl.x0 + 3; x <= cl.x0 + 8; x++) sp(x, py, DRUM[2]);
    sp(cl.x1 - 4, py - 1, CHROME[4]); sp(cl.x1 - 3, py - 1, CHROME[5]); sp(cl.x1 - 4, py, CHROME[3]); sp(cl.x1 - 3, py, CHROME[4]);
    sp(cl.x1 - 7, py, DRUM[3]);
    const cy = Math.round(fy(M_DC, cl.cx)), rr = 0.465 * cl.w;
    sp(Math.round(cl.cx - rr) + 1, cy - 4, CHROME[2]); sp(Math.round(cl.cx - rr) + 1, cy + 3, CHROME[2]);
    for (let q = -2; q <= 2; q++) sp(Math.round(cl.cx + rr) - 1, cy + q, CHROME[q < 0 ? 5 : 3]);
  });
  // ceiling panels and the pendant lamp
  for (const [a, b, on] of [[300, 318, true], [352, 371, lit]]) {
    for (let x = a; x <= b; x++) {
      const y = Math.round(fy(-0.051, x));
      sp(x, y - 1, CEIL[1]);
      sp(x, y, on ? FLUO[3] : FLUO[0], on ? 1 : 0);
      sp(x, y + 1, on ? FLUO[2] : CEIL[2], on ? 1 : 0);
      sp(x, y + 2, CEIL[1]);
    }
  }
  for (let y = Math.round(fy(M_WT, 334)) + 1; y <= 128; y++) sp(334, y, MTL[3]);
  for (let y = 129; y <= 137; y++) {
    const u = (y - 129) / 8, hw = 3 + Math.sqrt(u) * 8.6;
    for (let x = Math.round(334 - hw); x <= Math.round(334 + hw); x++) {
      const v = 3.0 + (1 - u) * 1.4 - (x - 334) / hw * 0.8 + (y === 137 ? 2.6 : 0);
      sv(x, y, v, PEND, y === 137 ? 1 : 0);
    }
  }
  for (let x = 331; x <= 337; x++) sp(x, 138, PEND[x > 332 && x < 336 ? 7 : 6], 1);
  sp(333, 139, PEND[7], 1); sp(334, 139, FLUO[3], 1); sp(335, 139, PEND[7], 1);
  // a clock with no numbers, reading two, and a shelf with three bottles
  { const cx = 291, cy = Math.round(fy(-0.031, 291));
    for (let y = cy - 5; y <= cy + 5; y++) for (let x = cx - 5; x <= cx + 5; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d < 3.6) sp(x, y, ENAMEL[9]); else if (d < 4.7) sp(x, y, MTL[4]);
    }
    sp(cx, cy, MTL[2]); sp(cx, cy - 1, MTL[2]); sp(cx, cy - 2, MTL[2]); sp(cx + 1, cy, MTL[2]); sp(cx + 2, cy - 1, MTL[2]);
  }
  { const y = Math.round(fy(-0.024, 362));
    for (let x = 352; x <= 373; x++) { sp(x, y, MTL[5]); sp(x, y + 1, WALL[1]); }
    const bot = [[355, C('#3d6a8a'), C('#5b8aab')], [360, C('#d9d4c8'), C('#f2eee4')], [365, C('#c8743a'), C('#e59a5a')]];
    for (const [bx, c0, c1] of bot) for (let k = 1; k <= 5; k++) { sp(bx, y - k, c1); sp(bx + 1, y - k, c0); sp(bx + 2, y - k, k < 5 ? c0 : WALL[2]); }
  }
  // big-leafed plant in a cream pot, in the corner of the window
  for (let y = 189; y <= 202; y++) {
    const hw = 5.5 - (y - 189) * 0.12;
    for (let x = Math.round(257 - hw); x <= Math.round(257 + hw); x++) sv(x, y, 2.4 + (x < 257 ? 0.8 : -0.4) + (y === 189 ? 1.5 : y === 190 ? -1.2 : 0), POT);
  }
  const leaves = [[257, 189, 248, 166, 0], [257, 189, 266, 160, 1], [258, 189, 252, 150, 2], [257, 189, 262, 176, 3], [256, 189, 250, 180, 4], [258, 189, 268, 172, 5], [257, 189, 259, 155, 6]];
  for (const [bx, by, tx, ty, j] of leaves) {
    for (let k = 0; k <= 20; k++) { const u = k / 20; sv(Math.round(bx + (tx - bx) * u * 0.7), Math.round(by + (ty - by) * u * 0.8), 2.0, LEAF); }
    const ang = Math.atan2(ty - by, tx - bx), len = 9, wid = 3.4;
    const lx = bx + (tx - bx) * 0.72, ly = by + (ty - by) * 0.8;
    for (let y = Math.floor(ly - 10); y <= Math.ceil(ly + 10); y++) for (let x = Math.floor(lx - 10); x <= Math.ceil(lx + 10); x++) {
      const dx = x + 0.5 - lx, dy = y + 0.5 - ly;
      const a = dx * Math.cos(ang) + dy * Math.sin(ang), b = -dx * Math.sin(ang) + dy * Math.cos(ang);
      const e = (a / len) ** 2 + (b / (wid * (1 - Math.abs(a) / (len * 1.15)) + 0.4)) ** 2;
      if (a < -len * 0.15 || e > 1) continue;
      const vein = Math.abs(b) < 0.5 && a > 0;
      sv(x, y, 3.2 + (b < 0 ? 1.6 : 0) + lint(x, y, lit) * 1.2 - e * 1.2 - (vein ? 1.4 : 0) + (j % 2) * 0.4, LEAF);
    }
  }
  // three plastic chairs
  const CH = ['.bbbbbbbbbb.', 'bBCCCCCCCCBb', 'bBBBBBBBBBBb', 'bBBBBBBBBBBb', 'bBBBBBBBBBBb', 'bBBBBBBBBBBb', 'bBBBBBBBBBBb', '.bBBBBBBBBb.',
    '..m......m..', '..m......m..', 'ssssssssssss', 'SSSSSSSSSSSS', 'dddddddddddd', '.l........l.', '.l........l.', '.l........l.', '.l........l.', '.l........l.', '.L........L.'];
  const key = { b: CHAIR[1], B: CHAIR[3], C: CHAIR[4], s: CHAIR[5], S: CHAIR[4], d: CHAIR[1], m: CHROME[2], l: CHROME[3], L: FLOOR[0] };
  for (const cx of [279, 293, 307]) for (let r = 0; r < CH.length; r++) for (let c = 0; c < 12; c++) {
    const ch = CH[r][c];
    if (ch !== '.') sp(cx + c, 183 + r, key[ch]);
  }
  rect(296, 191, 302, 192, (x, y) => sp(x, y, y === 191 ? C('#c9d6de') : C('#8fa3b3')));   // a folded towel, left behind
}

function shopfront(lit) {
  // glass: a cold tint, a faint diagonal sheen, fog at the foot
  for (let x = WIN_X[0]; x <= DOOR_X[1]; x++) {
    const kind = x <= WIN_X[1] ? 1 : x >= DOOR_X[0] ? 2 : 0;
    if (!kind || (x >= MUL[0] && x <= MUL[1])) continue;
    const y0 = Math.ceil(fy(M_GT, x)), y1 = Math.floor(fy(kind === 1 ? M_WB : 0.0425, x)) - (kind === 1 ? 1 : 0);
    for (let y = y0; y <= y1; y++) {
      const i = y * W + x;
      GLASS[i] = kind;
      let c = mixc(TB[i], C('#1a2235'), 0.08);
      const s = mod(x * 0.9 + y * 0.6, 110);
      if (s < 14) c = mixc(c, C('#cdd8e4'), fq(i, 0.08 * Math.sin(s / 14 * Math.PI), 4));
      const fogY = fy(M_WB, x) - 10;
      if (y > fogY) c = mixc(c, C('#bdb7a8'), fq(i, (y - fogY) / 12 * 0.2, 6));
      TB[i] = c;
    }
  }
  const frame = (x, y, v) => sv(x, y, v, MTL);
  for (let x = 243; x <= 428; x++) {
    const yt = Math.round(fy(M_WT, x)), yb = Math.round(fy(M_WB, x));
    for (const yy of [yt, yt + 1]) frame(x, yy, yy === yt ? 1.8 : 3);
    if (x <= 386) { frame(x, yb, 7.2); frame(x, yb + 1, 4.4); frame(x, yb + 2, 1.6); }
  }
  for (let y = 100; y < 230; y++) {
    const inX = (x) => y >= Math.round(fy(M_WT, x)) && y <= Math.round(fy(x <= 386 ? M_WB : M_BASE, x));
    for (const [x, v] of [[243, 2.4], [244, 5.4], [245, 4.2], [246, 1.6], [MUL[0], 5], [MUL[0] + 1, 3.6], [MUL[1], 1.6], [382, 5.2], [383, 3.4], [384, 1.6], [385, 2.6], [386, 2.6], [387, 2.4], [388, 5.4], [389, 2.0], [425, 5.2], [426, 3.4], [427, 1.6], [428, 2.4]]) if (inX(x)) frame(x, y, v);
  }
  // door: push bar, handle, kick plate
  for (let x = 392; x <= 422; x++) { const y = Math.round(fy(0.012, x)); sp(x, y, CHROME[5]); sp(x, y + 1, CHROME[2]); }
  for (let y = Math.round(fy(-0.004, 393)); y <= Math.round(fy(0.026, 393)); y++) sp(393, y, CHROME[4]);
  for (let x = 390; x <= 424; x++) for (let y = Math.ceil(fy(0.0425, x)); y <= Math.ceil(fy(M_BASE, x)) - 1; y++) sv(x, y, y === Math.ceil(fy(0.0425, x)) ? 7 : 3 + (fbm(x * 0.4, y * 0.4, 2) - 0.5), MTL);
  // beads of rain on the glass
  for (let k = 0; k < 90; k++) {
    const x = WIN_X[0] + Math.floor(hsh(k * 4.1) * (DOOR_X[1] - WIN_X[0]));
    const y = 126 + Math.floor(Math.pow(hsh(k * 2.7), 0.8) * 76);
    const i = y * W + x;
    if (!GLASS[i]) continue;
    TB[i] = mixc(TB[i], C('#ffffff'), 0.32);
    if (GLASS[i + W]) TB[i + W] = mixc(TB[i + W], C('#20232c'), 0.32);
  }
}

function awning() {
  for (let x = 225; x <= 434; x++) {
    const yF = fy(M_AWF, x);
    const yA = x < 238 ? 107.7 + (238 - x) / 13 * (yF - 107.7) : fy(M_AWA, x);
    for (let y = Math.ceil(yA); y <= Math.floor(yF); y++) {
      const u = (y - yA) / Math.max(1, yF - yA);
      const seam = mod(x - 225 + u * 5, 21) < 1;
      let v = 2.2 + u * 2.4 + (noise2(x * 0.3, y * 0.5) - 0.5) * 0.8 - (seam ? 1.0 : 0) + (y === Math.ceil(yA) ? -0.8 : 0);
      v += Math.exp(-(((u - 0.35) / 0.14) ** 2)) * 1.1 * (0.4 + 0.6 * noise2(x * 0.07, 3));                // wet sheen
      sv(x, y, v, AWN);
    }
    const yB = Math.round(fy(M_AWB, x));
    for (let y = Math.floor(yF) + 1; y <= yB; y++) {
      if (y === yB) sp(x, y, mixc(AWN[3], WARM[4], 0.45));
      else sv(x, y, 1.8 + (y === Math.floor(yF) + 1 ? 1.8 : 0) + (noise2(x * 0.5, y) - 0.5) * 0.6, AWN);
    }
  }
  for (let y = Math.round(fy(M_AWA, 433)); y <= Math.round(fy(M_AWB, 434)); y++) { sv(434, y, 1.2, AWN); sv(435, y, 0.6, AWN); }
}

function sign() {
  // a blank lightbox on a bracket, hung out over the corner
  const x0 = 205, x1 = 233, y0 = 78, y1 = 104;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const ex = Math.min(x - x0, x1 - x), ey = Math.min(y - y0, y1 - y);
    if (ex + ey < 2) continue;
    if (ex < 2 || ey < 2) { sv(x, y, (ey === 0 || ex === 0) ? 3.4 : 1.6, MTL); continue; }
    const d = Math.hypot((x - (x0 + x1) / 2) / 14, (y - (y0 + y1) / 2) / 13);
    const v = 2.6 + (1 - d) * 2.8 - (y - y0) * 0.02;
    sv(x, y, v, SIGN, v > 4.3 ? 1 : 0);
  }
  // a faint painted mark: a round door and two bubbles
  const MOT = C('#6f8e8c');
  for (let y = y0 + 4; y <= y1 - 4; y++) for (let x = x0 + 4; x <= x1 - 4; x++) {
    const i = y * W + x, d = Math.hypot(x + 0.5 - 217, y + 0.5 - 92);
    if (d > 5.2 && d < 6.6) TB[i] = mixc(TB[i], MOT, 0.7);
    const b1 = Math.hypot(x + 0.5 - 226, y + 0.5 - 85), b2 = Math.hypot(x + 0.5 - 229, y + 0.5 - 90);
    if ((b1 > 1.2 && b1 < 2.2) || (b2 > 0.5 && b2 < 1.4)) TB[i] = mixc(TB[i], MOT, 0.6);
  }
  for (let x = 234; x <= 242; x++) { sv(x, 85, 3.6, MTL); sv(x, 86, 1.4, MTL); sv(x, 97, 3.2, MTL); sv(x, 98, 1.2, MTL); }
  rect(241, 82, 243, 101, (x, y) => sv(x, y, x === 241 ? 3.4 : 1.8, MTL));
}

function lowWallAndPost() {
  for (let x = 213; x < FX0; x++) {
    const yt = Math.round(fy(0.0076, x)), yb = Math.ceil(fy(M_BASE, x)) - 1;
    for (let y = yt; y <= yb; y++) {
      const course = (y - yt) % 5 === 4, joint = (x + (Math.floor((y - yt) / 5) & 1) * 5) % 10 === 0;
      const v = 2.6 + (x - 213) * 0.06 + (fbm(x * 0.2, y * 0.2, 3) - 0.5) * 1.0 - (course || joint ? 0.9 : 0) + (y === yt ? 2.6 : y === yt + 1 ? 1.2 : 0);
      sv(x, y, v, PAVE);
    }
  }
  for (let y = 156; y <= 207; y++) { sv(203, y, 3.0 + (y < 160 ? 1.4 : 0), MTL); sv(204, y, 1.2, MTL); }
  sv(202, 156, 3, MTL); sv(205, 156, 1, MTL);
}

// ---------------------------------------------------------------- build both static bases
const BLOCKS = [
  { side: 'R', x0: 154, x1: 162, top: 176, sw: 2, v: 2.6, seed: 1, win: [1, 2, 3, 4], lit: [1] },
  { side: 'L', x0: 128, x1: 140, top: 171, sw: 5, v: 2.6, seed: 2, win: [1, 2, 3, 4], lit: [2] },
  { side: 'R', x0: 163, x1: 178, top: 167, sw: 4, v: 2.4, seed: 3, win: [2, 2, 4, 5], lit: [3, 4] },
  { side: 'L', x0: 110, x1: 126, top: 162, sw: 7, v: 2.4, seed: 4, win: [2, 2, 4, 5], lit: [4, 9] },
  { side: 'R', x0: 180, x1: 197, top: 150, sw: 5, v: 2.2, seed: 5, win: [2, 3, 5, 7], lit: [2, 7], sideWin: [[0, 1]] },
  { side: 'L', x0: 82, x1: 104, top: 149, sw: 9, v: 2.2, seed: 6, win: [2, 3, 5, 7], lit: [3, 10], sideWin: [[1, 2]] },
  { side: 'R', x0: 196, x1: 236, top: 132, sw: 7, v: 2.0, seed: 7, win: [3, 4, 6, 9], lit: [3, 9, 14], sideWin: [[0, 0], [1, 2]] },
  { side: 'L', x0: 42, x1: 72, top: 112, sw: 12, v: 2.0, seed: 8, win: [3, 4, 6, 10], lit: [7, 12], sideWin: [[0, 1], [2, 3]] },
];
for (const lit of [1, 0]) {
  TB = BASE[lit]; TG = BGL[lit];
  sky(); distance();
  for (const b of BLOCKS) block(b);
  ground(lit);
  lowWallAndPost();
  upperBlock();
  facade();
  interior(lit);
  shopfront(lit);
  awning();
  sign();
  leftBlock();
  lampLight();
  streetlamp();
  // the galaxy's own light on its machine and the floor in front
  for (let y = 150; y < 210; y++) for (let x = Math.floor(GCX - 26); x <= GCX + 26; x++) {
    const i = y * W + x;
    if (!GLASS[i]) continue;
    const r = Math.hypot(x + 0.5 - GCX, y + 0.5 - GCY);
    const fb = fy(M_MB, x);
    const fl = y > fb ? Math.exp(-(((x + 0.5 - GCX) / 16) ** 2) - (((y - fb - 2) / 4) ** 2)) * 0.32 : 0;
    const rim = r > GRR && r < GRR + 8 ? (1 - (r - GRR) / 8) * 0.26 : 0;
    const k = fl + rim;
    if (k > 0.01) TB[i] = mixc(TB[i], VIOLET, fq(i, k, 8));
  }
}

// ---------------------------------------------------------------- reflections set-up
// the line each column mirrors about: the foot of whatever stands there
const AX = new Float32Array(W);
for (let x = 0; x < W; x++) AX[x] = x <= 28 ? ybL(28) : x < V2X ? ybL(x) : x < 213 ? ybR(x) : fy(M_BASE, x);
// glossy stretch per column: under the shop the reflection is pulled out long; down the cross street it stays closer to a
// mirror, so the glow at the street's end and the lit windows run toward us as long streaks
const SQX = new Float32Array(W);
for (let x = 0; x < W; x++) SQX[x] = 0.75 + 0.65 * smoothstep(190, 240, x);
const REFK = new Float32Array(W * H), COLM = new Float32Array(W);
for (let x = 0; x < W; x++) COLM[x] = 0.7 + 0.3 * smoothstep(0.25, 0.75, noise2(x * 0.4, 7.7));
for (let y = HZ + 1; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x, k = KIND[i];
  if (k < 0 || y <= AX[x] + 0.5) continue;
  if (k === 0) REFK[i] = Math.min(1, (0.7 + 0.35 * Math.exp(-(y - HZ) / 22)) * COLM[x]);
  else if (k === 1) REFK[i] = 0.5 * (0.7 + 0.3 * COLM[x]);
  else if (k === 2) REFK[i] = 0.3;
  else REFK[i] = 0;                                  // kerbs stay crisp
  if (PUDM[i]) REFK[i] = 0.9;
  if (JOINT[i]) REFK[i] *= 0.3;
}
// the puddle's edge: lit on the far side, a dark lip on the near side
const RIM_T = [], RIM_B = [];
for (let y = HZ + 2; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
  const i = y * W + x;
  if (PUDM[i]) continue;
  if (PUDM[i + W]) RIM_T.push(i); else if (PUDM[i - W]) RIM_B.push(i);
}
// shimmer: noise that is periodic in y, so scrolling it a whole period per loop is seamless
// NT1: long vertical streaks (1-3 cycles per period); NT2: short horizontal ripple breaks (11-23 cycles)
const NP = 128, NT1 = new Float32Array(W * NP), NT2 = new Float32Array(W * NP);
for (let x = 0; x < W; x++) {
  const p1 = noise2(x * 0.33, 1.3) * TAU * 2, p2 = noise2(x * 0.33, 8.1) * TAU * 2, p3 = h2(x, 3) * TAU;
  // ripple phase is constant across short spans, so breaks read as little horizontal dashes
  const sp1 = Math.floor((x + noise2(x * 0.05, 2.2) * 13) / 5), sp2 = Math.floor((x + noise2(x * 0.05, 5.5) * 13) / 7), sp3 = Math.floor(x / 3);
  const q1 = h2(sp1, 1) * TAU, q2 = h2(sp2, 2) * TAU, q3 = h2(sp3, 9.9) * TAU;
  const k1 = 13 + Math.floor(h2(sp1, 4) * 9), k2 = 19 + Math.floor(h2(sp2, 6) * 9), k3 = 8 + Math.floor(h2(sp3, 8) * 6);   // whole cycles per period
  for (let y = 0; y < NP; y++) {
    const a = TAU * y / NP;
    NT1[y * W + x] = Math.sin(a + p1) * 0.45 + Math.sin(a * 2 + p2) * 0.35 + Math.sin(a * 3 + p3) * 0.2;
    NT2[y * W + x] = Math.sin(a * k1 + q1) * 0.5 + Math.sin(a * k2 + q2) * 0.3 + Math.sin(a * k3 + q3) * 0.2;
  }
}
// warm glossy streaks under the lit windows down the cross street
const WS = new Float32Array(W * H);
LITW.push([3 + 9 + 2, 70 + 40 + 4, ybL(28), 5], [3 + 2, 70 + 80 + 4, ybL(28), 5]);
for (const [cx, cy, foot, ww] of LITW) {
  if (cx > 236) continue;
  const sq = SQX[Math.round(cx)], yr = foot + (foot - cy) / sq;
  const len = 6 + (foot - cy) * 0.25, hw = 0.6 + ww * 0.35;
  for (let y = Math.floor(yr - 3); y <= Math.ceil(yr + len); y++) for (let x = Math.floor(cx - hw - 1); x <= Math.ceil(cx + hw + 1); x++) {
    if (x < 0 || x >= W || y <= HZ || y >= H) continue;
    const i = y * W + x;
    if (KIND[i] < 0 || y <= AX[x] + 1) continue;
    const u = (y - yr) / len, k = Math.exp(-(((x - cx) / hw) ** 2)) * (u < 0 ? 1 + u / 0.4 : 1 - u) * 0.75;
    if (k > WS[i]) WS[i] = k;
  }
}
// the streetlamp's own long streak on the road
const XS = new Float32Array(W * H);
for (let y = 200; y < H; y++) for (let x = 0; x < 90; x++) {
  const i = y * W + x, d = y - 205;
  if (KIND[i] < 0 || d < 0) continue;
  XS[i] = Math.exp(-(((x + 0.5 - LX - 2) / (1.8 + d * 0.05)) ** 2)) * smoothstep(0, 12, d) * (1 - d / 80) + Math.exp(-(((x + 0.5 - LX - 2) / 8) ** 2)) * 0.16 * smoothstep(0, 20, d);
}

// ---------------------------------------------------------------- rain light: where streaks catch light
const RA = new Float32Array(W * H), RC = new Uint32Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x;
  const lampK = coneI(x, y) * 1.4 + Math.exp(-(((x - LX) / 10) ** 2) - (((y - LY - 2) / 6) ** 2)) * 0.8;
  const winK = Math.exp(-(((x - 336) / 105) ** 4) - (((y - 168) / 55) ** 4)) * 0.55 + (GLASS[i] ? 0.12 : 0);
  const signK = Math.exp(-(((x - 219) / 20) ** 2) - (((y - 91) / 18) ** 2)) * 0.5;
  const upK = Math.exp(-(((x - 420) / 14) ** 2) - (((y - 32) / 22) ** 2)) * 0.45;
  const skyK = y < HZ ? 0.06 : 0;
  RA[i] = clamp(lampK + winK + signK + upK + skyK, 0, 1.2);
  const tot = lampK + winK + signK + upK + 0.12;
  RC[i] = mixc(mixc(RAIN_COOL, RAIN_WARM, (winK + upK + signK) / tot), RAIN_LAMP, lampK / tot);
}

// ---------------------------------------------------------------- galaxy
const GSTARS = [];
for (let k = 0; k < 110; k++) {
  const r = 1.0 + Math.pow(hsh(k * 3.3), 0.75) * (GRG - 1.4);
  const arm = k & 1, onArm = hsh(k * 2.1) < 0.78;
  const a0 = onArm ? 2.2 * Math.log(r + 0.8) + arm * Math.PI + (hsh(k * 7.7) - 0.5) * 0.7 : hsh(k * 7.7) * TAU;
  GSTARS.push({ r, a0, b: hsh(k * 5.1), tw: 1 + (k % 4) });
}
const GHL = [];
for (let y = Math.floor(GCY - GRG); y <= Math.ceil(GCY + GRG); y++) for (let x = Math.floor(GCX - GRG); x <= Math.ceil(GCX + GRG); x++) {
  const px = x + 0.5 - GCX, py = y + 0.5 - GCY, r = Math.hypot(px, py), ang = Math.atan2(py, px);
  if (r < GRG) GHL.push([x, y, px, py, r, (r > GRG - 2.6 && r < GRG - 0.9 && ang > -2.75 && ang < -1.6) ? 0.38 : 0]);
}
function galaxy(t) {
  const rot = -TAU * t / T;                        // one full turn per loop; the arms trail
  const breath = 0.92 + 0.08 * Math.sin(TAU * 2 * t / T);
  for (const [x, y, px, py, r, hl] of GHL) {
    const i = y * W + x;
    const a = Math.atan2(py, px) - rot;
    const arm = Math.pow(0.5 + 0.5 * Math.cos(2 * (a - 2.2 * Math.log(r + 0.8))), 2.4);
    const dust = noise2(r * Math.cos(a) * 0.7 + 7, r * Math.sin(a) * 0.7 + 3) - 0.5;
    const v = 1.0 + arm * 8.4 * Math.exp(-r / (GRG * 0.75)) * smoothstep(0.6, 2.6, r) + dust * 1.6 - smoothstep(GRG - 1.8, GRG, r) * 1.2;
    const core = Math.exp(-((r / 2.0) ** 2)) * breath;
    const vv = v + core * 8;
    let c = dq(i, vv, GALAXY), g = 0;
    if (core > 0.45) { c = CORE[core > 0.85 ? 2 : core > 0.65 ? 1 : 0]; g = 1; }
    else if (vv > 10.5) g = 1;
    if (hl) c = mixc(c, CHROME[6], hl);
    buf[i] = c; gl[i] = g;
  }
  for (const s of GSTARS) {
    const a = s.a0 + rot;
    const x = Math.floor(GCX + Math.cos(a) * s.r), y = Math.floor(GCY + Math.sin(a) * s.r);
    if (Math.hypot(x + 0.5 - GCX, y + 0.5 - GCY) > GRG - 0.8) continue;
    const tw = 0.6 + 0.4 * Math.sin(TAU * (s.tw * t / T + s.b));
    const lvl = s.b > 0.85 ? 15 : s.b > 0.5 ? 13 : 11;
    const i = y * W + x;
    buf[i] = s.b > 0.93 ? C('#ffd2c8') : GALAXY[Math.round(lvl - (1 - tw) * 3)];
    if (s.b > 0.85 && tw > 0.7) gl[i] = 1;
  }
  const cl = COLS[GAL], li = Math.round(fy((M_MT + M_PAN) / 2, cl.cx)) * W + cl.x1 - 7;   // its running light, the only one lit
  buf[li] = GALAXY[13]; gl[li] = 1;
}

// ---------------------------------------------------------------- reflections
const PSR = new Int32Array(W * (H + 1)), PSG = new Int32Array(W * (H + 1)), PSB = new Int32Array(W * (H + 1));
const RINGS = [];
for (let k = 0; k < 6; k++) RINGS.push({ n: 5 + k, ph: hsh(k * 9.1), s: k });
function ringAt(rg, t) {
  const q = fract(rg.n * t / T + rg.ph), cyc = mod(Math.floor(rg.n * t / T + rg.ph), rg.n);
  const a = hsh(rg.s * 31 + cyc * 7.3) * TAU, rr = Math.sqrt(hsh(rg.s * 17 + cyc * 3.9)) * 0.7;
  return { q, x: PUD.cx + Math.cos(a) * rr * PUD.rx, y: PUD.cy + Math.sin(a) * rr * PUD.ry };
}
function reflections(t) {
  const YMAX = 232;
  for (let y = 0; y < YMAX; y++) {
    const o = y * W, o1 = (y + 1) * W;
    for (let x = 0; x < W; x++) {
      const c = buf[o + x];
      PSR[o1 + x] = PSR[o + x] + (c & 255);
      PSG[o1 + x] = PSG[o + x] + ((c >>> 8) & 255);
      PSB[o1 + x] = PSB[o + x] + ((c >>> 16) & 255);
    }
  }
  const rings = RINGS.map((r) => ringAt(r, t));
  const s1 = Math.floor(NP * t / T), s2 = Math.floor(NP * 2 * t / T), s3 = Math.floor(NP * 3 * t / T);
  for (let y = HZ + 1; y < H; y++) {
    const r1 = mod(y - s1, NP) * W, r2 = mod(y - s2, NP) * W, r3 = mod(y + s3, NP) * W;
    const rpL = NT2[r2 + LX] * 0.6 + NT2[r3 + LX + 97] * 0.4, brkL = smoothstep(-0.4, 0.4, rpL) * (0.7 + 0.3 * NT1[r1 + LX + 3]);
    const offL = NT2[r3 + LX + 40] > 0.45 ? 1 : NT2[r3 + LX + 40] < -0.5 ? -1 : 0;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let k = REFK[i];
      if (k <= 0.01) continue;
      const pud = PUDM[i], ax = AX[x], d = y + 0.5 - ax;
      let xo = x, ys = ax - d * SQX[x], L;
      const st = 0.5 + 0.5 * NT1[r1 + x], rp = NT2[r2 + x] * 0.6 + NT2[r3 + ((x + 97) % W)] * 0.4;
      const brk = smoothstep(-0.4, 0.3, rp);
      if (pud) {
        L = 1;
        let disp = 0, bright = 0;
        for (const r of rings) {
          const rad = 1 + r.q * 10, e = Math.hypot(x + 0.5 - r.x, (y + 0.5 - r.y) / 0.3), dd = e - rad;
          if (dd > -2.5 && dd < 2.5) { const f = (1 - r.q) * Math.cos(dd * 1.6) * Math.exp(-dd * dd * 0.4); disp += f * 1.6; if (dd > -0.7 && dd < 0.7) bright += (1 - r.q) * 0.5; }
        }
        xo = x + Math.round(disp); ys += disp * 0.8;
        k = Math.min(1, k + bright * 0.15);
      } else {
        k *= (0.4 + 0.6 * st) * (0.5 + 0.5 * brk);
        L = 2 + Math.floor(d * 0.32);
        if (rp > 0.6) xo += 1; else if (rp < -0.65) xo -= 1;
      }
      if (xo < 0) xo = 0; else if (xo >= W) xo = W - 1;
      let ya = Math.round(ys) - L, yb = Math.round(ys) + L;
      const lim = Math.min(YMAX - 1, Math.floor(AX[xo]) - 1);
      if (ya < 0) ya = 0;
      if (yb > lim) yb = lim;
      if (ya > yb) continue;
      const n = yb - ya + 1, A = ya * W + xo, B = (yb + 1) * W + xo, sc = (pud ? 0.85 : 0.95) / n;
      const rc = Math.min(255, (PSR[B] - PSR[A]) * sc), gc = Math.min(255, (PSG[B] - PSG[A]) * sc), bc = Math.min(255, (PSB[B] - PSB[A]) * sc);
      if (!pud) k = Math.min(1, k * (0.5 + (rc * 0.3 + gc * 0.59 + bc * 0.11) / 160));      // bright things reflect, dark things barely do
      const f = pud ? k : fq(i, k, 7);
      if (f > 0) buf[i] = mixc(buf[i], pk(rc | 0, gc | 0, bc | 0), f);
      const ws = WS[i];
      if (ws > 0.02) { const f3 = fq(i, ws * (0.25 + 0.75 * brk), 8); if (f3 > 0) buf[i] = mixc(buf[i], WARM[4], f3); }
      const xs = x < 100 ? XS[i - offL] : 0;
      if (xs > 0.02) {
        const f2 = fq(i, xs * (0.3 + 0.7 * brkL) * 0.9, 8);
        if (f2 > 0) { buf[i] = mixc(buf[i], LAMP[4], f2); if (f2 > 0.6) gl[i] = 1; }
      }
    }
  }
  for (const i of RIM_T) buf[i] = mixc(buf[i], PAVE[6], 0.35);
  for (const i of RIM_B) buf[i] = mixc(buf[i], PUDC[0], 0.55);
  for (const r of rings) {
    if (r.q > 0.85) continue;
    const rad = 1 + r.q * 10;
    for (let a = 0; a < 48; a++) {
      const th = a / 48 * TAU, x = Math.round(r.x + Math.cos(th) * rad), y = Math.round(r.y + Math.sin(th) * rad * 0.3);
      if (x < 0 || x >= W || y < 0 || y >= H) continue;
      const i = y * W + x;
      if (!PUDM[i] || THR[i] > (1 - r.q) * 0.9) continue;
      buf[i] = mixc(buf[i], RC[i], 0.35 * (1 - r.q));
    }
  }
}

// ---------------------------------------------------------------- rain
const DROPS = [];
for (let k = 0; k < 460; k++) {
  const near = k < 120;
  DROPS.push({
    x0: hsh(k * 1.73) * (W + 120), ph: hsh(k * 3.17),
    n: near ? 26 + (k % 5) : 15 + (k % 4),
    L: near ? 10 + Math.floor(hsh(k * 5.3) * 7) : 5 + Math.floor(hsh(k * 5.3) * 4),
    a: near ? 0.15 : 0.085, ra: near ? 0.5 : 0.32,
  });
}
const SLANT = -0.2;
function rain(t) {
  for (const d of DROPS) {
    const yh = fract(d.ph + d.n * t / T) * (H + 60) - 30;
    const xh = mod(d.x0 + yh * SLANT, W + 120) - 60;
    for (let s = 0; s < d.L; s++) {
      const y = Math.round(yh - s), x = Math.round(xh - s * SLANT);
      if (x < 0 || x >= W || y < 0 || y >= H) continue;
      const i = y * W + x;
      const fade = s === 0 ? 0.7 : 1 - s / d.L;
      buf[i] = mixc(buf[i], RC[i], (d.a + RA[i] * d.ra) * fade);
    }
  }
}
const SPL = [];
for (let k = 0; k < 100; k++) SPL.push({ n: 14 + (k % 9), ph: hsh(k * 2.3), s: k });
function splashes(t) {
  for (const s of SPL) {
    const q = fract(s.n * t / T + s.ph);
    if (q > 0.09) continue;
    const cyc = mod(Math.floor(s.n * t / T + s.ph), s.n);
    const x = Math.floor(hsh(s.s * 13.1 + cyc * 1.7) * W), y = HZ + 6 + Math.floor(Math.pow(hsh(s.s * 7.7 + cyc * 2.9), 0.8) * (H - HZ - 7));
    const i = y * W + x;
    if (PUDM[i] || KIND[i] < 0 || KIND[i] === 4) continue;
    buf[i] = mixc(buf[i], RC[i], 0.55);
    if (q < 0.045 && x > 0 && x < W - 1) { buf[i - 1 - W] = mixc(buf[i - 1 - W], RC[i], 0.3); buf[i + 1 - W] = mixc(buf[i + 1 - W], RC[i], 0.3); }
  }
}

// ---------------------------------------------------------------- water on the glass, drips, gutter, moths
const RUNS = [];
for (let k = 0; k < 11; k++) {
  const door = k >= 9;
  const x = door ? DOOR_X[0] + 6 + (k - 9) * 18 : WIN_X[0] + 4 + Math.floor(hsh(k * 5.9) * 128);
  RUNS.push({ x, n: 1 + (k % 2), ph: hsh(k * 2.2), s: k, y0: Math.ceil(fy(M_GT, x)) + 2 + Math.floor(hsh(k * 8.3) * 26), y1: Math.floor(fy(door ? 0.0425 : M_WB, x)) - 3 });
}
function glassRuns(t) {
  for (const r of RUNS) {
    if (r.x >= MUL[0] - 1 && r.x <= MUL[1] + 1) continue;
    const u = fract(r.n * t / T + r.ph);
    const su = u * 6, st = Math.floor(su), p = (st + smoothstep(0, 0.3, su - st)) / 6;
    const yh = Math.round(r.y0 + p * (r.y1 - r.y0));
    const fade = smoothstep(0, 0.04, u) * (1 - smoothstep(0.9, 1, u));
    if (fade <= 0) continue;
    const wob = (y) => r.x + Math.round(Math.sin(y * 0.21 + r.s * 3) * 0.9);
    for (let y = r.y0; y < yh; y++) {
      const x = wob(y), i = y * W + x;
      if (!GLASS[i]) continue;
      const a = 0.24 * fade * (0.5 + 0.5 * (y - r.y0) / Math.max(1, yh - r.y0));
      buf[i] = mixc(buf[i], C('#2a2a30'), a * 0.6);
      if (GLASS[i + 1]) buf[i + 1] = mixc(buf[i + 1], C('#fff8ea'), a * 0.5);
    }
    const x = wob(yh), i = yh * W + x;
    if (GLASS[i]) {
      buf[i] = mixc(buf[i], C('#fffaf0'), 0.55 * fade);
      if (GLASS[i + W]) buf[i + W] = mixc(buf[i + W], C('#1c1d24'), 0.5 * fade);
      if (GLASS[i + 1]) buf[i + 1] = mixc(buf[i + 1], C('#1c1d24'), 0.25 * fade);
    }
  }
}
const DRIPS = [{ x: 262, n: 6, ph: 0.1 }, { x: 318, n: 5, ph: 0.55 }, { x: 371, n: 4, ph: 0.3 }, { x: 412, n: 3, ph: 0.8 }, { x: 290, n: 4, ph: 0.68 }];
function drips(t) {
  for (const d of DRIPS) {
    const q = fract(d.n * t / T + d.ph), y0 = Math.round(fy(M_AWB, d.x)) + 1;
    const land = Math.round(fy(M_BASE + (M_CURB - M_BASE) * 0.45, d.x));
    const period = T / d.n, fallT = Math.sqrt(2 * (land - y0) / 300), q0 = 0.62, q1 = q0 + fallT / period;
    const i0 = y0 * W + d.x;
    if (q < q0) {
      const grow = q / q0;
      buf[i0] = mixc(buf[i0], WARM[6], 0.3 + grow * 0.5); gl[i0] = grow > 0.6 ? 1 : 0;
      if (grow > 0.7) buf[i0 + W] = mixc(buf[i0 + W], WARM[5], (grow - 0.7) * 2);
    } else if (q < q1) {
      const tt = (q - q0) * period, y = Math.round(y0 + 150 * tt * tt);
      for (let k = 0; k < 3; k++) {
        const yy = y - k; if (yy < y0 || yy >= H) continue;
        const i = yy * W + d.x;
        buf[i] = mixc(buf[i], k ? RAIN_WARM : WARM[7], k ? 0.35 : 0.7);
      }
    } else if (q < q1 + 0.09) {
      const s = (q - q1) / 0.09, w = Math.round(1 + s * 3), c = mixc(WARM[6], RAIN_COOL, s);
      for (const dx of [-w, w]) { const i = (land - Math.round(2 * (1 - s) * s * 4)) * W + d.x + dx; buf[i] = mixc(buf[i], c, 0.6 * (1 - s)); }
      buf[land * W + d.x] = mixc(buf[land * W + d.x], c, 0.5 * (1 - s));
    }
  }
}
// water running down the awning in thin runnels, catching the sky
const RUNNELS = [];
for (let k = 0; k < 12; k++) RUNNELS.push({ x: 240 + Math.floor(hsh(k * 3.7) * 190), n: 3 + (k % 4), ph: hsh(k * 1.3) });
function runnels(t) {
  for (const r of RUNNELS) {
    const yA = fy(M_AWA, r.x), yF = fy(M_AWF, r.x);
    const q = fract(r.n * t / T + r.ph), yh = yA + q * (yF - yA + 2);
    for (let k = 0; k < 4; k++) {
      const y = Math.round(yh - k);
      if (y < yA || y > yF) continue;
      const i = y * W + r.x;
      buf[i] = mixc(buf[i], C('#e0a49a'), 0.3 * (1 - k / 4));
    }
  }
}
function gutter(t) {
  for (let x = 140; x < W; x++) {
    const f = fract(x / 23 + noise2(x * 0.1, 0) * 0.6 + 6 * t / T);
    if (f > 0.14) continue;
    const y = Math.round(fy(M_CURB2, x)) + 1, i = y * W + x;
    buf[i] = mixc(buf[i], RC[i - 20 * W], 0.3 * (1 - f / 0.14));
  }
  for (let k = 0; k < 6; k++) {
    const y = Math.ceil(fy(M_BASE, 471)) - 2 + k, x = 471 + (k > 2 ? 1 : 0), i = y * W + x;
    buf[i] = mixc(buf[i], RAIN_COOL, 0.25 + 0.35 * (fract(k * 0.31 - 24 * t / T) < 0.5 ? 1 : 0));
  }
}
function moths(t) {
  for (let k = 0; k < 4; k++) {
    const a = TAU * ((k + 2) * t / T + hsh(k * 4.4)), b = TAU * ((k + 3) * t / T + hsh(k * 6.1));
    const x = Math.round(LX + Math.sin(a) * (6 + k * 2) + Math.sin(b * 2) * 1.5), y = Math.round(LY + 5 + k * 1.5 + Math.sin(b) * 4);
    if (x < 0 || x >= W) continue;
    const i = y * W + x;
    buf[i] = mixc(buf[i], LAMP[5], 0.75); gl[i] = 1;
  }
}

// ---------------------------------------------------------------- frame
function panel(t) {                              // the right ceiling panel stutters twice per loop
  for (const [s, len] of [[5.1, 0.55], [12.6, 0.3]]) if (t >= s && t < s + len) {
    const u = (t - s) / len;
    return Math.sin(u * 37) * Math.sin(u * 13 + 1) > 0.05 ? 1 : (u > 0.5 ? 0.35 : 0);
  }
  return 1;
}
function render(t) {
  const lit = panel(t);
  if (lit >= 1) { buf.set(BASE[1]); gl.set(BGL[1]); }
  else if (lit <= 0) { buf.set(BASE[0]); gl.set(BGL[0]); }
  else { const A = BASE[0], B = BASE[1]; for (let i = 0; i < W * H; i++) buf[i] = lit > THR[i] ? B[i] : A[i]; gl.set(BGL[0]); }
  galaxy(t);
  glassRuns(t);
  reflections(t);
  gutter(t);
  runnels(t);
  splashes(t);
  drips(t);
  moths(t);
  rain(t);
  P.present(Math.floor(t * FPS));
}

diorama({ width: P.OW, height: P.OH, fps: FPS, duration: T, render });
