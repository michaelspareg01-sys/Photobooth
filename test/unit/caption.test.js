import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATE_FORMATS, FONTS, formatDate, captionLines, fitFontSize, toDateInputValue, fromDateInputValue } from '../../src/renderer/core/caption.js';

const oct27 = new Date(2026, 9, 27);
const jan5 = new Date(2026, 0, 5);

test('date formats', () => {
  assert.deepEqual(DATE_FORMATS.map((f) => f.id), ['long', 'dots', 'us']);
  assert.equal(formatDate(oct27, 'long'), 'Oct 27, 2026');
  assert.equal(formatDate(oct27, 'dots'), '27.10.2026');
  assert.equal(formatDate(oct27, 'us'), '10.27.26');
  assert.equal(formatDate(jan5, 'long'), 'Jan 5, 2026');
  assert.equal(formatDate(jan5, 'dots'), '05.01.2026');
  assert.equal(formatDate(jan5, 'us'), '01.05.26');
  assert.throws(() => formatDate(oct27, 'iso'), /unknown date format/i);
});

test('fonts are the three bundled families', () => {
  assert.deepEqual(FONTS.map((f) => f.family), ['Special Elite', 'Pacifico', 'Bebas Neue']);
});

test('caption lines: title then date, trimmed', () => {
  assert.deepEqual(
    captionLines({ text: '  Sam & Alex ', showDate: true, date: oct27, dateFormat: 'long' }),
    [{ kind: 'title', text: 'Sam & Alex' }, { kind: 'date', text: 'Oct 27, 2026' }],
  );
});

test('caption lines skip empty pieces', () => {
  assert.deepEqual(captionLines({ text: '   ', showDate: false, date: oct27, dateFormat: 'long' }), []);
  assert.deepEqual(captionLines({ text: '', showDate: true, date: oct27, dateFormat: 'us' }), [{ kind: 'date', text: '10.27.26' }]);
  assert.deepEqual(captionLines({ text: 'Hi', showDate: false, date: oct27, dateFormat: 'us' }), [{ kind: 'title', text: 'Hi' }]);
  assert.deepEqual(captionLines({ text: undefined, showDate: true, date: null, dateFormat: 'us' }), []);
});

test('fitFontSize picks the largest size that fits', () => {
  const measure = (text, size) => text.length * size * 0.5;
  assert.equal(fitFontSize(measure, 'abcd', 100, 80, 20), 50);
  assert.equal(fitFontSize(measure, 'ab', 1000, 80, 20), 80);
  assert.equal(fitFontSize(measure, 'a'.repeat(100), 100, 80, 20), 20);
});

test('date input round trip uses local dates', () => {
  assert.equal(toDateInputValue(jan5), '2026-01-05');
  const d = fromDateInputValue('2026-10-27');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 9);
  assert.equal(d.getDate(), 27);
  assert.equal(fromDateInputValue('garbage'), null);
});
