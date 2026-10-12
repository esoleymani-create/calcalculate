// Pure calorie math, shared by the browser app and the Node tests.
(function (root) {
  'use strict';

  const LB_PER_KG = 2.20462;
  const CM_PER_IN = 2.54;

  // MET values from the Compendium of Physical Activities (Ainsworth et al.).
  const ACTIVITIES = [
    { id: 'walk-moderate', name: 'Walking (moderate, 3 mph)', met: 3.5 },
    { id: 'walk-brisk', name: 'Walking (brisk, 4 mph)', met: 5.0 },
    { id: 'hike', name: 'Hiking', met: 6.0 },
    { id: 'run-6', name: 'Running (6 mph / 10 min mile)', met: 9.8 },
    { id: 'run-8', name: 'Running (8 mph / 7.5 min mile)', met: 11.8 },
    { id: 'cycle-leisure', name: 'Cycling (leisure, <10 mph)', met: 4.0 },
    { id: 'cycle-moderate', name: 'Cycling (moderate, 12–14 mph)', met: 8.0 },
    { id: 'swim', name: 'Swimming (moderate laps)', met: 5.8 },
    { id: 'weights', name: 'Weight training (general)', met: 3.5 },
    { id: 'weights-vigorous', name: 'Weight training (vigorous)', met: 6.0 },
    { id: 'hiit', name: 'HIIT / circuit training', met: 8.0 },
    { id: 'elliptical', name: 'Elliptical (moderate)', met: 5.0 },
    { id: 'rowing', name: 'Rowing machine (moderate)', met: 7.0 },
    { id: 'stairs', name: 'Stair climber', met: 9.0 },
    { id: 'jump-rope', name: 'Jump rope', met: 11.8 },
    { id: 'yoga', name: 'Yoga', met: 2.5 },
    { id: 'dance', name: 'Dancing', met: 5.0 },
    { id: 'basketball', name: 'Basketball (game)', met: 8.0 },
    { id: 'soccer', name: 'Soccer (casual)', met: 7.0 },
    { id: 'tennis', name: 'Tennis (singles)', met: 8.0 },
    { id: 'gardening', name: 'Gardening', met: 3.8 },
    { id: 'housework', name: 'Housework / cleaning', met: 3.3 },
  ];

  function lbToKg(lb) {
    return lb / LB_PER_KG;
  }

  function kgToLb(kg) {
    return kg * LB_PER_KG;
  }

  function ftInToCm(ft, inches) {
    return (ft * 12 + inches) * CM_PER_IN;
  }

  function cmToFtIn(cm) {
    const totalIn = Math.round(cm / CM_PER_IN);
    return { ft: Math.floor(totalIn / 12), in: totalIn % 12 };
  }

  // Basal metabolic rate (kcal/day), Mifflin–St Jeor equation.
  function bmr({ weightKg, heightCm, age, sex }) {
    if (!(weightKg > 0 && heightCm > 0 && age > 0)) return 0;
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return Math.round(sex === 'female' ? base - 161 : base + 5);
  }

  // Active calories for an activity: energy burned *above* resting, so it can
  // be added to BMR without double counting (same idea as "active calories"
  // on fitness watches). 1 MET ≈ 1 kcal per kg per hour.
  function activeCalories(met, weightKg, minutes) {
    if (!(met > 1 && weightKg > 0 && minutes > 0)) return 0;
    return Math.round((met - 1) * weightKg * (minutes / 60));
  }

  function findActivity(id) {
    return ACTIVITIES.find((a) => a.id === id) || null;
  }

  function sumCalories(entries) {
    return entries.reduce((total, e) => total + (e.calories || 0), 0);
  }

  // Local-time YYYY-MM-DD key, so "today" matches the user's clock.
  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDateKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function shiftDateKey(key, days) {
    const date = parseDateKey(key);
    date.setDate(date.getDate() + days);
    return dateKey(date);
  }

  const Calc = {
    ACTIVITIES,
    lbToKg,
    kgToLb,
    ftInToCm,
    cmToFtIn,
    bmr,
    activeCalories,
    findActivity,
    sumCalories,
    dateKey,
    parseDateKey,
    shiftDateKey,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calc;
  } else {
    root.Calc = Calc;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
