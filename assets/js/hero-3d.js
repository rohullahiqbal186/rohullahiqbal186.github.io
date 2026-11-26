// Interactive version of the hero illustration. Loaded only by main.js,
// only when motion is allowed and the device looks capable.
// Plain WebGL 1, no libraries. Draws on demand: nothing animates unless
// the pointer moves, and it settles back when the pointer leaves.

import { buildScene, VIEW, perspective, viewMatrix, multiply } from "./hero-geometry.js";

const VERT = `
attribute vec3 a_pos;
attribute float a_w;
uniform mat4 u_mvp;
uniform float u_px;
uniform float u_min;
varying float v_w;
void main() {
  vec4 p = u_mvp * vec4(a_pos, 1.0);
  gl_Position = p;
  gl_PointSize = max(u_min, (1.4 + a_w * 3.6) * u_px * (${VIEW.distance.toFixed(2)} / p.w));
  v_w = a_w;
}`;

const FRAG = `
precision mediump float;
varying float v_w;
uniform vec4 u_line;
uniform float u_isLine;
void main() {
  if (u_isLine > 0.5) { gl_FragColor = vec4(u_line.rgb * u_line.a, u_line.a); return; }
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d);
  if (r > 0.25) discard;
  float edge = smoothstep(0.25, 0.16, r);
  vec3 slate = vec3(0.24, 0.29, 0.35);
  vec3 blue = vec3(0.165, 0.333, 0.627);
  float k = smoothstep(0.25, 0.75, v_w);
  vec3 col = mix(slate, blue, k);
  float a = (0.28 + 0.72 * v_w) * edge;
  gl_FragColor = vec4(col * a, a);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

export function mount(figure) {
  const stage = figure.querySelector(".hero-figure__stage");
  if (!stage) return null;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "low-power" });
  if (!gl) return null; // keep the static image

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const scene = buildScene();
  const loc = {
    pos: gl.getAttribLocation(prog, "a_pos"),
    w: gl.getAttribLocation(prog, "a_w"),
    mvp: gl.getUniformLocation(prog, "u_mvp"),
    px: gl.getUniformLocation(prog, "u_px"),
    min: gl.getUniformLocation(prog, "u_min"),
    line: gl.getUniformLocation(prog, "u_line"),
    isLine: gl.getUniformLocation(prog, "u_isLine"),
  };

  function buffer(arr) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
    return b;
  }
  const pointBuf = buffer(scene.points.flat());
  const traceBuf = buffer(scene.trace.flatMap((p) => [...p, 1]));
  const frameBuf = buffer(scene.frames.flatMap((q) => q.flatMap((p) => [...p, 0])));

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const state = { yaw: VIEW.yaw, pitch: VIEW.pitch, ty: VIEW.yaw, tp: VIEW.pitch, raf: 0, dpr: 1 };

  function bind(buf) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(loc.pos);
    gl.vertexAttribPointer(loc.pos, 3, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(loc.w);
    gl.vertexAttribPointer(loc.w, 1, gl.FLOAT, false, 16, 12);
  }

  function draw() {
    const w = canvas.width, h = canvas.height;
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const mvp = multiply(perspective(VIEW.fov, w / h, 0.1, 20), viewMatrix(state.yaw, state.pitch, VIEW.distance));
    gl.uniformMatrix4fv(loc.mvp, false, new Float32Array(mvp));
    // same on-screen size as the static SVG: 1.2 units per 1000px of width
    gl.uniform1f(loc.px, state.dpr * 1.2 * (canvas.clientWidth / 1000));
    gl.uniform1f(loc.min, 1.3 * state.dpr);

    gl.uniform1f(loc.isLine, 1);
    gl.uniform4f(loc.line, 0.45, 0.51, 0.58, 0.45);
    bind(frameBuf);
    for (let f = 0; f < scene.frames.length; f++) gl.drawArrays(gl.LINE_LOOP, f * 4, 4);

    gl.uniform1f(loc.isLine, 0);
    bind(pointBuf);
    gl.drawArrays(gl.POINTS, 0, scene.points.length);

    gl.uniform1f(loc.isLine, 1);
    gl.uniform4f(loc.line, 0.165, 0.333, 0.627, 1);
    bind(traceBuf);
    gl.drawArrays(gl.LINE_STRIP, 0, scene.trace.length);
  }

  function step() {
    state.yaw += (state.ty - state.yaw) * 0.09;
    state.pitch += (state.tp - state.pitch) * 0.09;
    draw();
    if (Math.abs(state.ty - state.yaw) + Math.abs(state.tp - state.pitch) > 1e-4) {
      state.raf = requestAnimationFrame(step);
    } else {
      state.raf = 0;
    }
  }
  function wake() { if (!state.raf) state.raf = requestAnimationFrame(step); }

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = stage.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * state.dpr));
    canvas.height = Math.max(1, Math.round(r.height * state.dpr));
    draw();
  }

  // Pointer tilt: mouse and pen only, so touch scrolling is never captured.
  const area = figure.closest("[data-hero-area]") || figure;
  function onMove(e) {
    if (e.pointerType === "touch") return;
    const r = stage.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    state.ty = VIEW.yaw + nx * VIEW.tiltYaw;
    state.tp = VIEW.pitch + ny * VIEW.tiltPitch;
    wake();
  }
  function onLeave() { state.ty = VIEW.yaw; state.tp = VIEW.pitch; wake(); }
  area.addEventListener("pointermove", onMove);
  area.addEventListener("pointerleave", onLeave);

  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  function destroy() {
    area.removeEventListener("pointermove", onMove);
    area.removeEventListener("pointerleave", onLeave);
    ro.disconnect();
    if (state.raf) cancelAnimationFrame(state.raf);
    figure.classList.remove("is-live");
    canvas.remove();
  }
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); destroy(); });

  stage.appendChild(canvas);
  resize();
  figure.classList.add("is-live");
  return { destroy };
}
