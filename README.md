# Pretty Lies

A dreamy, bittersweet little website with glossy 3D artwork, an interactive Three.js heart, and nine original quotes about pretty lies and honest feelings.

**Live:** https://xrishis.github.io/pretty-lies/

## Run locally

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The site uses `/pretty-lies/` as its base path.

## Check and build

```sh
npm test
npm run build
npm run preview
```

The site is static. Favorites stay in the visitor's browser. All fonts and artwork are served locally. The heart supports dragging, tapping, keyboard activation, reduced motion, pausing, and a fallback when WebGL is unavailable.

## Publish

Pushing to `main` runs the tests and build, then deploys `dist` to GitHub Pages through `.github/workflows/deploy.yml`. The repository's Pages source is GitHub Actions.

Original quote text and generated artwork were created for this website. Lora and DM Sans are distributed under the SIL Open Font License; their license texts are included in `public/assets/`.
