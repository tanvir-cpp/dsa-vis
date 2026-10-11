# WASM (optional acceleration)

TS fallback generators remain the default. WASM is a progressive enhancement.

## Build pkg

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
wasm-pack build dsa-core --target web --out-dir app/src/pkg
```

`app/src/pkg/` is gitignored / generated. When absent, `loadWasm()` returns
`null` and all pages transparently use TS.

## Adopt in a page (optional)

```tsx
const { steps, source } = useWasmSteps('bubble-10-42', () => bubbleTs(10, 42), 'bubble_sort_steps_js', 10, 42);
```

- `key` must encode fn + args. `fallback` is sync TS steps. `wasmFn` is the
  `*_js` export name; `wasmArgs` are passed through (edges as JS arrays).
- `source` is `'wasm' | 'ts'` for badge/debug. Never blocks render.

## Deploy

`.github/workflows/deploy.yml` builds pkg with `continue-on-error: true`,
so Pages deploys even before `dsa-core` WASM lands. No top-level static
`import '../pkg/...'` — only dynamic `import(/* @vite-ignore */ ...)` + 
`// @ts-ignore`, so `tsc --noEmit` passes with or without `pkg/`.
