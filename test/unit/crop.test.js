import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coverCrop, clampPan, clampZoom } from '../../src/renderer/core/crop.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('wide photo into square slot crops the sides, centered', () => {
  const r = coverCrop(4000, 2000, 500, 500);
  close(r.sw, 2000);
  close(r.sh, 2000);
  close(r.sx, 1000);
  close(r.sy, 0);
});

test('tall photo into wide slot crops top and bottom, centered', () => {
  const r = coverCrop(1000, 3000, 300, 200);
  close(r.sw, 1000);
  close(r.sh, 1000 * (200 / 300));
  close(r.sy, (3000 - r.sh) / 2);
  close(r.sx, 0);
});

test('source rect always keeps the slot aspect ratio', () => {
  for (const [sw, sh, dw, dh, zoom] of [[1234, 987, 540, 360, 1], [800, 1600, 930, 930, 2.5], [5000, 100, 540, 486, 1.3]]) {
    const r = coverCrop(sw, sh, dw, dh, { zoom });
    close(r.sw / r.sh, dw / dh);
    assert.ok(r.sx >= 0 && r.sy >= 0 && r.sx + r.sw <= sw + 1e-9 && r.sy + r.sh <= sh + 1e-9);
  }
});

test('pan of -1 and 1 reaches the edges', () => {
  const left = coverCrop(4000, 2000, 500, 500, { panX: -1 });
  const right = coverCrop(4000, 2000, 500, 500, { panX: 1 });
  close(left.sx, 0);
  close(right.sx, 2000);
});

test('pan outside -1..1 is clamped', () => {
  assert.deepEqual(coverCrop(4000, 2000, 500, 500, { panX: 5 }), coverCrop(4000, 2000, 500, 500, { panX: 1 }));
  assert.equal(clampPan(-3), -1);
  assert.equal(clampPan(0.25), 0.25);
  assert.equal(clampPan(Number.NaN), 0);
});

test('zoom shrinks the source rect and stays centered', () => {
  const r = coverCrop(2000, 2000, 500, 500, { zoom: 2 });
  close(r.sw, 1000);
  close(r.sx, 500);
  close(r.sy, 500);
});

test('zoom is clamped to 1..5', () => {
  assert.equal(clampZoom(0.2), 1);
  assert.equal(clampZoom(9), 5);
  assert.equal(clampZoom(Number.NaN), 1);
  assert.deepEqual(coverCrop(2000, 1000, 100, 100, { zoom: 0.5 }), coverCrop(2000, 1000, 100, 100));
});

test('panBy converts a pointer drag in slot pixels to pan', async () => {
  const { panBy } = await import('../../src/renderer/core/crop.js');
  const photo = { zoom: 1, panX: 0, panY: 0 };
  // 4000x2000 into 500x500: 2000px of spare width, 4 source px per slot px.
  assert.deepEqual(panBy(photo, 4000, 2000, 500, 500, 125, 40), { panX: -0.5, panY: 0 });
  assert.deepEqual(panBy(photo, 4000, 2000, 500, 500, -9999, 0), { panX: 1, panY: 0 });
  assert.deepEqual(panBy({ ...photo, panY: 0.3 }, 1000, 1000, 500, 500, 10, 10), { panX: 0, panY: 0.3 }, 'no spare: unchanged');
});
