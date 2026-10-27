# Photobooth Desktop App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An Electron desktop app that turns uploaded or camera-captured photos into 300 DPI photo booth strips and Polaroids.

**Architecture:** Pure, DOM-free core modules (`src/renderer/core/`) hold all layout, crop, filter, caption, sticker, booth and state logic and are unit tested with `node --test`. A thin canvas renderer and vanilla-JS UI sit on top. Electron main/preload provide the window, camera permission and native save dialog.

**Tech Stack:** Electron 45, plain ES modules, Canvas 2D, `node:test`, playwright-core `_electron` for end-to-end, electron-builder for installers.

**Spec:** `docs/superpowers/specs/2026-10-27-photobooth-design.md`

## Global Constraints

- Output sizes at 300 DPI: strip 600x1800, Polaroid 1050x1260 with 930x930 image, double sheet 1200x1800.
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- No runtime network access; strict CSP `default-src 'self'`.
- Core modules must not touch `document` or `window`.

## Review Focus

1. Fewer photos than slots: empty slots render a placeholder, export still works.
2. Very large or portrait/landscape-mismatched photos: cover-crop never distorts, pan is clamped so no gaps show.
3. Camera denied or missing: clear message, upload still works.
4. Switching layout or photo count with stickers placed: stickers stay on the frame (clamped to 0..1).
5. Empty caption with date off: caption area still drawn cleanly, no "undefined" text.

---

### Task 1: Project scaffold
**Files:** `package.json`, `.gitignore`, `README.md`
- [ ] Add scripts `start`, `test` (`node --test test/unit/`), `test:e2e`, `dist`. Commit.

### Task 2: Layouts (`core/layouts.js`)
**Produces:** `LAYOUTS`, `computeLayout(layoutId, {photoCount}) -> {width, height, strip:{width,height}, copies:[{x,y}], slots:[{x,y,w,h}], caption:{x,y,w,h}}`
- [ ] Failing tests: exact sizes per layout, slots inside strip, equal, non-overlapping, ordered top to bottom; double has 2 copies; unknown id throws.
- [ ] Implement, pass, commit.

### Task 3: Crop math (`core/crop.js`)
**Produces:** `coverCrop(srcW, srcH, dstW, dstH, {zoom=1, panX=0, panY=0}) -> {sx,sy,sw,sh}`; `clampPan`.
- [ ] Tests: aspect preserved, centered by default, pan in -1..1 reaches edges and clamps, zoom shrinks source rect, zoom < 1 clamped to 1.
- [ ] Implement, pass, commit.

### Task 4: Filters (`core/filters.js`)
**Produces:** `FILTERS` list, `applyFilter(imageData, filterId, {seed})` (mutates `data`).
- [ ] Tests: original unchanged; B&W makes r=g=b using Rec. 601 weights; sepia matches the standard sepia matrix on a known pixel; noir is grayscale with higher contrast; warm raises red / lowers blue; vintage deterministic per seed; alpha untouched; unknown id throws.
- [ ] Implement, pass, commit.

### Task 5: Caption and date (`core/caption.js`)
**Produces:** `DATE_FORMATS`, `formatDate(date, formatId)`, `captionLines({text, showDate, date, dateFormat})`, `fitFontSize(measure, text, maxWidth, maxSize, minSize)`.
- [ ] Tests for each format, padding, empty text, trimmed text, font fitting.
- [ ] Implement, pass, commit.

### Task 6: Stickers (`core/stickers.js`)
**Produces:** `STICKER_EMOJI`, `createSticker(emoji, opts)`, `hitTest(stickers, x, y, frameW, frameH)`, `moveSticker`, `clampSticker`.
- [ ] Tests: topmost hit wins, miss returns null, move clamps to 0..1, size clamp.
- [ ] Implement, pass, commit.

### Task 7: Themes (`core/themes.js`)
**Produces:** `PATTERNS`, `THEME_PRESETS`, `themeFromPreset(id)`.
- [ ] Tests: every preset has valid hex colors and a known pattern.
- [ ] Implement, pass, commit.

### Task 8: State store (`core/state.js`)
**Produces:** `createInitialState(now)`, `createStore(initial)` with `getState/update(fn)/subscribe`, helpers `addPhotos`, `removePhoto`, `movePhoto`, `slotCount(state)`.
- [ ] Tests: add caps at 4, reorder, remove, subscribers notified, slotCount per layout.
- [ ] Implement, pass, commit.

### Task 9: Booth sequencer (`core/booth.js`) and file names (`core/filename.js`)
**Produces:** `runBooth({shots, seconds, wait, onTick, onFlash, capture, signal})`, `exportFileName(layoutId, ext, date)`.
- [ ] Tests with fake `wait`: tick order 3,2,1 per shot, capture called N times, abort stops early; filename format.
- [ ] Implement, pass, commit.

### Task 10: Canvas renderer (`render.js`) and patterns (`patterns.js`)
- [ ] `renderFrame(canvas, state, images)` draws background, pattern, slots (cover-crop + filter), caption, stickers, copies, cut line.
- [ ] Verified by e2e pixel checks (Task 12).

### Task 11: Electron shell and UI
**Files:** `src/main/main.js`, `src/main/preload.cjs`, `src/renderer/index.html`, `styles.css`, `app.js`, `ui/*.js`
- [ ] Window, CSP, camera permission handler, save IPC. UI panels for photos, camera booth, layout, filter, frame, caption, stickers, export.

### Task 12: End-to-end test (`test/e2e/app.e2e.mjs`)
- [ ] Launch Electron with a fake camera, upload fixture photos, switch every layout/filter, add caption and sticker, run the booth, export via stubbed save, assert output dimensions and non-blank pixels. Run under `xvfb-run`.
