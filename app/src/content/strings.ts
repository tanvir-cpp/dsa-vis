// String-matching + data-structure step generators and curriculum content.
//
// Line maps (1-indexed into the pseudocode arrays below):
//   STR_ALGOS kmp | naive:
//     1 build-LPS / scan-init, 2 compare, 3 match-advance / mismatch-fallback, 4 done.
//   STRUCT_CONTENT bst:
//     1 start / insert-key, 2 compare / find-slot, 3 insert, 4 done.
//   STRUCT_CONTENT unionfind:
//     1 init-parent, 2 find-roots, 3 union, 4 done.

export interface StrStep {
  ti: number | null;
  pi: number | null;
  line: number;
  note: string;
}

export interface BstStep {
  state: number[];
  highlight: number | null;
  line: number;
  note: string;
}

export interface UnionStep {
  parent: number[];
  highlight: number | null;
  line: number;
  note: string;
}

export interface Complexity {
  best: string;
  avg: string;
  worst: string;
  space: string;
}

export interface StrAlgoMeta {
  title: string;
  pseudocode: string[];
  python: string[];
  cpp: string[];
  complexity: Complexity;
  bullets: string[];
  checks: { q: string; a: string }[];
}

export interface StructMeta {
  title: string;
  pseudocode: string[];
  python: string[];
  cpp: string[];
  complexity: Complexity;
  bullets: string[];
  checks: { q: string; a: string }[];
}

const MAX_STEPS = 10000;

// ---------------------------------------------------------------------------
// KMP prefix function
// ---------------------------------------------------------------------------

/** Prefix function (LPS array). lps[i] = longest proper prefix of pat[0..i] that is also a suffix. */
export function kmpPrefix(pat: string): number[] {
  const m = pat.length;
  const lps: number[] = new Array<number>(m).fill(0);
  let len = 0;
  let i = 1;
  while (i < m) {
    if (pat[i] === pat[len]) {
      len += 1;
      lps[i] = len;
      i += 1;
    } else if (len > 0) {
      len = lps[len - 1];
    } else {
      lps[i] = 0;
      i += 1;
    }
  }
  return lps;
}

// ---------------------------------------------------------------------------
// KMP steps — line map: 1 build-lps/scan-init, 2 compare,
// 3 match-advance/mismatch-fallback, 4 done. Stops at first match.
// ---------------------------------------------------------------------------

export function kmpSteps(text: string, pat: string): StrStep[] {
  const steps: StrStep[] = [];
  const n = text.length;
  const m = pat.length;
  if (m === 0) {
    steps.push({ ti: null, pi: null, line: 4, note: 'Done — empty pattern matches at 0' });
    return steps;
  }
  const lps = kmpPrefix(pat);
  let comps = 0;
  steps.push({
    ti: 0,
    pi: 0,
    line: 1,
    note: `Build LPS for "${pat}" → [${lps.join(', ')}] — start scan ti=0, pi=0`,
  });
  let ti = 0;
  let pi = 0;
  while (ti < n) {
    if (steps.length >= MAX_STEPS - 2) break;
    const match = text[ti] === pat[pi];
    comps += 1;
    steps.push({
      ti,
      pi,
      line: 2,
      note: `Compare text[${ti}]='${text[ti]}' vs pat[${pi}]='${pat[pi]}'${match ? ' — match' : ' — mismatch'}`,
    });
    if (match) {
      ti += 1;
      pi += 1;
      if (pi === m) {
        const start = ti - m;
        steps.push({
          ti: ti - 1,
          pi: m - 1,
          line: 3,
          note: `Match — pattern found at ${start} (ends ti=${ti - 1})`,
        });
        steps.push({
          ti: ti - 1,
          pi: null,
          line: 4,
          note: `Done — first match at ${start} after ${comps} comparisons`,
        });
        return steps;
      }
      steps.push({ ti, pi, line: 3, note: `Match — advance ti=${ti}, pi=${pi}` });
    } else if (pi > 0) {
      const npi = lps[pi - 1];
      steps.push({
        ti,
        pi: npi,
        line: 3,
        note: `Mismatch — fallback pi=${pi} → ${npi} (lps[${pi - 1}])`,
      });
      pi = npi;
    } else {
      ti += 1;
      steps.push({
        ti: ti < n ? ti : null,
        pi: 0,
        line: 3,
        note: `Mismatch with pi=0 — advance ti=${ti}`,
      });
    }
  }
  steps.push({ ti: null, pi: null, line: 4, note: `Done — pattern not found after ${comps} comparisons` });
  return steps;
}

// ---------------------------------------------------------------------------
// Naive steps — line map: 1 scan-init (also per-alignment init),
// 2 compare, 3 match-advance/mismatch-shift, 4 done. Stops at first match.
// ---------------------------------------------------------------------------

export function naiveSteps(text: string, pat: string): StrStep[] {
  const steps: StrStep[] = [];
  const n = text.length;
  const m = pat.length;
  if (m === 0) {
    steps.push({ ti: null, pi: null, line: 4, note: 'Done — empty pattern matches at 0' });
    return steps;
  }
  if (m > n) {
    steps.push({ ti: null, pi: null, line: 1, note: `Scan init — text n=${n} < pattern m=${m}, no alignments` });
    steps.push({ ti: null, pi: null, line: 4, note: 'Done — pattern longer than text, not found' });
    return steps;
  }
  let comps = 0;
  steps.push({
    ti: 0,
    pi: 0,
    line: 1,
    note: `Scan init — text n=${n}, pattern m=${m}, ${n - m + 1} alignments`,
  });
  for (let s = 0; s <= n - m; s++) {
    if (steps.length >= MAX_STEPS - 2) break;
    steps.push({ ti: s, pi: 0, line: 1, note: `Alignment s=${s} — compare text[${s}..${s + m - 1}] vs pattern` });
    let j = 0;
    for (; j < m; j++) {
      if (steps.length >= MAX_STEPS - 2) break;
      const ti = s + j;
      const match = text[ti] === pat[j];
      comps += 1;
      steps.push({
        ti,
        pi: j,
        line: 2,
        note: `Compare text[${ti}]='${text[ti]}' vs pat[${j}]='${pat[j]}'${match ? ' — match' : ' — mismatch'}`,
      });
      if (match) {
        if (j === m - 1) {
          steps.push({ ti, pi: j, line: 3, note: `Match — pattern found at ${s}` });
          steps.push({ ti, pi: null, line: 4, note: `Done — first match at ${s} after ${comps} comparisons` });
          return steps;
        }
        steps.push({ ti: ti + 1, pi: j + 1, line: 3, note: `Match — advance j=${j} → ${j + 1}` });
      } else {
        steps.push({ ti, pi: 0, line: 3, note: `Mismatch at j=${j} — shift s=${s} → ${s + 1}` });
        break;
      }
    }
  }
  steps.push({ ti: null, pi: null, line: 4, note: `Done — pattern not found after ${comps} comparisons` });
  return steps;
}

// ---------------------------------------------------------------------------
// Fixed demo pair, sliced by size param
// ---------------------------------------------------------------------------

export const DEMO_TEXT = 'ABABDABACDABABCABAB';
export const DEMO_PAT = 'ABABCABAB';

export function clampStrSize(n: number): number {
  if (!Number.isFinite(n)) return DEMO_TEXT.length;
  return Math.max(5, Math.min(DEMO_TEXT.length, Math.floor(n)));
}

/** Demo text sliced to `size` chars (5..19). Pattern stays fixed. */
export function demoText(size: number): string {
  return DEMO_TEXT.slice(0, clampStrSize(size));
}

/** On-demand dispatcher used by StringPage. */
export function stepsForStringAlgo(id: string, size: number, pattern?: string): StrStep[] {
  const text = demoText(size);
  const pat = pattern ?? DEMO_PAT;
  return id === 'naive' ? naiveSteps(text, pat) : kmpSteps(text, pat);
}

// ---------------------------------------------------------------------------
// Curriculum content: KMP + Naive
// ---------------------------------------------------------------------------

export const STR_ALGOS: Record<'kmp' | 'naive', StrAlgoMeta> = {
  kmp: {
    title: 'KMP String Matching',
    pseudocode: [
      'build LPS for pattern; ti=0, pi=0  // 1 build-lps / scan-init',
      "compare text[ti] vs pat[pi]        // 2 compare",
      'if match: ti++, pi++; elif pi>0: pi=lps[pi-1]; else ti++  // 3 advance / fallback',
      'done — report first match or not found  // 4 done',
    ],
    python: [
      'lps, ti, pi = prefix(pat), 0, 0  # 1',
      "while ti < n:  # compare text[ti] vs pat[pi]  # 2",
      '    ti, pi = (ti+1, pi+1) if match else (ti, lps[pi-1] or ti+1)  # 3',
      '# done — report match or -1  # 4',
    ],
    cpp: [
      'auto lps = prefix(pat); int ti=0, pi=0; // 1',
      'while (ti < n) { // compare text[ti] vs pat[pi] // 2',
      '    if (match) {++ti; ++pi;} else if (pi) pi=lps[pi-1]; else ++ti; } // 3',
      '// done — report match or -1 // 4',
    ],
    complexity: { best: 'O(n)', avg: 'O(n+m)', worst: 'O(n+m)', space: 'O(m)' },
    bullets: [
      'The LPS table encodes how far the pattern can shift on mismatch without re-scanning text.',
      'Each step advances ti or shrinks pi, so total work is linear in n+m.',
      'Never moves ti backwards — the text pointer only advances.',
    ],
    checks: [
      { q: 'What does lps[i] mean?', a: 'Length of the longest proper prefix of pat[0..i] that is also a suffix — the fallback for pi.' },
      { q: 'Why is KMP linear?', a: 'ti advances at most n times and pi falls back at most as often as it advanced — O(n+m) total.' },
    ],
  },
  naive: {
    title: 'Naive String Matching',
    pseudocode: [
      'for s = 0 to n-m: align at s     // 1 scan-init',
      "compare text[s+j] vs pat[j]      // 2 compare",
      'if match: j++; else shift s++    // 3 advance / shift',
      'done — report first match or not found  // 4 done',
    ],
    python: [
      'for s in range(n - m + 1):  # 1 align',
      "    for j in range(m):  # compare text[s+j] vs pat[j]  # 2",
      '        if match: j += 1  # else break, shift s  # 3',
      '# done — report match or -1  # 4',
    ],
    cpp: [
      'for (int s = 0; s <= n - m; ++s) { // 1 align',
      '    for (int j = 0; j < m; ++j) // compare // 2',
      '        if (match) continue; else break; // 3 shift on mismatch',
      '// done // 4 }',
    ],
    complexity: { best: 'O(n)', avg: 'O(n·m)', worst: 'O(n·m)', space: 'O(1)' },
    bullets: [
      'Tries every alignment s and re-compares from j=0 after each mismatch.',
      'Best case O(n): first character mismatches at every alignment.',
      'Worst case O(n·m): e.g. text of all A with pattern AAA…AB.',
    ],
    checks: [
      { q: 'How many alignments are tried?', a: 'n-m+1 — from s=0 to s=n-m inclusive.' },
      { q: 'When is naive actually fine?', a: 'Short patterns and rare partial matches — small constants, no preprocessing.' },
    ],
  },
};

// ---------------------------------------------------------------------------
// BST demo: sorted-insert trace.
// Line map: 1 start/insert-key, 2 compare/find-slot, 3 insert, 4 done.
// The sorted array doubles as the inorder traversal of the BST.
// ---------------------------------------------------------------------------

export const BST_VALUES: number[] = [50, 30, 70, 20, 40, 60, 80];

export function bstSteps(values: number[]): BstStep[] {
  const steps: BstStep[] = [];
  const state: number[] = [];
  steps.push({ state: [], highlight: null, line: 1, note: `Start — insert ${values.length} keys (${values.join(', ') || 'none'})` });
  if (values.length === 0) {
    steps.push({ state: [], highlight: null, line: 4, note: 'Done — empty tree' });
    return steps;
  }
  for (const v of values) {
    if (steps.length >= MAX_STEPS - 1) break;
    steps.push({ state: [...state], highlight: null, line: 1, note: `Insert key=${v}` });
    let k = 0;
    while (k < state.length && state[k] < v) k += 1;
    steps.push({
      state: [...state],
      highlight: state.length > 0 ? Math.min(k, state.length - 1) : null,
      line: 2,
      note: state.length === 0 ? `Empty tree — ${v} becomes root` : `Compare to find slot for ${v} — position ${k} in [${state.join(', ')}]`,
    });
    state.splice(k, 0, v);
    steps.push({ state: [...state], highlight: k, line: 3, note: `Inserted ${v} at ${k} → [${state.join(', ')}]` });
  }
  steps.push({ state: [...state], highlight: null, line: 4, note: `Done — inorder [${state.join(', ')}]` });
  return steps;
}

// ---------------------------------------------------------------------------
// Union-Find demo: parent-array trace.
// Line map: 1 init-parent, 2 find-roots, 3 union, 4 done.
// ---------------------------------------------------------------------------

export const UNION_N = 8;
export const UNION_PAIRS: [number, number][] = [
  [0, 1],
  [2, 3],
  [0, 2],
  [4, 5],
  [6, 7],
  [4, 6],
  [0, 4],
];

function findRoot(parent: number[], x: number): number {
  let r = x;
  while (parent[r] !== r) r = parent[r];
  return r;
}

export function unionSteps(n: number, pairs: [number, number][]): UnionStep[] {
  const steps: UnionStep[] = [];
  const size = Number.isFinite(n) ? Math.max(1, Math.min(64, Math.floor(n))) : 1;
  const parent: number[] = Array.from({ length: size }, (_, i) => i);
  steps.push({ parent: [...parent], highlight: null, line: 1, note: `Init parent[i]=i for n=${size} → [${parent.join(', ')}]` });
  for (const pair of pairs) {
    if (steps.length >= MAX_STEPS - 1) break;
    const a = pair[0];
    const b = pair[1];
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a >= size || b >= size) {
      steps.push({ parent: [...parent], highlight: null, line: 2, note: `Skip invalid pair (${a}, ${b}) for n=${size}` });
      continue;
    }
    const ra = findRoot(parent, a);
    const rb = findRoot(parent, b);
    steps.push({ parent: [...parent], highlight: b, line: 2, note: `Find(${a})=${ra}, find(${b})=${rb}` });
    if (ra === rb) {
      steps.push({ parent: [...parent], highlight: null, line: 3, note: `Already connected (${a} ~ ${b}, root ${ra}) — no union` });
    } else {
      parent[rb] = ra;
      steps.push({ parent: [...parent], highlight: rb, line: 3, note: `Union(${a}, ${b}) — parent[${rb}]=${ra} → [${parent.join(', ')}]` });
    }
  }
  steps.push({ parent: [...parent], highlight: null, line: 4, note: `Done — parent [${parent.join(', ')}]` });
  return steps;
}

// ---------------------------------------------------------------------------
// Curriculum content: BST + Union-Find
// ---------------------------------------------------------------------------

export const STRUCT_CONTENT: Record<'bst' | 'unionfind', StructMeta> = {
  bst: {
    title: 'Binary Search Tree',
    pseudocode: [
      'insert key; empty → root          // 1 start / insert-key',
      'compare vs node; go left / right  // 2 compare / find-slot',
      'attach at empty slot              // 3 insert',
      'done — inorder traversal is sorted  // 4 done',
    ],
    python: [
      'node = root  # insert key  # 1',
      '    node = node.left if key < node.key else node.right  # 2',
      '    node.slot = key  # attach  # 3',
      '# done — inorder is sorted  # 4',
    ],
    cpp: [
      'Node* node = root; // insert key // 1',
      '    node = (key < node->key) ? node->left : node->right; // 2',
      '    node->slot = key; // attach // 3',
      '// done — inorder is sorted // 4',
    ],
    complexity: { best: 'O(log n)', avg: 'O(log n)', worst: 'O(n)', space: 'O(n)' },
    bullets: [
      'Left subtree holds smaller keys, right holds larger — inorder yields sorted order.',
      'Balanced trees give O(log n) insert/search; degenerate input degrades to O(n).',
      'This trace shows the sorted (inorder) state after each insert.',
    ],
    checks: [
      { q: 'Why is inorder sorted?', a: 'Every node is visited after its whole left subtree and before its right subtree.' },
      { q: 'When is insert O(n)?', a: 'Inserting sorted keys builds a chain — each insert walks the full height.' },
    ],
  },
  unionfind: {
    title: 'Union-Find (Disjoint Set)',
    pseudocode: [
      'parent[i] = i for all i           // 1 init-parent',
      'find(x): follow parent to root   // 2 find-roots',
      'union(a,b): attach root(b) under root(a)  // 3 union',
      'done — same root means connected  // 4 done',
    ],
    python: [
      'parent = list(range(n))  # 1',
      '    ra, rb = find(a), find(b)  # 2',
      '    parent[rb] = ra  # union  # 3',
      '# done — find(a) == find(b) iff connected  # 4',
    ],
    cpp: [
      'for (int i = 0; i < n; ++i) parent[i] = i; // 1',
      '    int ra = find(a), rb = find(b); // 2',
      '    parent[rb] = ra; // union // 3',
      '// done — same root means connected // 4',
    ],
    complexity: { best: 'O(α(n))', avg: 'O(α(n))', worst: 'O(log n)', space: 'O(n)' },
    bullets: [
      'parent[i]=i marks a root; otherwise parent points one step toward the root.',
      'Union attaches one root under the other — the array is the whole state.',
      'Union by rank + path compression push nearly every op to amortized α(n).',
    ],
    checks: [
      { q: 'How do you test connectivity?', a: 'Compare roots: connected(a, b) iff find(a) == find(b).' },
      { q: 'Why attach root-to-root?', a: 'Linking non-roots would orphan subtrees; roots keep every node reachable.' },
    ],
  },
};
