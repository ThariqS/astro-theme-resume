// Small deterministic helpers shared by dioramas.
export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const fract = (x) => x - Math.floor(x);

// Seeded RNG (mulberry32). const r = rng(42); r() -> [0,1)
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Hash-based value noise, deterministic.
export function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
export function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
export function fbm(x, y, oct = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise2(x * f, y * f); f *= 2; a *= 0.5; } return s; }

export const hex = (h) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const BAYER8 = (() => { const m = []; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
  let v = 0, xx = x, yy = y ^ x; for (let b = 0; b < 3; b++) { v = (v << 2) | (((yy >> b) & 1) << 1) | ((xx >> b) & 1); } m.push(v); }
  // reorder bits into standard Bayer
  return Array.from({ length: 64 }, (_, i) => { const x = i % 8, y = (i / 8) | 0; let v = 0, mask = 4;
    for (let k = 0; k < 3; k++) { v = (v << 2) | ((((x ^ y) & mask) ? 1 : 0) << 1) | ((y & mask) ? 1 : 0); mask >>= 1; } return (v + 0.5) / 64; }); })();
