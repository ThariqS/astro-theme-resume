// wheat-lighthouse — night over a wheat field that runs to the hills, nowhere near the sea. A white lighthouse
// stands in it anyway, a little shed at its foot with one lit window. The lamp turns, lingering as it looks out
// over the field to the left, then swinging round past us. The wheat moves in long swells like water: the crests
// catch the moon, and go gold where the beam lies. Fireflies drift over the stalks; under the field, a cut-away of
// soil, roots and stones. Composition follows lab/covers/v3/wheat-lighthouse.png, widened to 16:9.
import { diorama } from '../lib/runtime.js';
import { TAU, clamp, smoothstep, fract, noise2, fbm, rng } from '../lib/util.js';
import { createPix, C, R, mixc } from '../lib/pix.js';

const W = 480, H = 270, S = 4, T = 20, FPS = 30;
const P = createPix({ W, H, S, canvas: document.getElementById('out'),
  grade: { from: [29.6, 12.9, 4.1, 3.5, -4.7, 13.5, 14.3], to: [39.1, 13.8, 4.0, 3.8, -2.1, 19.7, 19.3], kL: 0.9, kC: 0.5, kW: 0.8,
    sel: [[289, 30, -11, 1.0, 2], [90, 35, -14, 1.3, 4]] }, grain: 0.08, glow: [0.8, 0.55] });
const { put, dith, thr, buf, gl } = P;

// ---------------------------------------------------------------- colour
const SKY = R(['#0b1028', '#0e142d', '#111832', '#141c38', '#17213d', '#1b2543', '#1f2a48', '#242f4e', '#293453', '#2f3a58', '#36405c', '#3e4660', '#474c64', '#515267', '#5b586a']);
const MOON = R(['#9a96a6', '#aea9b6', '#c1bcc5', '#d2cdd2', '#e1dcdd', '#ede9e6', '#f6f3ee', '#fcfaf5']);
const CLOUD = R(['#20263f', '#282e49', '#323753', '#3d405d', '#494a67', '#565470', '#645f79', '#736a81', '#837688']);
const PINK = R(['#262842', '#30304b', '#3c3753', '#4a3f5b', '#594862', '#6a5168', '#7c5b6d', '#8e6670', '#9f7273']);
const STAR = R(['#56607f', '#a3a8c4', '#f2eedf']);
const HILLF = R(['#1d2546', '#212a4a', '#262e4e', '#2b3352']);
const HILLN = R(['#121834', '#151c37', '#19203b', '#1d243e', '#222941']);
const WHEAT = R(['#1c2230', '#232a33', '#2b3236', '#343a38', '#3e4339', '#4a4c3a', '#56553b', '#635e3d', '#706740', '#7e7043', '#8c7946', '#9a834a', '#a88d4f', '#b59755', '#c2a25d', '#cdad68', '#d7b977', '#e0c68b', '#e9d4a3', '#f2e3c0']);
const WLIT = R(['#3a2c24', '#523d2b', '#6b4f32', '#856139', '#9f7441', '#b5874d', '#c99a5c', '#d9ad6f', '#e6c286', '#f0d6a3', '#f8e8c6', '#fff6e6']);
const STEM = R(['#16171d', '#1f1f20', '#2a2823', '#353126', '#413b2a', '#4d452e', '#5a4f33', '#675a38', '#74653e']);
const TOWER = R(['#373a50', '#44475d', '#53556a', '#636478', '#757586', '#898795', '#9d9aa5', '#b2aeb5', '#c6c1c4', '#d8d3d2', '#e7e2de', '#f3efe9']);
const COPPER = R(['#1a1217', '#26191b', '#35211f', '#462a23', '#5a3428', '#70402e', '#874d35', '#9e5c3e', '#b46d49']);
const GLASS = R(['#5a3e2c', '#8a5a32', '#b9803c', '#dea653', '#f4c97b', '#ffe6b0', '#fff7e6']);
const WARM = R(['#8a4f2a', '#c27a3c', '#eba552', '#f9ca76', '#ffe4a8', '#fff6dc']);
const FIRE = R(['#5f6a36', '#a6bb5c', '#dcef92', '#fbffd8']);
const SOIL_TOP = R(['#120d13', '#1a1319', '#231a20', '#2c2127']);
const SOIL = R(['#33252a', '#3d2d30', '#483537', '#543e3e', '#604846', '#6d524e', '#795c55']);
const CLAY = R(['#5f4b4b', '#6f5a57', '#806a64']);
const PEBBLE = R(['#2d2b38', '#3e3b49', '#524e5b', '#67626d', '#7e7881', '#968f97']);
const ROOT = R(['#0e0a0f', '#21181d', '#382a2e', '#4d3b3c']);
const BEAMC = C('#ffdfa0'), BEAMW = C('#fff6de'), HILL_LIT = C('#5a5068');

// ---------------------------------------------------------------- layout: one low pinhole camera for the whole field
// World: X right, Y up from the wheat tops, Z away from the eye. Screen: x = CX + F*X/Z, y = HZ - F*(Y-HC)/Z.
// The eye is only HC metres above the wheat, so the field closes up fast toward the horizon, as in the reference.
const HZ = 169, CX = 240, F = 300, HC = 0.7;
const LX = 355, LFOOT = 172;                                    // tower axis; row where its foot meets the wheat
const ZL = F * HC / (LFOOT - HZ), XL = (LX - CX) * ZL / F;      // ~70 m out, ~27 m right
const LAMPY = 89, YL = HC + (HZ - LAMPY) * ZL / F;             // lamp ~19 m up
const FRONT = 204, ZN = F * HC / (FRONT + 0.5 - HZ);            // last row of the field surface; depth of the cut
const MX = 97, MY = 40, MR = 9;                                 // the moon, small and bright, upper left
const GY = new Int16Array(W);                                   // ground line of the cut-away
for (let x = 0; x < W; x++) GY[x] = Math.round(237 + 1.3 * Math.sin(x * 0.016 + 0.6) + 0.9 * Math.sin(x * 0.043 + 2.1));
const hsh = (n) => { const s = Math.sin(n * 91.3458 + 17.17) * 47453.5453; return s - Math.floor(s); };

// The lamp turns once per loop but lingers while it faces out over the field to the left (as in the reference),
// then swings quickly round past the eye and back. dtheta/dt ~ 1 - EASE*cos, slowest at t = 0.
const TH_L = (145 / 360) * TAU, EASE = 0.8;
const heading = (u) => TH_L + TAU * (u - (EASE / TAU) * Math.sin(TAU * u));

// wind: a near swell rolling toward us, long patches running right, and a slow gust envelope; whole cycles per loop
const WAVES = [[0.45, -0.89, 5.5, 3], [0.97, -0.24, 15, 2]];     // dirX, dirZ, wavelength (m), cycles per loop
const wavePh = (X, Z, k) => { const [dx, dz, l] = WAVES[k]; return TAU * (X * dx + Z * dz) / l + 2.2 * fbm(X * 0.07 + 3, Z * 0.09 + k * 7, 3); };
const gustPh = (X, Z) => TAU * (X * 0.9 - Z * 0.4) / 40 + 1.6 * noise2(X * 0.03, Z * 0.05);

// ---------------------------------------------------------------- static: sky, moon, hills, soil
const base = new Uint32Array(W * H), baseGlow = new Uint8Array(W * H);
const bput = (x, y, c, g = 0) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; base[i] = c; baseGlow[i] = g; };
for (let y = 0; y <= HZ + 2; y++) for (let x = 0; x < W; x++) {
  const dm = Math.hypot(x + 0.5 - MX, y + 0.5 - MY);
  const halo = dm > MR ? 2.6 * Math.exp(-(dm - MR) / 12) + 1.1 * Math.exp(-(dm - MR) / 60) : 0;
  const v = Math.pow(clamp(y / HZ, 0, 1.05), 1.5) * 12.4 + 1.2 + halo + (fbm(x * 0.02, y * 0.045, 3) - 0.5) * 0.9;
  bput(x, y, dith(x, y, v, SKY));
}
for (let y = MY - MR - 1; y <= MY + MR + 1; y++) for (let x = MX - MR - 1; x <= MX + MR + 1; x++) {
  const rx = x + 0.5 - MX, ry = y + 0.5 - MY, dm = Math.hypot(rx, ry);
  if (dm > MR + 0.3) continue;
  const maria = fbm(rx * 0.16 + 11, ry * 0.16 + 4, 3);
  const v = 6.4 - Math.pow(dm / MR, 3) * 2 - smoothstep(0.45, 0.65, maria) * 1.8 - (rx + ry) * 0.06;
  let c = dith(x, y, v, MOON);
  if (dm > MR - 0.7) c = mixc(c, base[y * W + x], 0.4);
  bput(x, y, c, 1);
}
// hills: a far pale range and a nearer dark one
const hillTop = new Int16Array(W);
for (let x = 0; x < W; x++) {
  const xr = (x - 37.5) / 0.2637;                                // reference x
  const far = 160 - 5 * Math.exp(-(((xr - 150) / 190) ** 2)) - 4.5 * Math.exp(-(((xr - 470) / 170) ** 2)) - 3 * Math.exp(-(((xr - 980) / 260) ** 2))
    - 5 * smoothstep(1250, 1700, xr) + (fbm(x * 0.03, 2, 3) - 0.5) * 2.2;
  const near = 165 - 1.5 * Math.exp(-(((xr + 100) / 200) ** 2)) - 3 * Math.exp(-(((xr - 780) / 200) ** 2)) - 4 * smoothstep(1380, 1700, xr) + (fbm(x * 0.05, 9, 3) - 0.5) * 1.4;
  const ft = Math.round(far), nt = Math.round(near);
  hillTop[x] = Math.min(ft, nt);
  for (let y = ft; y <= HZ + 1; y++) bput(x, y, dith(x, y, 3.0 - (y - ft) * 0.2 + (y === ft ? 0.6 : 0) + (noise2(x * 0.15, y * 0.4) - 0.5) * 0.6, HILLF));
  for (let y = nt; y <= HZ + 1; y++) bput(x, y, dith(x, y, 3.2 - (y - nt) * 0.4 + (y === nt ? 0.7 : 0) + (noise2(x * 0.2, y * 0.5) - 0.5) * 0.7, HILLN));
}
// a farm light far off on the left hills
bput(64, hillTop[64] + 3, WARM[3], 1);
// cut-away soil: dark topsoil, strata, clay lenses
for (let x = 0; x < W; x++) {
  const s = GY[x];
  for (let y = s; y < H; y++) {
    const d = y - s;
    const wob = 3 * Math.sin(x * 0.019 + 1.3) + 4 * (fbm(x * 0.035, y * 0.03, 3) - 0.5);
    const yy = y + wob;
    let c;
    if (d < 1) c = SOIL_TOP[0];
    else if (d < 5 + 2 * noise2(x * 0.17, 1)) c = dith(x, y, 0.6 + (noise2(x * 0.5, y * 0.5) - 0.3) * 2 + d * 0.3, SOIL_TOP);
    else {
      const band = Math.floor((yy - 237) / 9), f = fract((yy - 237) / 9), bm = ((band % 4) + 4) % 4;
      const bv = [3.2, 4.5, 2.4, 5.0][bm];
      const v = bv + (noise2(x * 0.33, y * 0.33) - 0.5) * 1.4 - (f < 0.12 ? 1.0 : 0) - smoothstep(250, 270, y) * 1.4;
      c = dith(x, y, v, SOIL);
      if (bm === 3 && noise2(x * 0.12, y * 0.4) > 0.55) c = dith(x, y, 1.2 + noise2(x * 0.6, y * 0.6) * 1.5 - smoothstep(250, 270, y), CLAY);
    }
    bput(x, y, c);
  }
}
{ // pebbles lit from the upper left, then a fringe of fine wheat roots with a few long ones
  const r = rng(31);
  for (let i = 0; i < 58; i++) {
    const x = Math.round(r() * W), top = GY[clamp(x, 0, W - 1)] + 6;
    const y = Math.round(top + r() * (H - top));
    const rx = 1 + Math.round(r() * (r() < 0.2 ? 3 : 1.6)), ry = Math.max(1, Math.round(rx * (0.5 + r() * 0.35)));
    const tone = 1.8 + r() * 1.8 - smoothstep(250, 270, y) * 0.8;
    for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++) {
      if ((xx / (rx + 0.5)) ** 2 + (yy / (ry + 0.5)) ** 2 > 1) continue;
      bput(x + xx, y + yy, dith(x + xx, y + yy, tone - yy / ry * 0.9 - xx / rx * 0.3, PEBBLE));
    }
    if (rx > 1) bput(x - rx, y + ry, SOIL_TOP[1]);
  }
  for (let i = 0; i < 320; i++) {
    let x = r() * W, y = GY[clamp(Math.round(x), 0, W - 1)] + 1;
    const long = r() < 0.15, len = long ? 10 + r() * 14 : 3 + r() * 6;
    let dx = (r() - 0.5) * 0.5;
    const col = long ? (r() < 0.5 ? ROOT[1] : ROOT[2]) : ROOT[0];
    for (let k = 0; k < len; k++) {
      bput(Math.round(x), Math.round(y), k > len * 0.75 && long ? ROOT[3] : col);
      if (long && k > 3 && r() < 0.08) {
        let bx = x, by = y; const sd = r() < 0.5 ? -1 : 1;
        for (let q = 0; q < 2 + r() * 4; q++) { bx += sd * 0.8; by += 0.6; bput(Math.round(bx), Math.round(by), ROOT[1]); }
      }
      y += 1; x += dx; dx = clamp(dx + (r() - 0.5) * 0.4, -0.7, 0.7);
    }
  }
}

// ---------------------------------------------------------------- stars and clouds
const stars = [];
for (let i = 0; i < 170; i++) {
  const x = Math.floor(hsh(i * 3.31) * W), y = Math.floor(Math.pow(hsh(i * 8.17), 1.25) * 140);
  if (Math.hypot(x - MX, y - MY) < MR + 10 || y > hillTop[x] - 4) continue;
  stars.push([x, y, hsh(i * 1.93), 1 + Math.floor(hsh(i * 4.71) * 3), hsh(i * 6.1) < 0.1]);
}
// flat clouds: a flat belly, a lumpy top lit by the moon, pre-coloured in their own frame so the dither travels with them
const clouds = [];
function cloud(x0, x1, yb, bumps, ramp, amp, ph, seed) {
  const px = [];
  for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
    const e = Math.min(x - x0, x1 - x) / 10;                      // taper at the ends
    if (e <= 0) continue;
    let th = 0;
    for (const [bx, bh, bw] of bumps) th = Math.max(th, bh * Math.exp(-(((x - bx) / bw) ** 2)));
    th = Math.max(1.5, th * 1.5 * Math.min(1, e) + (noise2(x * 0.09, seed) - 0.5) * 2.2) * Math.min(1, e * 1.4);
    const belly = yb + Math.round((noise2(x * 0.05, seed + 3) - 0.5) * 1.4);
    const top = Math.round(belly - th);
    for (let y = top; y <= belly; y++) {
      const k = (y - top) / Math.max(1, belly - top);           // 0 top .. 1 belly
      const dm = Math.hypot(x - MX, y - MY);
      const v = 2.6 + (1 - k) * 2.8 - (y === belly ? 0.9 : 0) + 2.2 * Math.exp(-dm / 70) + (k < 0.25 ? 0.8 : 0);
      px.push(x, y, dith(x, y, v, ramp));
    }
  }
  clouds.push({ px, amp, ph });
}
cloud(76, 198, 78, [[108, 8, 16], [140, 6, 22], [178, 4, 16], [92, 4, 10]], CLOUD, 3, 0.1, 1.3);
cloud(-14, 128, 110, [[6, 12, 26], [52, 7, 18], [96, 5, 18], [118, 3, 8]], CLOUD, 3, 0.35, 2.6);
cloud(48, 228, 144, [[110, 8, 20], [150, 5, 22], [76, 4, 14], [200, 2.5, 18]], PINK, 4, 0.6, 3.9);
cloud(336, 494, 68, [[402, 11, 22], [362, 4, 14], [452, 8, 24], [480, 5, 14]], CLOUD, 4, 0.85, 5.2);
cloud(372, 494, 135, [[442, 11, 24], [404, 6, 16], [476, 7, 14]], PINK, 3, 0.2, 6.5);
cloud(260, 304, 142, [[282, 2.5, 14]], PINK, 2, 0.5, 7.8);
cloud(312, 340, 152, [[326, 2, 9]], PINK, 2, 0.75, 9.1);
cloud(196, 252, 30, [[222, 3, 14]], CLOUD, 3, 0.4, 10.4);

// ---------------------------------------------------------------- field: per-pixel precompute for the wheat surface
const FR0 = HZ + 1, FN = (FRONT - FR0 + 1) * W;
const fP1 = new Float32Array(FN), fP2 = new Float32Array(FN), fG = new Float32Array(FN);
const fBase = new Float32Array(FN), fCrest = new Float32Array(FN), fA1 = new Float32Array(FN), fA2 = new Float32Array(FN), fFar = new Float32Array(FN);
const fCph = new Float32Array(FN), fSph = new Float32Array(FN), fRL = new Float32Array(FN), fL0 = new Float32Array(FN);
const fV = new Float32Array(FN), fL = new Float32Array(FN), fW = new Float32Array(FN), fCr = new Float32Array(FN);   // per-frame results
const footprint = (r) => smoothstep(3, 16, r) * (0.16 + 0.84 * Math.exp(-r / 40));
const SHED = { x0: 361, x1: 386, foot: 174, win: [366.5, 164.5] };
const CAMX = -XL / Math.hypot(XL, ZL), CAMZ = -ZL / Math.hypot(XL, ZL);   // heading from the lamp to the eye
for (let y = FR0; y <= FRONT; y++) for (let x = 0; x < W; x++) {
  const j = (y - FR0) * W + x;
  const Z = F * HC / (y + 0.5 - HZ), X = (x + 0.5 - CX) * Z / F;
  fP1[j] = wavePh(X, Z, 0); fP2[j] = wavePh(X, Z, 1); fG[j] = gustPh(X, Z);
  const far = smoothstep(ZN, 40, Z);
  fFar[j] = far;
  fBase[j] = 5.0 + far * 3.2 - smoothstep(70, 140, Z) * 1.2 + (fbm(X * 0.08 + 1, Z * 0.1, 3) - 0.5) * 1.4;
  fA1[j] = 1 - smoothstep(16, 36, Z);
  fA2[j] = 1 - smoothstep(80, 140, Z) * 0.7;
  fCrest[j] = 8.6 - far * 2.6;
  const dx = X - XL, dz = Z - ZL, r = Math.hypot(dx, dz) + 1e-6;
  fCph[j] = dx / r; fSph[j] = dz / r; fRL[j] = footprint(r);
  fL0[j] = 0.22 * Math.exp(-(((x - LX) / 26) ** 2) - (((y - LFOOT) / 3) ** 2))          // lamp spill round the foot
    + 0.4 * Math.exp(-(((x - SHED.win[0]) / 5) ** 2) - (((y - SHED.foot - 1.5) / 1.6) ** 2));   // the shed window
}

// grain heads through the field: strokes that tilt downwind as a swell passes, in loose staggered rows
const heads = [];
{
  const r = rng(99);
  for (let y = 174; y <= FRONT; y++) {
    const Z = F * HC / (y + 0.5 - HZ);
    const size = Z < 8.6 ? 4 : Z < 13 ? 3 : Z < 26 ? 2 : 1;
    if (size === 4 && y % 3 !== 0) continue;
    if (size === 3 && (y & 1)) continue;
    const step = [0, 3.4, 3.2, 3.6, 4.6][size];
    for (let x = r() * step; x < W; x += step * (0.7 + r() * 0.6)) {
      const xi = Math.round(x);
      heads.push({ x: xi, y, Z, size, sway: [0, 0.6, 1.2, 2.2, 3.2][size], j: (y - FR0) * W + xi, tone: r() * 0.9 });
    }
  }
}
const headsBehind = heads.filter((h) => h.Z > ZL), headsFront = heads.filter((h) => h.Z <= ZL);

// foreground stalks standing on the cut, in ranks drawn back to front so ears sit at many heights, all bowing right
// [rank, min spacing, max spacing, base offset, min height, max height, dimness]
const RANKS = [[0, 2.4, 4.2, -2, 30, 44, 2.0], [1, 4.0, 7.0, 1, 8, 17, 2.6], [2, 3.0, 5.2, 0, 18, 30, 1.4], [3, 5.0, 9.0, 1, 26, 37, 0.5], [4, 8.0, 15.0, 2, 37, 50, 0]];
const stalks = [];
{
  const r = rng(7);
  for (const [rank, sp0, sp1, dy, h0, h1, dim] of RANKS) {
    for (let x = -14 + r() * sp0; x < W + 2; x += sp0 + r() * (sp1 - sp0)) {
      const xi = Math.round(x), xc = clamp(xi, 0, W - 1);
      const Z = ZN - rank * 0.3, X = (xi + 0.5 - CX) * Z / F;
      const dx = X - XL, dz = Z - ZL, rr = Math.hypot(dx, dz);
      const h = Math.round(h0 + r() * (h1 - h0));
      stalks.push({ x: xi, y: GY[xc] + dy, h, dim, lean: 1.5 + r() * 6.5, ph: r() * TAU,
        p1: wavePh(X, Z, 0), p2: wavePh(X, Z, 1), g: gustPh(X, Z),
        cph: dx / rr, sph: dz / rr, rl: footprint(rr), tone: r(), ear: Math.min(h - 3, 7 + Math.round(r() * 2) + (dim < 1 ? 2 : 0)) });
    }
  }
}

// ---------------------------------------------------------------- lighthouse and shed, built once
const twMask = new Uint8Array(W * H);
const solid = [];          // [index, colour] pairs drawn every frame
const glass = [];          // lantern panes, coloured per frame
const clip = new Int16Array(W);   // per column: first row hidden by wheat in front of the buildings
for (let x = 0; x < W; x++) clip[x] = (x > SHED.x0 + 1 ? SHED.foot : LFOOT) - (hsh(x * 1.7) > 0.55 ? 1 : 0) + (hsh(x * 3.1) > 0.8 ? 1 : 0);
const sp = (x, y, c, m = 1) => { if (x < 0 || x >= W || y < 0 || y >= H || y >= clip[x]) return; const i = y * W + x; solid.push(i, c); twMask[i] = m; };
{
  // body: a tapering white cylinder, moonlit from the left, with faint courses of stone
  for (let y = 104; y <= 176; y++) {
    const hw = 10.5 + 5.5 * (y - 104) / 67;
    for (let x = Math.floor(LX - hw); x < Math.ceil(LX + hw); x++) {
      const nx = (x + 0.5 - LX) / hw;
      if (Math.abs(nx) > 1) continue;
      const l = clamp(0.6 - 0.68 * nx + 0.22 * (1 - nx * nx), 0, 1);
      let v = 1.2 + l * 9.6 + (noise2(x * 0.7, y * 0.2) - 0.5) * 0.9 - ((y - 104) % 5 === 4 && noise2(x * 0.3, y) > 0.45 ? 0.6 : 0);
      if (y < 108) v -= (108 - y) * 0.9;
      if (nx > 0.88) v -= 1;
      if (y > 150) v += (1 - Math.abs(nx)) * smoothstep(150, 172, y) * 0.8;   // warm spill from the field at the foot
      sp(x, y, dith(x, y, v, TOWER));
    }
  }
  // arched windows
  for (const wy of [113, 134]) {
    for (let y = wy; y < wy + 6; y++) for (let x = LX - 1; x <= LX; x++) {
      if (y === wy && x === LX) continue;
      sp(x, y, x === LX - 1 ? COPPER[1] : COPPER[0]);
    }
    sp(LX - 1, wy + 6, TOWER[10]); sp(LX, wy + 6, TOWER[8]);
  }
  // gallery deck and brackets
  for (let x = LX - 14; x < LX + 14; x++) {
    const nx = (x + 0.5 - LX) / 14;
    sp(x, 102, dith(x, 102, 6.6 - nx * 2.4, COPPER)); sp(x, 103, dith(x, 103, 3.6 - nx * 1.6, COPPER)); sp(x, 104, dith(x, 104, 2.0 - nx, COPPER));
    if (Math.abs(x + 0.5 - LX) > 10.5 && Math.abs(x + 0.5 - LX) < 13.5) sp(x, 105, COPPER[1]);
  }
  // watch room behind the rail
  for (let y = 94; y <= 101; y++) for (let x = LX - 9; x < LX + 9; x++) {
    const nx = (x + 0.5 - LX) / 9;
    sp(x, y, dith(x, y, 3.4 - nx * 2 + (y === 94 ? 1.4 : 0), COPPER));
  }
  // lantern: panes (filled per frame) between copper mullions, eave, dome, ball and finial
  for (let y = 84; y <= 93; y++) for (let x = LX - 8; x < LX + 8; x++) {
    const m = ((x - (LX - 8)) % 4) === 0 || x === LX + 7;
    if (m) sp(x, y, x < LX - 2 ? COPPER[5] : x < LX + 3 ? COPPER[4] : COPPER[2]);
    else { glass.push(x, y); twMask[y * W + x] = 1; }
  }
  for (let x = LX - 10; x < LX + 10; x++) { const nx = (x + 0.5 - LX) / 10; sp(x, 83, dith(x, 83, 6.8 - nx * 3, COPPER)); sp(x, 82, dith(x, 82, 5 - nx * 2.6, COPPER)); }
  for (let y = 75; y <= 81; y++) {
    const k = (81.5 - y) / 7.4, hw = 9 * Math.sqrt(Math.max(0, 1 - k * k));
    for (let x = Math.floor(LX - hw); x < Math.ceil(LX + hw); x++) {
      const nx = (x + 0.5 - LX) / Math.max(hw, 1);
      if (Math.abs(nx) > 1.05) continue;
      let v = 4.2 - nx * 2.6 + (1 - k) * 0.6;
      if (nx < -0.25 && nx > -0.75 && k > 0.2) v += 2;
      sp(x, y, dith(x, y, v, COPPER));
    }
  }
  for (const [x, y, c] of [[LX - 1, 74, 6], [LX, 74, 4], [LX - 2, 73, 6], [LX - 1, 73, 8], [LX, 73, 5], [LX + 1, 73, 3], [LX - 1, 72, 6], [LX, 72, 4], [LX - 1, 71, 3], [LX - 1, 70, 3], [LX - 1, 69, 4]]) sp(x, y, COPPER[c]);
  // rail in front of the watch room, catching the lamplight on its top
  for (let x = LX - 14; x < LX + 14; x++) {
    const nx = (x + 0.5 - LX) / 14;
    sp(x, 94, COPPER[nx < 0.2 ? 8 : 6]); sp(x, 98, COPPER[nx < 0 ? 5 : 3]);
    if ((x - LX + 14) % 3 === 0 || x === LX + 13) for (let y = 95; y <= 101; y++) if (y !== 98) sp(x, y, COPPER[nx < 0 ? 5 : 2]);
  }

  // the shed at its foot: white walls, a rust roof, a door, one warm window
  const { x0, x1 } = SHED;
  for (let y = 160; y <= 178; y++) for (let x = x0; x <= x1; x++) {
    const nx = (x - x0) / (x1 - x0);
    let v = 7.4 - nx * 2.8 - (y < 162 ? (162 - y) * 1.4 : 0) + (noise2(x * 0.7, y * 0.5) - 0.5) * 0.8 - (x === x0 ? 1.6 : 0);
    sp(x, y, dith(x, y, v, TOWER));
  }
  for (let y = 153; y <= 159; y++) {
    const inset = Math.round((159 - y) * 0.3);
    for (let x = x0 - 1 + inset; x <= x1 + 1 - inset; x++) {
      const nx = (x - x0) / (x1 - x0);
      let v = 5.4 - nx * 2.4 + (y === 153 ? 1.8 : 0) - (y === 159 ? 1.6 : 0) - ((y - 153) % 2 === 1 ? 0.5 : 0) + (noise2(x * 0.6, y) - 0.5) * 0.6;
      sp(x, y, dith(x, y, v, COPPER));
    }
  }
  for (let y = 165; y <= 178; y++) for (let x = 373; x <= 376; x++) sp(x, y, y === 165 && (x === 373 || x === 376) ? TOWER[4] : x === 373 ? COPPER[3] : COPPER[1]);
  for (let y = 163; y <= 166; y++) for (let x = 365; x <= 368; x++) {
    const bar = x === 367 || y === 165;
    if (bar) sp(x, y, WARM[1]); else sp(x, y, y === 163 ? WARM[4] : WARM[3], 2);
  }
  for (let x = 364; x <= 369; x++) sp(x, 167, TOWER[9]);
}

// ---------------------------------------------------------------- beam precompute: one ray per sky pixel
const RVX = new Float32Array(W * HZ), RVZ = new Float32Array(W * HZ), RDV = new Float32Array(W * HZ);
const W0X = -XL, W0Y = HC - YL, W0Z = -ZL, W02 = W0X * W0X + W0Y * W0Y + W0Z * W0Z;
for (let y = 0; y < HZ; y++) for (let x = 0; x < W; x++) {
  let vx = (x + 0.5 - CX) / F, vy = -(y + 0.5 - HZ) / F, vz = 1;
  const n = Math.hypot(vx, vy, vz); vx /= n; vy /= n; vz /= n;
  const j = y * W + x;
  RVX[j] = vx; RVZ[j] = vz; RDV[j] = vx * W0X + vy * W0Y + vz * W0Z;
}
const R0 = 0.9, TB = 0.072;                                    // lens radius (m), tan of the cone half-angle
const hillPix = [];
for (let x = 0; x < W; x++) for (let y = hillTop[x]; y <= HZ; y++) {
  const Zh = 900, X = (x + 0.5 - CX) * Zh / F, dx = X - XL, dz = Zh - ZL, r = Math.hypot(dx, dz);
  hillPix.push(y * W + x, dx / r, dz / r);
}

// ---------------------------------------------------------------- frame
const cloudMask = new Uint8Array(W * HZ);
const waveAt = (p1, p2, a1, a2, k1) => (Math.sin(p1 - a1) * k1 + 0.7 * Math.sin(p2 - a2)) / (k1 + 0.7);
// moonlit value -> warm value when the beam is on it: keeps the swell's light and dark, tints it gold
const warmV = (v, L) => (v - 3.5) * 0.5 + L * 6.2;
const pick = (ramp, v) => ramp[v <= 0 ? 0 : v >= ramp.length - 1 ? ramp.length - 1 : Math.round(v)];

function render(t) {
  const u = t / T;
  buf.set(base); gl.set(baseGlow); cloudMask.fill(0);
  const th = heading(u), cT = Math.cos(th), sT = Math.sin(th);
  const facing = Math.max(0, cT * CAMX + sT * CAMZ), flash = Math.pow(facing, 16);
  const a1 = TAU * WAVES[0][3] * u, a2 = TAU * WAVES[1][3] * u, a0 = TAU * u;

  // stars
  for (const [x, y, ph, k, big] of stars) {
    const tw = 0.5 + 0.5 * Math.sin(TAU * (k * u + ph));
    if (tw < 0.3) continue;
    put(x, y, STAR[tw > 0.86 ? 2 : tw > 0.58 ? 1 : 0], tw > 0.86 ? 1 : 0);
    if (big && tw > 0.72) { put(x - 1, y, STAR[0]); put(x + 1, y, STAR[0]); put(x, y - 1, STAR[0]); put(x, y + 1, STAR[0]); }
  }
  // clouds drift a few pixels and back
  for (const cl of clouds) {
    const dx = Math.round(cl.amp * Math.sin(TAU * (u + cl.ph)));
    const px = cl.px;
    for (let k = 0; k < px.length; k += 3) {
      const x = px[k] + dx, y = px[k + 1];
      if (x < 0 || x >= W || y < 0 || y >= HZ || y >= hillTop[x]) continue;
      const i = y * W + x;
      buf[i] = px[k + 2]; gl[i] = 0; cloudMask[i] = 1;
    }
  }
  // the beam grazes the far hills as it passes over them
  for (let k = 0; k < hillPix.length; k += 3) {
    const cd = hillPix[k + 1] * cT + hillPix[k + 2] * sT;
    if (cd < 0.97) continue;
    const L = Math.exp((cd - 1) * 220) * 0.8;
    const i = hillPix[k], x = i % W, y = (i / W) | 0;
    const lev = Math.floor(L * 4 + thr(x, y));
    if (lev > 0) buf[i] = mixc(buf[i], HILL_LIT, lev * 0.2);
  }

  // the wheat surface: swells, silver-gold on the crests, warmer where the beam lies
  for (let y = FR0; y <= FRONT; y++) {
    const row = (y - FR0) * W;
    for (let x = 0; x < W; x++) {
      const j = row + x, i = y * W + x;
      const k1 = fA1[j];
      const w = waveAt(fP1[j], fP2[j], a1, a2, k1) * fA2[j];
      const g = 0.6 + 0.4 * Math.sin(fG[j] - a0);
      const hh = (1 + w) * 0.5;
      const crest = hh * hh * hh * g;
      const v = fBase[j] + crest * fCrest[j] - (1 - hh) * 2.0 + (g - 0.6) * 1.8 * fFar[j];
      let L = fL0[j];
      const cd = fCph[j] * cT + fSph[j] * sT;
      if (cd > 0.8) L += Math.exp((cd - 1) * 58) * fRL[j];
      fV[j] = v; fL[j] = L; fW[j] = w; fCr[j] = crest;
      let c = dith(x, y, v, WHEAT), gg = 0;
      if (L > 0.02) {
        const lq = Math.floor(Math.min(1, L * 1.4) * 4 + thr(x, y)) * 0.25;
        if (lq > 0) { const vw = warmV(v, L); c = mixc(c, dith(x, y, vw, WLIT), Math.min(1, lq)); gg = vw > 9 && lq >= 1 ? 1 : 0; }
      }
      buf[i] = c; gl[i] = gg;
    }
  }
  // the near wall of stalks above the cut: a dark mass of stems
  for (let x = 0; x < W; x++) {
    const g0 = GY[x], stem = hsh(x * 0.73) > 0.6 ? 0.9 : 0;
    for (let y = FRONT + 1; y < g0; y++) {
      const k = (y - FRONT) / (g0 - FRONT);
      const i = y * W + x;
      buf[i] = dith(x, y, 5.2 - k * 4.6 + stem * (1 - k * 0.5) + (noise2(x * 0.45, y * 0.05) - 0.5) * 0.9, STEM); gl[i] = 0;
    }
  }

  const drawHead = (hd) => {
    const j = hd.j, w = fW[j], L = fL[j], cr = fCr[j];
    const v = Math.min(fV[j] + 1.2 + cr * 3.4 + hd.tone, fV[j] + (hd.size < 3 ? 1.5 : 3.2));
    const lean = Math.round((w + 0.5) * hd.sway);
    const warm = L > 0.06 && Math.min(1, L * 1.4) > thr(hd.x, hd.y);
    const ramp = warm ? WLIT : WHEAT, vv = warm ? warmV(v, L) : v, g = warm && vv > 9 ? 1 : 0;
    const x = hd.x, y = hd.y;
    switch (hd.size) {
      case 1: put(x + Math.round(lean * 0.5), y, pick(ramp, vv - 0.6 - hd.tone * 0.6)); break;
      case 2: put(x, y, pick(ramp, vv - 0.8)); put(x + Math.round(lean * 0.6), y - 1, pick(ramp, vv + 0.4), g); break;
      case 3:
        put(x, y + 1, pick(warm ? ramp : WHEAT, (warm ? vv : fV[j]) - 2));
        put(x, y, pick(ramp, vv - 0.9)); put(x + Math.round(lean * 0.45), y - 1, pick(ramp, vv), g); put(x + lean, y - 2, pick(ramp, vv + 0.9), g);
        break;
      default: {
        put(x, y + 1, pick(warm ? ramp : WHEAT, (warm ? vv : fV[j]) - 2.4));
        for (let k = 0; k < 4; k++) {
          const s = (k + 1) / 4, xx = x + Math.round(lean * s * s);
          put(xx, y - k, pick(ramp, vv - 1 + k * 0.6), g);
          if (k === 1 || k === 2) put(xx + (k === 1 ? -1 : 1), y - k, pick(ramp, vv - (k === 1 ? 0.6 : 2)));
        }
      }
    }
  };
  for (const hd of headsBehind) drawHead(hd);

  // lighthouse and shed
  for (let k = 0; k < solid.length; k += 2) { buf[solid[k]] = solid[k + 1]; gl[solid[k]] = twMask[solid[k]] === 2 ? 1 : 0; }
  // lantern panes: the lens shows brightest on the side the beam leaves from
  const behind = Math.max(0, sT);
  for (let k = 0; k < glass.length; k += 2) {
    const x = glass[k], y = glass[k + 1], i = y * W + x;
    const nx = (x + 0.5 - LX) / 7.5;
    const hl = Math.exp(-((nx - cT * 0.85) ** 2) / 0.2) * (1 - behind * 0.45);
    const v = 2.4 + facing * 2.2 + hl * 2.2 + (Math.abs(y - LAMPY) < 1.5 ? 0.7 : 0) - (y === 84 ? 0.7 : 0);
    buf[i] = dith(x, y, v, GLASS); gl[i] = 1;
  }
  for (const hd of headsFront) drawHead(hd);

  // the beam: a soft cone of light in the night air, brighter as it turns toward us
  const dX = cT, dZ = sT, e = dX * W0X + dZ * W0Z;
  for (let y = 0; y < HZ; y++) {
    const row = y * W;
    for (let x = 0; x < W; x++) {
      const j = row + x;
      const vx = RVX[j], vz = RVZ[j], dv = RDV[j];
      const b = vx * dX + vz * dZ;
      let den = 1 - b * b; if (den < 1e-4) den = 1e-4;
      let uu = (e - b * dv) / den, s = (b * e - dv) / den, d2, rad;
      if (uu < 0) { uu = 0; s = -dv; d2 = W02 - dv * dv; rad = R0; }
      else { d2 = W02 + s * s + uu * uu + 2 * s * dv - 2 * uu * e - 2 * s * uu * b; rad = R0 + uu * TB; }
      if (s <= 0) continue;
      const q = Math.max(0, d2) / (rad * rad);
      if (q > 12) continue;
      if (twMask[j] && s * vz > ZL - 2) continue;
      const fwd = Math.max(0, -b), bk = Math.max(0, b);
      let I = (0.55 * Math.exp(-q * 1.6) + 0.45 * Math.exp(-q * 0.5)) * Math.exp(-uu / 50) * (1.05 + 0.45 * fwd * fwd * fwd) * (1 - 0.35 * bk);
      if (cloudMask[j]) I *= 1.7;
      const lev = Math.floor(I * 9 + thr(x, y));
      if (lev <= 0) continue;
      buf[j] = mixc(buf[j], lev > 6 ? BEAMW : BEAMC, Math.min(0.82, lev * 0.085));
      if (lev >= 7) gl[j] = 1;
    }
  }
  // the lamp itself, flaring as the beam comes round to face us
  {
    const HR = 4 + 16 * flash;
    for (let y = Math.floor(LAMPY - HR); y <= LAMPY + HR; y++) for (let x = Math.floor(LX - HR); x <= LX + HR; x++) {
      if (y < 0 || y >= H) continue;
      const d = Math.hypot(x + 0.5 - LX, (y + 0.5 - LAMPY) * 1.1);
      if (d > HR) continue;
      const ee = 1 - d / HR, I = ee * ee * (0.4 + 0.6 * flash) + (d < 2.5 ? 0.35 : 0);
      const lev = Math.floor(I * 8 + thr(x, y));
      if (lev <= 0) continue;
      const i = y * W + x;
      buf[i] = mixc(buf[i], BEAMW, Math.min(0.92, lev * 0.12)); gl[i] = 1;
    }
  }

  // foreground stalks: a curved stem, a long braided ear, awns
  for (const st of stalks) {
    const w = waveAt(st.p1, st.p2, a1, a2, 1);
    const g = 0.6 + 0.4 * Math.sin(st.g - a0);
    const hh = (1 + w) * 0.5, crest = Math.pow(hh, 2.5) * g;
    const tip = (st.lean + 5.0 * (0.5 + 0.5 * w) * g + 0.7 * Math.sin(TAU * 5 * u + st.ph)) * (st.h / 40);
    const cd = st.cph * cT + st.sph * sT;
    const L = cd > 0.8 ? Math.exp((cd - 1) * 58) * st.rl : 0;
    const warm = L * 1.4 > 0.2 + st.tone * 0.6;
    const back = st.dim;
    const hv = 9.6 + crest * 6.2 + st.tone * 1.5 - back * 1.7;
    const ramp = warm ? WLIT : WHEAT, HV = warm ? warmV(hv, L) : hv, gg = warm && HV > 9 ? 1 : 0;
    const sr = warm ? WLIT : STEM, s0 = warm ? 0.6 + L * 2.2 : 2.6 - back * 0.9;
    let lx = st.x, ly = st.y, px = st.x;
    for (let k = 0; k <= st.h; k++) {
      const s = k / st.h;
      const x = Math.round(st.x + tip * s * s), y = st.y - k + Math.round(Math.abs(tip) * 0.34 * s * s * s * s);
      const hk = st.h - k;                                     // 0 at the tip
      if (hk >= st.ear) put(x, y, pick(sr, s0 + s * 4.4));
      else {
        const taper = hk === 0 || hk === st.ear - 1;
        put(x, y, pick(ramp, HV + 0.8 - hk * 0.28), gg);
        if (!taper && (hk & 1)) put(x - 1, y, pick(ramp, HV - 0.3));
        if (!taper && !(hk & 1)) put(x + 1, y, pick(ramp, HV - 1.9));
      }
      if (k > 0 && Math.abs(x - px) > 1) put((x + px) >> 1, y, hk >= st.ear ? pick(sr, s0 + s * 4.4) : pick(ramp, HV));
      lx = x; ly = y; px = x;
    }
    const sd = tip > 0.5 ? 1 : tip < -0.5 ? -1 : 0;
    for (let a = 1; a <= 3; a++) if (a < 3 || st.tone > 0.4) put(lx + sd * a, ly - a + (sd !== 0 && a === 3 ? 1 : 0), pick(ramp, HV - 1.6 - a * 0.7));
    if (st.tone > 0.6) { put(lx - 1 + sd, ly - 2, pick(ramp, HV - 3)); put(lx - 1 + sd, ly - 3, pick(ramp, HV - 3.6)); }
  }

  // fireflies wandering over the wheat
  for (let k = 0; k < 13; k++) {
    const x0 = 16 + hsh(k * 2.7) * 448, y0 = 178 + hsh(k * 5.3) * 44;
    const k1 = 1 + (k % 3), k2 = 2 + (k % 2), k3 = 1 + ((k + 1) % 3);
    const x = x0 + 10 * Math.sin(TAU * (k1 * u + hsh(k * 1.1))) + 4 * Math.sin(TAU * (k2 * 2 * u + hsh(k * 7.7)));
    const y = y0 + 5 * Math.sin(TAU * (k3 * u + hsh(k * 3.9))) + 2 * Math.sin(TAU * (5 * u + k));
    const blink = 0.5 + 0.5 * Math.sin(TAU * ((3 + (k % 4)) * u + hsh(k * 9.1)));
    if (blink < 0.3) continue;
    const lv = blink > 0.8 ? 3 : blink > 0.55 ? 2 : 1;
    put(x, y, FIRE[lv], 1);
    if (lv === 3) { put(x + 1, y, FIRE[1], 1); put(x, y + 1, FIRE[0], 1); }
  }

  P.present(Math.floor(t * FPS));
}

diorama({ width: P.OW, height: P.OH, fps: FPS, duration: T, render });
