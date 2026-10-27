// App state and a minimal store. Decoded images live outside the state (keyed
// by photo id) so state stays plain data.

import { themeFromPreset } from './themes.js';

export const MAX_PHOTOS = 4;

export function createInitialState(now = new Date()) {
  return {
    layout: 'strip',
    photoCount: 4,
    photos: [],
    filter: 'original',
    theme: themeFromPreset('classic'),
    caption: { text: '', font: 'typewriter', showDate: true, date: now, dateFormat: 'long' },
    stickers: [],
    selectedStickerId: null,
    cutLine: true,
  };
}

export function slotCount(state) {
  return state.layout === 'polaroid' ? 1 : state.photoCount;
}

export function addPhotos(state, photos) {
  const room = MAX_PHOTOS - state.photos.length;
  const added = photos.slice(0, Math.max(0, room)).map((p) => ({ zoom: 1, panX: 0, panY: 0, ...p }));
  return { ...state, photos: [...state.photos, ...added] };
}

export function removePhoto(state, id) {
  return { ...state, photos: state.photos.filter((p) => p.id !== id) };
}

export function movePhoto(state, from, to) {
  const n = state.photos.length;
  if (from < 0 || from >= n || to < 0 || to >= n || from === to) return state;
  const photos = [...state.photos];
  const [p] = photos.splice(from, 1);
  photos.splice(to, 0, p);
  return { ...state, photos };
}

export function updatePhoto(state, id, patch) {
  return { ...state, photos: state.photos.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
}

export function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    getState: () => state,
    update(fn) {
      const prev = state;
      state = fn(state);
      if (state !== prev) listeners.forEach((l) => l(state, prev));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
