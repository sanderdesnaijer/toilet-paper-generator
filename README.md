Absolutely.
Here is the full cleaned README as plain text you can copy directly into `README.md`.

---

# 🧻 3D Toilet Roll Generator

### Three.js Physics Demo with Real Thermal Printer Output

An interactive **3D toilet paper roll simulator** built with **Next.js, Three.js, and Rapier physics**.

Drag the roll in your browser.
Measure the paper in real centimeters.
Print the exact result to a real ESC/POS thermal printer.

Live demo:
👉 [https://unroll.metsander.com](https://unroll.metsander.com)

---

## 🚀 What This Project Does

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

### 1️⃣ 3D Roll Rendering

* Built with Three.js via React Three Fiber
* Dynamic cylinder geometry updates as paper unrolls
* Realistic paper tail with physics constraints

### 2️⃣ Physics Simulation

* Powered by Rapier physics
* Inertia while dragging
* Paper interacts with the ground plane

### 3️⃣ Measurement Logic

* Converts unrolled arc length to real-world centimeters
* Roll radius updates dynamically
* Tracks remaining paper accurately

### 4️⃣ Thermal Printer Integration

* Sends raw ESC/POS byte commands
* Communicates via Node TCP socket
* Works with most Ethernet thermal printers

---

## 🛠 Tech Stack

* Next.js 16
* React 19
* Three.js
* React Three Fiber
* Rapier Physics
* Tailwind CSS
* Node TCP Sockets
* ESC/POS raw commands

---

## 📦 Getting Started

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

## 🖨 Printer Support

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

## 📸 Social Images

Generate Open Graph images:

```bash
npm run generate:og
```

Uses `public/logo.jpg` as base.

---

## 🌍 SEO & AI Discoverability

This project includes:

* Proper metadata
* Open Graph tags
* Twitter cards
* Dynamic OG image generation
* Sitemap.xml
* Robots.txt

Target keywords:

* Three.js physics demo
* WebGL printer integration
* ESC/POS Node example
* Thermal printer from browser
* React Three Fiber physics
* Interactive 3D demo with hardware

---

## 🎯 Why This Exists

Because combining:

* WebGL
* Physics
* Geometry math
* Real hardware printing

into a toilet paper simulator
is objectively unnecessary.

And therefore necessary.

---

## 📜 Commit Convention

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

## 🚀 Deployment

### Static Hosting

Upload the `/out` folder to:

* GitHub Pages
* Cloudflare Pages
* Any FTP host

---

### Vercel

Works out of the box with default Next.js settings.

---

## 📄 License

MIT — do whatever you want, just don’t blame me if you print too much paper.
