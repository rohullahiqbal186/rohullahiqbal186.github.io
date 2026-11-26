# rohullahiqbal186.github.io

Personal research site of Rohullah Iqbal, published with GitHub Pages at
<https://rohullahiqbal186.github.io/>.

Plain static HTML and CSS. There is no build step: GitHub Pages serves the files as they are.

## Structure

```
index.html                     Home: research, selected projects, workshops, about, CV and contact
contact.html                   Contact page (URL kept from the previous site)
projects/bot2-scoring/         Case study: automatic scoring of BOT-2 drawing tasks
projects/avses/                Case study: bachelor's thesis (AVSES)
404.html                       Not-found page (uses root-relative paths on purpose)
assets/css/site.css            All styles
assets/js/main.js              Decides whether to load the 3D hero (progressive enhancement)
assets/js/hero-3d.js           WebGL hero scene, no libraries
assets/js/hero-geometry.js     Shared geometry for the WebGL scene and the static SVG
assets/img/                    Static hero SVG, project schematics, favicon, social card
assets/cv/                     Public CV (PDF)
scripts/                       Helpers for maintenance only; not needed to publish
```

## Preview locally

```
python3 -m http.server 8000
# open http://localhost:8000/
```

Use a local server rather than opening the files directly: the hero script is an ES module, and
browsers block modules on `file://` pages. Everything else still works without JavaScript.

## Maintenance helpers (optional, Node 18+)

```
node scripts/build-hero-svg.mjs   # regenerate assets/img/hero-frames.svg after changing hero-geometry.js
node scripts/check-site.mjs       # check that every internal link and asset path resolves
```

## Publishing

Settings > Pages > Build and deployment: Source "Deploy from a branch", branch `main`, folder `/ (root)`.
The `.nojekyll` file tells Pages to serve the files without running Jekyll.
