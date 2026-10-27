import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBooth } from '../../src/renderer/core/booth.js';
import { exportFileName } from '../../src/renderer/core/filename.js';

function recorder() {
  const log = [];
  return {
    log,
    wait: async (ms) => log.push(['wait', ms]),
    onTick: (n, shot) => log.push(['tick', n, shot]),
    onFlash: (shot) => log.push(['flash', shot]),
    capture: async (shot) => { log.push(['capture', shot]); return `photo${shot}`; },
  };
}

test('counts down, flashes and captures each shot in order', async () => {
  const r = recorder();
  const photos = await runBooth({ shots: 2, seconds: 3, pauseMs: 500, ...r });
  assert.deepEqual(photos, ['photo0', 'photo1']);
  assert.deepEqual(r.log, [
    ['tick', 3, 0], ['wait', 1000], ['tick', 2, 0], ['wait', 1000], ['tick', 1, 0], ['wait', 1000],
    ['flash', 0], ['capture', 0], ['wait', 500],
    ['tick', 3, 1], ['wait', 1000], ['tick', 2, 1], ['wait', 1000], ['tick', 1, 1], ['wait', 1000],
    ['flash', 1], ['capture', 1],
  ]);
});

test('abort stops before the next capture and returns what was taken', async () => {
  const r = recorder();
  const controller = new AbortController();
  const capture = async (shot) => { if (shot === 0) controller.abort(); return r.capture(shot); };
  const photos = await runBooth({ shots: 3, seconds: 1, ...r, capture, signal: controller.signal });
  assert.deepEqual(photos, ['photo0']);
  assert.equal(r.log.filter(([k]) => k === 'capture').length, 1);
});

test('export file name', () => {
  assert.equal(exportFileName('double', 'png', new Date(2026, 9, 27, 15, 30, 2)), 'photobooth-double-2026-10-27-153002.png');
  assert.equal(exportFileName('polaroid', 'jpg', new Date(2026, 0, 5, 9, 4, 0)), 'photobooth-polaroid-2026-01-05-090400.jpg');
});
