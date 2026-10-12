# CalCalculate

A small web app for tracking the calories you burn each day. It has no
dependencies, needs no build step and no account, and your data stays in your
browser (`localStorage`).

## Features

- **Daily summary**: resting calories (BMR) + active calories = total burned,
  with a progress ring toward your daily active-calorie goal.
- **Log activities** from a list of 22 common activities (walking, running,
  cycling, lifting, HIIT, yoga, …). Calories are estimated from your weight
  and the duration.
- **Manual entries** for numbers from a fitness watch or a gym machine.
- **WHOOP import** from the CSV files in a WHOOP data export (see below).
- **Any day**: go back to earlier days or pick a date to log or review them.
- **7-day chart** with your daily average. Tap a bar to open that day.
- Metric or imperial units, light and dark mode, works on a phone screen.
- **Export to CSV**.

## Running it

Open `index.html` in a browser, or serve the folder:

```sh
npm start          # serves the app at http://localhost:3000
```

To use it on your phone, host the folder on any static host (GitHub Pages,
Netlify, …) and use "Add to Home Screen".

## Importing from WHOOP

1. In the WHOOP app, go to **More → App Settings → Data Export** and request
   your data. WHOOP emails you a zip file.
2. Unzip it, then in CalCalculate choose **Import from WHOOP → Choose CSV
   files** and select `physiological_cycles.csv` and `workouts.csv`.

- **Daily totals** come from the cycles file. On days with WHOOP data, the
  total burned is WHOOP's measured figure instead of the BMR estimate.
- **Workouts** appear in that day's activity list with a WHOOP badge,
  including their strain.
- Re-importing a newer export updates days you already have, without
  duplicating anything. Other files in the export are skipped.

WHOOP names each cycle after the day you wake into, so a cycle that starts
in the evening counts toward the next day. WHOOP's workout calories are the
full burn for the workout, not just the extra above resting.

## How the estimates work

- **Resting burn (BMR)** uses the Mifflin–St Jeor equation:
  `10·kg + 6.25·cm − 5·age + 5` (male) or `− 161` (female).
- **Active calories** use MET values from the Compendium of Physical
  Activities: `(MET − 1) · kg · hours`. The `− 1` leaves out the resting
  calories you would burn anyway, so active calories can be added to BMR
  without counting them twice. Fitness watches show "active calories" the
  same way.

These are estimates. Real burn varies by person and by how hard you work.

## Tests

```sh
npm test
```

The calorie maths is in `calc.js` and is tested with Node's built-in test
runner (Node 18+).
