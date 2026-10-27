# Photobooth

A desktop app that turns your photos into photo booth prints: classic 2x6 strips,
Polaroid-style frames and print-ready double strips. Upload photos or shoot them
with your camera using a 3-2-1 countdown, then add filters, frame colors,
captions, a date stamp and emoji stickers.

Everything runs on your computer. Photos are never uploaded anywhere.

## Features

- **Layouts at real print sizes (300 DPI)**
  - Classic strip: 2x6 in (600x1800 px), 3 or 4 photos
  - Polaroid: 3.5x4.2 in frame with a 3.1x3.1 in image (1050x1260 px)
  - Double strip: two identical 2x6 strips on a 4x6 in sheet (1200x1800 px), with optional crop marks for cutting
- **Photos:** upload up to 4 (button or drag and drop anywhere), reorder, remove. Drag a photo in the preview to reposition it; scroll to zoom.
- **Camera booth:** live viewfinder, 3, 5 or 10 second countdown, flash, one shot per slot. The mirror option matches what you see.
- **Filters:** Original, B&W, Sepia, Vintage (faded sepia, vignette, grain), Noir, Warm, Cool.
- **Frames:** 7 preset themes, or choose your own background, pattern (dots, stripes, checker, film sprockets, hearts) and colors.
- **Caption:** your text in three bundled fonts (Typewriter, Script, Poster), plus an optional date stamp in three formats.
- **Stickers:** 20 emoji. Drag to move, scroll on one (or use the sliders) to resize and rotate, Delete key to remove.
- **Export:** PNG or JPEG through a save dialog, with 300 DPI written into the file so it prints at the right size. Or print directly.

## Run it

Requires Node.js 22 or newer.

```bash
npm install
npm start
```

If `npm start` reports that Electron failed to install, run
`node node_modules/electron/install.js` once and try again.

## Build an installer

```bash
npm run dist         # installer for the current OS (dmg, NSIS .exe or AppImage)
npm run dist:dir     # unpacked app folder, quicker for testing
```

Output goes to `dist/`. Build each platform's installer on that platform.
On macOS the app asks for camera permission the first time you open the camera booth.

## Tests

```bash
npm test             # unit tests for all image, layout and state logic
npm run test:e2e     # drives the real app with a fake camera
```

On Linux without a display, run the end-to-end test with
`xvfb-run -a npm run test:e2e`. Screenshots and exported files land in `test-output/`.

## How it's built

- Electron with context isolation, a sandboxed preload and a strict content security policy. The renderer only gets two functions: save a file and ask for camera access.
- The renderer is plain ES modules with no framework or bundler.
- `src/renderer/core/` holds all the logic (layouts, crop math, filters, captions, stickers, state, booth countdown, DPI stamping). It has no DOM access and is fully unit tested.
- `src/renderer/render.js` draws the whole print at full resolution. The preview is that same canvas scaled down, so what you see is what you save.

Design notes and the implementation plan are in `docs/superpowers/`.

## Font licenses

Pacifico and Bebas Neue are under the SIL Open Font License; Special Elite is
under the Apache License 2.0. The license texts are in `src/renderer/assets/fonts/`.
