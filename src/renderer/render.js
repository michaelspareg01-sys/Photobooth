// Draws a whole frame from state at full print resolution. The on-screen
// preview is this same canvas scaled down with CSS, so preview == export.

import { computeLayout } from './core/layouts.js';
import { coverCrop } from './core/crop.js';
import { applyFilter } from './core/filters.js';
import { FONTS, captionLines, fitFontSize } from './core/caption.js';
import { drawPattern } from './patterns.js';

const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';
const DATE_FAMILY = 'Special Elite';

let stripCanvas = null;

function stripContext(w, h) {
  stripCanvas ??= document.createElement('canvas');
  if (stripCanvas.width !== w || stripCanvas.height !== h) {
    stripCanvas.width = w;
    stripCanvas.height = h;
  }
  return stripCanvas.getContext('2d', { willReadFrequently: true });
}

function drawPlaceholder(ctx, slot, index, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.08;
  ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 10]);
  ctx.strokeRect(slot.x + 1.5, slot.y + 1.5, slot.w - 3, slot.h - 3);
  ctx.globalAlpha = 0.6;
  ctx.font = `${Math.round(Math.min(slot.w, slot.h) * 0.12)}px "${DATE_FAMILY}"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Photo ${index + 1}`, slot.x + slot.w / 2, slot.y + slot.h / 2);
  ctx.restore();
}

function drawPhoto(ctx, slot, photo, image, filter, seed) {
  const crop = coverCrop(image.width, image.height, slot.w, slot.h, photo);
  ctx.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, slot.x, slot.y, slot.w, slot.h);
  if (filter !== 'original') {
    const data = ctx.getImageData(slot.x, slot.y, slot.w, slot.h);
    applyFilter(data, filter, { seed });
    ctx.putImageData(data, slot.x, slot.y);
  }
}

function drawCaption(ctx, area, state) {
  const lines = captionLines(state.caption);
  if (!lines.length) return;
  const family = (FONTS.find((f) => f.id === state.caption.font) ?? FONTS[0]).family;
  const hasTitle = lines[0].kind === 'title';
  const hasDate = lines.at(-1).kind === 'date';
  const titleBox = hasDate ? area.h * 0.6 : area.h;
  const dateSize = Math.round(area.h * (hasTitle ? 0.17 : 0.26));

  ctx.save();
  ctx.fillStyle = state.theme.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = area.x + area.w / 2;
  if (hasTitle) {
    const text = lines[0].text;
    const measure = (t, size) => {
      ctx.font = `${size}px "${family}"`;
      return ctx.measureText(t).width;
    };
    const size = fitFontSize(measure, text, area.w * 0.94, Math.round(titleBox * 0.62), 14);
    ctx.font = `${size}px "${family}"`;
    ctx.fillText(text, cx, area.y + titleBox / 2);
  }
  if (hasDate) {
    ctx.font = `${dateSize}px "${DATE_FAMILY}"`;
    const y = hasTitle ? area.y + titleBox + (area.h - titleBox) / 2 : area.y + area.h / 2;
    ctx.fillText(lines.at(-1).text, cx, y);
  }
  ctx.restore();
}

function drawSticker(ctx, s, w, h) {
  ctx.save();
  ctx.translate(s.x * w, s.y * h);
  ctx.rotate((s.rotation * Math.PI) / 180);
  ctx.font = `${Math.round(s.size * w * 0.85)}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s.emoji, 0, 0);
  ctx.restore();
}

function drawSelection(ctx, s, w, h, ox) {
  ctx.save();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.arc(ox + s.x * w, s.y * h, (s.size * w) / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCropMarks(ctx, x, h) {
  ctx.save();
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  for (const [y0, y1] of [[0, 24], [h - 24, h]]) {
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
  }
  ctx.restore();
}

// images: Map of photo id -> drawable (ImageBitmap, canvas, img) with width/height.
export function renderFrame(canvas, state, images, { showSelection = false } = {}) {
  const layout = computeLayout(state.layout, { photoCount: state.photoCount });
  const { width: sw, height: sh } = layout.strip;
  const ctx = stripContext(sw, sh);

  ctx.fillStyle = state.theme.background;
  ctx.fillRect(0, 0, sw, sh);
  drawPattern(ctx, state.theme.pattern, sw, sh, state.theme.patternColor);

  layout.slots.forEach((slot, i) => {
    const photo = state.photos[i];
    const image = photo && images.get(photo.id);
    if (image) drawPhoto(ctx, slot, photo, image, state.filter, i + 1);
    else drawPlaceholder(ctx, slot, i, state.theme.textColor);
  });

  drawCaption(ctx, layout.caption, state);
  for (const s of state.stickers) drawSticker(ctx, s, sw, sh);

  if (canvas.width !== layout.width) canvas.width = layout.width;
  if (canvas.height !== layout.height) canvas.height = layout.height;
  const out = canvas.getContext('2d');
  for (const copy of layout.copies) out.drawImage(stripCanvas, copy.x, copy.y);

  if (layout.copies.length > 1 && state.cutLine) {
    for (let i = 1; i < layout.copies.length; i++) drawCropMarks(out, layout.copies[i].x, layout.height);
  }
  if (showSelection) {
    const selected = state.stickers.find((s) => s.id === state.selectedStickerId);
    if (selected) for (const copy of layout.copies) drawSelection(out, selected, sw, sh, copy.x);
  }
  return layout;
}
