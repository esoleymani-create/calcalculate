const test = require('node:test');
const assert = require('node:assert/strict');
const Calc = require('../calc.js');

test('bmr uses Mifflin–St Jeor', () => {
  // 10*70 + 6.25*175 - 5*30 + 5 = 1648.75
  assert.equal(Calc.bmr({ weightKg: 70, heightCm: 175, age: 30, sex: 'male' }), 1649);
  // 10*60 + 6.25*165 - 5*30 - 161 = 1320.25
  assert.equal(Calc.bmr({ weightKg: 60, heightCm: 165, age: 30, sex: 'female' }), 1320);
});

test('bmr is 0 for incomplete profiles', () => {
  assert.equal(Calc.bmr({ weightKg: 0, heightCm: 175, age: 30, sex: 'male' }), 0);
  assert.equal(Calc.bmr({}), 0);
});

test('activeCalories counts burn above resting', () => {
  // (9.8 - 1) * 70 kg * 0.5 h = 308
  assert.equal(Calc.activeCalories(9.8, 70, 30), 308);
  assert.equal(Calc.activeCalories(3.5, 80, 60), 200);
});

test('activeCalories rejects invalid input', () => {
  assert.equal(Calc.activeCalories(1, 70, 30), 0);
  assert.equal(Calc.activeCalories(5, 0, 30), 0);
  assert.equal(Calc.activeCalories(5, 70, 0), 0);
  assert.equal(Calc.activeCalories(5, 70, -10), 0);
});

test('unit conversions round-trip', () => {
  assert.ok(Math.abs(Calc.kgToLb(Calc.lbToKg(180)) - 180) < 1e-9);
  assert.ok(Math.abs(Calc.ftInToCm(5, 10) - 177.8) < 1e-9);
  assert.deepEqual(Calc.cmToFtIn(177.8), { ft: 5, in: 10 });
  assert.deepEqual(Calc.cmToFtIn(182.88), { ft: 6, in: 0 });
});

test('date keys use local time and shift across month/year boundaries', () => {
  assert.equal(Calc.dateKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(Calc.shiftDateKey('2026-01-01', -1), '2025-12-31');
  assert.equal(Calc.shiftDateKey('2026-02-28', 1), '2026-03-01');
  assert.equal(Calc.dateKey(Calc.parseDateKey('2026-10-12')), '2026-10-12');
});

test('sumCalories and findActivity', () => {
  assert.equal(Calc.sumCalories([{ calories: 100 }, { calories: 250 }, {}]), 350);
  assert.equal(Calc.findActivity('yoga').met, 2.5);
  assert.equal(Calc.findActivity('nope'), null);
  const ids = Calc.ACTIVITIES.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length, 'activity ids are unique');
});
