# APEX

A browser arcade racer built with JavaScript and Canvas. Complete a 5 km sprint, dodge traffic, and use nitro to improve your record. Includes three scenic routes, car colors, difficulty settings, touch controls, and local personal records. No account or API keys required.

Ready-to-play files are in [downloads](downloads/README.md): a standalone HTML game and a ready-to-host website ZIP.

## Run

Use Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

Vite serves the app on port 5173 by default. For production, run `npm run build` and serve the generated `dist` directory, or use `npm run preview`.

In the Codex cloud environment, install with `npm ci --cache /workspace/.cache/npm` so npm uses a writable cache.

## Play without installing anything

Run `npm run export` to create `release/apex-game.html`. Download that file and double-click it to play in a modern browser on your computer. It includes the code, graphics, and fonts, so no server or internet connection is needed. Browser settings may limit saved records for local files.

For a public URL, deploy the contents of `dist` to a static website host such as Netlify, Vercel, or GitHub Pages. Netlify Drop accepts a ZIP containing `index.html` at the archive root.

## Controls

- Arrow keys or A/D: steer
- Down arrow or S: brake
- Shift or Space: nitro
- P or Escape: pause/resume
- Enter: start or retry
- On a touchscreen, hold the steering and nitro buttons

Races accelerate automatically. You have three lives; collisions cost one life. Reach 5 km to finish. Records stay in this browser using localStorage. Settings include sound, motion effects, and three traffic difficulty levels.

## Validate

```sh
npm test
npm run build
```

No backend services or external assets are required.
