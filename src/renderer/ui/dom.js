export const $ = (selector) => document.querySelector(selector);

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    node.append(child instanceof Node ? child : String(child));
  }
  return node;
}

// Draws a cover-cropped thumbnail of `image` into a new canvas.
export function thumbnail(image, w, h) {
  const canvas = el('canvas', { width: w, height: h });
  const scale = Math.max(w / image.width, h / image.height);
  const sw = w / scale;
  const sh = h / scale;
  canvas.getContext('2d').drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, 0, 0, w, h);
  return canvas;
}

let toastTimer = null;
export function toast(message, kind = 'info') {
  const node = $('#toast');
  node.textContent = message;
  node.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.className = 'toast'; }, kind === 'error' ? 6000 : 3500);
}
