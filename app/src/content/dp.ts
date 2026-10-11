// DP step generators + curriculum content.
//
// Line map (1-indexed into DP_ALGOS[id].pseudocode):
//   1 init, 2 loop, 3 compare, 4 done.
//
// All demo inputs are fixed arrays/strings sliced by a size param —
// deterministic, no RNG.

export interface DpStep {
  table: number[][];
  cell: [number, number] | null;
  line: number;
  note: string;
}

export interface DpAlgoMeta {
  title: string;
  pseudocode: string[];
  python: string[];
  cpp: string[];
  complexity: { best: string; avg: string; worst: string; space: string };
  bullets: string[];
  checks: { q: string; a: string }[];
}

/** Hard cap so traces stay bounded. */
const MAX_STEPS = 5000;

function canPush(steps: DpStep[]): boolean {
  return steps.length < MAX_STEPS;
}

function clampInt(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, Math.floor(v)));
}

function snap2(t: number[][]): number[][] {
  return t.map((r) => [...r]);
}

// ---------------------------------------------------------------------------
// 0/1 Knapsack — line map: 1 init, 2 loop, 3 compare, 4 done
// ---------------------------------------------------------------------------
const KNAP_W = [2, 3, 4, 1, 5, 2];
const KNAP_V = [3, 4, 5, 2, 6, 3];
const KNAP_CAP = 6;

export function knapsackSteps(n: number): DpStep[] {
  const count = clampInt(n, 0, KNAP_W.length);
  const wt = KNAP_W.slice(0, count);
  const val = KNAP_V.slice(0, count);
  const dp: number[][] = Array.from({ length: count + 1 }, () => new Array<number>(KNAP_CAP + 1).fill(0));
  const steps: DpStep[] = [];
  steps.push({
    table: snap2(dp),
    cell: null,
    line: 1,
    note: `Init dp[0..${count}][0..${KNAP_CAP}] = 0 — cap=${KNAP_CAP}, weights=[${wt.join(',')}], values=[${val.join(',')}]`,
  });
  for (let i = 1; i <= count; i++) {
    if (!canPush(steps)) break;
    const wti = wt[i - 1];
    const vali = val[i - 1];
    steps.push({
      table: snap2(dp),
      cell: [i, 0],
      line: 2,
      note: `Row i=${i} — item wt=${wti}, val=${vali}`,
    });
    for (let w = 0; w <= KNAP_CAP; w++) {
      if (!canPush(steps)) break;
      if (w < wti) {
        dp[i][w] = dp[i - 1][w];
        steps.push({
          table: snap2(dp),
          cell: [i, w],
          line: 3,
          note: `dp[${i}][${w}] = dp[${i - 1}][${w}] = ${dp[i][w]} — too heavy (wt ${wti} > ${w}), skip`,
        });
      } else {
        const skip = dp[i - 1][w];
        const take = dp[i - 1][w - wti] + vali;
        dp[i][w] = skip >= take ? skip : take;
        steps.push({
          table: snap2(dp),
          cell: [i, w],
          line: 3,
          note: `dp[${i}][${w}] = max(skip ${skip}, take ${take}) = ${dp[i][w]} — ${take > skip ? 'take' : 'skip'}`,
        });
      }
    }
  }
  if (canPush(steps)) {
    steps.push({
      table: snap2(dp),
      cell: null,
      line: 4,
      note: `Done — best value dp[${count}][${KNAP_CAP}] = ${dp[count][KNAP_CAP]}`,
    });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// LCS — line map: 1 init, 2 loop, 3 compare, 4 done
// ---------------------------------------------------------------------------
const LCS_A_FULL = 'ABCBDAB';
const LCS_B_FULL = 'BDCABA';

export function lcsSteps(n?: number): DpStep[] {
  let a = LCS_A_FULL;
  let b = LCS_B_FULL;
  if (n !== undefined) {
    const k = clampInt(n, 1, Math.max(a.length, b.length));
    a = a.slice(0, k);
    b = b.slice(0, k);
  }
  const m = a.length;
  const nb = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(nb + 1).fill(0));
  const steps: DpStep[] = [];
  steps.push({
    table: snap2(dp),
    cell: null,
    line: 1,
    note: `Init dp[0..${m}][0..${nb}] = 0 — A="${a}", B="${b}"`,
  });
  for (let i = 1; i <= m; i++) {
    if (!canPush(steps)) break;
    steps.push({
      table: snap2(dp),
      cell: [i, 0],
      line: 2,
      note: `Row i=${i} — A[${i - 1}]="${a[i - 1]}"`,
    });
    for (let j = 1; j <= nb; j++) {
      if (!canPush(steps)) break;
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        steps.push({
          table: snap2(dp),
          cell: [i, j],
          line: 3,
          note: `Match "${a[i - 1]}" — dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${dp[i][j]}`,
        });
      } else {
        const up = dp[i - 1][j];
        const left = dp[i][j - 1];
        dp[i][j] = up >= left ? up : left;
        steps.push({
          table: snap2(dp),
          cell: [i, j],
          line: 3,
          note: `"${a[i - 1]}" vs "${b[j - 1]}" — dp[${i}][${j}] = max(${up}, ${left}) = ${dp[i][j]}`,
        });
      }
    }
  }
  if (canPush(steps)) {
    steps.push({
      table: snap2(dp),
      cell: null,
      line: 4,
      note: `Done — LCS length dp[${m}][${nb}] = ${dp[m][nb]}`,
    });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// LIS — line map: 1 init, 2 loop, 3 compare, 4 done (single-row table)
// ---------------------------------------------------------------------------
const LIS_ALL = [10, 9, 2, 5, 3, 7, 101, 18];

export function lisSteps(n: number): DpStep[] {
  const count = clampInt(n, 0, LIS_ALL.length);
  const x = LIS_ALL.slice(0, count);
  const dp = new Array<number>(count).fill(0);
  const steps: DpStep[] = [];
  steps.push({
    table: [[...dp]],
    cell: null,
    line: 1,
    note: `Init dp = [0 x ${count}] — x=[${x.join(',')}]`,
  });
  for (let i = 0; i < count; i++) {
    if (!canPush(steps)) break;
    dp[i] = 1;
    steps.push({
      table: [[...dp]],
      cell: [0, i],
      line: 2,
      note: `i=${i} — x[i]=${x[i]}, dp[i]=1`,
    });
    for (let j = 0; j < i; j++) {
      if (!canPush(steps)) break;
      if (x[j] < x[i]) {
        const before = dp[i];
        const cand = dp[j] + 1;
        if (cand > before) dp[i] = cand;
        steps.push({
          table: [[...dp]],
          cell: [0, i],
          line: 3,
          note: `x[${j}]=${x[j]} < x[${i}]=${x[i]} — dp[${i}] = max(${before}, ${cand}) = ${dp[i]}`,
        });
      } else {
        steps.push({
          table: [[...dp]],
          cell: [0, i],
          line: 3,
          note: `x[${j}]=${x[j]} vs x[${i}]=${x[i]} — no extend, dp[${i}]=${dp[i]}`,
        });
      }
    }
  }
  if (canPush(steps)) {
    const ans = count === 0 ? 0 : Math.max(...dp);
    steps.push({
      table: [[...dp]],
      cell: null,
      line: 4,
      note: `Done — LIS length max(dp) = ${ans}`,
    });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Coin change (min coins) — line map: 1 init, 2 loop, 3 compare, 4 done
// ---------------------------------------------------------------------------
const COINS = [1, 3, 4];

export function coinSteps(amount: number): DpStep[] {
  const target = clampInt(amount, 0, 30);
  const INF = target + 1;
  const dp = new Array<number>(target + 1).fill(INF);
  dp[0] = 0;
  const steps: DpStep[] = [];
  steps.push({
    table: [[...dp]],
    cell: null,
    line: 1,
    note: `Init dp[0]=0, dp[1..${target}]=inf — coins=[${COINS.join(',')}]`,
  });
  for (let a = 1; a <= target; a++) {
    if (!canPush(steps)) break;
    steps.push({
      table: [[...dp]],
      cell: [0, a],
      line: 2,
      note: `Amount ${a} — try coins [${COINS.join(',')}]`,
    });
    for (const c of COINS) {
      if (!canPush(steps)) break;
      if (c > a) continue;
      const cand = dp[a - c] + 1;
      const before = dp[a];
      if (cand < before) dp[a] = cand;
      steps.push({
        table: [[...dp]],
        cell: [0, a],
        line: 3,
        note: `Coin ${c} — dp[${a - c}]+1 = ${cand} ${cand < before ? `< ${before} — take` : `>= ${before} — keep`} → dp[${a}]=${dp[a]}`,
      });
    }
  }
  if (canPush(steps)) {
    steps.push({
      table: [[...dp]],
      cell: null,
      line: 4,
      note: `Done — min coins for ${target} = ${dp[target]}`,
    });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Curriculum content — python/cpp each hold 4 single lines aligned to 1..4.
// ---------------------------------------------------------------------------
export const DP_ALGOS: Record<'knapsack' | 'lcs' | 'lis' | 'coin', DpAlgoMeta> = {
  knapsack: {
    title: '0/1 Knapsack',
    pseudocode: [
      'dp[0][*] = dp[*][0] = 0          // 1 init',
      'for i = 1..n, w = 0..cap:         // 2 loop',
      '  dp[i][w] = w<wt[i] ? dp[i-1][w] : max(dp[i-1][w], dp[i-1][w-wt[i]]+val[i])  // 3 compare',
      'done — answer dp[n][cap]          // 4 done',
    ],
    python: [
      'dp = [[0] * (cap + 1) for _ in range(n + 1)]  # 1 init',
      'for i in range(1, n + 1):  # + for w in range(cap + 1):  # 2 loop',
      '    dp[i][w] = dp[i-1][w] if w < wt[i-1] else max(dp[i-1][w], dp[i-1][w-wt[i-1]] + val[i-1])  # 3 compare',
      '# done — answer dp[n][cap]  # 4 done',
    ],
    cpp: [
      'vector<vector<int>> dp(n + 1, vector<int>(cap + 1, 0)); // 1 init',
      'for (int i = 1; i <= n; ++i) for (int w = 0; w <= cap; ++w) // 2 loop',
      '    dp[i][w] = (w < wt[i-1]) ? dp[i-1][w] : max(dp[i-1][w], dp[i-1][w-wt[i-1]] + val[i-1]); // 3 compare',
      '// done — answer dp[n][cap]; // 4 done',
    ],
    complexity: { best: 'O(n·cap)', avg: 'O(n·cap)', worst: 'O(n·cap)', space: 'O(n·cap)' },
    bullets: [
      'Each row i decides item i once: skip it or take it (0/1 — no repeats).',
      'Column w is a capacity budget; dp[i][w] is the best value using items 1..i within w.',
      'Demo fixes cap=6 with weights/values sliced from fixed arrays — deterministic, no RNG.',
    ],
    checks: [
      { q: 'Why dp[i-1][w-wt[i]] and not dp[i][w-wt[i]]?', a: 'Row i-1 excludes item i, enforcing 0/1 use; dp[i][...] would allow reuse (unbounded).' },
      { q: 'Where is the answer, and how do you recover the items?', a: 'dp[n][cap]; walk back from (n, cap), taking item i whenever dp[i][w] != dp[i-1][w].' },
    ],
  },
  lcs: {
    title: 'Longest Common Subsequence',
    pseudocode: [
      'dp[0][*] = dp[*][0] = 0          // 1 init',
      'for i = 1..m, j = 1..n:           // 2 loop',
      '  dp[i][j] = A[i]==B[j] ? dp[i-1][j-1]+1 : max(dp[i-1][j], dp[i][j-1])  // 3 compare',
      'done — answer dp[m][n]            // 4 done',
    ],
    python: [
      'dp = [[0] * (n + 1) for _ in range(m + 1)]  # 1 init',
      'for i in range(1, m + 1):  # + for j in range(1, n + 1):  # 2 loop',
      '    dp[i][j] = dp[i-1][j-1] + 1 if A[i-1] == B[j-1] else max(dp[i-1][j], dp[i][j-1])  # 3 compare',
      '# done — answer dp[m][n]  # 4 done',
    ],
    cpp: [
      'vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0)); // 1 init',
      'for (int i = 1; i <= m; ++i) for (int j = 1; j <= n; ++j) // 2 loop',
      '    dp[i][j] = (A[i-1] == B[j-1]) ? dp[i-1][j-1] + 1 : max(dp[i-1][j], dp[i][j-1]); // 3 compare',
      '// done — answer dp[m][n]; // 4 done',
    ],
    complexity: { best: 'O(m·n)', avg: 'O(m·n)', worst: 'O(m·n)', space: 'O(m·n)' },
    bullets: [
      'Match extends the diagonal by 1; mismatch inherits the best of top/left.',
      'First row/column stay 0 — an empty prefix has no common subsequence.',
      'Demo uses fixed strings "ABCBDAB" / "BDCABA" (sliced by size) — deterministic, no RNG.',
    ],
    checks: [
      { q: 'Why +1 only on a match?', a: 'Only a matching pair can extend a common subsequence; otherwise the LCS already lives in a shorter prefix.' },
      { q: 'How do you recover the actual subsequence?', a: 'Backtrack from (m, n): match → take the char and go diagonal; else step toward the larger of top/left.' },
    ],
  },
  lis: {
    title: 'Longest Increasing Subsequence',
    pseudocode: [
      'dp[i] = 1 for all i              // 1 init',
      'for i = 0..n-1:                  // 2 loop',
      '  for j < i: if x[j] < x[i]: dp[i] = max(dp[i], dp[j]+1)  // 3 compare',
      'done — answer max(dp)            // 4 done',
    ],
    python: [
      'dp = [1] * n  # 1 init',
      'for i in range(n):  # 2 loop',
      '    for j in range(i): dp[i] = max(dp[i], dp[j] + 1) if x[j] < x[i] else dp[i]  # 3 compare',
      '# done — answer max(dp)  # 4 done',
    ],
    cpp: [
      'vector<int> dp(n, 1); // 1 init',
      'for (int i = 0; i < n; ++i) // 2 loop',
      '    for (int j = 0; j < i; ++j) if (x[j] < x[i]) dp[i] = max(dp[i], dp[j] + 1); // 3 compare',
      '// done — answer max(dp); // 4 done',
    ],
    complexity: { best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(n)' },
    bullets: [
      'dp[i] is the length of the best increasing subsequence ending exactly at i.',
      'Single-row table: cell [0,i] holds dp[i]; the demo array is fixed, sliced by size.',
      'The answer is max(dp), not dp[n-1] — the longest subsequence can end anywhere.',
    ],
    checks: [
      { q: 'Why is strict < required?', a: 'Strictly increasing forbids equal neighbours; <= would count non-decreasing instead.' },
      { q: 'Where does O(n²) come from?', a: 'Each i scans all j < i — n·(n-1)/2 pairs.' },
    ],
  },
  coin: {
    title: 'Coin Change (Min Coins)',
    pseudocode: [
      'dp[0] = 0; dp[1..amt] = inf      // 1 init',
      'for a = 1..amount:                // 2 loop',
      '  dp[a] = min over coins c<=a of dp[a-c]+1  // 3 compare',
      'done — answer dp[amount]          // 4 done',
    ],
    python: [
      'dp = [0] + [amount + 1] * amount  # 1 init',
      'for a in range(1, amount + 1):  # 2 loop',
      '    dp[a] = min(dp[a - c] + 1 for c in coins if c <= a)  # 3 compare',
      '# done — answer dp[amount]  # 4 done',
    ],
    cpp: [
      'vector<int> dp(amount + 1, amount + 1); dp[0] = 0; // 1 init',
      'for (int a = 1; a <= amount; ++a) // 2 loop',
      '    for (int c : coins) if (c <= a) dp[a] = min(dp[a], dp[a - c] + 1); // 3 compare',
      '// done — answer dp[amount]; // 4 done',
    ],
    complexity: { best: 'O(amount·k)', avg: 'O(amount·k)', worst: 'O(amount·k)', space: 'O(amount)' },
    bullets: [
      'dp[a] is the fewest coins for amount a; each coin tries to extend a smaller solved amount.',
      'Coins [1,3,4] guarantee every amount is reachable (1 covers all gaps).',
      'Unbounded reuse: dp[a-c] may itself use coin c — unlike 0/1 knapsack.',
    ],
    checks: [
      { q: 'Why must amounts ascend?', a: 'dp[a-c] with c >= 1 is always a smaller amount, so ascending a guarantees subproblems are solved.' },
      { q: 'Does greedy (always take 4) work here?', a: 'No: 6 = 3+3 (2 coins) beats 4+1+1 (3 coins) — DP checks every coin.' },
    ],
  },
};
