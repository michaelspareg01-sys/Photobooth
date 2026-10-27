// Pixel filters that work on anything shaped like ImageData:
// { width, height, data: Uint8ClampedArray (RGBA) }. They mutate data in place
// and never touch alpha.

export const FILTERS = [
  { id: 'original', name: 'Original' },
  { id: 'bw', name: 'B&W' },
  { id: 'sepia', name: 'Sepia' },
  { id: 'vintage', name: 'Vintage' },
  { id: 'noir', name: 'Noir' },
  { id: 'warm', name: 'Warm' },
  { id: 'cool', name: 'Cool' },
];

// Rec. 601 luma weights.
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

// Small seeded PRNG (mulberry32) so film grain is repeatable.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function eachPixel(img, fn) {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = fn(d[i], d[i + 1], d[i + 2], i / 4);
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
}

function sepia(r, g, b) {
  return [
    0.393 * r + 0.769 * g + 0.189 * b,
    0.349 * r + 0.686 * g + 0.168 * b,
    0.272 * r + 0.534 * g + 0.131 * b,
  ];
}

const OPS = {
  original: () => {},
  bw: (img) => eachPixel(img, (r, g, b) => {
    const y = luma(r, g, b);
    return [y, y, y];
  }),
  sepia: (img) => eachPixel(img, sepia),
  noir: (img) => eachPixel(img, (r, g, b) => {
    const y = (luma(r, g, b) - 128) * 1.5 + 128;
    return [y, y, y];
  }),
  warm: (img) => eachPixel(img, (r, g, b) => [r * 1.08 + 8, g * 1.02 + 2, b * 0.9]),
  cool: (img) => eachPixel(img, (r, g, b) => [r * 0.92, g * 1.0 + 2, b * 1.08 + 8]),
  vintage: (img, { seed = 1 } = {}) => {
    const rand = mulberry32(seed);
    const cx = (img.width - 1) / 2;
    const cy = (img.height - 1) / 2;
    const maxDist = Math.hypot(cx, cy) || 1;
    eachPixel(img, (r, g, b, n) => {
      const [sr, sg, sb] = sepia(r, g, b);
      const dist = Math.hypot((n % img.width) - cx, Math.floor(n / img.width) - cy) / maxDist;
      const vignette = 1 - 0.45 * dist * dist;
      const grain = (rand() - 0.5) * 18;
      // Half sepia, faded blacks, a little warmth, vignette, then grain.
      const mix = (o, s) => (o * 0.5 + s * 0.5) * 0.85 + 25;
      return [
        (mix(r, sr) + 6) * vignette + grain,
        mix(g, sg) * vignette + grain,
        (mix(b, sb) - 6) * vignette + grain,
      ];
    });
  },
};

export function applyFilter(imageData, filterId, options) {
  const op = OPS[filterId];
  if (!op) throw new Error(`Unknown filter: ${filterId}`);
  op(imageData, options);
  return imageData;
}
