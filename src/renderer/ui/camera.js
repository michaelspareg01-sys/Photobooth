import { runBooth } from '../core/booth.js';
import { slotCount } from '../core/state.js';
import { $, el, thumbnail } from './dom.js';

function sleep(ms, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}

function cameraErrorMessage(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera access was blocked. Allow Photobooth to use the camera in your system privacy settings, then try again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found. Plug one in, or upload photos instead.';
    case 'NotReadableError':
      return 'The camera is busy in another app. Close that app and try again.';
    default:
      return `The camera could not start (${err?.message ?? 'unknown error'}).`;
  }
}

export function setupCamera({ store, images, toast }) {
  const dialog = $('#booth');
  const video = $('#booth-video');
  const viewfinder = video.parentElement;
  const count = $('#booth-count');
  const flash = $('#booth-flash');
  const error = $('#booth-error');
  const shotsList = $('#booth-shots');
  const status = $('#booth-status');
  const startBtn = $('#booth-start');
  const mirror = $('#booth-mirror');
  const secondsSelect = $('#booth-seconds');

  let stream = null;
  let run = null; // AbortController for the current booth run
  let session = 0; // bumps on every open/close so late camera starts are discarded

  function syncMirror() { viewfinder.classList.toggle('mirrored', mirror.checked); }
  mirror.addEventListener('change', syncMirror);

  function stopCamera() {
    session++;
    run?.abort();
    run = null;
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
  }

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
    startBtn.disabled = true;
  }

  async function open() {
    error.hidden = true;
    startBtn.disabled = true;
    count.textContent = '';
    shotsList.replaceChildren();
    const shots = slotCount(store.getState());
    status.textContent = `Takes ${shots} photo${shots === 1 ? '' : 's'}${store.getState().photos.length ? ' and replaces your current ones' : ''}.`;
    syncMirror();
    dialog.showModal();
    const mine = ++session;
    try {
      if (window.photobooth?.requestCamera && !(await window.photobooth.requestCamera())) {
        throw Object.assign(new Error('denied'), { name: 'NotAllowedError' });
      }
      const started = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user' },
        audio: false,
      });
      if (mine !== session) {
        started.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = started;
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        run?.abort();
        showError('The camera was disconnected. Reconnect it and open the booth again.');
      });
      video.srcObject = stream;
      await video.play().catch(() => {});
      startBtn.disabled = false;
    } catch (err) {
      if (mine === session) showError(cameraErrorMessage(err));
    }
  }

  // Captures the true (un-mirrored) frame so any text in the shot reads
  // correctly in the print. Mirroring only applies to the live preview.
  async function capture() {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) throw new Error('the camera is not sending video');
    return createImageBitmap(video);
  }

  async function start() {
    if (!stream || run) return;
    run = new AbortController();
    const { signal } = run;
    const shots = slotCount(store.getState());
    const taken = [];
    startBtn.disabled = true;
    shotsList.replaceChildren();

    try {
      await runBooth({
        shots,
        seconds: Number(secondsSelect.value),
        signal,
        wait: (ms) => sleep(ms, signal),
        onTick: (n, shot) => {
          status.textContent = `Photo ${shot + 1} of ${shots}`;
          count.textContent = String(n);
          count.classList.remove('pop');
          void count.offsetWidth; // restart the animation
          count.classList.add('pop');
        },
        onFlash: () => {
          count.textContent = '';
          flash.classList.remove('go');
          void flash.offsetWidth;
          flash.classList.add('go');
        },
        capture: async () => {
          const bitmap = await capture();
          taken.push(bitmap);
          shotsList.append(el('li', {}, thumbnail(bitmap, Math.round(60 * (bitmap.width / bitmap.height)), 60)));
          return bitmap;
        },
      });
    } catch (err) {
      count.textContent = '';
      showError(`Couldn't take the photo: ${err.message}.`);
    } finally {
      if (run?.signal === signal) run = null;
      if (stream && error.hidden) startBtn.disabled = false;
    }

    if (signal.aborted || taken.length < shots) {
      taken.forEach((b) => b.close());
      return;
    }
    const stamp = new Date().toLocaleTimeString();
    const photos = taken.map((bitmap, i) => {
      const id = crypto.randomUUID();
      images.set(id, bitmap);
      return { id, name: `Booth shot ${i + 1} (${stamp})`, zoom: 1, panX: 0, panY: 0 };
    });
    const old = store.getState().photos;
    store.update((s) => ({ ...s, photos }));
    for (const p of old) {
      images.get(p.id)?.close?.();
      images.delete(p.id);
    }
    status.textContent = 'Done!';
    await sleep(700);
    dialog.close();
    toast(`Captured ${shots} photo${shots === 1 ? '' : 's'}.`);
  }

  $('#camera-btn').addEventListener('click', open);
  startBtn.addEventListener('click', start);
  $('#booth-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', stopCamera);
}
