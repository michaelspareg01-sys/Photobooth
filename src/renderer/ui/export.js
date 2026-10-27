import { DPI, computeLayout } from '../core/layouts.js';
import { setPngDpi, setJpegDpi } from '../core/dpi.js';
import { exportFileName } from '../core/filename.js';
import { slotCount } from '../core/state.js';
import { renderFrame } from '../render.js';
import { $, el } from './dom.js';

const FORMATS = {
  png: { mime: 'image/png', stamp: setPngDpi },
  jpg: { mime: 'image/jpeg', stamp: setJpegDpi, quality: 0.95 },
};

export async function encodeFrame(state, images, format) {
  const { mime, stamp, quality } = FORMATS[format];
  const canvas = el('canvas');
  renderFrame(canvas, state, images, { showSelection: false });
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), mime, quality);
  });
  return stamp(new Uint8Array(await blob.arrayBuffer()), DPI);
}

function download(bytes, name, mime) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  el('a', { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function setupExport({ store, images, toast }) {
  const formatSelect = $('#export-format');
  const saveBtn = $('#save-btn');
  const printImage = $('#print-image');
  const pageSheet = new CSSStyleSheet();
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, pageSheet];

  function warnIfEmpty(state) {
    const missing = slotCount(state) - Math.min(state.photos.length, slotCount(state));
    if (missing > 0) toast(`${missing} slot${missing === 1 ? ' is' : 's are'} still empty.`);
  }

  saveBtn.addEventListener('click', async () => {
    const state = store.getState();
    const format = formatSelect.value;
    saveBtn.disabled = true;
    try {
      warnIfEmpty(state);
      const bytes = await encodeFrame(state, images, format);
      const name = exportFileName(state.layout, format);
      if (window.photobooth?.saveImage) {
        const result = await window.photobooth.saveImage(bytes, name);
        if (result.saved) toast(`Saved to ${result.path}`);
      } else {
        download(bytes, name, FORMATS[format].mime);
      }
    } catch (err) {
      toast(`Could not save: ${err.message}`, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });

  $('#print-btn').addEventListener('click', async () => {
    const state = store.getState();
    warnIfEmpty(state);
    const layout = computeLayout(state.layout, { photoCount: state.photoCount });
    const widthIn = layout.width / DPI;
    const heightIn = layout.height / DPI;
    try {
      const bytes = await encodeFrame(state, images, 'png');
      const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
      pageSheet.replaceSync(`@page { size: ${widthIn}in ${heightIn}in; margin: 0; }`);
      printImage.style.width = `${widthIn}in`;
      printImage.style.height = `${heightIn}in`;
      printImage.src = url;
      await printImage.decode();
      // Keep the image until printing has finished reading it.
      window.addEventListener('afterprint', () => URL.revokeObjectURL(url), { once: true });
      window.print();
    } catch (err) {
      toast(`Could not print: ${err.message}`, 'error');
    }
  });
}
