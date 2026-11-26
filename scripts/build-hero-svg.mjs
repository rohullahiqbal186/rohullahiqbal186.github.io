// Builds assets/img/hero-frames.svg, the static version of the hero
// illustration, from the same geometry as the WebGL scene.
// Run: node scripts/build-hero-svg.mjs   (only needed if you change the geometry)

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildScene, VIEW, perspective, viewMatrix, multiply, project } from "../assets/js/hero-geometry.js";

const W = 1000, H = 800;
const m = multiply(perspective(VIEW.fov, W / H, 0.1, 20), viewMatrix(VIEW.yaw, VIEW.pitch, VIEW.distance));
const { points, trace, frames } = buildScene();

const toScreen = (p) => {
  const [x, y, w] = project(m, p);
  return [((x + 1) / 2) * W, ((1 - y) / 2) * H, w];
};
const f1 = (n) => n.toFixed(1);

const out = [];
out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">`);
out.push(`<title id="t">Illustration: a stack of six synthetic video frames</title>`);
out.push(`<desc id="d">Six frames drawn as grids of dots, stacked in depth. A bright patch moves across the frames and a blue line traces its path through time. Synthetic data for illustration only.</desc>`);
out.push(`<rect width="${W}" height="${H}" fill="#e9eef2"/>`);

// frame outlines
for (const q of frames) {
  const s = q.map(toScreen);
  out.push(`<polygon points="${s.map((p) => f1(p[0]) + "," + f1(p[1])).join(" ")}" fill="none" stroke="#74828f" stroke-opacity="0.45" stroke-width="1.2"/>`);
}

// points: drop faint background points on a checker pattern to keep the file small
const drawn = [];
points.forEach((p) => {
  const [x, y, w] = toScreen(p);
  const r = ((1.4 + p[3] * 3.6) * 1.2 * (VIEW.distance / w)) / 2;
  drawn.push({ x, y, w, r, v: p[3] });
});
drawn.sort((a, b) => b.w - a.w);
// group by colour and opacity bucket so each circle carries only geometry
const groups = new Map();
for (const d of drawn) {
  const blue = d.v > 0.45;
  const a = (Math.round((0.28 + 0.72 * d.v) * 10) / 10).toFixed(1);
  const key = (blue ? "#2a55a0" : "#3d4a59") + "|" + a;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(`<circle cx="${f1(d.x)}" cy="${f1(d.y)}" r="${d.r.toFixed(1)}"/>`);
}
for (const [key, list] of groups) {
  const [fill, a] = key.split("|");
  out.push(`<g fill="${fill}" fill-opacity="${a}">${list.join("")}</g>`);
}

// trace
const t = trace.map(toScreen);
out.push(`<polyline points="${t.map((p) => f1(p[0]) + "," + f1(p[1])).join(" ")}" fill="none" stroke="#2a55a0" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`);
out.push(`</svg>`);

const target = fileURLToPath(new URL("../assets/img/hero-frames.svg", import.meta.url));
writeFileSync(target, out.join("\n") + "\n");
console.log(`wrote ${target} (${drawn.length} points)`);
