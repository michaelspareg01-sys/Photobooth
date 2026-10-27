// Camera booth sequence: for each shot, count down, flash, capture. Timing and
// side effects are injected so the sequence is testable without a camera.

export async function runBooth({ shots, seconds = 3, pauseMs = 800, wait, onTick, onFlash, capture, signal }) {
  const photos = [];
  for (let shot = 0; shot < shots; shot++) {
    for (let n = seconds; n >= 1; n--) {
      if (signal?.aborted) return photos;
      onTick?.(n, shot);
      await wait(1000);
    }
    if (signal?.aborted) return photos;
    onFlash?.(shot);
    photos.push(await capture(shot));
    if (signal?.aborted) return photos;
    if (shot < shots - 1) await wait(pauseMs);
  }
  return photos;
}
