// Geometry for the hero illustration, shared by the WebGL scene (hero-3d.js)
// and the static SVG fallback (scripts/build-hero-svg.mjs).
//
// What it shows: a short stack of video frames, each drawn as a grid of
// points. A soft bright blob moves across the frames and stands in for a
// hand gesture; a line traces it through time. This mirrors the thesis
// design (a CNN reads each frame, an LSTM reads the sequence).
// All values are synthetic. Nothing here comes from a real dataset.

export const FRAMES = 6;
export const COLS = 34;
export const ROWS = 22;
export const FRAME_W = 1.6;
export const FRAME_H = 1.04;
export const GAP = 0.46;

export const VIEW = {
  yaw: -0.62,      // radians, resting camera angle
  pitch: 0.2,
  distance: 4.7,
  fov: 0.62,       // vertical field of view, radians
  tiltYaw: 0.38,   // how far the pointer can turn it
  tiltPitch: 0.16,
};

function blobCentre(t) {
  // Normalised frame coordinates, -0.5 .. 0.5
  return {
    u: -0.3 + 0.58 * t,
    v: 0.16 - 0.26 * t + 0.1 * Math.sin(Math.PI * t),
  };
}

export function buildScene() {
  const points = [];   // [x, y, z, w] where w = intensity 0..1
  const trace = [];    // [x, y, z] blob centre per frame
  const frames = [];   // four corners per frame
  const aspect = FRAME_W / FRAME_H;
  const sigma = 0.1;

  for (let f = 0; f < FRAMES; f++) {
    const t = f / (FRAMES - 1);
    const z = (f - (FRAMES - 1) / 2) * GAP;
    const c = blobCentre(t);

    for (let r = 0; r < ROWS; r++) {
      for (let k = 0; k < COLS; k++) {
        const u = k / (COLS - 1) - 0.5;
        const v = r / (ROWS - 1) - 0.5;
        const du = (u - c.u) * aspect;
        const dv = v - c.v;
        const blob = Math.exp(-(du * du + dv * dv) / (2 * sigma * sigma));
        // faint fixed structure so each frame reads as an image, not noise
        const base = 0.13 + 0.06 * Math.cos(u * 5.0 + v * 2.0) + (v < -0.28 ? 0.07 : 0);
        const w = Math.min(1, base + blob);
        // keep the full grid only near the moving patch; elsewhere every other row and column
        if (w < 0.3 && (k % 2 === 1 || r % 2 === 1)) continue;
        points.push([u * FRAME_W, v * FRAME_H, z + blob * 0.07, w]);
      }
    }
    trace.push([c.u * FRAME_W, c.v * FRAME_H, z + 0.07]);
    const hw = FRAME_W / 2, hh = FRAME_H / 2;
    frames.push([[-hw, -hh, z], [hw, -hh, z], [hw, hh, z], [-hw, hh, z]]);
  }
  return { points, trace, frames };
}

// ---- small matrix helpers (column-major, WebGL convention) ----

export function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
}

export function multiply(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] =
        a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

export function viewMatrix(yaw, pitch, distance) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const ry = [cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1];
  const rx = [1, 0, 0, 0, 0, cp, sp, 0, 0, -sp, cp, 0, 0, 0, 0, 1];
  const tr = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -distance, 1];
  return multiply(tr, multiply(rx, ry));
}

export function project(m, p) {
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
  const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
  const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  return [x / w, y / w, w];
}
