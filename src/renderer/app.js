import { createInitialState, createStore } from './core/state.js';
import { FONTS } from './core/caption.js';
import { renderFrame } from './render.js';
import { $, toast } from './ui/dom.js';
import { setupPhotos } from './ui/photos.js';
import { setupCamera } from './ui/camera.js';
import { setupControls } from './ui/controls.js';
import { setupStage } from './ui/stage.js';
import { setupExport } from './ui/export.js';

const store = createStore(createInitialState());
const images = new Map(); // photo id -> ImageBitmap
const preview = $('#preview');

let queued = false;
function scheduleRender() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    renderFrame(preview, store.getState(), images, { showSelection: true });
    preview.dataset.rendered = String(Number(preview.dataset.rendered ?? 0) + 1);
  });
}

async function main() {
  // Canvas text needs the bundled fonts loaded before the first draw.
  await Promise.all(FONTS.map((f) => document.fonts.load(`48px "${f.family}"`))).catch(() => {});
  const app = { store, images, preview, scheduleRender, toast };
  setupPhotos(app);
  setupCamera(app);
  setupControls(app);
  setupStage(app);
  setupExport(app);
  store.subscribe(scheduleRender);
  scheduleRender();
  document.body.dataset.ready = 'true';
}

main();
