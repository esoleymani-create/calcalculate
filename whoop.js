// Parses the CSV files in a WHOOP data export ("Export my data" in the WHOOP
// app): physiological_cycles.csv and workouts.csv. Columns are matched by
// header name rather than position, so extra or reordered columns are fine.
(function (root) {
  'use strict';

  const KJ_PER_KCAL = 4.184;

  // RFC 4180-style CSV: quoted fields, escaped quotes, CRLF or LF.
  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    text = text.replace(/^﻿/, '');

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"' && text[i + 1] === '"') {
          field += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
    if (field !== '' || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
  }

  function normalize(header) {
    return header.toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim();
  }

  // Index of the first header matching any of the patterns, or -1.
  function findColumn(headers, ...patterns) {
    const norm = headers.map(normalize);
    for (const pattern of patterns) {
      const idx = norm.findIndex((h) => pattern.test(h));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  // Energy column, and the factor that converts its values to kcal.
  function findEnergyColumn(headers) {
    const kj = findColumn(headers, /kilojoule/, /\bkj\b/);
    if (kj !== -1) return { idx: kj, toKcal: 1 / KJ_PER_KCAL };
    // WHOOP labels this "Energy burned (cal)" but the values are kcal.
    const cal = findColumn(headers, /energy burned/, /calorie/, /\bkcal\b/);
    return { idx: cal, toKcal: 1 };
  }

  // "2026-10-12 07:30:00" (or ISO "2026-10-12T07:30:00") → parts, read as the
  // local wall-clock time WHOOP wrote, without timezone conversion.
  function parseTimestamp(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec((value || '').trim());
    if (!m) return null;
    return { date: `${m[1]}-${m[2]}-${m[3]}`, hour: m[4] ? Number(m[4]) : 0, minute: m[5] ? Number(m[5]) : 0 };
  }

  function addDays(key, days) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + days));
    return date.toISOString().slice(0, 10);
  }

  // A WHOOP cycle starts when you fall asleep and WHOOP names it after the day
  // you wake up into, so a cycle starting in the evening belongs to the next day.
  function cycleDay(startValue) {
    const ts = parseTimestamp(startValue);
    if (!ts) return null;
    return ts.hour >= 12 ? addDays(ts.date, 1) : ts.date;
  }

  function toNumber(value) {
    if (value == null) return NaN;
    const s = String(value).trim();
    return s === '' ? NaN : Number(s);
  }

  function detectKind(headers) {
    const norm = headers.map(normalize);
    if (norm.some((h) => h.startsWith('workout start'))) return 'workouts';
    if (norm.some((h) => h.startsWith('cycle start')) && norm.some((h) => h === 'day strain' || /energy|kilojoule|calorie/.test(h))) {
      return 'cycles';
    }
    return 'unknown';
  }

  // → [{ date, totalKcal, strain }], one per day with an energy value.
  function parseCycles(rows) {
    const [headers, ...data] = rows;
    const start = findColumn(headers, /^cycle start/);
    const strainCol = findColumn(headers, /^day strain/, /strain/);
    const energy = findEnergyColumn(headers);
    if (start === -1 || energy.idx === -1) return [];

    const byDay = new Map();
    for (const row of data) {
      const date = cycleDay(row[start]);
      const raw = toNumber(row[energy.idx]);
      if (!date || !(raw > 0)) continue;
      const strain = toNumber(row[strainCol]);
      byDay.set(date, {
        date,
        totalKcal: Math.round(raw * energy.toKcal),
        strain: Number.isFinite(strain) ? strain : null,
      });
    }
    return [...byDay.values()];
  }

  // → [{ id, date, name, minutes, calories, strain }]
  function parseWorkouts(rows) {
    const [headers, ...data] = rows;
    const start = findColumn(headers, /^workout start/);
    const end = findColumn(headers, /^workout end/);
    const durationCol = findColumn(headers, /^duration/);
    const nameCol = findColumn(headers, /^activity name/, /^sport/, /^activity/);
    const strainCol = findColumn(headers, /^activity strain/, /strain/);
    const energy = findEnergyColumn(headers);
    if (start === -1 || energy.idx === -1) return [];

    const workouts = [];
    for (const row of data) {
      const ts = parseTimestamp(row[start]);
      const raw = toNumber(row[energy.idx]);
      if (!ts || !(raw > 0)) continue;

      let minutes = toNumber(row[durationCol]);
      if (!(minutes > 0)) minutes = minutesBetween(ts, parseTimestamp(row[end]));
      const strain = toNumber(row[strainCol]);

      workouts.push({
        // Stable id so importing the same export again doesn't duplicate entries.
        id: `whoop-${row[start].trim()}`,
        date: ts.date,
        name: (nameCol !== -1 && row[nameCol].trim()) || 'WHOOP workout',
        minutes: minutes > 0 ? Math.round(minutes) : null,
        calories: Math.round(raw * energy.toKcal),
        strain: Number.isFinite(strain) ? strain : null,
      });
    }
    return workouts;
  }

  function minutesBetween(a, b) {
    if (!a || !b) return NaN;
    const toMin = (t) => {
      const [y, m, d] = t.date.split('-').map(Number);
      return Date.UTC(y, m - 1, d) / 60000 + t.hour * 60 + t.minute;
    };
    return toMin(b) - toMin(a);
  }

  // Parse one exported file. → { kind, cycles, workouts }
  function parseExport(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) return { kind: 'unknown', cycles: [], workouts: [] };
    const kind = detectKind(rows[0]);
    return {
      kind,
      cycles: kind === 'cycles' ? parseCycles(rows) : [],
      workouts: kind === 'workouts' ? parseWorkouts(rows) : [],
    };
  }

  const Whoop = { parseCsv, parseExport, cycleDay, KJ_PER_KCAL };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Whoop;
  } else {
    root.Whoop = Whoop;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
