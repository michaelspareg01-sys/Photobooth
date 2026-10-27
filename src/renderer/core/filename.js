const pad = (n) => String(n).padStart(2, '0');

export function exportFileName(layoutId, ext, date = new Date()) {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `photobooth-${layoutId}-${day}-${time}.${ext}`;
}
