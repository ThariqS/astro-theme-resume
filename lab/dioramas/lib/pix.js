// Low-res pixel buffer with dithering, upscaled nearest-neighbour, then soft glow, vignette and grain.
// The look follows the pixel pieces in ~/Projects/dioramas (270x338 at 4x, Bayer + hash dither).
import { clamp, BAYER4, rng } from './util.js';

export const pk = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
export const C = (h) => { const n = parseInt(h.slice(1), 16); return pk((n >> 16) & 255, (n >> 8) & 255, n & 255); };
export const R = (a) => a.map(C);
export const unpk = (c) => [c & 255, (c >> 8) & 255, (c >> 16) & 255];
const hex = (c) => '#' + [c & 255, (c >>> 8) & 255, (c >>> 16) & 255].map((v) => v.toString(16).padStart(2, '0')).join('');
export const mixc = (a, b, f) => {
  const fi = Math.max(0, Math.min(256, (f * 256 + 0.5) | 0)), gi = 256 - fi;
  const r = ((a & 255) * gi + (b & 255) * fi) >> 8;
  const g = (((a >>> 8) & 255) * gi + ((b >>> 8) & 255) * fi) >> 8;
  const bl = (((a >>> 16) & 255) * gi + ((b >>> 16) & 255) * fi) >> 8;
  return ((255 << 24) | (bl << 16) | (g << 8) | r) >>> 0;
};

// Colour grade: move each colour's Lab statistics from `from` towards `to` by k.
//   from/to = [Lmean, Lstd, aMean, aStd, bMean, bStd, chromaMean]; ?nograde turns it off (used to measure a scene).
const lin = (v) => (v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92);
const gam = (v) => (v > 0.0031308 ? 1.055 * v ** (1 / 2.4) - 0.055 : 12.92 * v);
function toLab(r, g, b) {
  r = lin(r / 255); g = lin(g / 255); b = lin(b / 255);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.9505, y = 0.2126 * r + 0.7152 * g + 0.0722 * b, z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.089;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function fromLab(L, a, b) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const fi = (t) => (t > 0.206893 ? t * t * t : (t - 16 / 116) / 7.787);
  const x = fi(fx) * 0.9505, y = fi(fy), z = fi(fz) * 1.089;
  const r = 3.2406 * x - 1.5372 * y - 0.4986 * z, g = -0.9689 * x + 1.8758 * y + 0.0415 * z, bl = 0.0557 * x - 0.204 * y + 1.057 * z;
  const c = (v) => Math.max(0, Math.min(255, Math.round(gam(Math.max(0, v)) * 255)));
  return [c(r), c(g), c(bl)];
}
// The grade keeps hues: lightness moves to the reference's mean/spread, chroma scales as a whole,
// warm and neutral colours take the reference's warmth (blues are left blue), and `sel` entries
// [hueDeg, widthDeg, dHue, chromaMul, dL] nudge one family of colours (e.g. olive wheat -> gold).
function makeGrade({ from, to, k = 0.85, kL = k, kC = k, kW = k, sel = [] }) {
  const sL = to[1] / from[1];
  const sC = from[6] && to[6] ? clamp(to[6] / from[6], 0.8, 1.5) : 1;
  const dA = to[2] - from[2], dB = to[4] - from[4];
  const lut = new Uint32Array(1 << 18);
  const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  return (c) => {
    const idx = (((c & 255) >> 2) << 12) | ((((c >>> 8) & 255) >> 2) << 6) | (((c >>> 16) & 255) >> 2);
    let v = lut[idx];
    if (v) return v;
    let [L, a, b] = toLab(((c & 255) & ~3) + 2, (((c >>> 8) & 255) & ~3) + 2, (((c >>> 16) & 255) & ~3) + 2);
    L += kL * ((L - from[0]) * sL + to[0] - L);
    let C = Math.hypot(a, b), h = Math.atan2(b, a) * 180 / Math.PI;
    for (const [hc, wd, dh, cm, dl] of sel) {
      const d = ((h - hc + 540) % 360) - 180;
      const w = sm(1 - Math.abs(d) / wd) * sm((C - 3) / 8);
      h += w * dh; C *= 1 + w * (cm - 1); L += w * dl;
    }
    C *= 1 + kC * (sC - 1);
    a = C * Math.cos(h * Math.PI / 180); b = C * Math.sin(h * Math.PI / 180);
    const ww = clamp((b + 12) / 24, 0, 1);
    a += kW * dA * ww; b += kW * dB * ww;
    const [r, g, bl] = fromLab(L, a, b);
    return (lut[idx] = ((255 << 24) | (bl << 16) | (g << 8) | r) >>> 0);
  };
}

export function createPix({ W, H, S, canvas, vignette = '#b8a99c', vigAmt = 0.8, lift = '#120e0d', grain = 0.08, glow = [0.75, 0.5], grade = null }) {
  const OW = W * S, OH = H * S;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  const lo = mk(W, H), lctx = lo.getContext('2d');
  const img = lctx.createImageData(W, H);
  const buf = new Uint32Array(img.data.buffer);
  const oimg = lctx.createImageData(W, H);                // what gets shown: buf after the grade
  const obuf = new Uint32Array(oimg.data.buffer);
  const gradeFn = grade && !new URLSearchParams(location.search).has('nograde') ? makeGrade(grade) : null;
  const gl = new Uint8Array(W * H);                       // 1 = this pixel glows
  const glc = mk(W, H), gctx = glc.getContext('2d');
  const gimg = gctx.createImageData(W, H);
  const gbuf = new Uint32Array(gimg.data.buffer);
  const out = canvas.getContext('2d');

  // Vignette (multiplied, gentle and warm) and a few deterministic grain frames.
  const vig = mk(OW, OH), vctx = vig.getContext('2d');
  const grd = vctx.createRadialGradient(OW / 2, OH * 0.46, OW * 0.34, OW / 2, OH / 2, Math.hypot(OW, OH) * 0.62);
  grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, hex(mixc(C('#ffffff'), C(vignette), vigAmt)));
  vctx.fillStyle = grd; vctx.fillRect(0, 0, OW, OH);
  const grains = [];
  for (let k = 0; k < 6; k++) {
    const g = mk(OW / 2, OH / 2), c = g.getContext('2d'), d = c.createImageData(g.width, g.height), r = rng(k * 7919 + 13);
    for (let i = 0; i < d.data.length; i += 4) { const v = (r() * 255) | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    c.putImageData(d, 0, 0); grains.push(g);
  }

  const bay = (x, y) => BAYER4[((y & 3) << 2) | (x & 3)];
  const h21 = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
  const thr = (x, y) => bay(x, y) * 0.75 + h21(x, y) * 0.25;

  function put(x, y, c, g = 0) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = y * W + x; buf[i] = c; gl[i] = g;
  }
  // v is a fractional index into ramp; the fraction is dithered.
  function dith(x, y, v, ramp) {
    const n = ramp.length - 1; v = clamp(v, 0, n);
    const i = Math.floor(v), f = v - i;
    return (i < n && f > thr(x, y)) ? ramp[i + 1] : ramp[i];
  }
  function line(x0, y0, x1, y1, c, g = 0) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) { put(x0, y0, c, g); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  // Draw a sprite given as an array of strings; key maps characters to colours ('.' is transparent).
  function sprite(rows, key, x0, y0, flip = false, g = 0) {
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[flip ? row.length - 1 - c : c];
        if (ch !== '.' && key[ch] !== undefined) put(x0 + c, y0 + r, key[ch], g);
      }
    }
  }

  function present(frame) {
    if (gradeFn) for (let i = 0; i < buf.length; i++) obuf[i] = gradeFn(buf[i]);
    else obuf.set(buf);
    lctx.putImageData(oimg, 0, 0);
    for (let i = 0; i < gbuf.length; i++) gbuf[i] = gl[i] ? obuf[i] : 0;
    gctx.putImageData(gimg, 0, 0);
    out.save();
    out.imageSmoothingEnabled = false;
    out.globalCompositeOperation = 'source-over'; out.globalAlpha = 1; out.filter = 'none';
    out.drawImage(lo, 0, 0, OW, OH);
    out.imageSmoothingEnabled = true;
    out.globalCompositeOperation = 'screen';
    out.filter = `blur(${S * 2.5}px)`; out.globalAlpha = glow[0]; out.drawImage(glc, 0, 0, OW, OH);
    out.filter = `blur(${S * 9}px)`; out.globalAlpha = glow[1]; out.drawImage(glc, 0, 0, OW, OH);
    out.filter = 'none';
    out.globalCompositeOperation = 'multiply'; out.globalAlpha = 1; out.drawImage(vig, 0, 0);
    if (lift) { out.globalCompositeOperation = 'screen'; out.fillStyle = lift; out.fillRect(0, 0, OW, OH); }
    out.globalCompositeOperation = 'overlay'; out.globalAlpha = grain; out.drawImage(grains[((frame % 6) + 6) % 6], 0, 0, OW, OH);
    out.restore();
  }

  return { W, H, OW, OH, buf, gl, put, dith, thr, line, sprite, present, clearGlow: () => gl.fill(0) };
}
