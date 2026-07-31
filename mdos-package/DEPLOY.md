# Deploy MDOS

This package is a self-contained, importable MDOS workspace.

## Quick Deploy (static web)

```bash
bun install
bun run build
# outputs ./dist — deploy to any static host
```

## Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

## Deploy to Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

## Import the workspace

Open MDOS and use **IMPORT** to load `mdos.workspace.json`. This restores the
full Momento seed (Constitution, Articles, ADRs, agents, skills, workflows).
