# Codex AI proxy

A Cloudflare Worker that exists only to add CORS headers so the static codex
app can call an OpenAI-compatible provider from the browser with the user's own
key. It stores nothing and holds no secret.

## Contract

```
POST <worker>/ai/<provider>/<upstream path>
x-provider-key: <the user's provider key>
```

The provider id is looked up in the `PROVIDERS` table in `src/worker.js`; no
caller-supplied host ever reaches `fetch`. Streaming responses pass through
unchanged.

## Deploy

```
cd worker
npx wrangler deploy
```

Copy the printed `*.workers.dev` URL into the app's Settings sheet, or set
`VITE_WORKER_BASE` before `npm run build` to bake it in as the default.

## Adding a provider

One line in `PROVIDERS` here, one entry in `src/ai/providers.ts` in the app.
