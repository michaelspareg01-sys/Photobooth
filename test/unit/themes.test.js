import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PATTERNS, THEME_PRESETS, themeFromPreset } from '../../src/renderer/core/themes.js';

const HEX = /^#[0-9a-f]{6}$/i;

test('patterns', () => {
  assert.deepEqual(PATTERNS.map((p) => p.id), ['none', 'dots', 'stripes', 'checker', 'film', 'hearts']);
});

test('every preset has valid colors and a known pattern', () => {
  assert.ok(THEME_PRESETS.length >= 6);
  const patternIds = new Set(PATTERNS.map((p) => p.id));
  for (const p of THEME_PRESETS) {
    assert.match(p.background, HEX, p.id);
    assert.match(p.patternColor, HEX, p.id);
    assert.match(p.textColor, HEX, p.id);
    assert.ok(patternIds.has(p.pattern), p.id);
  }
});

test('themeFromPreset returns a copy without the display name', () => {
  const t = themeFromPreset('classic');
  assert.deepEqual(Object.keys(t).sort(), ['background', 'pattern', 'patternColor', 'preset', 'textColor']);
  t.background = '#000000';
  assert.notEqual(themeFromPreset('classic').background, '#000000');
  assert.throws(() => themeFromPreset('nope'), /unknown theme/i);
});
