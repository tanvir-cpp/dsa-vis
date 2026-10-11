# DSA·vis — Data Structures & Algorithms, visualized

An interactive visual learning tool for essential DSA. Every algorithm runs as an
exact step-by-step trace: data state, comparisons, swaps, and the source line
behind each step — with playback controls, Python/C++ code tabs, complexity
tables, and self-check questions.

- **Live site:** https://tanvir-cpp.github.io/dsa-vis/
- **Repo:** https://github.com/tanvir-cpp/dsa-vis
  (slug is `dsa-vis` — GitHub repo names can't contain `·`; the UI brand is `DSA·vis`)

## Features

- **40+ visualizers** across sorting, searching, arrays, graphs, DP, strings,
  trees, tries, linked structures, and pathfinding (full list below).
- **Step traces, not animations** — each step is a deterministic data snapshot
  with a note explaining what happened.
- **Playback controls** — play/pause, step forward/back, scrubber, 0.5x–4x
  speed, shuffle (seeded RNG, so every run is reproducible).
- **Code tabs** — pseudocode, Python, and C++ side by side, line-synced to the
  current step. Language choice persists across pages.
- **Learning panels** — complexity table, key-idea bullets, and self-check
  Q&A on every page.
- **Clean, dense UI** — light + dark themes (system default, toggle persists),
  single accent color, flat fills, 1px borders, system + monospace type.
  Keyboard- and screen-reader-friendly labels on all visualizations.
- **Rust engine + TS fallback** — algorithm traces are implemented in Rust
  (`dsa-core`, compilable to WASM) and mirrored by deterministic TypeScript
  generators, so the app works fully without a WASM build.

## Curriculum

| Module | Topics | Routes |
|---|---|---|
| Sorting | Bubble, Selection, Insertion, Merge, Quick | `/sort/:id` |
| Searching | Linear, Binary | `/search/:id` |
| Arrays | Two Sum (sorted), Sliding Window, Prefix Sums, Kadane, Rotate, Dedup | `/arrays/:id` |
| Graphs | BFS, DFS, Dijkstra, Topo Sort (Kahn) | `/graph/:id` |
| DP | Knapsack, LCS, LIS, Coin Change | `/dp/:id` |
| Strings | KMP, Naive matching, Trie insert/search | `/string/:id`, `/trie/:id` |
| Trees | BST insert, Max-Heap build/extract | `/trees/:id` |
| Structures | BST/Union-Find, Linked List, Stack, Queue | `/structures`, `/linked/:id` |
| Pathfinding | BFS vs Greedy vs A* on grids | `/path/:id` |

Deep links use hash routing (e.g. `/#/sort/quick`), so any step context is
shareable as a URL.

## How it works

```
dsa-core/  Rust trace engine (sorting, graphs, dp, strings, structures,
           arrays, heap, trie, linked) → native tests + wasm-bindgen wrappers
app/       Vite + React 18 + TypeScript + React Router (HashRouter)
  src/content/   deterministic TS step generators (mirror the Rust traces)
  src/engine/    AlgoStep schema + usePlayback hook (single source of truth)
  src/components/viz/  SVG/Canvas visualizers (bars, graphs, trees, grids…)
  src/pages/     one page per module, same layout: viz → toolbar → inspector
  src/wasm/      optional WASM loader (uses TS traces until a pkg is built)
```

`AlgoStep` (`app/src/engine/types.ts`) is the contract both engines honor:
`{ array, compare, swap, sorted_from, line, note, comparisons, swaps }`.
Graph, DP, trie, and grid modules use their own analogous step shapes.

## Local development

Prerequisites: Rust (`rustup`), Node 20+.

```sh
# Rust engine: 85 tests
cd dsa-core && cargo test

# Web app
cd app && npm install && npm run dev      # dev server
npx tsc --noEmit                          # typecheck
npm run build && npm run preview          # production check

# Optional: build the WASM bundle (pages use it when present,
# otherwise they fall back to the TS generators automatically)
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
wasm-pack build dsa-core --target web --out-dir app/src/pkg
```

## Deployment

Static hosting on GitHub Pages via `.github/workflows/deploy.yml`
(push to `main` → build WASM → `npm ci`/`vite build` → `deploy-pages`).
Notes:

- `app/vite.config.ts` sets `base: '/dsa-vis/'` — it must match the repo slug.
- `HashRouter` is required: Pages serves no SPA fallback, so all routes live
  after `#/`.
- To enable Pages on a fresh fork: repo Settings → Pages → Source: GitHub
  Actions (or `gh api repos/{owner}/{repo}/pages -X POST -f build_type=workflow`).

## Roadmap / known gaps

- Graph coverage: Kruskal, Prim, Bellman-Ford.
- WASM adoption inside pages (loader exists at `app/src/wasm/`; traces currently TS-first).
- Keyboard shortcuts (space / ← / →), full a11y + Lighthouse pass.
- Shareable seed URLs (seed is currently local state).
