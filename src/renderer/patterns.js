// Frame background patterns, drawn over the base color and under the photos.

function heart(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  ctx.fill();
}

const DRAW = {
  none() {},
  dots(ctx, w, h) {
    const step = 44;
    for (let row = 0, y = step / 2; y < h + step; row++, y += step / 2) {
      for (let x = row % 2 ? step / 2 : 0; x < w + step; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  stripes(ctx, w, h) {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 4);
    const span = Math.hypot(w, h);
    for (let x = -span; x < span; x += 60) ctx.fillRect(x, -span, 26, span * 2);
    ctx.restore();
  },
  checker(ctx, w, h) {
    const s = 40;
    for (let y = 0, r = 0; y < h; y += s, r++) {
      for (let x = (r % 2) * s; x < w; x += s * 2) ctx.fillRect(x, y, s, s);
    }
  },
  film(ctx, w, h) {
    const holeW = 14;
    const holeH = 22;
    const step = 48;
    const inset = 8;
    for (let y = 14; y + holeH < h; y += step) {
      for (const x of [inset, w - inset - holeW]) {
        ctx.beginPath();
        ctx.roundRect(x, y, holeW, holeH, 3);
        ctx.fill();
      }
    }
  },
  hearts(ctx, w, h) {
    const step = 70;
    for (let row = 0, y = 10; y < h; row++, y += step * 0.8) {
      for (let x = row % 2 ? step / 2 : 0; x < w + step; x += step) heart(ctx, x, y, 26);
    }
  },
};

export function drawPattern(ctx, patternId, w, h, color) {
  const draw = DRAW[patternId];
  if (!draw) throw new Error(`Unknown pattern: ${patternId}`);
  ctx.save();
  ctx.fillStyle = color;
  draw(ctx, w, h);
  ctx.restore();
}
