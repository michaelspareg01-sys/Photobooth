import { MAX_PHOTOS, addPhotos, removePhoto, movePhoto, updatePhoto, slotCount } from '../core/state.js';
import { $, el, thumbnail } from './dom.js';

const MAX_SIDE = 3000; // decoded photos are capped to save memory; output slots are far smaller
const IMAGE_NAME = /\.(jpe?g|png|gif|webp|bmp|avif)$/i;

export async function decodeImage(blob) {
  let bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest > MAX_SIDE) {
    const scale = MAX_SIDE / longest;
    const small = await createImageBitmap(bitmap, {
      resizeWidth: Math.round(bitmap.width * scale),
      resizeHeight: Math.round(bitmap.height * scale),
      resizeQuality: 'high',
    });
    bitmap.close();
    bitmap = small;
  }
  return bitmap;
}

export function setupPhotos({ store, images, toast }) {
  const input = $('#file-input');
  const tray = $('#tray');
  const hint = $('#photo-hint');
  const overlay = $('#drop-overlay');

  async function addFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith('image/') || IMAGE_NAME.test(f.name));
    if (!files.length) return;
    const room = MAX_PHOTOS - store.getState().photos.length;
    if (room <= 0) {
      toast(`You already have ${MAX_PHOTOS} photos. Remove one to add another.`);
      return;
    }
    if (files.length > room) toast(`Only ${room} more photo${room === 1 ? '' : 's'} fit, so the rest were skipped.`);
    const added = [];
    for (const file of files.slice(0, room)) {
      try {
        const id = crypto.randomUUID();
        images.set(id, await decodeImage(file));
        added.push({ id, name: file.name });
      } catch {
        toast(`Couldn't open ${file.name}. Try a JPEG or PNG.`, 'error');
      }
    }
    if (added.length) store.update((s) => addPhotos(s, added));
  }

  function drop(id) {
    images.get(id)?.close?.();
    images.delete(id);
    store.update((s) => removePhoto(s, id));
  }

  $('#upload-btn').addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    await addFiles(input.files);
    input.value = '';
  });

  // Dropping files anywhere in the window adds them.
  const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files');
  let depth = 0;
  window.addEventListener('dragenter', (e) => { if (hasFiles(e)) { depth++; overlay.hidden = false; } });
  window.addEventListener('dragleave', (e) => { if (hasFiles(e) && --depth <= 0) { depth = 0; overlay.hidden = true; } });
  window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    overlay.hidden = true;
    addFiles(e.dataTransfer.files);
  });

  let dragIndex = null;

  function renderTray(state) {
    const slots = slotCount(state);
    const n = state.photos.length;
    hint.textContent = n
      ? `${n} of ${MAX_PHOTOS} photos. This layout uses ${slots}. Drag to reorder.`
      : `Add up to ${MAX_PHOTOS} photos, or shoot them with the camera.`;
    if (!n) {
      tray.replaceChildren(el('li', { class: 'tray-empty' }, 'Drop photos here or use the buttons above'));
      return;
    }
    tray.replaceChildren(...state.photos.map((photo, i) => {
      const image = images.get(photo.id);
      const reframed = photo.zoom !== 1 || photo.panX !== 0 || photo.panY !== 0;
      const item = el('li', {
        draggable: true,
        class: i < slots ? '' : 'unused',
        dataset: { id: photo.id },
        ondragstart: (e) => { dragIndex = i; e.dataTransfer.effectAllowed = 'move'; },
        ondragend: () => { dragIndex = null; },
        ondragover: (e) => { if (dragIndex !== null) { e.preventDefault(); item.classList.add('drag-over'); } },
        ondragleave: () => item.classList.remove('drag-over'),
        ondrop: (e) => {
          if (dragIndex === null) return;
          e.preventDefault();
          e.stopPropagation();
          store.update((s) => movePhoto(s, dragIndex, i));
        },
      }, [
        image ? thumbnail(image, 168, 126) : el('canvas', { width: 168, height: 126 }),
        el('div', { class: 'meta' }, [
          el('span', { class: 'slot' }, i < slots ? `Slot ${i + 1}` : 'Not in this layout'),
          el('span', { class: 'name', title: photo.name }, photo.name),
          el('div', { class: 'actions' }, [
            el('button', { type: 'button', title: 'Move up', 'aria-label': 'Move up', disabled: i === 0, onclick: () => store.update((s) => movePhoto(s, i, i - 1)) }, '↑'),
            el('button', { type: 'button', title: 'Move down', 'aria-label': 'Move down', disabled: i === n - 1, onclick: () => store.update((s) => movePhoto(s, i, i + 1)) }, '↓'),
            el('button', { type: 'button', title: 'Reset framing', 'aria-label': 'Reset framing', disabled: !reframed, onclick: () => store.update((s) => updatePhoto(s, photo.id, { zoom: 1, panX: 0, panY: 0 })) }, '⟲'),
            el('button', { type: 'button', title: 'Remove', 'aria-label': `Remove ${photo.name}`, class: 'danger', onclick: () => drop(photo.id) }, '✕'),
          ]),
        ]),
      ]);
      return item;
    }));
  }

  store.subscribe((state, prev) => {
    if (state.photos !== prev.photos || state.layout !== prev.layout || state.photoCount !== prev.photoCount) renderTray(state);
  });
  renderTray(store.getState());

  return { addFiles };
}
