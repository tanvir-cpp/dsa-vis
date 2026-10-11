// Array-pattern step generators + curriculum content.
//
// Mirrors the shell-owned contracts:
//   - AlgoStep shape in app/src/engine/types.ts (snake_case, exact fields)
//   - Deterministic LCG in app/src/content/algorithms.ts (Knuth MMIX:
//     A=6364136223846793005, C=1, mod 2^64)
//   - Line maps documented below (1-indexed into ARRAY_ALGOS[id].pseudocode)
//
// Line maps (all 1..5):
//   - twosum:  1 init, 2 loop, 3 compare sum, 4 move, 5 done
//   - sliding: 1 first window, 2 slide, 3 compare-best, 4 record, 5 done
//   - prefix:  1 init, 2 loop, 3 add, 4 fill, 5 done
//   - kadane:  1 init, 2 loop, 3 extend-vs-restart, 4 update-best, 5 done
//   - rotate:  1 reverse-all, 2 reverse-first-k, 3 reverse-rest, 4 mid-note, 5 done
//   - dedup:   1 init, 2 scan, 3 compare-dup, 4 write/skip, 5 done
import type { AlgoStep } from '../engine/types';
import type { AlgoMeta } from './algorithms';

// ---------------------------------------------------------------------------
// Deterministic LCG (matches dsa-core/src/prng.rs exactly)
// ---------------------------------------------------------------------------
const U64_MASK = (1n << 64n) - 1n;
const LCG_A = 6364136223846793005n;
const LCG_C = 1n;

export class Lcg {
  private state: bigint;

  constructor(seed: number | bigint) {
    this.state = BigInt(seed) & U64_MASK;
  }

  /** Advance state and return raw u64. */
  next(): bigint {
    this.state = (this.state * LCG_A + LCG_C) & U64_MASK;
    return this.state;
  }

  /** Inclusive range [lo, hi], mirroring `Lcg::gen_range`. */
  genRange(lo: number, hi: number): number {
    if (lo > hi) throw new Error('genRange: lo must be <= hi');
    const span = BigInt(hi - lo + 1);
    return lo + Number(this.next() % span);
  }

  stateValue(): bigint {
    return this.state;
  }
}

function clampSize(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.floor(n)));
}

function randomArray(n: number, seed: number, lo = 5, hi = 40): { arr: number[]; rng: Lcg } {
  const size = clampSize(n);
  const rng = new Lcg(seed);
  const arr: number[] = [];
  for (let k = 0; k < size; k++) arr.push(rng.genRange(lo, hi));
  return { arr, rng };
}

/** Hard cap shared by every generator below. */
const MAX_STEPS = 10000;

function capped(steps: AlgoStep[], s: AlgoStep): void {
  if (steps.length < MAX_STEPS) steps.push(s);
}

// ---------------------------------------------------------------------------
// Two Sum (sorted input) — line map:
// 1 init, 2 loop, 3 compare sum, 4 move, 5 done
// ---------------------------------------------------------------------------
export function twoSumSteps(n: number, seed: number, target?: number): AlgoStep[] {
  const size = clampSize(n);
  const steps: AlgoStep[] = [];
  if (size <= 1) {
    const { arr } = randomArray(size, seed);
    const a = [...arr].sort((x, y) => x - y);
    capped(steps, {
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: 0,
      line: 1,
      note: `Two-sum init — n=${size}, need at least 2 elements`,
      comparisons: 0,
      swaps: 0,
    });
    capped(steps, {
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: 0,
      line: 5,
      note: 'Done — need at least 2 elements',
      comparisons: 0,
      swaps: 0,
    });
    return steps;
  }
  const { arr: unsorted, rng } = randomArray(size, seed);
  const a = [...unsorted].sort((x, y) => x - y);
  const ia = Number(rng.next() % BigInt(size));
  let ib = Number(rng.next() % BigInt(size));
  if (ib === ia) ib = (ib + 1) % size;
  const t = target ?? a[ia] + a[ib];
  let comparisons = 0;

  capped(steps, {
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: null,
    line: 1,
    note: `Two-sum target=${t} — sorted n=${size}, l=0, r=${size - 1}`,
    comparisons,
    swaps: 0,
  });
  let l = 0;
  let r = size - 1;
  while (l < r && steps.length < MAX_STEPS) {
    capped(steps, {
      array: [...a],
      compare: [l, r],
      swap: null,
      sorted_from: null,
      line: 2,
      note: `Loop l=${l}, r=${r}`,
      comparisons,
      swaps: 0,
    });
    comparisons += 1;
    const s = a[l] + a[r];
    capped(steps, {
      array: [...a],
      compare: [l, r],
      swap: null,
      sorted_from: null,
      line: 3,
      note: `Sum a[${l}]+a[${r}]=${a[l]}+${a[r]}=${s} vs ${t}`,
      comparisons,
      swaps: 0,
    });
    if (s === t) {
      capped(steps, {
        array: [...a],
        compare: [l, r],
        swap: null,
        sorted_from: null,
        line: 5,
        note: `Found ${a[l]}+${a[r]}=${t} at [${l},${r}] after ${comparisons} comparisons`,
        comparisons,
        swaps: 0,
      });
      return steps;
    }
    if (s < t) {
      capped(steps, {
        array: [...a],
        compare: [l, r],
        swap: null,
        sorted_from: null,
        line: 4,
        note: `${s} < ${t} — l=${l + 1}`,
        comparisons,
        swaps: 0,
      });
      l += 1;
    } else {
      capped(steps, {
        array: [...a],
        compare: [l, r],
        swap: null,
        sorted_from: null,
        line: 4,
        note: `${s} > ${t} — r=${r - 1}`,
        comparisons,
        swaps: 0,
      });
      r -= 1;
    }
  }
  capped(steps, {
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: null,
    line: 5,
    note: `Done — no pair sums to ${t} after ${comparisons} comparisons`,
    comparisons,
    swaps: 0,
  });
  return steps;
}

// ---------------------------------------------------------------------------
// Sliding Window Max Sum — line map:
// 1 first window, 2 slide, 3 compare-best, 4 record, 5 done
// ---------------------------------------------------------------------------
export function slidingSteps(n: number, seed: number, k = 3): AlgoStep[] {
  const size = clampSize(n);
  const steps: AlgoStep[] = [];
  if (size <= 0) {
    capped(steps, {
      array: [],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 5,
      note: 'Done — empty array, no window',
      comparisons: 0,
      swaps: 0,
    });
    return steps;
  }
  let kk = Math.floor(k);
  if (!Number.isFinite(kk)) kk = 3;
  kk = Math.max(1, Math.min(size, kk));
  const { arr: a } = randomArray(size, seed);
  let comparisons = 0;

  let windowSum = 0;
  for (let j = 0; j < kk; j++) windowSum += a[j];
  let best = windowSum;
  let bestStart = 0;
  capped(steps, {
    array: [...a],
    compare: [0, kk - 1],
    swap: null,
    sorted_from: null,
    line: 1,
    note: `First window [0..${kk - 1}] sum=${windowSum}, k=${kk}`,
    comparisons,
    swaps: 0,
  });
  if (size <= kk) {
    capped(steps, {
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 5,
      note: `Done — max sum ${best} window [0..${kk - 1}]`,
      comparisons,
      swaps: 0,
    });
    return steps;
  }
  for (let i = 1; i <= size - kk && steps.length < MAX_STEPS; i++) {
    windowSum += a[i + kk - 1] - a[i - 1];
    capped(steps, {
      array: [...a],
      compare: [i, i + kk - 1],
      swap: null,
      sorted_from: null,
      line: 2,
      note: `Slide to [${i}..${i + kk - 1}] sum=${windowSum}`,
      comparisons,
      swaps: 0,
    });
    comparisons += 1;
    capped(steps, {
      array: [...a],
      compare: [i, i + kk - 1],
      swap: null,
      sorted_from: null,
      line: 3,
      note: `Compare sum ${windowSum} vs best ${best}`,
      comparisons,
      swaps: 0,
    });
    if (windowSum > best) {
      best = windowSum;
      bestStart = i;
      capped(steps, {
        array: [...a],
        compare: [i, i + kk - 1],
        swap: null,
        sorted_from: null,
        line: 4,
        note: `New best ${best} at [${i}..${i + kk - 1}]`,
        comparisons,
        swaps: 0,
      });
    } else {
      capped(steps, {
        array: [...a],
        compare: [i, i + kk - 1],
        swap: null,
        sorted_from: null,
        line: 4,
        note: `Keep best ${best}`,
        comparisons,
        swaps: 0,
      });
    }
  }
  capped(steps, {
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: null,
    line: 5,
    note: `Done — max sum ${best} window [${bestStart}..${bestStart + kk - 1}]`,
    comparisons,
    swaps: 0,
  });
  return steps;
}

// ---------------------------------------------------------------------------
// Prefix Sums — line map: 1 init, 2 loop, 3 add, 4 fill, 5 done
// Visualized array is the prefix array itself, filled from zeros;
// sorted_from stays null mid-trace (compare outline carries meaning),
// Some(0) at done so the finished prefix glows.
// ---------------------------------------------------------------------------
export function prefixSteps(n: number, seed: number): AlgoStep[] {
  const size = clampSize(n);
  const steps: AlgoStep[] = [];
  if (size <= 0) {
    capped(steps, {
      array: [],
      compare: null,
      swap: null,
      sorted_from: 0,
      line: 1,
      note: 'Prefix init — empty array',
      comparisons: 0,
      swaps: 0,
    });
    capped(steps, {
      array: [],
      compare: null,
      swap: null,
      sorted_from: 0,
      line: 5,
      note: 'Done — empty prefix',
      comparisons: 0,
      swaps: 0,
    });
    return steps;
  }
  const { arr: a } = randomArray(size, seed);
  const pref = new Array<number>(size).fill(0);
  let comparisons = 0;
  let swaps = 0;

  capped(steps, {
    array: [...pref],
    compare: null,
    swap: null,
    sorted_from: null,
    line: 1,
    note: `Prefix init — n=${size}, a=[${a.join(',')}]`,
    comparisons,
    swaps,
  });
  for (let i = 0; i < size && steps.length < MAX_STEPS; i++) {
    capped(steps, {
      array: [...pref],
      compare: [i, i],
      swap: null,
      sorted_from: null,
      line: 2,
      note: `Loop i=${i} (a[${i}]=${a[i]})`,
      comparisons,
      swaps,
    });
    comparisons += 1;
    const val = i === 0 ? a[0] : pref[i - 1] + a[i];
    capped(steps, {
      array: [...pref],
      compare: [i, i],
      swap: null,
      sorted_from: null,
      line: 3,
      note: i === 0 ? `pref[0]=a[0]=${val}` : `pref[${i}]=pref[${i - 1}]+a[${i}]=${val}`,
      comparisons,
      swaps,
    });
    pref[i] = val;
    swaps += 1;
    capped(steps, {
      array: [...pref],
      compare: [i, i],
      swap: null,
      sorted_from: null,
      line: 4,
      note: `Fill pref[${i}]=${val}`,
      comparisons,
      swaps,
    });
  }
  capped(steps, {
    array: [...pref],
    compare: null,
    swap: null,
    sorted_from: 0,
    line: 5,
    note: `Done — prefix [${pref.join(',')}]`,
    comparisons,
    swaps,
  });
  return steps;
}

// ---------------------------------------------------------------------------
// Kadane's Max Subarray — line map:
// 1 init, 2 loop, 3 extend-vs-restart, 4 update-best, 5 done
// ---------------------------------------------------------------------------
export function kadaneSteps(n: number, seed: number): AlgoStep[] {
  const size = clampSize(n);
  const steps: AlgoStep[] = [];
  if (size <= 0) {
    capped(steps, {
      array: [],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 1,
      note: 'Kadane init — empty array',
      comparisons: 0,
      swaps: 0,
    });
    capped(steps, {
      array: [],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 5,
      note: 'Done — empty array, best 0',
      comparisons: 0,
      swaps: 0,
    });
    return steps;
  }
  const { arr: a } = randomArray(size, seed, -20, 50);
  let comparisons = 0;
  let cur = a[0];
  let best = a[0];

  capped(steps, {
    array: [...a],
    compare: [0, 0],
    swap: null,
    sorted_from: null,
    line: 1,
    note: `Init cur=${cur}, best=${best} (a[0]=${a[0]})`,
    comparisons,
    swaps: 0,
  });
  for (let i = 1; i < size && steps.length < MAX_STEPS; i++) {
    capped(steps, {
      array: [...a],
      compare: [i, i],
      swap: null,
      sorted_from: null,
      line: 2,
      note: `Loop i=${i} (a[${i}]=${a[i]}), cur=${cur}, best=${best}`,
      comparisons,
      swaps: 0,
    });
    comparisons += 1;
    const extend = cur + a[i];
    if (a[i] > extend) {
      cur = a[i];
      capped(steps, {
        array: [...a],
        compare: [i, i],
        swap: null,
        sorted_from: null,
        line: 3,
        note: `Extend vs restart: max(${a[i]},${extend})=${cur} — restart, cur=${cur}`,
        comparisons,
        swaps: 0,
      });
    } else {
      cur = extend;
      capped(steps, {
        array: [...a],
        compare: [i, i],
        swap: null,
        sorted_from: null,
        line: 3,
        note: `Extend vs restart: max(${a[i]},${extend})=${cur} — extend, cur=${cur}`,
        comparisons,
        swaps: 0,
      });
    }
    if (cur > best) {
      best = cur;
      capped(steps, {
        array: [...a],
        compare: [i, i],
        swap: null,
        sorted_from: null,
        line: 4,
        note: `New best=${best} (ends ${i}), cur=${cur}`,
        comparisons,
        swaps: 0,
      });
    } else {
      capped(steps, {
        array: [...a],
        compare: [i, i],
        swap: null,
        sorted_from: null,
        line: 4,
        note: `Keep best=${best}, cur=${cur}`,
        comparisons,
        swaps: 0,
      });
    }
  }
  capped(steps, {
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: null,
    line: 5,
    note: `Done — max subarray sum=${best}`,
    comparisons,
    swaps: 0,
  });
  return steps;
}

// ---------------------------------------------------------------------------
// Rotate Array right by k (3-reversal) — line map:
// 1 reverse-all, 2 reverse-first-k, 3 reverse-rest, 4 mid-note, 5 done
// ---------------------------------------------------------------------------
export function rotateSteps(n: number, seed: number, k = 3): AlgoStep[] {
  const size = clampSize(n);
  const steps: AlgoStep[] = [];
  if (size <= 0) {
    capped(steps, {
      array: [],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 1,
      note: 'Rotate init — empty array',
      comparisons: 0,
      swaps: 0,
    });
    capped(steps, {
      array: [],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 5,
      note: 'Done — empty array',
      comparisons: 0,
      swaps: 0,
    });
    return steps;
  }
  const { arr: a } = randomArray(size, seed);
  let kk = Math.floor(k);
  if (!Number.isFinite(kk)) kk = 3;
  kk = ((kk % size) + size) % size;
  const comparisons = 0;
  let swaps = 0;

  capped(steps, {
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: null,
    line: 1,
    note: `Rotate right k=${kk} — n=${size}: reverse all`,
    comparisons,
    swaps,
  });
  for (let l = 0, r = size - 1; l < r && steps.length < MAX_STEPS; l++, r--) {
    const tmp = a[l];
    a[l] = a[r];
    a[r] = tmp;
    swaps += 1;
    capped(steps, {
      array: [...a],
      compare: null,
      swap: [l, r],
      sorted_from: null,
      line: 1,
      note: `Reverse-all swap ${l} <-> ${r}`,
      comparisons,
      swaps,
    });
  }
  capped(steps, {
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: null,
    line: 4,
    note: `Reversed all — now reverse first k=${kk}`,
    comparisons,
    swaps,
  });
  for (let l = 0, r = kk - 1; l < r && steps.length < MAX_STEPS; l++, r--) {
    const tmp = a[l];
    a[l] = a[r];
    a[r] = tmp;
    swaps += 1;
    capped(steps, {
      array: [...a],
      compare: null,
      swap: [l, r],
      sorted_from: null,
      line: 2,
      note: `Reverse first-k swap ${l} <-> ${r}`,
      comparisons,
      swaps,
    });
  }
  capped(steps, {
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: null,
    line: 4,
    note: `First-${kk} done — now reverse rest ${size - kk}`,
    comparisons,
    swaps,
  });
  for (let l = kk, r = size - 1; l < r && steps.length < MAX_STEPS; l++, r--) {
    const tmp = a[l];
    a[l] = a[r];
    a[r] = tmp;
    swaps += 1;
    capped(steps, {
      array: [...a],
      compare: null,
      swap: [l, r],
      sorted_from: null,
      line: 3,
      note: `Reverse rest swap ${l} <-> ${r}`,
      comparisons,
      swaps,
    });
  }
  capped(steps, {
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: null,
    line: 5,
    note: `Done — rotated right by k=${kk} in ${swaps} swaps`,
    comparisons,
    swaps,
  });
  return steps;
}

// ---------------------------------------------------------------------------
// Remove Duplicates (sorted input) — line map:
// 1 init, 2 scan, 3 compare-dup, 4 write/skip, 5 done
// ---------------------------------------------------------------------------
export function dedupSteps(n: number, seed: number): AlgoStep[] {
  const size = clampSize(n);
  const steps: AlgoStep[] = [];
  if (size <= 0) {
    capped(steps, {
      array: [],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 1,
      note: 'Dedup init — empty array',
      comparisons: 0,
      swaps: 0,
    });
    capped(steps, {
      array: [],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 5,
      note: 'Done — new length 0',
      comparisons: 0,
      swaps: 0,
    });
    return steps;
  }
  const { arr: unsorted } = randomArray(size, seed, 1, Math.max(1, Math.ceil(size / 2)));
  const a = [...unsorted].sort((x, y) => x - y);
  let comparisons = 0;
  let swaps = 0;

  capped(steps, {
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: null,
    line: 1,
    note: `Dedup init — sorted n=${size}, w=0`,
    comparisons,
    swaps,
  });
  if (size <= 1) {
    capped(steps, {
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 5,
      note: `Done — new length ${size}`,
      comparisons,
      swaps,
    });
    return steps;
  }
  let w = 0;
  for (let i = 1; i < size && steps.length < MAX_STEPS; i++) {
    capped(steps, {
      array: [...a],
      compare: [i, w],
      swap: null,
      sorted_from: null,
      line: 2,
      note: `Scan i=${i} (a[${i}]=${a[i]}), w=${w}`,
      comparisons,
      swaps,
    });
    comparisons += 1;
    const isDup = a[i] === a[w];
    capped(steps, {
      array: [...a],
      compare: [i, w],
      swap: null,
      sorted_from: null,
      line: 3,
      note: `Compare a[${i}]=${a[i]} vs a[${w}]=${a[w]} — ${isDup ? 'dup' : 'new'}`,
      comparisons,
      swaps,
    });
    if (!isDup) {
      w += 1;
      a[w] = a[i];
      swaps += 1;
      capped(steps, {
        array: [...a],
        compare: null,
        swap: [i, w],
        sorted_from: null,
        line: 4,
        note: `Write a[${w}]=${a[i]} (from i=${i})`,
        comparisons,
        swaps,
      });
    } else {
      capped(steps, {
        array: [...a],
        compare: [i, w],
        swap: null,
        sorted_from: null,
        line: 4,
        note: `Skip dup a[${i}]=${a[i]}`,
        comparisons,
        swaps,
      });
    }
  }
  capped(steps, {
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: null,
    line: 5,
    note: `Done — new length ${w + 1} after ${comparisons} compares, ${swaps} writes`,
    comparisons,
    swaps,
  });
  return steps;
}

export type ArrayId = 'twosum' | 'sliding' | 'prefix' | 'kadane' | 'rotate' | 'dedup';

/** On-demand dispatcher used by ArrayPage (param = target for twosum, k for sliding/rotate). */
export function stepsForArray(id: string, n: number, seed: number, param?: number): AlgoStep[] {
  switch (id) {
    case 'twosum':
      return twoSumSteps(n, seed, param);
    case 'sliding':
      return slidingSteps(n, seed, param ?? 3);
    case 'prefix':
      return prefixSteps(n, seed);
    case 'kadane':
      return kadaneSteps(n, seed);
    case 'rotate':
      return rotateSteps(n, seed, param ?? 3);
    case 'dedup':
      return dedupSteps(n, seed);
    default:
      return twoSumSteps(n, seed, param);
  }
}

/** Effective target/k for display when the user has not overridden it. */
export function arrayParam(id: string, n: number, seed: number): number | null {
  const size = clampSize(n);
  if (size <= 0) return null;
  switch (id) {
    case 'twosum': {
      if (size < 2) return null;
      const { arr: unsorted, rng } = randomArray(size, seed);
      const a = [...unsorted].sort((x, y) => x - y);
      const ia = Number(rng.next() % BigInt(size));
      let ib = Number(rng.next() % BigInt(size));
      if (ib === ia) ib = (ib + 1) % size;
      return a[ia] + a[ib];
    }
    case 'sliding':
    case 'rotate':
      return Math.max(1, Math.min(3, size));
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Curriculum content (each code array is exactly 5 single lines, 1:1 with
// the line map; every line is under 64 chars)
// ---------------------------------------------------------------------------
export const ARRAY_ALGOS: Record<ArrayId, AlgoMeta> = {
  twosum: {
    title: 'Two Sum (Sorted)',
    pseudocode: [
      'l=0, r=n-1 // 1 init',
      'while l<r: // 2 loop',
      's=a[l]+a[r]; if s==t return // 3 compare',
      'if s<t: l++ else r-- // 4 move',
      'done — no pair // 5 done',
    ],
    python: [
      'l, r = 0, n - 1  # init',
      'while l < r:  # loop',
      's = a[l] + a[r]  # compare',
      'l, r = (l+1, r) if s<t else (l, r-1)',
      '# done',
    ],
    cpp: [
      'int l = 0, r = n - 1; // init',
      'while (l < r) { // loop',
      'int s = a[l] + a[r]; // compare',
      'if (s < t) ++l; else --r; // move',
      '// done',
    ],
    complexity: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    bullets: [
      'Sorted input lets one pair of pointers squeeze from both ends.',
      'Each step discards one side: s<t drops l, s>t drops r.',
      'No extra space — the demo target is always a real pair sum.',
    ],
    checks: [
      { q: 'Why must the input be sorted?', a: 'Ordering tells us which side to discard: a small sum needs a bigger l, a big sum a smaller r.' },
      { q: 'Why is it O(n)?', a: 'Each step moves l or r once, so at most n-1 sum comparisons.' },
    ],
  },
  sliding: {
    title: 'Sliding Window Max Sum',
    pseudocode: [
      'sum=a[0..k-1], best=sum // 1 first window',
      'slide sum+=a[i+k-1]-a[i-1] // 2 slide',
      'if sum>best // 3 compare-best',
      'best=sum // 4 record',
      'done — best is max // 5 done',
    ],
    python: [
      'best = sum(a[:k])  # first',
      'for i in range(1, n-k+1):  # slide',
      'if s > best:  # compare',
      'best = s  # record',
      '# done',
    ],
    cpp: [
      'int best = window(a, k); // first',
      'for (int i = 1; i <= n-k; ++i) // slide',
      'if (s > best) // compare',
      'best = s; // record',
      '// done',
    ],
    complexity: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    bullets: [
      'Fixed window k slides in O(1) per step: add one, drop one.',
      'Compare each window against best — never recompute a sum.',
      'Needs k<=n; the window [i..i+k-1] is highlighted as [i,i+k-1].',
    ],
    checks: [
      { q: 'Why not recompute each window sum?', a: 'Recomputing costs O(k) per window for O(n·k); sliding reuses overlap for O(n).' },
      { q: 'What if k equals n?', a: 'One window only — the first sum is the answer, no slides.' },
    ],
  },
  prefix: {
    title: 'Prefix Sums',
    pseudocode: [
      'pref=zeros(n) // 1 init',
      'for i=0..n-1: // 2 loop',
      'v=pref[i-1]+a[i] // 3 add',
      'pref[i]=v // 4 fill',
      'done — pref built // 5 done',
    ],
    python: [
      'pref = [0] * n  # init',
      'for i in range(n):  # loop',
      'v = (pref[i-1] if i else 0) + a[i]  # add',
      'pref[i] = v  # fill',
      '# done',
    ],
    cpp: [
      'vector<int> pref(n, 0); // init',
      'for (int i = 0; i < n; ++i) // loop',
      'int v = (i ? pref[i-1] : 0) + a[i]; // add',
      'pref[i] = v; // fill',
      '// done',
    ],
    complexity: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(n)' },
    bullets: [
      'pref[i] answers sum(a[0..i]) in O(1) after one O(n) build.',
      'Range sum(l,r) = pref[r]-pref[l-1] — the payoff for the extra array.',
      'The bars show pref filling from zeros; i=0 has no pref[-1].',
    ],
    checks: [
      { q: 'Why O(n) extra space?', a: 'The output array holds one running total per index.' },
      { q: 'How is pref[0] defined?', a: 'pref[0]=a[0] — there is no previous total to add.' },
    ],
  },
  kadane: {
    title: "Kadane's Max Subarray",
    pseudocode: [
      'cur=best=a[0] // 1 init',
      'for i=1..n-1: // 2 loop',
      'cur=max(a[i], cur+a[i]) // 3 extend-restart',
      'best=max(best, cur) // 4 update-best',
      'done — best is max // 5 done',
    ],
    python: [
      'cur = best = a[0]  # init',
      'for x in a[1:]:  # loop',
      'cur = max(x, cur + x)  # restart?',
      'best = max(best, cur)  # update',
      '# done',
    ],
    cpp: [
      'int cur = a[0], best = a[0]; // init',
      'for (int i = 1; i < n; ++i) // loop',
      'cur = std::max(a[i], cur + a[i]); // extend',
      'best = std::max(best, cur); // update',
      '// done',
    ],
    complexity: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    bullets: [
      'cur is the best sum ending at i: extend it or restart at a[i].',
      'Restart exactly when a[i] alone beats cur+a[i] (cur went negative).',
      'Values span -20..50 so restarts actually trigger in demos.',
    ],
    checks: [
      { q: 'Why start at a[0], not 0?', a: 'All-negative input must return the least-bad element, not 0.' },
      { q: 'When do we restart?', a: 'When cur+a[i] < a[i], i.e. the running sum drags below starting fresh.' },
    ],
  },
  rotate: {
    title: 'Rotate Array (Reversal)',
    pseudocode: [
      'reverse a[0..n-1] // 1 reverse-all',
      'reverse a[0..k-1] // 2 reverse-first-k',
      'reverse a[k..n-1] // 3 reverse-rest',
      '// phase marker // 4 mid-note',
      'done — rotated by k // 5 done',
    ],
    python: [
      'a.reverse()  # 1 reverse-all',
      'a[:k] = a[:k][::-1]  # 2 first-k',
      'a[k:] = a[k:][::-1]  # 3 rest',
      '# phase marker  # 4 mid-note',
      '# done  # 5 done',
    ],
    cpp: [
      'reverse(a, 0, n - 1); // 1 all',
      'reverse(a, 0, k - 1); // 2 first-k',
      'reverse(a, k, n - 1); // 3 rest',
      '// phase marker; // 4 mid-note',
      '// done; // 5 done',
    ],
    complexity: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    bullets: [
      'Three reversals rotate right by k with zero extra allocation.',
      'Normalize k%=n first — full turns are no-ops.',
      'Every pair swap is shown; the trace counts real writes.',
    ],
    checks: [
      { q: 'Why reverse all, then parts?', a: 'Full reversal puts each element k away from home; the two partial reversals fix the order inside each block.' },
      { q: 'What if k is 0 or n?', a: 'Reversals cancel out and the array is unchanged — still O(n) time.' },
    ],
  },
  dedup: {
    title: 'Remove Duplicates (Sorted)',
    pseudocode: [
      'w=0 // 1 init write ptr',
      'for i=1..n-1: // 2 scan',
      'if a[i]!=a[w] // 3 compare-dup',
      'w++; a[w]=a[i] // 4 write/skip',
      'done — len w+1 // 5 done',
    ],
    python: [
      'w = 0  # init',
      'for i in range(1, n):  # scan',
      'if a[i] != a[w]:  # dup?',
      'w += 1; a[w] = a[i]  # write',
      '# done len w + 1',
    ],
    cpp: [
      'int w = 0; // init',
      'for (int i = 1; i < n; ++i) // scan',
      'if (a[i] != a[w]) // dup?',
      'a[++w] = a[i]; // write',
      '// done len w + 1',
    ],
    complexity: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    bullets: [
      'Sorted input groups equals, so one compare per element suffices.',
      'Slow pointer w marks the unique prefix; i scans ahead.',
      'Values range 1..ceil(n/2), forcing duplicates in every demo.',
    ],
    checks: [
      { q: 'Why compare against a[w], not a[i-1]?', a: 'a[w] is the last kept unique; a[i-1] may be an already-skipped duplicate run.' },
      { q: 'What is the new length?', a: 'w+1 — the unique prefix a[0..w]; the tail beyond w is leftover.' },
    ],
  },
};
