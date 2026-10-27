import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PHOTOS, createInitialState, createStore, slotCount, addPhotos, removePhoto, movePhoto, updatePhoto,
} from '../../src/renderer/core/state.js';

const now = new Date(2026, 9, 27);
const photo = (id) => ({ id, name: `${id}.jpg` });

test('initial state', () => {
  const s = createInitialState(now);
  assert.equal(s.layout, 'strip');
  assert.equal(s.photoCount, 4);
  assert.deepEqual(s.photos, []);
  assert.equal(s.filter, 'original');
  assert.equal(s.theme.preset, 'classic');
  assert.deepEqual(s.caption, { text: '', font: 'typewriter', showDate: true, date: now, dateFormat: 'long' });
  assert.deepEqual(s.stickers, []);
  assert.equal(s.selectedStickerId, null);
  assert.equal(s.cutLine, true);
});

test('slotCount follows the layout', () => {
  const s = createInitialState(now);
  assert.equal(slotCount(s), 4);
  assert.equal(slotCount({ ...s, photoCount: 3 }), 3);
  assert.equal(slotCount({ ...s, layout: 'polaroid' }), 1);
  assert.equal(slotCount({ ...s, layout: 'double', photoCount: 3 }), 3);
});

test('addPhotos appends with default framing and caps at 4', () => {
  let s = createInitialState(now);
  s = addPhotos(s, [photo('a'), photo('b'), photo('c')]);
  s = addPhotos(s, [photo('d'), photo('e')]);
  assert.equal(MAX_PHOTOS, 4);
  assert.deepEqual(s.photos.map((p) => p.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(s.photos[0], { id: 'a', name: 'a.jpg', zoom: 1, panX: 0, panY: 0 });
});

test('removePhoto, movePhoto and updatePhoto', () => {
  let s = addPhotos(createInitialState(now), ['a', 'b', 'c'].map(photo));
  s = movePhoto(s, 0, 2);
  assert.deepEqual(s.photos.map((p) => p.id), ['b', 'c', 'a']);
  s = movePhoto(s, 2, 9);
  assert.deepEqual(s.photos.map((p) => p.id), ['b', 'c', 'a'], 'out of range is a no-op');
  s = removePhoto(s, 'c');
  assert.deepEqual(s.photos.map((p) => p.id), ['b', 'a']);
  s = updatePhoto(s, 'a', { zoom: 2 });
  assert.equal(s.photos[1].zoom, 2);
  assert.equal(s.photos[0].zoom, 1);
});

test('store notifies subscribers and supports unsubscribe', () => {
  const store = createStore(createInitialState(now));
  const seen = [];
  const off = store.subscribe((state, prev) => seen.push([prev.filter, state.filter]));
  store.update((s) => ({ ...s, filter: 'bw' }));
  off();
  store.update((s) => ({ ...s, filter: 'sepia' }));
  assert.deepEqual(seen, [['original', 'bw']]);
  assert.equal(store.getState().filter, 'sepia');
});
