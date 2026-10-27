import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STICKER_EMOJI, createSticker, hitTest, moveSticker, clampSticker } from '../../src/renderer/core/stickers.js';

test('has a palette of emoji', () => {
  assert.ok(STICKER_EMOJI.length >= 12);
  assert.equal(new Set(STICKER_EMOJI).size, STICKER_EMOJI.length, 'no duplicates');
});

test('createSticker gives unique ids and defaults', () => {
  const a = createSticker('⭐');
  const b = createSticker('💖', { x: 0.2 });
  assert.notEqual(a.id, b.id);
  assert.deepEqual({ ...a, id: 0 }, { id: 0, emoji: '⭐', x: 0.5, y: 0.5, size: 0.2, rotation: 0 });
  assert.equal(b.x, 0.2);
});

test('hitTest returns the topmost sticker under the point', () => {
  const below = createSticker('⭐', { x: 0.5, y: 0.5, size: 0.2 });
  const above = createSticker('💖', { x: 0.55, y: 0.5, size: 0.2 });
  // Frame 600x1800: sticker radius is 0.2 * 600 / 2 = 60px.
  assert.equal(hitTest([below, above], 320, 900, 600, 1800), above.id);
  assert.equal(hitTest([below, above], 250, 900, 600, 1800), below.id);
  assert.equal(hitTest([below, above], 10, 10, 600, 1800), null);
});

test('moveSticker shifts and clamps to the frame', () => {
  const s = createSticker('⭐', { x: 0.9, y: 0.1 });
  const moved = moveSticker(s, 0.5, -0.5);
  assert.equal(moved.x, 1);
  assert.equal(moved.y, 0);
  assert.equal(s.x, 0.9, 'original untouched');
});

test('clampSticker bounds position, size and rotation', () => {
  const s = clampSticker({ id: 1, emoji: '⭐', x: -2, y: 3, size: 4, rotation: 270 });
  assert.deepEqual(s, { id: 1, emoji: '⭐', x: 0, y: 1, size: 0.6, rotation: 180 });
  assert.equal(clampSticker({ ...s, size: 0 }).size, 0.05);
  // The rotation slider runs -180..180; its ends must not flip to each other.
  assert.equal(clampSticker({ ...s, rotation: 180 }).rotation, 180);
  assert.equal(clampSticker({ ...s, rotation: -180 }).rotation, -180);
  assert.equal(clampSticker({ ...s, rotation: -300 }).rotation, -180);
});
