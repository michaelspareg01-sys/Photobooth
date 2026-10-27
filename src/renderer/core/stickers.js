// Emoji stickers. Position (x, y) is the sticker center as a 0..1 fraction of
// the strip/frame; size is the sticker width as a fraction of the frame width.

export const STICKER_EMOJI = [
  '💖', '⭐', '✨', '😎', '👑', '🎉', '🥳', '😘',
  '🌸', '🔥', '💋', '🦋', '🌈', '🍾', '📸', '💯',
  '🎈', '😂', '🐶', '🌟',
];

export const MIN_SIZE = 0.05;
export const MAX_SIZE = 0.6;

let nextId = 1;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const wrapDegrees = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180;

export function clampSticker(s) {
  return {
    ...s,
    x: clamp(s.x, 0, 1),
    y: clamp(s.y, 0, 1),
    size: clamp(s.size, MIN_SIZE, MAX_SIZE),
    rotation: wrapDegrees(s.rotation),
  };
}

export function createSticker(emoji, { x = 0.5, y = 0.5, size = 0.2, rotation = 0 } = {}) {
  return clampSticker({ id: nextId++, emoji, x, y, size, rotation });
}

// Returns the id of the topmost sticker under pixel (px, py), or null.
export function hitTest(stickers, px, py, frameW, frameH) {
  for (let i = stickers.length - 1; i >= 0; i--) {
    const s = stickers[i];
    const radius = (s.size * frameW) / 2;
    if (Math.hypot(px - s.x * frameW, py - s.y * frameH) <= radius) return s.id;
  }
  return null;
}

export function moveSticker(s, dx, dy) {
  return clampSticker({ ...s, x: s.x + dx, y: s.y + dy });
}
