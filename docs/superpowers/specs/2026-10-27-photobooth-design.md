# Photobooth Desktop App: Design

Date: 2026-10-27

## Intent

Turn ordinary photos (uploaded, or shot live with the computer's camera) into
images that look like real photo booth output, ready to save or print.

The user answered four questions up front and then asked for the whole app to
be built without further check-ins:

| Question | Answer |
|---|---|
| Platform | Desktop app |
| Photo input | Upload several photos; live camera booth |
| Layouts | Classic vertical strip; Polaroid single; Double strip (print-ready) |
| Extras | Filters; frame colors and patterns; caption and date; stickers / emoji |

## Goals

- Desktop app for Windows, macOS and Linux.
- Upload 1 to 4 photos (file picker or drag and drop) that fill the layout's slots in order.
- Live camera booth: 3-2-1 countdown per shot, flash, auto-captures one photo per slot.
- Layouts at 300 DPI, using real print sizes:
  - Classic strip, 2x6 in (600x1800 px), 3 or 4 photos.
  - Polaroid, 3.5x4.2 in frame (1050x1260 px) with a 3.1x3.1 in image (930x930 px).
  - Double strip, two identical 2x6 strips on a 4x6 in sheet (1200x1800 px), with an optional cut line.
- Filters applied to every photo in the frame: Original, B&W, Sepia, Vintage, Noir (high contrast B&W), Warm, Cool.
- Frame theme: preset themes, plus background color, pattern (none, dots, stripes, checker, film sprockets, hearts) and pattern color.
- Caption text with three bundled fonts and a text color; optional date stamp in three formats.
- Emoji stickers: add, drag, resize, rotate, delete. Stickers sit on top of everything.
- Pan (drag) and zoom (scroll wheel) each photo inside its slot.
- Export PNG or JPEG at full resolution through a native save dialog; print.

## Non-goals

- Accounts, cloud storage, sharing to social networks.
- Per-photo filters, undo history, saving editable projects.
- Video, GIF or "boomerang" output.

## Anti-goals

- Photos never leave the machine. No network calls at runtime.
- No blurry output: export is always at 300 DPI print size, never at preview size.

## Constraints

- Electron with `contextIsolation: true`, `nodeIntegration: false`, sandboxed preload; renderer gets only a tiny `window.photobooth` API (save file).
- Renderer is plain ES modules, no bundler, no framework.
- All image logic that can be pure (layout math, crop math, filters, date and caption formatting, sticker hit-testing, booth countdown sequencing, state) lives in `src/renderer/core/` with no DOM access, so it is unit tested with `node --test`.
- Fonts are bundled (Pacifico and Bebas Neue, SIL OFL; Special Elite, Apache 2.0) so output looks identical on every OS.

## Approaches considered

1. **Electron + Canvas 2D (picked, my call).** Same rendering engine (Chromium) on every OS, camera via `getUserMedia`, mature packaging with electron-builder. Cost: ~100 MB installers.
2. **Tauri + Canvas.** Small installers, but uses each OS's own webview (WebKit on macOS/Linux, WebView2 on Windows), so canvas output, fonts and camera permissions differ per platform, and it needs a Rust toolchain.
3. **Python (PySide/Qt + Pillow).** Good image libraries, but camera capture and a polished UI take far more code, and packaging Python apps is fragile.

Electron wins because identical output across platforms matters most for a print product.

## How it works

- **Composition model:** one `state` object (layout, photo count, photos with per-photo pan/zoom, filter, theme, caption, date, stickers). `render(ctx, state, images)` draws the whole frame from state at full resolution. The preview is that same canvas scaled down with CSS, so what you see is what you export.
- **Double strip:** render a single 600x1800 strip, then draw it twice on the 1200x1800 sheet. Stickers are stored in strip coordinates so both copies match; pointer input in either half maps back to the strip.
- **Coordinates:** stickers store normalized positions (0..1 of the strip/frame) so they survive layout and photo-count changes.
- **Filters:** pixel operations on `ImageData` for the slot region, applied after drawing the photo and before stickers and caption. Vintage grain uses a seeded PRNG so output is deterministic.
- **Camera:** booth runs `countdown -> flash -> capture` for each slot via an injectable sequencer; capture draws the (un-mirrored) video frame into a canvas.
- **Save:** renderer encodes the canvas to a data URL, preload sends it over IPC, main shows `dialog.showSaveDialog` and writes the file. In a plain browser (tests, dev) it falls back to a download link.

## Left to the builder

Exact UI arrangement, sticker emoji set, theme preset colors, date formats.
Calls I made on the user's behalf are marked "my call" above.
