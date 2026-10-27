// "object-fit: cover" math with pan and zoom. Pan runs -1..1 per axis, where
// -1 shows the left/top edge of the photo and 1 the right/bottom edge.

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function clampPan(v) {
  return Number.isFinite(v) ? clamp(v, -1, 1) : 0;
}

export function clampZoom(v) {
  return Number.isFinite(v) ? clamp(v, MIN_ZOOM, MAX_ZOOM) : 1;
}

export function coverCrop(srcW, srcH, dstW, dstH, { zoom = 1, panX = 0, panY = 0 } = {}) {
  const z = clampZoom(zoom);
  const scale = Math.max(dstW / srcW, dstH / srcH) * z;
  const sw = dstW / scale;
  const sh = dstH / scale;
  const spareX = srcW - sw;
  const spareY = srcH - sh;
  return {
    sx: (spareX / 2) * (1 + clampPan(panX)),
    sy: (spareY / 2) * (1 + clampPan(panY)),
    sw,
    sh,
  };
}

// Turns a pointer drag of (dxPx, dyPx) slot pixels into a new pan, so the
// photo follows the pointer. Axes with no spare image stay where they are.
export function panBy(photo, srcW, srcH, dstW, dstH, dxPx, dyPx) {
  const { sw, sh } = coverCrop(srcW, srcH, dstW, dstH, photo);
  const spareX = srcW - sw;
  const spareY = srcH - sh;
  const shift = (pan, d, s, dst, spare) => (spare > 1e-9 ? clampPan(pan - (d * (s / dst)) / (spare / 2)) : pan);
  return {
    panX: shift(photo.panX, dxPx, sw, dstW, spareX),
    panY: shift(photo.panY, dyPx, sh, dstH, spareY),
  };
}
