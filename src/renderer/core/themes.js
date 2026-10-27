// Frame backgrounds: a base color, an optional repeating pattern and the
// caption text color.

export const PATTERNS = [
  { id: 'none', name: 'Plain' },
  { id: 'dots', name: 'Polka dots' },
  { id: 'stripes', name: 'Stripes' },
  { id: 'checker', name: 'Checker' },
  { id: 'film', name: 'Film sprockets' },
  { id: 'hearts', name: 'Hearts' },
];

export const THEME_PRESETS = [
  { id: 'classic', name: 'Classic White', background: '#fbfaf6', pattern: 'none', patternColor: '#e8e4da', textColor: '#1d1d1f' },
  { id: 'midnight', name: 'Midnight', background: '#111114', pattern: 'none', patternColor: '#2a2a30', textColor: '#f5f1e8' },
  { id: 'film', name: 'Film Noir', background: '#0b0b0b', pattern: 'film', patternColor: '#f2f2f2', textColor: '#f2f2f2' },
  { id: 'bubblegum', name: 'Bubblegum', background: '#ffd1e3', pattern: 'dots', patternColor: '#ff8fbf', textColor: '#7a1846' },
  { id: 'retro', name: 'Retro Stripes', background: '#fff1d6', pattern: 'stripes', patternColor: '#f4a259', textColor: '#5b2a0d' },
  { id: 'mint', name: 'Mint Checker', background: '#d9f4e6', pattern: 'checker', patternColor: '#b4e6cc', textColor: '#1f5a3d' },
  { id: 'sweetheart', name: 'Sweetheart', background: '#c8102e', pattern: 'hearts', patternColor: '#e8435c', textColor: '#fff4f4' },
];

export function themeFromPreset(id) {
  const preset = THEME_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown theme: ${id}`);
  const { background, pattern, patternColor, textColor } = preset;
  return { preset: id, background, pattern, patternColor, textColor };
}
