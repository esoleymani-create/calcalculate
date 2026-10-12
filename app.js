(function () {
  'use strict';

  const STORAGE_KEY = 'calcalculate:v1';
  const RING_CIRCUMFERENCE = 2 * Math.PI * 52;
  const $ = (id) => document.getElementById(id);

  // ---- State -------------------------------------------------------------

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          profile: parsed.profile || null,
          entries: parsed.entries || {},
          whoopDays: parsed.whoopDays || {},
        };
      }
    } catch (err) {
      console.warn('Could not read saved data', err);
    }
    return { profile: null, entries: {}, whoopDays: {} };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Could not save data', err);
    }
  }

  const state = loadState();
  let selectedDay = Calc.dateKey(new Date());

  function entriesFor(day) {
    return state.entries[day] || [];
  }

  function profileWeightKg() {
    return state.profile ? state.profile.weightKg : 0;
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function addEntry(entry) {
    const list = state.entries[selectedDay] || (state.entries[selectedDay] = []);
    list.push({ id: newId(), ...entry });
    saveState();
    render();
  }

  function removeEntry(id) {
    const list = entriesFor(selectedDay).filter((e) => e.id !== id);
    if (list.length) state.entries[selectedDay] = list;
    else delete state.entries[selectedDay];
    saveState();
    render();
  }

  // ---- Rendering ---------------------------------------------------------

  const fmt = (n) => Math.round(n).toLocaleString();

  function renderDay() {
    const today = Calc.dateKey(new Date());
    $('day-picker').value = selectedDay;
    $('day-picker').max = today;
    $('next-day').disabled = selectedDay >= today;

    const date = Calc.parseDateKey(selectedDay);
    let name = date.toLocaleDateString(undefined, { weekday: 'long' });
    if (selectedDay === today) name = 'Today';
    else if (selectedDay === Calc.shiftDateKey(today, -1)) name = 'Yesterday';
    $('day-name').textContent = name;
  }

  function renderSummary() {
    const active = Calc.sumCalories(entriesFor(selectedDay));
    const profile = state.profile;
    const goal = profile && profile.goal > 0 ? profile.goal : 0;
    const whoopDay = state.whoopDays[selectedDay];

    $('active-total').textContent = fmt(active);
    $('active-total-2').textContent = fmt(active);
    $('goal-text').textContent = goal ? `of ${fmt(goal)} goal` : '';

    if (whoopDay) {
      // WHOOP measures the whole day, workouts included.
      $('bmr-label').textContent = 'Rest of day';
      $('bmr-total').textContent = fmt(Math.max(whoopDay.totalKcal - active, 0));
      $('grand-total').textContent = fmt(whoopDay.totalKcal);
      const strain = whoopDay.strain != null ? ` · Day strain ${whoopDay.strain.toFixed(1)}` : '';
      $('day-source').textContent = `Total from WHOOP${strain}`;
      $('day-source').hidden = false;
      $('profile-hint').hidden = true;
    } else {
      const resting = profile ? Calc.bmr(profile) : 0;
      $('bmr-label').textContent = 'Resting (BMR)';
      $('bmr-total').textContent = resting ? fmt(resting) : '—';
      $('grand-total').textContent = fmt(resting + active);
      $('day-source').hidden = true;
      $('profile-hint').hidden = Boolean(profile);
    }

    const progress = goal ? Math.min(active / goal, 1) : active > 0 ? 1 : 0;
    const ring = $('ring-fill');
    ring.style.strokeDasharray = RING_CIRCUMFERENCE;
    ring.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);
  }

  function renderEntries() {
    const list = $('entry-list');
    const entries = entriesFor(selectedDay);
    list.replaceChildren();
    $('empty-entries').hidden = entries.length > 0;

    for (const entry of entries) {
      const li = document.createElement('li');

      const info = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = entry.name;
      if (entry.source === 'whoop') {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = 'WHOOP';
        name.append(badge);
      }
      const meta = document.createElement('div');
      meta.className = 'meta';
      const parts = [];
      if (entry.minutes) parts.push(`${entry.minutes} min`);
      if (entry.strain != null) parts.push(`Strain ${entry.strain.toFixed(1)}`);
      if (!parts.length) parts.push('Manual entry');
      meta.textContent = parts.join(' · ');
      info.append(name, meta);

      const kcal = document.createElement('span');
      kcal.className = 'kcal';
      kcal.textContent = `${fmt(entry.calories)} kcal`;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove';
      remove.textContent = '✕';
      remove.setAttribute('aria-label', `Remove ${entry.name}`);
      remove.addEventListener('click', () => removeEntry(entry.id));

      li.append(info, kcal, remove);
      list.append(li);
    }
  }

  function renderWeek() {
    const chart = $('week-chart');
    const today = Calc.dateKey(new Date());
    const goal = state.profile && state.profile.goal > 0 ? state.profile.goal : 0;
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const key = Calc.shiftDateKey(today, -i);
      days.push({ key, total: Calc.sumCalories(entriesFor(key)) });
    }
    const max = Math.max(goal, ...days.map((d) => d.total), 1);

    chart.replaceChildren();
    for (const day of days) {
      const col = document.createElement('button');
      col.type = 'button';
      col.className = 'bar-col';
      if (day.key === selectedDay) col.classList.add('selected');
      if (goal && day.total >= goal) col.classList.add('met');
      const label = Calc.parseDateKey(day.key).toLocaleDateString(undefined, { weekday: 'short' });
      col.setAttribute('aria-label', `${label}: ${fmt(day.total)} active kcal`);

      const val = document.createElement('span');
      val.className = 'val';
      val.textContent = day.total ? fmt(day.total) : '';
      const track = document.createElement('div');
      track.className = 'bar-track';
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = `${(day.total / max) * 100}%`;
      track.append(bar);
      const dayLabel = document.createElement('span');
      dayLabel.className = 'day';
      dayLabel.textContent = label;

      col.append(val, track, dayLabel);
      col.addEventListener('click', () => {
        selectedDay = day.key;
        render();
      });
      chart.append(col);
    }

    const avg = days.reduce((s, d) => s + d.total, 0) / days.length;
    chart.setAttribute('aria-label', `Active calories for the last 7 days, averaging ${fmt(avg)} per day`);
    $('week-avg').textContent = `Average: ${fmt(avg)} active kcal/day`;
  }

  function renderPreview() {
    const activity = Calc.findActivity($('activity-select').value);
    const minutes = Number($('activity-minutes').value);
    const weight = profileWeightKg();
    const preview = $('activity-preview');
    if (!weight) {
      preview.textContent = 'Save your profile weight to estimate calories.';
    } else if (activity && minutes > 0) {
      preview.textContent = `≈ ${fmt(Calc.activeCalories(activity.met, weight, minutes))} active kcal`;
    } else {
      preview.textContent = '';
    }
  }

  function render() {
    renderDay();
    renderSummary();
    renderEntries();
    renderWeek();
    renderPreview();
  }

  // ---- Profile form ------------------------------------------------------

  function currentUnits() {
    return document.querySelector('input[name="units"]:checked').value;
  }

  function applyUnitsUI(units) {
    const imperial = units === 'imperial';
    $('weight-label').textContent = imperial ? 'Weight (lb)' : 'Weight (kg)';
    document.querySelector('.height-metric').hidden = imperial;
    document.querySelector('.height-imperial').hidden = !imperial;
    $('height-cm').required = !imperial;
    $('height-ft').required = imperial;
    $('height-in').required = imperial;
  }

  function fillProfileForm() {
    const p = state.profile;
    const units = p ? p.units : 'metric';
    document.querySelector(`input[name="units"][value="${units}"]`).checked = true;
    applyUnitsUI(units);
    if (!p) return;

    document.querySelector(`input[name="sex"][value="${p.sex}"]`).checked = true;
    $('age').value = p.age;
    $('goal').value = p.goal || '';
    writeBodyFields(units, p.weightKg, p.heightCm);
  }

  function writeBodyFields(units, weightKg, heightCm) {
    if (units === 'imperial') {
      $('weight').value = weightKg ? Math.round(Calc.kgToLb(weightKg) * 10) / 10 : '';
      if (heightCm) {
        const { ft, in: inches } = Calc.cmToFtIn(heightCm);
        $('height-ft').value = ft;
        $('height-in').value = inches;
      }
    } else {
      $('weight').value = weightKg ? Math.round(weightKg * 10) / 10 : '';
      $('height-cm').value = heightCm ? Math.round(heightCm) : '';
    }
  }

  function readBodyFields(units) {
    const weight = Number($('weight').value);
    if (units === 'imperial') {
      return {
        weightKg: weight ? Calc.lbToKg(weight) : 0,
        heightCm: Calc.ftInToCm(Number($('height-ft').value), Number($('height-in').value)),
      };
    }
    return { weightKg: weight, heightCm: Number($('height-cm').value) };
  }

  let lastUnits = 'metric';
  document.querySelectorAll('input[name="units"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      // Convert what's already typed so switching units doesn't lose input.
      const body = readBodyFields(lastUnits);
      lastUnits = currentUnits();
      applyUnitsUI(lastUnits);
      writeBodyFields(lastUnits, body.weightKg, body.heightCm);
    });
  });

  $('profile-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const units = currentUnits();
    const body = readBodyFields(units);
    state.profile = {
      units,
      sex: document.querySelector('input[name="sex"]:checked').value,
      age: Number($('age').value),
      weightKg: Math.round(body.weightKg * 10) / 10,
      heightCm: Math.round(body.heightCm * 10) / 10,
      goal: Number($('goal').value) || 0,
    };
    saveState();
    $('profile-status').textContent = `Saved. Resting burn ≈ ${fmt(Calc.bmr(state.profile))} kcal/day.`;
    render();
  });

  // ---- Activity forms ----------------------------------------------------

  for (const activity of Calc.ACTIVITIES) {
    const option = document.createElement('option');
    option.value = activity.id;
    option.textContent = activity.name;
    $('activity-select').append(option);
  }
  $('activity-select').addEventListener('change', renderPreview);
  $('activity-minutes').addEventListener('input', renderPreview);

  $('activity-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const weight = profileWeightKg();
    if (!weight) {
      $('weight').focus();
      renderPreview();
      return;
    }
    const activity = Calc.findActivity($('activity-select').value);
    const minutes = Number($('activity-minutes').value);
    addEntry({
      name: activity.name,
      activityId: activity.id,
      minutes,
      calories: Calc.activeCalories(activity.met, weight, minutes),
    });
    $('activity-minutes').value = '';
    renderPreview();
  });

  $('manual-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const minutes = Number($('manual-minutes').value) || null;
    addEntry({
      name: $('manual-name').value.trim(),
      minutes,
      calories: Math.round(Number($('manual-calories').value)),
    });
    event.target.reset();
  });

  function selectTab(manual) {
    $('tab-activity').setAttribute('aria-selected', String(!manual));
    $('tab-manual').setAttribute('aria-selected', String(manual));
    $('activity-form').hidden = manual;
    $('manual-form').hidden = !manual;
  }
  $('tab-activity').addEventListener('click', () => selectTab(false));
  $('tab-manual').addEventListener('click', () => selectTab(true));

  // ---- Day navigation ----------------------------------------------------

  $('prev-day').addEventListener('click', () => {
    selectedDay = Calc.shiftDateKey(selectedDay, -1);
    render();
  });
  $('next-day').addEventListener('click', () => {
    const next = Calc.shiftDateKey(selectedDay, 1);
    if (next <= Calc.dateKey(new Date())) {
      selectedDay = next;
      render();
    }
  });
  $('day-picker').addEventListener('change', (event) => {
    if (event.target.value) {
      selectedDay = event.target.value;
      render();
    }
  });

  // ---- WHOOP import ------------------------------------------------------

  function importWhoop(results) {
    let days = 0;
    let workouts = 0;
    for (const result of results) {
      for (const cycle of result.cycles) {
        state.whoopDays[cycle.date] = { totalKcal: cycle.totalKcal, strain: cycle.strain };
        days++;
      }
      for (const w of result.workouts) {
        // Replace an earlier import of the same workout instead of duplicating it.
        const list = (state.entries[w.date] || []).filter((e) => e.id !== w.id);
        list.push({
          id: w.id,
          source: 'whoop',
          name: w.name,
          minutes: w.minutes,
          calories: w.calories,
          strain: w.strain,
        });
        state.entries[w.date] = list;
        workouts++;
      }
    }
    saveState();
    return { days, workouts };
  }

  $('whoop-files').addEventListener('change', async (event) => {
    const files = [...event.target.files];
    if (!files.length) return;
    const status = $('whoop-status');
    status.textContent = 'Importing…';

    const results = [];
    const skipped = [];
    for (const file of files) {
      try {
        const result = Whoop.parseExport(await file.text());
        if (result.kind === 'unknown') skipped.push(file.name);
        else results.push(result);
      } catch (err) {
        console.warn('Could not read', file.name, err);
        skipped.push(file.name);
      }
    }

    const { days, workouts } = importWhoop(results);
    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
    let message = `Imported ${plural(days, 'day')} of totals and ${plural(workouts, 'workout')}.`;
    if (skipped.length) {
      message += ` Skipped ${skipped.join(', ')} (not a WHOOP cycles or workouts file).`;
    }
    status.textContent = message;
    event.target.value = '';
    render();
  });

  // ---- Export / reset ----------------------------------------------------

  function csvCell(value) {
    const s = String(value ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  $('export-csv').addEventListener('click', () => {
    const rows = [['date', 'activity', 'minutes', 'active_kcal', 'source']];
    for (const day of Object.keys(state.entries).sort()) {
      for (const e of state.entries[day]) {
        rows.push([day, e.name, e.minutes || '', e.calories, e.source || 'manual']);
      }
    }
    const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `calcalculate-${Calc.dateKey(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  });

  $('clear-data').addEventListener('click', () => {
    if (!confirm('Delete your profile and all logged activities? This cannot be undone.')) return;
    state.profile = null;
    state.entries = {};
    state.whoopDays = {};
    saveState();
    $('profile-form').reset();
    $('profile-status').textContent = '';
    $('whoop-status').textContent = '';
    fillProfileForm();
    render();
  });

  // ---- Start -------------------------------------------------------------

  fillProfileForm();
  lastUnits = currentUnits();
  render();
})();
