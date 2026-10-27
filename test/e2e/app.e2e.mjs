// End-to-end test: launches the real Electron app with a fake camera and
// drives it like a person would. On Linux without a display, run under
// xvfb-run (see README).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from 'playwright-core';
import { redGradient, blue, green } from './fixtures.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = path.join(root, 'test-output');

let app;
let page;
const errors = [];

const pixel = (x, y) => page.evaluate(([px, py]) => {
  const c = document.querySelector('#preview');
  return Array.from(c.getContext('2d').getImageData(px, py, 1, 1).data);
}, [x, y]);

const canvasSize = () => page.evaluate(() => {
  const c = document.querySelector('#preview');
  return [c.width, c.height];
});

// Waits until the preview has re-rendered after an action.
async function settle(action) {
  const before = await page.locator('#preview').getAttribute('data-rendered');
  await action();
  await page.waitForFunction((b) => document.querySelector('#preview').dataset.rendered !== b, before);
}

const near = (a, b, tol = 12) => a.slice(0, 3).every((v, i) => Math.abs(v - b[i]) <= tol);

before(async () => {
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  app = await electron.launch({
    args: [root, '--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    cwd: root,
  });
  page = await app.firstWindow();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.waitForSelector('body[data-ready="true"]');
  await page.setViewportSize({ width: 1440, height: 940 }).catch(() => {});
});

after(async () => {
  await app?.close();
});

test('starts with an empty classic strip at 2x6 in, 300 DPI', async () => {
  assert.deepEqual(await canvasSize(), [600, 1800]);
  assert.match(await page.textContent('#photo-hint'), /Add up to 4 photos/);
  assert.equal(await page.getAttribute('#layout-options [data-value="strip"]', 'aria-pressed'), 'true');
});

test('uploads photos into the slots in order', async () => {
  await settle(() => page.setInputFiles('#file-input', [
    { name: 'red.png', mimeType: 'image/png', buffer: redGradient() },
    { name: 'blue.png', mimeType: 'image/png', buffer: blue() },
    { name: 'green.png', mimeType: 'image/png', buffer: green() },
  ]));
  assert.equal(await page.locator('#tray li').count(), 3);
  assert.match(await page.textContent('#photo-hint'), /3 of 4 photos/);
  // 4-photo strip slots: x 30..570, 360 tall, 20 gap, starting at y=30.
  assert.ok(near(await pixel(300, 210), [220, 110, 40], 20), 'slot 1 shows the red photo');
  assert.ok(near(await pixel(300, 590), [40, 80, 220]), 'slot 2 shows the blue photo');
  assert.ok(near(await pixel(300, 970), [40, 190, 80]), 'slot 3 shows the green photo');
  const empty = await pixel(300, 1350);
  assert.ok(!near(empty, [40, 190, 80]) && !near(empty, [40, 80, 220]), 'slot 4 is a placeholder');
});

test('reordering moves photos between slots', async () => {
  await settle(() => page.click('#tray li:nth-child(2) button[aria-label="Move up"]'));
  assert.ok(near(await pixel(300, 210), [40, 80, 220]), 'blue now first');
  await settle(() => page.click('#tray li:nth-child(1) button[aria-label="Move down"]'));
  assert.ok(near(await pixel(300, 210), [220, 110, 40], 20), 'red back first');
});

test('dragging a photo pans it and reset puts it back', async () => {
  const beforePan = await pixel(300, 210);
  const box = await page.locator('#preview').boundingBox();
  const scale = box.width / 600;
  const x = box.x + 300 * scale;
  const y = box.y + 210 * scale;
  await settle(async () => {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 40, y, { steps: 4 });
    await page.mouse.up();
  });
  const afterPan = await pixel(300, 210);
  assert.ok(afterPan[1] < beforePan[1] - 10, `dragging right shows more of the left (redder) side: ${beforePan} -> ${afterPan}`);
  await settle(() => page.click('#tray li:nth-child(1) button[aria-label="Reset framing"]'));
  assert.ok(near(await pixel(300, 210), beforePan, 3));
});

test('filters change the photos', async () => {
  await settle(() => page.click('#filter-options [data-value="bw"]'));
  const [r, g, b] = await pixel(300, 590);
  assert.ok(Math.abs(r - g) <= 1 && Math.abs(g - b) <= 1, `grayscale: ${r},${g},${b}`);
  await settle(() => page.click('#filter-options [data-value="sepia"]'));
  const s = await pixel(300, 590);
  assert.ok(s[0] > s[2], 'sepia is warm');
  await settle(() => page.click('#filter-options [data-value="original"]'));
});

test('caption text and date draw in the caption area', async () => {
  const inkCount = () => page.evaluate(() => {
    const c = document.querySelector('#preview');
    const d = c.getContext('2d').getImageData(30, 1570, 540, 200).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 120 && d[i + 1] < 120 && d[i + 2] < 120) n++;
    return n;
  });
  const dateOnly = await inkCount();
  assert.ok(dateOnly > 50, 'date stamp is on by default');
  await settle(() => page.fill('#caption-text', 'Summer Party'));
  assert.ok(await inkCount() > dateOnly + 200, 'caption adds text');
  await settle(() => page.click('#font-options [data-value="script"]'));
  await settle(() => page.click('#show-date'));
  assert.equal(await page.isDisabled('#date-format'), true);
});

test('frame themes recolor the strip', async () => {
  await settle(() => page.click('#theme-options [data-value="midnight"]'));
  assert.ok(near(await pixel(10, 10), [0x11, 0x11, 0x14], 4));
  assert.equal(await page.inputValue('#bg-color'), '#111114');
  await settle(() => page.selectOption('#pattern', 'film'));
  assert.equal(await page.getAttribute('#theme-options [data-value="midnight"]', 'aria-pressed'), 'false', 'customizing leaves the preset');
});

test('stickers can be added, adjusted and deleted', async () => {
  await settle(() => page.click('#sticker-palette button >> nth=0'));
  assert.equal(await page.isVisible('#sticker-controls'), true);
  await settle(() => page.fill('#sticker-size', '0.4'));
  await settle(() => page.fill('#sticker-rotation', '45'));
  await page.locator('#preview').focus();
  await settle(() => page.click('#sticker-delete'));
  assert.equal(await page.isVisible('#sticker-controls'), false);
  await settle(() => page.click('#sticker-palette button >> nth=3'));
});

test('polaroid and double strip layouts use real print sizes', async () => {
  await settle(() => page.click('#layout-options [data-value="polaroid"]'));
  assert.deepEqual(await canvasSize(), [1050, 1260]);
  assert.equal(await page.isHidden('#count-options'), true);

  await settle(() => page.click('#layout-options [data-value="double"]'));
  assert.deepEqual(await canvasSize(), [1200, 1800]);
  await settle(() => page.click('#count-options [data-value="3"]'));
  for (const [x, y] of [[300, 200], [100, 900], [450, 1650]]) {
    assert.deepEqual(await pixel(x, y), await pixel(x + 600, y), `both strips match at ${x},${y}`);
  }
  await page.screenshot({ path: path.join(out, 'double-strip.png') });
});

test('saves PNG and JPEG with 300 DPI metadata', async () => {
  const pngPath = path.join(out, 'export.png');
  await app.evaluate(({ dialog }, p) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: p }); }, pngPath);
  await page.click('#save-btn');
  await page.waitForFunction(() => document.querySelector('#toast').textContent.startsWith('Saved to'));
  const png = await readFile(pngPath);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 1800);
  assert.equal(png.toString('ascii', 37, 41), 'pHYs');
  assert.equal(png.readUInt32BE(41), 11811);

  const jpgPath = path.join(out, 'export.jpg');
  await app.evaluate(({ dialog }, p) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: p }); }, jpgPath);
  await page.selectOption('#export-format', 'jpg');
  await page.evaluate(() => { document.querySelector('#toast').textContent = ''; });
  await page.click('#save-btn');
  await page.waitForFunction(() => document.querySelector('#toast').textContent.startsWith('Saved to'));
  const jpg = await readFile(jpgPath);
  assert.deepEqual([jpg[0], jpg[1]], [0xff, 0xd8]);
  assert.equal(jpg.toString('ascii', 6, 10), 'JFIF');
  assert.equal(jpg[13], 1);
  assert.equal(jpg.readUInt16BE(14), 300);
});

test('camera booth counts down and captures a photo per slot', async () => {
  await settle(() => page.click('#layout-options [data-value="polaroid"]'));
  await page.click('#camera-btn');
  await page.waitForSelector('#booth[open]');
  await page.waitForFunction(() => !document.querySelector('#booth-start').disabled, null, { timeout: 15000 });
  await page.screenshot({ path: path.join(out, 'camera-booth.png') });
  await page.click('#booth-start');
  await page.waitForFunction(() => document.querySelector('#booth-count').textContent === '1', null, { timeout: 10000 });
  await page.waitForFunction(() => !document.querySelector('#booth').open, null, { timeout: 15000 });
  assert.equal(await page.locator('#tray li').count(), 1);
  assert.match(await page.textContent('#tray li .name'), /Booth shot 1/);
  await page.screenshot({ path: path.join(out, 'polaroid-from-camera.png') });
});

test('a blocked camera shows a clear message', async () => {
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'));
  });
  await page.click('#camera-btn');
  await page.waitForSelector('#booth-error:not([hidden])');
  assert.match(await page.textContent('#booth-error'), /blocked/i);
  assert.equal(await page.isDisabled('#booth-start'), true);
  await page.click('#booth-close');
  await page.waitForFunction(() => !document.querySelector('#booth').open);
});

test('an unreadable file is reported and skipped', async () => {
  await page.setInputFiles('#file-input', [{ name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not an image') }]);
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes("Couldn't open broken.jpg"));
  assert.equal(await page.locator('#tray li').count(), 1);
});

test('no errors were logged', () => {
  assert.deepEqual(errors, []);
});
