// Stamps print resolution into encoded images so a 600x1800 strip opens as
// 2x6 in (not 8.3x25 in at the 72 DPI default) in print dialogs and editors.

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];

export function setPngDpi(bytes, dpi) {
  if (bytes.length < 33 || PNG_SIG.some((b, i) => bytes[i] !== b)) throw new Error('Not a PNG');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ppm = Math.round(dpi / 0.0254);
  const phys = new Uint8Array(21);
  const pv = new DataView(phys.buffer);
  pv.setUint32(0, 9);
  phys.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  pv.setUint32(8, ppm);
  pv.setUint32(12, ppm);
  phys[16] = 1; // unit: meter
  pv.setUint32(17, crc32(phys.subarray(4, 17)));

  const parts = [bytes.subarray(0, 8)];
  for (let p = 8; p < bytes.length;) {
    const len = view.getUint32(p);
    const end = p + 12 + len;
    const type = String.fromCharCode(...bytes.subarray(p + 4, p + 8));
    if (type !== 'pHYs') parts.push(bytes.subarray(p, end));
    if (type === 'IHDR') parts.push(phys);
    p = end;
  }
  const out = new Uint8Array(parts.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of parts) { out.set(a, o); o += a.length; }
  return out;
}

export function setJpegDpi(bytes, dpi) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Not a JPEG');
  const hasJfif = bytes[2] === 0xff && bytes[3] === 0xe0 && String.fromCharCode(...bytes.subarray(6, 10)) === 'JFIF';
  let out;
  if (hasJfif) {
    out = bytes.slice();
  } else {
    const app0 = [0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0];
    out = new Uint8Array(bytes.length + app0.length);
    out.set(bytes.subarray(0, 2), 0);
    out.set(app0, 2);
    out.set(bytes.subarray(2), 2 + app0.length);
  }
  out[13] = 1; // units: dots per inch
  out[14] = dpi >> 8; out[15] = dpi & 0xff;
  out[16] = dpi >> 8; out[17] = dpi & 0xff;
  return out;
}
