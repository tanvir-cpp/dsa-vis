# DSA·vis — visual learning tool

Stack: Rust (`dsa-core`, deterministic traces → WASM) + React + TypeScript + Vite. Static deploy to GitHub Pages.

## Dev

```sh
cargo test -p dsa-core            # Rust traces / PRNG
cd app && npm ci && npm run dev   # Vite dev server
wasm-pack build dsa-core --target web --out-dir app/src/pkg  # WASM bundle (pre-wired TS fallback works without it)
cd app && npm run build && npm run preview                    # production check
```

## Pages base path

`app/vite.config.ts` sets `base: '/dsa-vis/'` for the repo subpath. `HashRouter` is used so deep links (`#/sort/bubble`) work without a SPA fallback.

## Roadmap

- P1: wire WASM traces into `SortingPage`, route `/sort/:id` + `/search/:id`, playback polish.
- P2: structures (stack/queue/linked list), graph (BFS/DFS), more self-checks.
- P3: DP tables, shareable seeds/URLs, a11y + perf pass.
