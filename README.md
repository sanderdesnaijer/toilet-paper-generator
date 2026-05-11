# 3D Toilet Paper Roll Simulator with Real Thermal Printing

A browser-based 3D toilet paper roll you can drag and unroll in real time. The physics simulation measures the exact paper length in centimeters. When you stop, the result prints on a real thermal receipt printer using raw ESC/POS commands over TCP.

Built with Next.js, Three.js (React Three Fiber), and Rapier physics.

**[Live Demo](https://unroll.metsander.com)** | **[Project Page](https://www.sanderdesnaijer.com/projects/3d-toilet-paper-roll-simulator-with-real-thermal-printing)** | **[Portfolio](https://www.sanderdesnaijer.com/)**

---

## What It Does

This project combines real-time WebGL rendering, rigid body physics, dynamic geometry updates, centimeter-accurate paper measurement, and raw ESC/POS printer output over TCP into a single interactive demo.

It started as a small experiment. It escalated.

---

## How It Works

This project combines:

* Real-time WebGL rendering
* Physics simulation
* Dynamic roll geometry
* Centimeter-accurate paper measurement
* Raw ESC/POS printer output over TCP

It started as a small experiment.
It escalated.

---

## Watch video
[![Watch on YouTube](https://img.youtube.com/vi/CoDqEwYAJCQ/maxresdefault.jpg)](https://www.youtube.com/watch?v=CoDqEwYAJCQ)

---

## 🧠 How It Works

### 3D Roll Rendering

* Built with Three.js via React Three Fiber
* Dynamic cylinder geometry updates as paper unrolls
* Realistic paper tail with physics constraints

### Physics Simulation

* Powered by Rapier physics
* Inertia while dragging
* Paper interacts with the ground plane

### Measurement Logic

* Converts unrolled arc length to real-world centimeters
* Roll radius updates dynamically
* Tracks remaining paper accurately

### Thermal Printer Integration

* Sends raw ESC/POS byte commands
* Communicates via Node TCP socket
* Works with most Ethernet thermal printers

---

## Tech Stack

* Next.js 16
* React 19
* Three.js
* React Three Fiber
* Rapier Physics
* Tailwind CSS
* Node TCP Sockets
* ESC/POS raw commands

---

## Getting Started

### 1. Install

```bash
npm install
```

### 2. Setup Environment

Copy environment file:

```bash
cp .env.example .env.local
```

Set your site URL so metadata, sitemap, and robots are correct.

---

### 3. Run Development Server

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

## Printer Support

There are two modes:

---

### Static Mode (No Printer Support)

```bash
npm run build
```

This generates a fully static export in `/out`.

In this mode:

* The 3D demo works
* Measurement works
* The Print button is disabled

Good for:

* GitHub Pages
* Cloudflare Pages
* Static hosting

---

### Server Mode (Printer Enabled)

To enable real thermal printer output:

1. Replace:

```
src/app/actions.ts
```

With:

```
src/app/actions.server.ts
```

2. Remove:

```ts
output: "export"
```

From `next.config.ts`

3. Build and start:

```bash
npm run build
npm run start
```

Now the app can send raw ESC/POS commands to your network printer.

---

## Social Images

Generate Open Graph images:

```bash
npm run generate:og
```

Uses `public/logo.jpg` as base.

---

## SEO and AI Discoverability

This project includes proper metadata, Open Graph tags, Twitter cards, dynamic OG image generation, sitemap.xml, and robots.txt.

---

## Why This Exists

Because combining WebGL, physics, geometry math, and real hardware printing into a toilet paper simulator is objectively unnecessary. And therefore necessary.

---

## Commit Convention

This project follows Conventional Commits.

Format:

```
<type>(<scope>): <description>
```

Example:

```bash
feat: add toilet paper roll animation
fix: correct paper texture rendering
feat(printer)!: change escpos command structure
```

---

## Deployment

### Static Hosting

Upload the `/out` folder to GitHub Pages, Cloudflare Pages, or any static host.

### Vercel

Works out of the box with default Next.js settings.

---

## Author

**Sander de Snaijer** -- Frontend Developer

* [Portfolio](https://www.sanderdesnaijer.com/)
* [This project on sanderdesnaijer.com](https://www.sanderdesnaijer.com/projects/3d-toilet-paper-roll-simulator-with-real-thermal-printing)
* [GitHub](https://github.com/sanderdesnaijer)
* [X / Twitter](https://x.com/sanderdesnaijer)
* [LinkedIn](https://www.linkedin.com/in/sanderdesnaijer)

---

## License

MIT — do whatever you want, just don’t blame me if you print too much paper.
