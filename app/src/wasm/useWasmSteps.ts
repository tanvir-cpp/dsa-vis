import { useEffect, useMemo, useState } from 'react';
import { wasmSteps } from './loader';

export interface UseWasmStepsResult<T> {
  steps: T[];
  source: 'wasm' | 'ts';
  error: string | null;
}

// Tries WASM async once per key; returns TS fallback until WASM resolves.
// key must encode fn + args identity (e.g. `bubble-10-42`).
export function useWasmSteps<T>(
  key: string,
  fallback: () => T[],
  wasmFn?: string,
  ...wasmArgs: unknown[]
): UseWasmStepsResult<T> {
  const fallbackSteps = useMemo(() => fallback(), [key]);
  const [wasmData, setWasmData] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wasmFn) return;
    let alive = true;
    setWasmData(null);
    setError(null);
    wasmSteps(wasmFn, ...wasmArgs)
      .then((res) => {
        if (!alive) return;
        if (res) setWasmData(res as T[]);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (wasmData) return { steps: wasmData, source: 'wasm', error };
  return { steps: fallbackSteps, source: 'ts', error };
}
