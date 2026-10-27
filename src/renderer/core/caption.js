// Caption text, date stamp and font fitting.

export const FONTS = [
  { id: 'typewriter', name: 'Typewriter', family: 'Special Elite' },
  { id: 'script', name: 'Script', family: 'Pacifico' },
  { id: 'poster', name: 'Poster', family: 'Bebas Neue' },
];

export const DATE_FORMATS = [
  { id: 'long', name: 'Oct 27, 2026' },
  { id: 'dots', name: '27.10.2026' },
  { id: 'us', name: '10.27.26' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');

export function formatDate(date, formatId) {
  const d = date.getDate();
  const m = date.getMonth();
  const y = date.getFullYear();
  switch (formatId) {
    case 'long': return `${MONTHS[m]} ${d}, ${y}`;
    case 'dots': return `${pad(d)}.${pad(m + 1)}.${y}`;
    case 'us': return `${pad(m + 1)}.${pad(d)}.${String(y).slice(-2)}`;
    default: throw new Error(`Unknown date format: ${formatId}`);
  }
}

export function captionLines({ text, showDate, date, dateFormat }) {
  const lines = [];
  const title = (text ?? '').trim();
  if (title) lines.push({ kind: 'title', text: title });
  if (showDate && date) lines.push({ kind: 'date', text: formatDate(date, dateFormat) });
  return lines;
}

// measure(text, size) -> width in px at that font size.
export function fitFontSize(measure, text, maxWidth, maxSize, minSize) {
  for (let size = maxSize; size > minSize; size--) {
    if (measure(text, size) <= maxWidth) return size;
  }
  return minSize;
}

export function toDateInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateInputValue(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
