// Progressive enhancement only. Every page works without this file.
// Decides whether the hero gets the interactive WebGL version; otherwise
// the static SVG that is already in the HTML stays in place.

(function () {
  var figure = document.querySelector("[data-hero]");
  if (!figure || !("noModule" in HTMLScriptElement.prototype)) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var nav = navigator;
  var lowPower =
    (nav.connection && nav.connection.saveData) ||
    (nav.deviceMemory && nav.deviceMemory < 4) ||
    (nav.hardwareConcurrency && nav.hardwareConcurrency < 4);

  var hint = figure.querySelector("[data-hero-hint]");
  var live = null;

  function start() {
    if (live || reduce.matches || lowPower) return;
    import("./hero-3d.js")
      .then(function (m) {
        if (reduce.matches) return;
        live = m.mount(figure);
        if (live && hint && window.matchMedia("(pointer: fine)").matches) hint.hidden = false;
      })
      .catch(function () { /* static image stays */ });
  }

  function stop() {
    if (live) { live.destroy(); live = null; }
    if (hint) hint.hidden = true;
  }

  if (reduce.addEventListener) {
    reduce.addEventListener("change", function () { reduce.matches ? stop() : start(); });
  }

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(start, { timeout: 1500 });
  } else {
    window.setTimeout(start, 600);
  }
})();
