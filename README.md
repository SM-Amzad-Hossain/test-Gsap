# test-Gsap — ORCHARD 🍊

A **3D scroll-animated product page** for a fictional fruit brand, built with
**GSAP ScrollTrigger** and **Three.js**. The scroll position drives a
choreographed camera and three procedurally-modelled fruits (blood orange,
alpine strawberry, golden kiwi half) through five full-screen sections.

## Features

- **Scroll-driven 3D choreography** — a single scrubbed GSAP timeline moves the
  camera and fruits so each product "spotlight" lands exactly when its section
  reaches the top of the viewport.
- **Procedural fruit models** — no external assets: lathe geometry strawberry
  with instanced seeds, sphere orange with stem/leaf, cut kiwi half with seed
  ring.
- **DOM reveals, progress bar, section dots, cart micro-interactions** — all
  GSAP.
- **Graceful degradation** — falls back to a DOM-only experience if WebGL is
  unavailable, and honours `prefers-reduced-motion`.

## Quickstart

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # production build → dist/
npm run preview  # serve the production build
```

## Stack

| Tool | Purpose |
| --- | --- |
| [Vite](https://vitejs.dev/) | dev server & bundler |
| [Three.js](https://threejs.org/) | WebGL scene, lighting (PMREM + RoomEnvironment) |
| [GSAP + ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) | scroll scrubbing, reveals, intro timeline |

## Structure

```
index.html        # page sections & markup
src/main.js       # Three.js scene + GSAP choreography
src/style.css     # layout, glass cards, ambient background
vite.config.js    # dev server (0.0.0.0 + permissive hosts for previews)
```

## Notes

- Sections are equal-height (`100svh`) so the master timeline (4 transitions
  over `main`) stays aligned with the DOM section boundaries.
- Fruit wrappers separate tweened state (`pos`, `scl`, `spin`) from the render
  loop, which composes it with idle bobbing and pointer parallax.
