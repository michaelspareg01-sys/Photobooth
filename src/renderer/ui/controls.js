import { LAYOUTS, computeLayout } from '../core/layouts.js';
import { FILTERS, applyFilter } from '../core/filters.js';
import { PATTERNS, THEME_PRESETS, themeFromPreset } from '../core/themes.js';
import { FONTS, DATE_FORMATS, toDateInputValue, fromDateInputValue } from '../core/caption.js';
import { STICKER_EMOJI, createSticker, clampSticker } from '../core/stickers.js';
import { coverCrop } from '../core/crop.js';
import { $, el } from './dom.js';

const THUMB = 96;

function segmented(container, options, onPick) {
  container.replaceChildren(...options.map((o) => el('button', {
    type: 'button',
    dataset: { value: String(o.value) },
    'aria-pressed': 'false',
    onclick: () => onPick(o.value),
  }, o.label)));
}

function markPressed(container, value) {
  for (const b of container.children) b.setAttribute('aria-pressed', String(b.dataset.value === String(value)));
}

// A neutral sample for filter thumbnails before any photo is added.
function sampleImage() {
  const c = el('canvas', { width: THUMB, height: THUMB });
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, THUMB, THUMB);
  g.addColorStop(0, '#f6c08a');
  g.addColorStop(0.5, '#e86f6f');
  g.addColorStop(1, '#5a7bd8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, THUMB, THUMB);
  ctx.fillStyle = '#fff6';
  ctx.beginPath();
  ctx.arc(THUMB * 0.5, THUMB * 0.42, THUMB * 0.2, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export function setupControls({ store, images }) {
  const update = (fn) => store.update(fn);
  const set = (patch) => update((s) => ({ ...s, ...patch }));
  const setTheme = (patch) => update((s) => ({ ...s, theme: { ...s.theme, ...patch, preset: 'custom' } }));
  const setCaption = (patch) => update((s) => ({ ...s, caption: { ...s.caption, ...patch } }));
  const setSticker = (id, patch) => update((s) => ({
    ...s,
    stickers: s.stickers.map((st) => (st.id === id ? clampSticker({ ...st, ...patch }) : st)),
  }));

  // Layout
  const layoutBox = $('#layout-options');
  const countBox = $('#count-options');
  segmented(layoutBox, LAYOUTS.map((l) => ({ value: l.id, label: l.name.replace(' (4x6 print)', '') })), (layout) => set({ layout }));
  segmented(countBox, [3, 4].map((n) => ({ value: n, label: `${n} photos` })), (photoCount) => set({ photoCount }));
  $('#cut-line').addEventListener('change', (e) => set({ cutLine: e.target.checked }));

  // Filters, with live thumbnails of the first photo
  const filterBox = $('#filter-options');
  const filterCanvases = new Map();
  filterBox.replaceChildren(...FILTERS.map((f) => {
    const canvas = el('canvas', { width: THUMB, height: THUMB });
    filterCanvases.set(f.id, canvas);
    return el('button', { type: 'button', dataset: { value: f.id }, 'aria-pressed': 'false', onclick: () => set({ filter: f.id }) }, [canvas, f.name]);
  }));
  let thumbKey = null;
  function drawFilterThumbs(state) {
    const photo = state.photos[0];
    const image = photo && images.get(photo.id);
    const key = photo ? `${photo.id}:${photo.zoom}:${photo.panX}:${photo.panY}` : 'sample';
    if (key === thumbKey) return;
    thumbKey = key;
    const source = image ?? sampleImage();
    const crop = coverCrop(source.width, source.height, THUMB, THUMB, photo ?? {});
    for (const [id, canvas] of filterCanvases) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, THUMB, THUMB);
      if (id !== 'original') {
        const data = ctx.getImageData(0, 0, THUMB, THUMB);
        applyFilter(data, id, { seed: 1 });
        ctx.putImageData(data, 0, 0);
      }
    }
  }

  // Frame
  const themeBox = $('#theme-options');
  themeBox.replaceChildren(...THEME_PRESETS.map((t) => el('button', {
    type: 'button',
    title: t.name,
    'aria-label': t.name,
    dataset: { value: t.id },
    'aria-pressed': 'false',
    onclick: () => set({ theme: themeFromPreset(t.id) }),
  }, el('span'))));
  for (const b of themeBox.children) {
    const t = THEME_PRESETS.find((p) => p.id === b.dataset.value);
    b.style.background = t.background;
    b.firstChild.style.background = t.pattern === 'none' ? t.textColor : t.patternColor;
  }
  const patternSelect = $('#pattern');
  patternSelect.replaceChildren(...PATTERNS.map((p) => el('option', { value: p.id }, p.name)));
  patternSelect.addEventListener('change', () => setTheme({ pattern: patternSelect.value }));
  $('#bg-color').addEventListener('input', (e) => setTheme({ background: e.target.value }));
  $('#pattern-color').addEventListener('input', (e) => setTheme({ patternColor: e.target.value }));
  $('#text-color').addEventListener('input', (e) => setTheme({ textColor: e.target.value }));

  // Caption
  const captionInput = $('#caption-text');
  captionInput.addEventListener('input', () => setCaption({ text: captionInput.value }));
  const fontBox = $('#font-options');
  segmented(fontBox, FONTS.map((f) => ({ value: f.id, label: f.name })), (font) => setCaption({ font }));
  FONTS.forEach((f, i) => { fontBox.children[i].style.fontFamily = `"${f.family}"`; });
  $('#show-date').addEventListener('change', (e) => setCaption({ showDate: e.target.checked }));
  $('#date').addEventListener('change', (e) => {
    const date = fromDateInputValue(e.target.value);
    if (date) setCaption({ date });
  });
  const dateFormat = $('#date-format');
  dateFormat.replaceChildren(...DATE_FORMATS.map((f) => el('option', { value: f.id }, f.name)));
  dateFormat.addEventListener('change', () => setCaption({ dateFormat: dateFormat.value }));

  // Stickers
  $('#sticker-palette').replaceChildren(...STICKER_EMOJI.map((emoji) => el('button', {
    type: 'button',
    title: `Add ${emoji}`,
    'aria-label': `Add ${emoji} sticker`,
    onclick: () => update((s) => {
      // Drop new stickers over a random photo slot so they're easy to spot.
      const layout = computeLayout(s.layout, { photoCount: s.photoCount });
      const slot = layout.slots[Math.floor(Math.random() * layout.slots.length)];
      const sticker = createSticker(emoji, {
        x: (slot.x + slot.w * (0.25 + Math.random() * 0.5)) / layout.strip.width,
        y: (slot.y + slot.h * (0.25 + Math.random() * 0.5)) / layout.strip.height,
        size: s.layout === 'polaroid' ? 0.16 : 0.22,
        rotation: Math.round((Math.random() - 0.5) * 30),
      });
      return { ...s, stickers: [...s.stickers, sticker], selectedStickerId: sticker.id };
    }),
  }, emoji)));
  const stickerControls = $('#sticker-controls');
  const sizeInput = $('#sticker-size');
  const rotationInput = $('#sticker-rotation');
  const selectedId = () => store.getState().selectedStickerId;
  sizeInput.addEventListener('input', () => setSticker(selectedId(), { size: Number(sizeInput.value) }));
  rotationInput.addEventListener('input', () => setSticker(selectedId(), { rotation: Number(rotationInput.value) }));
  $('#sticker-front').addEventListener('click', () => update((s) => {
    const st = s.stickers.find((x) => x.id === s.selectedStickerId);
    return st ? { ...s, stickers: [...s.stickers.filter((x) => x !== st), st] } : s;
  }));
  $('#sticker-delete').addEventListener('click', () => update((s) => ({
    ...s,
    stickers: s.stickers.filter((x) => x.id !== s.selectedStickerId),
    selectedStickerId: null,
  })));

  // Reflect state in the controls.
  function sync(state) {
    markPressed(layoutBox, state.layout);
    countBox.hidden = state.layout === 'polaroid';
    markPressed(countBox, state.photoCount);
    $('#cut-line-row').hidden = state.layout !== 'double';
    $('#cut-line').checked = state.cutLine;

    markPressed(filterBox, state.filter);
    drawFilterThumbs(state);

    markPressed(themeBox, state.theme.preset);
    patternSelect.value = state.theme.pattern;
    $('#bg-color').value = state.theme.background;
    $('#pattern-color').value = state.theme.patternColor;
    $('#text-color').value = state.theme.textColor;

    if (document.activeElement !== captionInput) captionInput.value = state.caption.text;
    markPressed(fontBox, state.caption.font);
    $('#show-date').checked = state.caption.showDate;
    $('#date').value = toDateInputValue(state.caption.date);
    $('#date').disabled = !state.caption.showDate;
    dateFormat.value = state.caption.dateFormat;
    dateFormat.disabled = !state.caption.showDate;

    const sticker = state.stickers.find((s) => s.id === state.selectedStickerId);
    stickerControls.hidden = !sticker;
    if (sticker) {
      sizeInput.value = String(sticker.size);
      rotationInput.value = String(sticker.rotation);
    }
  }

  store.subscribe(sync);
  sync(store.getState());
}
