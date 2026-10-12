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
