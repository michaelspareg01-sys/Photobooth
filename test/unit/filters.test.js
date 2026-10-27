import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FILTERS, applyFilter } from '../../src/renderer/core/filters.js';

function image(pixels, width = pixels.length, height = 1) {
  return { width, height, data: new Uint8ClampedArray(pixels.flat()) };
}
const px = (img, i) => Array.from(img.data.slice(i * 4, i * 4 + 4));

test('lists the filters in menu order', () => {
  assert.deepEqual(FILTERS.map((f) => f.id), ['original', 'bw', 'sepia', 'vintage', 'noir', 'warm', 'cool']);
});

test('original leaves pixels alone', () => {
  const img = image([[10, 20, 30, 255]]);
  applyFilter(img, 'original');
  assert.deepEqual(px(img, 0), [10, 20, 30, 255]);
});

test('bw uses Rec. 601 luma weights', () => {
  const img = image([[200, 100, 50, 255]]);
  applyFilter(img, 'bw');
  assert.deepEqual(px(img, 0), [124, 124, 124, 255]);
});

test('sepia applies the standard sepia matrix', () => {
  const img = image([[100, 50, 20, 255]]);
  applyFilter(img, 'sepia');
  assert.deepEqual(px(img, 0), [82, 73, 57, 255]);
});

test('noir is grayscale with more contrast than bw', () => {
  const pixels = [[40, 40, 40, 255], [215, 215, 215, 255]];
  const bw = image(pixels);
  const noir = image(pixels);
  applyFilter(bw, 'bw');
  applyFilter(noir, 'noir');
  const [dark, light] = [px(noir, 0), px(noir, 1)];
  assert.equal(dark[0], dark[1]);
  assert.equal(dark[1], dark[2]);
  assert.ok(dark[0] < px(bw, 0)[0]);
  assert.ok(light[0] > px(bw, 1)[0]);
});

test('warm raises red and lowers blue; cool does the opposite', () => {
  const warm = image([[100, 100, 100, 255]]);
  const cool = image([[100, 100, 100, 255]]);
  applyFilter(warm, 'warm');
  applyFilter(cool, 'cool');
  assert.ok(px(warm, 0)[0] > 100 && px(warm, 0)[2] < 100);
  assert.ok(px(cool, 0)[0] < 100 && px(cool, 0)[2] > 100);
});

test('vintage is deterministic for a seed and darkens corners', () => {
  const grey = Array.from({ length: 25 }, () => [150, 150, 150, 255]);
  const a = image(grey, 5, 5);
  const b = image(grey, 5, 5);
  const c = image(grey, 5, 5);
  applyFilter(a, 'vintage', { seed: 7 });
  applyFilter(b, 'vintage', { seed: 7 });
  applyFilter(c, 'vintage', { seed: 8 });
  assert.deepEqual(a.data, b.data);
  assert.notDeepEqual(a.data, c.data);
  const lum = (p) => p[0] + p[1] + p[2];
  assert.ok(lum(px(a, 0)) < lum(px(a, 12)), 'corner darker than center');
});

test('alpha is never changed', () => {
  for (const { id } of FILTERS) {
    const img = image([[90, 160, 220, 77]]);
    applyFilter(img, id, { seed: 1 });
    assert.equal(px(img, 0)[3], 77, id);
  }
});

test('unknown filter throws', () => {
  assert.throws(() => applyFilter(image([[0, 0, 0, 255]]), 'lomo'), /unknown filter/i);
});
