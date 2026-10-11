// TS fallback step generators + curriculum content.
//
// Mirrors the shell-owned contracts:
//   - AlgoStep shape in app/src/engine/types.ts (snake_case, exact fields)
//   - Rust LCG in dsa-core/src/prng.rs (Knuth MMIX: A=6364136223846793005, C=1, mod 2^64)
//   - Line maps documented below (1-indexed into ALGOS[id].pseudocode)
//
// This module lets SortingPage work BEFORE WASM is wired. Once dsa-core lands,
// the page can swap `stepsForAlgo` for the WASM trace emitter without changing UI.
import type { AlgoStep } from '../engine/types';

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

function randomArray(n: number, seed: number, lo = 5, hi = 100): { arr: number[]; rng: Lcg } {
  const size = clampSize(n);
  const rng = new Lcg(seed);
  const arr: number[] = [];
  for (let k = 0; k < size; k++) arr.push(rng.genRange(lo, hi));
  return { arr, rng };
}

// ---------------------------------------------------------------------------
// Bubble — line map: 1 outer loop, 2 inner loop, 3 compare, 4 swap, 5 done
// ---------------------------------------------------------------------------
export function bubbleSteps(n: number, seed: number): AlgoStep[] {
  const { arr: a, rng: _rng } = randomArray(n, seed);
  void _rng;
  const size = a.length;
  const steps: AlgoStep[] = [];
  let comparisons = 0;
  let swaps = 0;

  steps.push({
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: size > 1 ? null : 0,
    line: 1,
    note: `Start bubble sort — n=${size}, seed=${seed}`,
    comparisons,
    swaps,
  });
  if (size <= 1) {
    steps.push({
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: 0,
      line: 5,
      note: 'Done — trivially sorted',
      comparisons,
      swaps,
    });
    return steps;
  }

  for (let i = 0; i < size - 1; i++) {
    const sortedFrom: number | null = size - i < size ? size - i : null;
    steps.push({
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: sortedFrom,
      line: 1,
      note: `Outer pass i=${i} — bubble max into ${size - 1 - i}`,
      comparisons,
      swaps,
    });
    steps.push({
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: sortedFrom,
      line: 2,
      note: `Inner scan j=0..${size - 2 - i}`,
      comparisons,
      swaps,
    });
    for (let j = 0; j < size - 1 - i; j++) {
      comparisons += 1;
      const needSwap = a[j] > a[j + 1];
      steps.push({
        array: [...a],
        compare: [j, j + 1],
        swap: null,
        sorted_from: sortedFrom,
        line: 3,
        note: `Compare a[${j}]=${a[j]} vs a[${j + 1}]=${a[j + 1]}${needSwap ? ' — will swap' : ' — no swap'}`,
        comparisons,
        swaps,
      });
      if (needSwap) {
        const tmp = a[j];
        a[j] = a[j + 1];
        a[j + 1] = tmp;
        swaps += 1;
        steps.push({
          array: [...a],
          compare: null,
          swap: [j, j + 1],
          sorted_from: sortedFrom,
          line: 4,
          note: `Swap positions ${j} ↔ ${j + 1}`,
          comparisons,
          swaps,
        });
      }
    }
  }

  steps.push({
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: 0,
    line: 5,
    note: `Done — sorted in ${comparisons} comparisons, ${swaps} swaps`,
    comparisons,
    swaps,
  });
  return steps;
}

// ---------------------------------------------------------------------------
// Selection — line map: 1 outer, 2 inner/min-scan, 3 compare, 4 swap, 5 done
// ---------------------------------------------------------------------------
export function selectionSteps(n: number, seed: number): AlgoStep[] {
  const { arr: a } = randomArray(n, seed);
  const size = a.length;
  const steps: AlgoStep[] = [];
  let comparisons = 0;
  let swaps = 0;

  steps.push({
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: size > 1 ? null : 0,
    line: 1,
    note: `Start selection sort — n=${size}, seed=${seed}`,
    comparisons,
    swaps,
  });
  if (size <= 1) {
    steps.push({
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: 0,
      line: 5,
      note: 'Done — trivially sorted',
      comparisons,
      swaps,
    });
    return steps;
  }

  for (let i = 0; i < size - 1; i++) {
    let min = i;
    steps.push({
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 1,
      note: `Outer i=${i} — fix position ${i}`,
      comparisons,
      swaps,
    });
    steps.push({
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 2,
      note: `Inner scan j=${i + 1}..${size - 1} for min (start min=${min})`,
      comparisons,
      swaps,
    });
    for (let j = i + 1; j < size; j++) {
      comparisons += 1;
      const isNewMin = a[j] < a[min];
      steps.push({
        array: [...a],
        compare: [j, min],
        swap: null,
        sorted_from: null,
        line: 3,
        note: `Compare a[${j}]=${a[j]} vs a[${min}]=${a[min]}${isNewMin ? ' — new min' : ''}`,
        comparisons,
        swaps,
      });
      if (isNewMin) min = j;
    }
    if (min !== i) {
      const tmp = a[i];
      a[i] = a[min];
      a[min] = tmp;
      swaps += 1;
      steps.push({
        array: [...a],
        compare: null,
        swap: [i, min],
        sorted_from: null,
        line: 4,
        note: `Swap ${i} ↔ ${min}`,
        comparisons,
        swaps,
      });
    }
  }

  steps.push({
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: 0,
    line: 5,
    note: `Done — sorted in ${comparisons} comparisons, ${swaps} swaps`,
    comparisons,
    swaps,
  });
  return steps;
}

// ---------------------------------------------------------------------------
// Insertion — line map: 1 outer/key, 2 inner while, 3 compare, 4 shift/insert, 5 done
// ---------------------------------------------------------------------------
export function insertionSteps(n: number, seed: number): AlgoStep[] {
  const { arr: a } = randomArray(n, seed);
  const size = a.length;
  const steps: AlgoStep[] = [];
  let comparisons = 0;
  let swaps = 0;

  steps.push({
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: size > 1 ? null : 0,
    line: 1,
    note: `Start insertion sort — n=${size}, seed=${seed}`,
    comparisons,
    swaps,
  });
  if (size <= 1) {
    steps.push({
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: 0,
      line: 5,
      note: 'Done — trivially sorted',
      comparisons,
      swaps,
    });
    return steps;
  }

  for (let i = 1; i < size; i++) {
    const key = a[i];
    steps.push({
      array: [...a],
      compare: [i, i],
      swap: null,
      sorted_from: null,
      line: 1,
      note: `Outer i=${i} — key=${key}`,
      comparisons,
      swaps,
    });
    let j = i - 1;
    steps.push({
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 2,
      note: `Inner shift from j=${j}`,
      comparisons,
      swaps,
    });
    while (j >= 0) {
      comparisons += 1;
      const shift = a[j] > key;
      steps.push({
        array: [...a],
        compare: [j, j + 1],
        swap: null,
        sorted_from: null,
        line: 3,
        note: `Compare a[${j}]=${a[j]} vs key=${key}${shift ? ' — shift' : ' — stop'}`,
        comparisons,
        swaps,
      });
      if (!shift) break;
      a[j + 1] = a[j];
      swaps += 1;
      steps.push({
        array: [...a],
        compare: null,
        swap: [j, j + 1],
        sorted_from: null,
        line: 4,
        note: `Shift a[${j}] right to ${j + 1}`,
        comparisons,
        swaps,
      });
      j -= 1;
    }
    a[j + 1] = key;
    if (j + 1 !== i) {
      swaps += 1;
      steps.push({
        array: [...a],
        compare: null,
        swap: [j + 1, i],
        sorted_from: null,
        line: 4,
        note: `Insert key=${key} at ${j + 1}`,
        comparisons,
        swaps,
      });
    }
  }

  steps.push({
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: 0,
    line: 5,
    note: `Done — sorted in ${comparisons} comparisons, ${swaps} shifts`,
    comparisons,
    swaps,
  });
  return steps;
}

// ---------------------------------------------------------------------------
// Merge — line map: 1 divide, 2 merge-loop, 3 compare, 4 copy, 5 done
// ---------------------------------------------------------------------------
export function mergeSteps(n: number, seed: number): AlgoStep[] {
  const { arr: a } = randomArray(n, seed);
  const size = a.length;
  const steps: AlgoStep[] = [];
  let comparisons = 0;
  let copies = 0;

  steps.push({
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: null,
    line: 1,
    note: `Start merge sort — n=${size}, seed=${seed}`,
    comparisons,
    swaps: copies,
  });
  if (size <= 1) {
    steps.push({
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: 0,
      line: 5,
      note: 'Done — trivially sorted',
      comparisons,
      swaps: copies,
    });
    return steps;
  }

  function sort(lo: number, hi: number): void {
    if (lo >= hi) return;
    const mid = (lo + hi) >> 1;
    steps.push({
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 1,
      note: `Divide [${lo}..${hi}] → [${lo}..${mid}] + [${mid + 1}..${hi}]`,
      comparisons,
      swaps: copies,
    });
    sort(lo, mid);
    sort(mid + 1, hi);

    const left = a.slice(lo, mid + 1);
    const right = a.slice(mid + 1, hi + 1);
    let i = 0;
    let j = 0;
    let k = lo;
    steps.push({
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 2,
      note: `Merge [${lo}..${mid}] + [${mid + 1}..${hi}]`,
      comparisons,
      swaps: copies,
    });
    while (i < left.length && j < right.length) {
      comparisons += 1;
      const li = lo + i;
      const rj = mid + 1 + j;
      steps.push({
        array: [...a],
        compare: [li, rj],
        swap: null,
        sorted_from: null,
        line: 3,
        note: `Compare L=${left[i]} (pos ${li}) vs R=${right[j]} (pos ${rj})`,
        comparisons,
        swaps: copies,
      });
      if (left[i] <= right[j]) {
        a[k] = left[i];
        i += 1;
      } else {
        a[k] = right[j];
        j += 1;
      }
      copies += 1;
      steps.push({
        array: [...a],
        compare: null,
        swap: [k, k],
        sorted_from: null,
        line: 4,
        note: `Copy ${a[k]} into position ${k}`,
        comparisons,
        swaps: copies,
      });
      k += 1;
    }
    while (i < left.length) {
      a[k] = left[i];
      copies += 1;
      steps.push({
        array: [...a],
        compare: null,
        swap: [k, k],
        sorted_from: null,
        line: 4,
        note: `Copy remaining L=${left[i]} into ${k}`,
        comparisons,
        swaps: copies,
      });
      i += 1;
      k += 1;
    }
    while (j < right.length) {
      a[k] = right[j];
      copies += 1;
      steps.push({
        array: [...a],
        compare: null,
        swap: [k, k],
        sorted_from: null,
        line: 4,
        note: `Copy remaining R=${right[j]} into ${k}`,
        comparisons,
        swaps: copies,
      });
      j += 1;
      k += 1;
    }
  }

  sort(0, size - 1);
  steps.push({
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: 0,
    line: 5,
    note: `Done — sorted in ${comparisons} comparisons, ${copies} copies`,
    comparisons,
    swaps: copies,
  });
  return steps;
}

// ---------------------------------------------------------------------------
// Quick (Lomuto) — line map: 1 pivot/partition, 2 scan, 3 compare, 4 swap, 5 done
// ---------------------------------------------------------------------------
export function quickSteps(n: number, seed: number): AlgoStep[] {
  const { arr: a } = randomArray(n, seed);
  const size = a.length;
  const steps: AlgoStep[] = [];
  let comparisons = 0;
  let swaps = 0;

  steps.push({
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: null,
    line: 1,
    note: `Start quick sort — n=${size}, seed=${seed}`,
    comparisons,
    swaps,
  });
  if (size <= 1) {
    steps.push({
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: 0,
      line: 5,
      note: 'Done — trivially sorted',
      comparisons,
      swaps,
    });
    return steps;
  }

  function qs(lo: number, hi: number): void {
    if (lo >= hi) return;
    const pivot = a[hi];
    steps.push({
      array: [...a],
      compare: [hi, hi],
      swap: null,
      sorted_from: null,
      line: 1,
      note: `Partition [${lo}..${hi}] pivot a[${hi}]=${pivot}`,
      comparisons,
      swaps,
    });
    let i = lo;
    steps.push({
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 2,
      note: `Scan j=${lo}..${hi - 1}`,
      comparisons,
      swaps,
    });
    for (let j = lo; j < hi; j++) {
      comparisons += 1;
      const less = a[j] < pivot;
      steps.push({
        array: [...a],
        compare: [j, hi],
        swap: null,
        sorted_from: null,
        line: 3,
        note: `Compare a[${j}]=${a[j]} < pivot ${pivot}? ${less ? 'yes' : 'no'}`,
        comparisons,
        swaps,
      });
      if (less) {
        if (i !== j) {
          const tmp = a[i];
          a[i] = a[j];
          a[j] = tmp;
          swaps += 1;
          steps.push({
            array: [...a],
            compare: null,
            swap: [i, j],
            sorted_from: null,
            line: 4,
            note: `Swap ${i} ↔ ${j}`,
            comparisons,
            swaps,
          });
        }
        i += 1;
      }
    }
    if (i !== hi) {
      const tmp = a[i];
      a[i] = a[hi];
      a[hi] = tmp;
      swaps += 1;
      steps.push({
        array: [...a],
        compare: null,
        swap: [i, hi],
        sorted_from: null,
        line: 4,
        note: `Place pivot at ${i}`,
        comparisons,
        swaps,
      });
    }
    steps.push({
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 5,
      note: `Pivot settled at ${i} — recurse [${lo}..${i - 1}] + [${i + 1}..${hi}]`,
      comparisons,
      swaps,
    });
    qs(lo, i - 1);
    qs(i + 1, hi);
  }

  qs(0, size - 1);
  steps.push({
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: 0,
    line: 5,
    note: `Done — sorted in ${comparisons} comparisons, ${swaps} swaps`,
    comparisons,
    swaps,
  });
  return steps;
}

// ---------------------------------------------------------------------------
// Linear search — line map: 1 scan loop, 2 compare, 3 found, 4 done/not-found
// Single-index marks encoded as [idx, idx] per Step::mark_single contract.
// ---------------------------------------------------------------------------
export function linearSteps(n: number, seed: number, target?: number): AlgoStep[] {
  const size = clampSize(n);
  const steps: AlgoStep[] = [];
  if (size <= 0) {
    steps.push({
      array: [],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 4,
      note: 'Done — empty array, not found',
      comparisons: 0,
      swaps: 0,
    });
    return steps;
  }
  const { arr: a, rng } = randomArray(size, seed);
  const t = target ?? a[Number(rng.next() % BigInt(size))];
  let comparisons = 0;

  steps.push({
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: null,
    line: 1,
    note: `Search ${t} — linear scan n=${size}`,
    comparisons,
    swaps: 0,
  });
  for (let i = 0; i < size; i++) {
    comparisons += 1;
    steps.push({
      array: [...a],
      compare: [i, i],
      swap: null,
      sorted_from: null,
      line: 2,
      note: `Compare a[${i}]=${a[i]} vs ${t}`,
      comparisons,
      swaps: 0,
    });
    if (a[i] === t) {
      steps.push({
        array: [...a],
        compare: [i, i],
        swap: null,
        sorted_from: null,
        line: 3,
        note: `Found ${t} at index ${i} after ${comparisons} comparisons`,
        comparisons,
        swaps: 0,
      });
      return steps;
    }
  }
  steps.push({
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: null,
    line: 4,
    note: `Done — ${t} not found after ${comparisons} comparisons`,
    comparisons,
    swaps: 0,
  });
  return steps;
}

// ---------------------------------------------------------------------------
// Binary search (sorted input) — line map:
// 1 while loop, 2 probe mid, 3 compare/found, 4 narrow, 5 done
// ---------------------------------------------------------------------------
export function binarySteps(n: number, seed: number, target?: number): AlgoStep[] {
  const size = clampSize(n);
  const steps: AlgoStep[] = [];
  if (size <= 0) {
    steps.push({
      array: [],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 5,
      note: 'Done — empty array, not found',
      comparisons: 0,
      swaps: 0,
    });
    return steps;
  }
  const { arr: unsorted, rng } = randomArray(size, seed);
  const a = [...unsorted].sort((x, y) => x - y);
  const t = target ?? a[Number(rng.next() % BigInt(size))];
  let comparisons = 0;
  let lo = 0;
  let hi = size - 1;

  steps.push({
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: null,
    line: 1,
    note: `Search ${t} — binary over sorted n=${size}`,
    comparisons,
    swaps: 0,
  });
  while (lo <= hi) {
    steps.push({
      array: [...a],
      compare: null,
      swap: null,
      sorted_from: null,
      line: 1,
      note: `Loop lo=${lo}, hi=${hi}`,
      comparisons,
      swaps: 0,
    });
    const mid = (lo + hi) >> 1;
    steps.push({
      array: [...a],
      compare: [mid, mid],
      swap: null,
      sorted_from: null,
      line: 2,
      note: `Probe mid=${mid} (a[mid]=${a[mid]})`,
      comparisons,
      swaps: 0,
    });
    comparisons += 1;
    steps.push({
      array: [...a],
      compare: [mid, mid],
      swap: null,
      sorted_from: null,
      line: 3,
      note: `Compare a[${mid}]=${a[mid]} vs ${t}`,
      comparisons,
      swaps: 0,
    });
    if (a[mid] === t) {
      steps.push({
        array: [...a],
        compare: [mid, mid],
        swap: null,
        sorted_from: null,
        line: 5,
        note: `Found ${t} at index ${mid} after ${comparisons} comparisons`,
        comparisons,
        swaps: 0,
      });
      return steps;
    }
    if (a[mid] < t) {
      steps.push({
        array: [...a],
        compare: [mid, mid],
        swap: null,
        sorted_from: null,
        line: 4,
        note: `${a[mid]} < ${t} — lo=${mid + 1}`,
        comparisons,
        swaps: 0,
      });
      lo = mid + 1;
    } else {
      steps.push({
        array: [...a],
        compare: [mid, mid],
        swap: null,
        sorted_from: null,
        line: 4,
        note: `${a[mid]} > ${t} — hi=${mid - 1}`,
        comparisons,
        swaps: 0,
      });
      hi = mid - 1;
    }
  }
  steps.push({
    array: [...a],
    compare: null,
    swap: null,
    sorted_from: null,
    line: 5,
    note: `Done — ${t} not found after ${comparisons} comparisons`,
    comparisons,
    swaps: 0,
  });
  return steps;
}

/** Deterministic target for search visualizers (mirrors generators). */
export function searchTarget(algoId: string, n: number, seed: number): number | null {
  const size = clampSize(n);
  if (size <= 0) return null;
  if (algoId !== 'linear' && algoId !== 'binary') return null;
  const { arr, rng } = randomArray(size, seed);
  if (algoId === 'binary') arr.sort((x, y) => x - y);
  return arr[Number(rng.next() % BigInt(size))];
}

/** On-demand dispatcher used by SortingPage. */
export function stepsForAlgo(id: string, n: number, seed: number): AlgoStep[] {
  switch (id) {
    case 'bubble':
      return bubbleSteps(n, seed);
    case 'selection':
      return selectionSteps(n, seed);
    case 'insertion':
      return insertionSteps(n, seed);
    case 'merge':
      return mergeSteps(n, seed);
    case 'quick':
      return quickSteps(n, seed);
    case 'linear':
      return linearSteps(n, seed);
    case 'binary':
      return binarySteps(n, seed);
    default:
      return bubbleSteps(n, seed);
  }
}

// ---------------------------------------------------------------------------
// Curriculum content
// ---------------------------------------------------------------------------
export interface AlgoMeta {
  title: string;
  pseudocode: string[];
  python: string[];
  cpp: string[];
  complexity: { best: string; avg: string; worst: string; space: string };
  bullets: string[];
  checks: { q: string; a: string }[];
}

export const ALGOS: Record<string, AlgoMeta> = {
  bubble: {
    title: 'Bubble Sort',
    pseudocode: [
      'for i = 0 to n-2:            // 1 outer pass',
      '  for j = 0 to n-2-i:        // 2 inner scan',
      '    if a[j] > a[j+1]:        // 3 compare',
      '      swap a[j], a[j+1]      // 4 swap',
      'done — array sorted          // 5 done',
    ],
    python: [
      'for i in range(n - 1):',
      '    for j in range(n - 1 - i):',
      '        if a[j] > a[j + 1]:',
      '            a[j], a[j+1] = a[j+1], a[j]',
      '# done',
    ],
    cpp: [
      'for (int i = 0; i < n - 1; ++i) {',
      '    for (int j = 0; j < n - 1 - i; ++j)',
      '        if (a[j] > a[j + 1])',
      '            std::swap(a[j], a[j + 1]);',
      '// done',
    ],
    complexity: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    bullets: [
      'Large values bubble right one position per pass; the suffix a[n-i..] is sorted.',
      'Early-exit flag gives O(n) best case on sorted input.',
      'Stable: equal elements never swap.',
    ],
    checks: [
      { q: 'Why does the inner loop shrink each pass?', a: 'The last i elements are already the i largest, so j only needs to reach n-2-i.' },
      { q: 'How many comparisons in the worst case?', a: 'n·(n-1)/2 — one per inner iteration, hence O(n²).' },
    ],
  },
  selection: {
    title: 'Selection Sort',
    pseudocode: [
      'for i = 0 to n-2:            // 1 outer',
      '  min = i; for j = i+1..n-1  // 2 inner scan',
      '    if a[j] < a[min]         // 3 compare',
      '  if min != i: swap(i, min)  // 4 swap',
      'done — array sorted          // 5 done',
    ],
    python: [
      'for i in range(n - 1):',
      '    for j in range(i + 1, n):',
      '        if a[j] < a[min_i]:',
      '            a[i], a[min_i] = a[min_i], a[i]',
      '# done',
    ],
    cpp: [
      'for (int i = 0; i < n - 1; ++i) {',
      '    for (int j = i + 1; j < n; ++j)',
      '        if (a[j] < a[min_i])',
      '            std::swap(a[i], a[min_i]);',
      '// done',
    ],
    complexity: { best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    bullets: [
      'Exactly one swap per outer pass — minimal writes.',
      'Not stable: a distant min can jump over equals.',
      'Prefix a[0..i] is sorted after pass i.',
    ],
    checks: [
      { q: 'Why is best case still O(n²)?', a: 'Every pair is compared to find the min, even when sorted — no early exit.' },
      { q: 'How many swaps at most?', a: 'n-1, one per pass.' },
    ],
  },
  insertion: {
    title: 'Insertion Sort',
    pseudocode: [
      'for i = 1 to n-1: key = a[i] // 1 outer',
      '  j = i-1; while j>=0 and a[j] > key  // 2 inner',
      '    compare a[j] vs key      // 3 compare',
      '    a[j+1] = a[j]; j--       // 4 shift / insert',
      'done — array sorted          // 5 done',
    ],
    python: [
      'for i in range(1, n): key = a[i]',
      '    while j >= 0 and a[j] > key:',
      '        if a[j] > key:',
      '            a[j + 1] = a[j]; j -= 1',
      '# done',
    ],
    cpp: [
      'for (int i = 1; i < n; ++i) { // key = a[i]',
      '    while (j >= 0 && a[j] > key)',
      '        if (a[j] > key)',
      '            a[j + 1] = a[j];',
      '// done',
    ],
    complexity: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    bullets: [
      'Prefix a[0..i-1] stays sorted; key is inserted into place.',
      'Adaptive: O(n) on nearly-sorted input. Stable.',
      'Great for small n — used as quick/merge base case.',
    ],
    checks: [
      { q: 'What counts as a shift vs a swap?', a: 'Each right-move a[j+1]=a[j] is one shift; the trace records shifts in the swaps counter.' },
      { q: 'Why is sorted input O(n)?', a: 'Each key compares once against its predecessor and stops — n-1 compares, 0 shifts.' },
    ],
  },
  merge: {
    title: 'Merge Sort',
    pseudocode: [
      'mergeSort(lo,hi): if lo>=hi return  // 1 divide',
      '  mid=(lo+hi)/2; sort halves; merge // 2 merge loop',
      '    compare L[i] vs R[j]            // 3 compare',
      '    copy smaller into temp          // 4 copy',
      'done — segment merged               // 5 done',
    ],
    python: [
      'if lo >= hi: return  # divide',
      '    while i < len(L) and j < len(R):',
      '        if L[i] <= R[j]:',
      '            tmp[k] = L[i]; i += 1',
      '# done',
    ],
    cpp: [
      'if (lo >= hi) return; // divide',
      '    while (i < n1 && j < n2) {',
      '        if (L[i] <= R[j])',
      '            tmp[k++] = L[i++];',
      '// done',
    ],
    complexity: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' },
    bullets: [
      'Divide and conquer: split, sort halves, linear merge.',
      'Stable when left wins ties (<=). Guaranteed O(n log n).',
      'Copies counted in the swaps column of the trace.',
    ],
    checks: [
      { q: 'Why O(n) extra space?', a: 'Merging needs a temp buffer holding the segment being merged.' },
      { q: 'How deep is the recursion?', a: 'O(log n) — the array halves each level.' },
    ],
  },
  quick: {
    title: 'Quick Sort (Lomuto)',
    pseudocode: [
      'partition: pivot = a[hi]     // 1 pivot',
      '  for j = lo to hi-1         // 2 scan',
      '    if a[j] < pivot           // 3 compare',
      '      swap a[i], a[j]; i++    // 4 swap',
      'done — pivot placed, recurse  // 5 done',
    ],
    python: [
      'pivot = a[hi]  # partition [lo..hi]',
      '    for j in range(lo, hi):',
      '        if a[j] < pivot:',
      '            a[i], a[j] = a[j], a[i]  # i += 1',
      '# done',
    ],
    cpp: [
      'int pivot = a[hi]; // partition',
      '    for (int j = lo; j < hi; ++j)',
      '        if (a[j] < pivot)',
      '            std::swap(a[i], a[j]); ++i;',
      '// done',
    ],
    complexity: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)' },
    bullets: [
      'Partitioning puts the pivot in its final slot; recurse left/right.',
      'In-place but not stable (Lomuto). Worst case on sorted input with this pivot.',
      'Average O(n log n) with small constants — the practical default.',
    ],
    checks: [
      { q: 'What does i track?', a: 'The boundary of the < pivot region; elements before i are all < pivot.' },
      { q: 'When is it O(n²)?', a: 'Bad pivots every time (e.g. sorted input + last-element pivot) — one side stays size n-1.' },
    ],
  },
  linear: {
    title: 'Linear Search',
    pseudocode: [
      'for i = 0 to n-1:            // 1 scan',
      '  if a[i] == target:         // 2 compare',
      '    return i                 // 3 found',
      'return -1                    // 4 done / not found',
    ],
    python: [
      'for i in range(n):',
      '    if a[i] == target:',
      '        return i  # found',
      'return -1  # not found',
      '# done',
    ],
    cpp: [
      'for (int i = 0; i < n; ++i) {',
      '    if (a[i] == target)',
      '        return i; // found',
      'return -1; // not found',
      '// done',
    ],
    complexity: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    bullets: [
      'Works on any order — no sorted precondition.',
      'Single probe per step, shown as [i, i].',
      'Target is picked deterministically from the array (seeded), so demos hit.',
    ],
    checks: [
      { q: 'When is it O(1)?', a: 'Target at index 0 — one comparison.' },
      { q: 'Why prefer binary search?', a: 'Binary is O(log n) but needs sorted input; linear needs none.' },
    ],
  },
  binary: {
    title: 'Binary Search',
    pseudocode: [
      'lo=0, hi=n-1; while lo<=hi:  // 1 loop',
      '  mid = (lo+hi)//2           // 2 probe',
      '  if a[mid]==target: return mid  // 3 compare / found',
      '  elif a[mid]<target: lo=mid+1 else hi=mid-1  // 4 narrow',
      'return -1                    // 5 done',
    ],
    python: [
      'while lo <= hi:',
      '    mid = (lo + hi) // 2',
      '    if a[mid] == target: return mid',
      '    lo = mid + 1  # else hi = mid - 1',
      'return -1  # done',
    ],
    cpp: [
      'while (lo <= hi) {',
      '    int mid = (lo + hi) / 2;',
      '    if (a[mid] == target) return mid;',
      '    lo = mid + 1; // else hi = mid - 1',
      'return -1; // done',
    ],
    complexity: { best: 'O(1)', avg: 'O(log n)', worst: 'O(log n)', space: 'O(1)' },
    bullets: [
      'Requires sorted input — the generator sorts before searching.',
      'Halves the window each step; n=100 needs ≤ 7 probes.',
      'Probe shown as [mid, mid].',
    ],
    checks: [
      { q: 'Why must input be sorted?', a: 'Halving is only sound when ordering tells us which half can contain the target.' },
      { q: 'How many steps for n?', a: '⌈log₂(n+1)⌉ comparisons worst case.' },
    ],
  },
};
