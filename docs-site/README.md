# PLOROPSIS Docs Site

Source for the PLOROPSIS documentation site, built with [MkDocs](https://www.mkdocs.org/) and the [Material theme](https://squidfunk.github.io/mkdocs-material/).

## Where this goes in the repo

Drop this whole `docs-site/` folder into the root of `integrated-polar-expedition-logistic`, next to `README.md`.

## Local preview

```bash
pip install mkdocs-material
cd docs-site
mkdocs serve
```

Open `http://127.0.0.1:8000`.

## Editing content

All pages live under `docs-site/docs/`, as plain Markdown. Nav order and site settings are in `docs-site/mkdocs.yml`.

- `docs/assets/logo.png` — swap this for your finished PLOROPSIS logo when it's ready.
- `docs/assets/snun.png` — the Snun mascot is not currently used anywhere in this docs site (it's scoped to the interactive HTML dashboard). It's included here in case you want it for a landing page or "About" section later.

## Publishing to GitHub Pages

A workflow is already set up at `.github/workflows/deploy-docs.yml`. Once this folder is pushed to the `main` branch of the GitHub repo, it will automatically build and publish to:

```
https://S-gupt3.github.io/integrated-polar-expedition-logistic/
```

The first run will create a `gh-pages` branch. After that, go to **Settings → Pages** in the repo and confirm the source is set to the `gh-pages` branch (it's usually auto-detected).

To deploy manually instead:

```bash
cd docs-site
mkdocs gh-deploy --force
```
