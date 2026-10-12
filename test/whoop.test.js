const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Whoop = require('../whoop.js');

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

test('parseCsv handles quotes, escaped quotes, CRLF and BOM', () => {
  const rows = Whoop.parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n\r\n');
  assert.deepEqual(rows, [['a', 'b'], ['x, y', 'say "hi"']]);
});

test('cycleDay names a cycle after the day you wake into', () => {
  assert.equal(Whoop.cycleDay('2026-10-09 23:12:40'), '2026-10-10');
  assert.equal(Whoop.cycleDay('2026-10-12 00:31:10'), '2026-10-12');
  assert.equal(Whoop.cycleDay('2026-12-31 22:00:00'), '2027-01-01');
  assert.equal(Whoop.cycleDay(''), null);
});

test('parses physiological cycles into daily totals', () => {
  const result = Whoop.parseExport(fixture('physiological_cycles.csv'));
  assert.equal(result.kind, 'cycles');
  assert.deepEqual(result.cycles, [
    { date: '2026-10-10', totalKcal: 2410, strain: 12.4 },
    { date: '2026-10-11', totalKcal: 2102, strain: 8.1 },
    // The in-progress cycle has no energy yet, so it is skipped.
  ]);
});

test('parses workouts', () => {
  const result = Whoop.parseExport(fixture('workouts.csv'));
  assert.equal(result.kind, 'workouts');
  assert.equal(result.workouts.length, 3);
  assert.deepEqual(result.workouts[1], {
    id: 'whoop-2026-10-10 18:00:00',
    date: '2026-10-10',
    name: 'Weightlifting, Functional',
    minutes: 50,
    calories: 288,
    strain: 6.4,
  });
  // Missing duration falls back to end − start.
  assert.equal(result.workouts[2].minutes, 30);
});

test('converts kilojoule columns to kcal', () => {
  const csv = 'Cycle start time,Day Strain,Kilojoules\n2026-10-11 06:00:00,10,10460\n';
  const result = Whoop.parseExport(csv);
  assert.deepEqual(result.cycles, [{ date: '2026-10-11', totalKcal: 2500, strain: 10 }]);
});

test('unrelated files are reported as unknown', () => {
  const csv = 'Cycle start time,Sleep onset,Asleep duration (min)\n2026-10-11 06:00:00,x,400\n';
  assert.equal(Whoop.parseExport(csv).kind, 'unknown');
  assert.equal(Whoop.parseExport('').kind, 'unknown');
});
