// Frame geometry at 300 DPI. A classic booth strip is 2x6 in and booths print
// two of them on one 4x6 in sheet. A Polaroid i-Type frame is 3.5x4.2 in with
// a 3.1x3.1 in image.

export const DPI = 300;

export const LAYOUTS = [
  { id: 'strip', name: 'Classic strip', photoCounts: [3, 4] },
  { id: 'polaroid', name: 'Polaroid', photoCounts: [1] },
  { id: 'double', name: 'Double strip (4x6 print)', photoCounts: [3, 4] },
];

const STRIP = { width: 2 * DPI, height: 6 * DPI, margin: 30, gap: 20, captionHeight: 240 };

function stripGeometry(photoCount) {
  const { width, height, margin, gap, captionHeight } = STRIP;
  const slotW = width - margin * 2;
  const slotH = Math.floor((height - margin * 2 - captionHeight - gap * (photoCount - 1)) / photoCount);
  const slots = [];
  for (let i = 0; i < photoCount; i++) {
    slots.push({ x: margin, y: margin + i * (slotH + gap), w: slotW, h: slotH });
  }
  const captionY = slots.at(-1).y + slotH + gap;
  return {
    strip: { width, height },
    slots,
    caption: { x: margin, y: captionY, w: slotW, h: height - margin - captionY },
  };
}

function polaroidGeometry() {
  const width = Math.round(3.5 * DPI);
  const height = Math.round(4.2 * DPI);
  const image = Math.round(3.1 * DPI);
  const side = (width - image) / 2;
  const captionY = side + image + 10;
  return {
    width,
    height,
    strip: { width, height },
    copies: [{ x: 0, y: 0 }],
    slots: [{ x: side, y: side, w: image, h: image }],
    caption: { x: side, y: captionY, w: image, h: height - side / 2 - captionY },
  };
}

export function computeLayout(layoutId, { photoCount = 4 } = {}) {
  const layout = LAYOUTS.find((l) => l.id === layoutId);
  if (!layout) throw new Error(`Unknown layout: ${layoutId}`);
  if (layoutId === 'polaroid') return polaroidGeometry();
  if (!layout.photoCounts.includes(photoCount)) {
    throw new Error(`Unsupported photo count ${photoCount} for ${layoutId}`);
  }
  const geo = stripGeometry(photoCount);
  if (layoutId === 'double') {
    return { width: geo.strip.width * 2, height: geo.strip.height, copies: [{ x: 0, y: 0 }, { x: geo.strip.width, y: 0 }], ...geo };
  }
  return { width: geo.strip.width, height: geo.strip.height, copies: [{ x: 0, y: 0 }], ...geo };
}
