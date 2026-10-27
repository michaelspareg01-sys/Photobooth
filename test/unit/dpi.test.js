import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32 } from 'node:zlib';
import { setPngDpi, setJpegDpi } from '../../src/renderer/core/dpi.js';

const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function tinyPng(extra = []) {
  return new Uint8Array(Buffer.concat([
    Buffer.from(PNG_SIG),
    chunk('IHDR', Buffer.alloc(13, 1)),
    ...extra,
    chunk('IDAT', Buffer.from([1, 2, 3])),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

function chunks(bytes) {
  const b = Buffer.from(bytes);
  const out = [];
  for (let p = 8; p < b.length;) {
    const len = b.readUInt32BE(p);
    const type = b.toString('ascii', p + 4, p + 8);
    const data = b.subarray(p + 8, p + 8 + len);
    out.push({ type, data, crc: b.readUInt32BE(p + 8 + len), body: b.subarray(p + 4, p + 8 + len) });
    p += 12 + len;
  }
  return out;
}

test('setPngDpi inserts a valid pHYs chunk right after IHDR', () => {
  const out = chunks(setPngDpi(tinyPng(), 300));
  assert.deepEqual(out.map((c) => c.type), ['IHDR', 'pHYs', 'IDAT', 'IEND']);
  const phys = out[1];
  assert.equal(phys.data.readUInt32BE(0), 11811);
  assert.equal(phys.data.readUInt32BE(4), 11811);
  assert.equal(phys.data[8], 1, 'unit is meters');
  assert.equal(phys.crc, crc32(phys.body));
});

test('setPngDpi replaces an existing pHYs chunk', () => {
  const old = chunk('pHYs', Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 0]));
  const out = chunks(setPngDpi(tinyPng([old]), 300));
  assert.deepEqual(out.map((c) => c.type), ['IHDR', 'pHYs', 'IDAT', 'IEND']);
  assert.equal(out[1].data.readUInt32BE(0), 11811);
});

test('setPngDpi rejects non-PNG data', () => {
  assert.throws(() => setPngDpi(new Uint8Array([1, 2, 3]), 300), /not a png/i);
});

test('setJpegDpi rewrites the JFIF density', () => {
  const jfif = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
  const out = setJpegDpi(jfif, 300);
  assert.equal(out[13], 1, 'units: dots per inch');
  assert.equal((out[14] << 8) | out[15], 300);
  assert.equal((out[16] << 8) | out[17], 300);
  assert.equal(out.length, jfif.length);
});

test('setJpegDpi inserts a JFIF segment when missing', () => {
  const bare = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0, 2, 0xff, 0xd9]);
  const out = setJpegDpi(bare, 300);
  assert.deepEqual(Array.from(out.slice(0, 4)), [0xff, 0xd8, 0xff, 0xe0]);
  assert.equal(String.fromCharCode(...out.slice(6, 10)), 'JFIF');
  assert.equal((out[14] << 8) | out[15], 300);
  assert.deepEqual(Array.from(out.slice(20)), [0xff, 0xdb, 0, 2, 0xff, 0xd9]);
  assert.throws(() => setJpegDpi(new Uint8Array([0, 1]), 300), /not a jpeg/i);
});
