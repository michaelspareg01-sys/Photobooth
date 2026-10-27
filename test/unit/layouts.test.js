import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAYOUTS, computeLayout } from '../../src/renderer/core/layouts.js';

const inside = (r, w, h) => r.x >= 0 && r.y >= 0 && r.x + r.w <= w && r.y + r.h <= h;
const overlaps = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test('exposes the three layouts', () => {
  assert.deepEqual(LAYOUTS.map((l) => l.id), ['strip', 'polaroid', 'double']);
});

test('classic strip is 2x6 in at 300 DPI', () => {
  const l = computeLayout('strip', { photoCount: 4 });
  assert.equal(l.width, 600);
  assert.equal(l.height, 1800);
  assert.deepEqual(l.strip, { width: 600, height: 1800 });
  assert.deepEqual(l.copies, [{ x: 0, y: 0 }]);
});

for (const photoCount of [3, 4]) {
  test(`strip with ${photoCount} photos has equal, ordered, non-overlapping slots`, () => {
    const l = computeLayout('strip', { photoCount });
    assert.equal(l.slots.length, photoCount);
    for (const s of l.slots) {
      assert.ok(inside(s, 600, 1800), JSON.stringify(s));
      assert.equal(s.w, l.slots[0].w);
      assert.equal(s.h, l.slots[0].h);
      assert.ok(Number.isInteger(s.x) && Number.isInteger(s.y) && Number.isInteger(s.w) && Number.isInteger(s.h));
    }
    for (let i = 1; i < l.slots.length; i++) {
      assert.ok(l.slots[i].y > l.slots[i - 1].y);
      assert.ok(!overlaps(l.slots[i], l.slots[i - 1]));
    }
    const last = l.slots.at(-1);
    assert.ok(l.caption.y >= last.y + last.h, 'caption sits below photos');
    assert.ok(inside(l.caption, 600, 1800));
  });
}

test('strip photo count defaults to 4 and rejects other counts', () => {
  assert.equal(computeLayout('strip').slots.length, 4);
  assert.throws(() => computeLayout('strip', { photoCount: 5 }), /photo count/i);
});

test('polaroid is 3.5x4.2 in with a 3.1x3.1 in image', () => {
  const l = computeLayout('polaroid');
  assert.equal(l.width, 1050);
  assert.equal(l.height, 1260);
  assert.equal(l.slots.length, 1);
  const [s] = l.slots;
  assert.equal(s.w, 930);
  assert.equal(s.h, 930);
  assert.equal(s.x, 60, 'centered horizontally');
  assert.ok(l.caption.y >= s.y + s.h);
  assert.ok(inside(l.caption, 1050, 1260));
});

test('double strip puts two 2x6 strips on a 4x6 sheet', () => {
  const l = computeLayout('double', { photoCount: 3 });
  assert.equal(l.width, 1200);
  assert.equal(l.height, 1800);
  assert.deepEqual(l.strip, { width: 600, height: 1800 });
  assert.deepEqual(l.copies, [{ x: 0, y: 0 }, { x: 600, y: 0 }]);
  assert.equal(l.slots.length, 3);
  assert.deepEqual(l.slots, computeLayout('strip', { photoCount: 3 }).slots);
});

test('unknown layout throws', () => {
  assert.throws(() => computeLayout('nope'), /unknown layout/i);
});
