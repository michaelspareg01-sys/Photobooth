// Pointer interaction on the preview: drag stickers, drag photos to pan them
// inside their slot, scroll to zoom a photo or resize a sticker.

import { computeLayout } from '../core/layouts.js';
import { panBy, clampZoom } from '../core/crop.js';
import { hitTest, moveSticker, clampSticker } from '../core/stickers.js';
import { updatePhoto } from '../core/state.js';

export function setupStage({ store, images, preview }) {
  let drag = null;

  // Maps a pointer event to strip coordinates. On the double layout both
  // strips map onto the same single strip. A drag stays on the copy it
  // started on (copyX), so crossing the middle doesn't jump.
  function locate(e, copyX) {
    const state = store.getState();
    const layout = computeLayout(state.layout, { photoCount: state.photoCount });
    const rect = preview.getBoundingClientRect();
    const scale = layout.width / rect.width;
    const px = (e.clientX - rect.left) * scale;
    const py = (e.clientY - rect.top) * scale;
    const copy = copyX ?? (layout.copies.findLast((c) => px >= c.x) ?? layout.copies[0]).x;
    const x = px - copy;
    const y = py;
    const slotIndex = layout.slots.findIndex((s) => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h);
    const photo = slotIndex >= 0 ? state.photos[slotIndex] : undefined;
    return {
      state, layout, x, y, scale, copyX: copy,
      stickerId: hitTest(state.stickers, x, y, layout.strip.width, layout.strip.height),
      slot: layout.slots[slotIndex],
      photo: photo && images.has(photo.id) ? photo : undefined,
    };
  }

  preview.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const hit = locate(e);
    if (hit.stickerId !== null) {
      drag = { kind: 'sticker', id: hit.stickerId, x: hit.x, y: hit.y, copyX: hit.copyX };
      store.update((s) => ({ ...s, selectedStickerId: hit.stickerId }));
    } else if (hit.photo) {
      drag = { kind: 'photo', id: hit.photo.id, slot: hit.slot, x: hit.x, y: hit.y, copyX: hit.copyX };
      if (hit.state.selectedStickerId !== null) store.update((s) => ({ ...s, selectedStickerId: null }));
    } else {
      if (hit.state.selectedStickerId !== null) store.update((s) => ({ ...s, selectedStickerId: null }));
      return;
    }
    preview.setPointerCapture(e.pointerId);
    preview.style.cursor = 'grabbing';
    preview.focus();
  });

  preview.addEventListener('pointermove', (e) => {
    const hit = locate(e, drag?.copyX);
    if (!drag) {
      preview.style.cursor = hit.stickerId !== null ? 'move' : hit.photo ? 'grab' : 'default';
      return;
    }
    const dx = hit.x - drag.x;
    const dy = hit.y - drag.y;
    drag.x = hit.x;
    drag.y = hit.y;
    if (drag.kind === 'sticker') {
      const { width, height } = hit.layout.strip;
      store.update((s) => ({
        ...s,
        stickers: s.stickers.map((st) => (st.id === drag.id ? moveSticker(st, dx / width, dy / height) : st)),
      }));
    } else {
      const image = images.get(drag.id);
      store.update((s) => {
        const photo = s.photos.find((p) => p.id === drag.id);
        if (!photo || !image) return s;
        return updatePhoto(s, photo.id, panBy(photo, image.width, image.height, drag.slot.w, drag.slot.h, dx, dy));
      });
    }
  });

  const endDrag = () => {
    drag = null;
    preview.style.cursor = 'default';
  };
  preview.addEventListener('pointerup', endDrag);
  preview.addEventListener('pointercancel', endDrag);

  preview.addEventListener('wheel', (e) => {
    const hit = locate(e);
    const factor = Math.exp(-e.deltaY * 0.0015);
    if (hit.stickerId !== null) {
      e.preventDefault();
      store.update((s) => ({
        ...s,
        stickers: s.stickers.map((st) => (st.id === hit.stickerId ? clampSticker({ ...st, size: st.size * factor }) : st)),
      }));
    } else if (hit.photo) {
      e.preventDefault();
      store.update((s) => {
        const photo = s.photos.find((p) => p.id === hit.photo.id);
        return photo ? updatePhoto(s, photo.id, { zoom: clampZoom(photo.zoom * factor) }) : s;
      });
    }
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    const typing = e.target.closest?.('input, select, textarea') || document.querySelector('dialog[open]');
    const { selectedStickerId } = store.getState();
    if (typing || selectedStickerId === null) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      store.update((s) => ({ ...s, stickers: s.stickers.filter((st) => st.id !== selectedStickerId), selectedStickerId: null }));
    } else if (e.key === 'Escape') {
      store.update((s) => ({ ...s, selectedStickerId: null }));
    }
  });
}
