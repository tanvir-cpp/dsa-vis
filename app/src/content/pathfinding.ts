// Pathfinding step generators + curriculum content.
// Line map (1-indexed into PATH_ALGOS[id].pseudocode):
//   1 init, 2 pop-best, 3 expand-neighbors, 4 done/reconstruct.

export interface PathStep {
  visited: [number, number][];
  path: [number, number][];
  frontier: [number, number][];
  line: number;
  note: string;
}

export type PathAlgoId = 'bfs' | 'greedy' | 'astar';
export type PathPreset = 'empty' | 'corridor' | 'random';

export const PATH_ROWS = 12;
export const PATH_COLS = 12;
export const PATH_START: [number, number] = [1, 1];
export const PATH_GOAL: [number, number] = [10, 10];

// ---------------------------------------------------------------------------
// Deterministic LCG (copy of app/src/content/algorithms.ts, matches
// dsa-core/src/prng.rs: Knuth MMIX A=6364136223846793005, C=1, mod 2^64)
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

// ---------------------------------------------------------------------------
// Grid helpers
// ---------------------------------------------------------------------------
const MAX_STEPS = 5000;

// Deterministic neighbor order: up, right, down, left.
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
];

function keyOf(r: number, c: number): string {
  return `${r},${c}`;
}

function manhattan(a: [number, number], b: [number, number]): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function inBounds(r: number, c: number, rows: number, cols: number): boolean {
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

function canPush(n: number): boolean {
  return n < MAX_STEPS;
}

function copyCells(cells: [number, number][]): [number, number][] {
  return cells.map(([r, c]): [number, number] => [r, c]);
}

function sameCell(a: [number, number], b: [number, number]): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

// ---------------------------------------------------------------------------
// Wall presets (walls as Set<string> "r,c"; start/goal never walls)
// ---------------------------------------------------------------------------
export function wallsForPreset(
  preset: string,
  rows: number,
  cols: number,
  seed: number,
): Set<string> {
  const r = Math.max(1, Math.floor(rows));
  const c = Math.max(1, Math.floor(cols));
  const walls = new Set<string>();
  const p = preset.toLowerCase();

  if (p === 'corridor') {
    // Vertical bars with staggered gaps forcing an S-shaped detour.
    // Bars at c=3 (gap r=10), c=6 (gap r=2), c=9 (gap r=10).
    const bars: { col: number; gap: number }[] = [
      { col: 3, gap: 10 },
      { col: 6, gap: 2 },
      { col: 9, gap: 10 },
    ];
    for (const bar of bars) {
      if (bar.col < 0 || bar.col >= c) continue;
      for (let row = 0; row < r; row++) {
        if (row === bar.gap) continue;
        walls.add(keyOf(row, bar.col));
      }
    }
  } else if (p === 'random') {
    // ~20% walls, deterministic LCG in row-major order.
    const rng = new Lcg(seed);
    for (let row = 0; row < r; row++) {
      for (let col = 0; col < c; col++) {
        if (row === PATH_START[0] && col === PATH_START[1]) continue;
        if (row === PATH_GOAL[0] && col === PATH_GOAL[1]) continue;
        if (rng.genRange(0, 99) < 20) walls.add(keyOf(row, col));
      }
    }
  }
  // 'empty' (and unknown presets): no walls.

  // Start/goal are never walls.
  walls.delete(keyOf(PATH_START[0], PATH_START[1]));
  walls.delete(keyOf(PATH_GOAL[0], PATH_GOAL[1]));
  return walls;
}

function reconstructPath(
  parent: Map<string, [number, number]>,
  start: [number, number],
  goal: [number, number],
): [number, number][] {
  const full: [number, number][] = [];
  const startKey = keyOf(start[0], start[1]);
  let cur: [number, number] = [goal[0], goal[1]];
  let curKey = keyOf(cur[0], cur[1]);
  // Walk back parents from goal to start.
  const guard = 10000;
  let n = 0;
  const rev: [number, number][] = [];
  while (n < guard) {
    rev.push([cur[0], cur[1]]);
    if (curKey === startKey) break;
    const p = parent.get(curKey);
    if (p === undefined) break;
    cur = [p[0], p[1]];
    curKey = keyOf(cur[0], cur[1]);
    n += 1;
  }
  // rev is goal..start; reverse to start..goal.
  for (let i = rev.length - 1; i >= 0; i--) {
    const cell = rev[i] as [number, number];
    full.push([cell[0], cell[1]]);
  }
  // Validate chain starts at start; otherwise treat as broken.
  if (full.length === 0 || !sameCell(full[0] as [number, number], start)) return [];
  return full;
}

function pushReveal(
  steps: PathStep[],
  order: [number, number][],
  fullPath: [number, number][],
  doneNote: string,
): void {
  if (fullPath.length === 0) {
    if (canPush(steps.length)) {
      steps.push({
        visited: copyCells(order),
        path: [],
        frontier: [],
        line: 4,
        note: doneNote,
      });
    }
    return;
  }
  for (let i = 1; i <= fullPath.length; i++) {
    if (!canPush(steps.length)) break;
    const partial = copyCells(fullPath.slice(0, i));
    const last = i === fullPath.length;
    steps.push({
      visited: copyCells(order),
      path: partial,
      frontier: [],
      line: 4,
      note: last ? doneNote : `Reconstruct ${i}/${fullPath.length} — back via parent`,
    });
  }
}

// ---------------------------------------------------------------------------
// BFS — line map: 1 init, 2 pop, 3 expand, 4 done
// ---------------------------------------------------------------------------
export function bfsPath(
  rows: number,
  cols: number,
  walls: Set<string>,
  start: [number, number],
  goal: [number, number],
): PathStep[] {
  const r = Math.max(1, Math.floor(rows));
  const c = Math.max(1, Math.floor(cols));
  const steps: PathStep[] = [];
  const startKey = keyOf(start[0], start[1]);
  const goalKey = keyOf(goal[0], goal[1]);
  const discovered = new Set<string>([startKey]);
  const parent = new Map<string, [number, number]>();
  const queue: [number, number][] = [[start[0], start[1]]];
  const order: [number, number][] = [];

  steps.push({
    visited: [],
    path: [],
    frontier: copyCells(queue),
    line: 1,
    note: `Start BFS (${start[0]},${start[1]})->(${goal[0]},${goal[1]}) q=[${startKey}]`,
  });

  let found = sameCell(start, goal);
  while (queue.length > 0) {
    if (!canPush(steps.length)) break;
    const u = queue.shift() as [number, number];
    order.push([u[0], u[1]]);
    steps.push({
      visited: copyCells(order),
      path: [],
      frontier: copyCells(queue),
      line: 2,
      note: `Pop (${u[0]},${u[1]}) — visited ${order.length} frontier ${queue.length}`,
    });
    if (keyOf(u[0], u[1]) === goalKey) {
      found = true;
      break;
    }
    for (const d of DIRS) {
      const vr = u[0] + d[0];
      const vc = u[1] + d[1];
      if (!inBounds(vr, vc, r, c)) continue;
      const vk = keyOf(vr, vc);
      if (walls.has(vk)) continue;
      if (discovered.has(vk)) continue;
      discovered.add(vk);
      parent.set(vk, [u[0], u[1]]);
      queue.push([vr, vc]);
      if (!canPush(steps.length)) break;
      steps.push({
        visited: copyCells(order),
        path: [],
        frontier: copyCells(queue),
        line: 3,
        note: `Expand (${u[0]},${u[1]})->(${vr},${vc}) — q=[${queue.length}]`,
      });
    }
  }

  if (found || discovered.has(goalKey)) {
    const full = sameCell(start, goal) ? [[start[0], start[1]] as [number, number]] : reconstructPath(parent, start, goal);
    if (full.length > 0) {
      pushReveal(steps, order, full, `Done — shortest len=${full.length} visited=${order.length}`);
    } else {
      if (canPush(steps.length)) {
        steps.push({
          visited: copyCells(order),
          path: [],
          frontier: [],
          line: 4,
          note: `Done — unreachable visited=${order.length}`,
        });
      }
    }
  } else {
    if (canPush(steps.length)) {
      steps.push({
        visited: copyCells(order),
        path: [],
        frontier: [],
        line: 4,
        note: `Done — unreachable visited=${order.length}`,
      });
    }
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Greedy best-first (manhattan h only) — 1 init, 2 pop-best, 3 expand, 4 done
// ---------------------------------------------------------------------------
export function greedyPath(
  rows: number,
  cols: number,
  walls: Set<string>,
  start: [number, number],
  goal: [number, number],
): PathStep[] {
  const r = Math.max(1, Math.floor(rows));
  const c = Math.max(1, Math.floor(cols));
  const steps: PathStep[] = [];
  const startKey = keyOf(start[0], start[1]);
  const goalKey = keyOf(goal[0], goal[1]);
  const parent = new Map<string, [number, number]>();
  const open: [number, number][] = [[start[0], start[1]]];
  const inOpen = new Set<string>([startKey]);
  const closed = new Set<string>();
  const order: [number, number][] = [];

  steps.push({
    visited: [],
    path: [],
    frontier: copyCells(open),
    line: 1,
    note: `Start greedy (${start[0]},${start[1]}) h=${manhattan(start, goal)}`,
  });

  let found = sameCell(start, goal);
  while (open.length > 0) {
    if (!canPush(steps.length)) break;
    // Pop min h, tie-break row then col for determinism.
    let best = 0;
    let bestH = manhattan(open[0] as [number, number], goal);
    for (let i = 1; i < open.length; i++) {
      const cell = open[i] as [number, number];
      const h = manhattan(cell, goal);
      const cur = open[best] as [number, number];
      if (h < bestH || (h === bestH && (cell[0] < cur[0] || (cell[0] === cur[0] && cell[1] < cur[1])))) {
        best = i;
        bestH = h;
      }
    }
    const u = open.splice(best, 1)[0] as [number, number];
    inOpen.delete(keyOf(u[0], u[1]));
    closed.add(keyOf(u[0], u[1]));
    order.push([u[0], u[1]]);
    steps.push({
      visited: copyCells(order),
      path: [],
      frontier: copyCells(open),
      line: 2,
      note: `Pop best (${u[0]},${u[1]}) h=${manhattan(u, goal)} — vis ${order.length}`,
    });
    if (keyOf(u[0], u[1]) === goalKey) {
      found = true;
      break;
    }
    for (const d of DIRS) {
      const vr = u[0] + d[0];
      const vc = u[1] + d[1];
      if (!inBounds(vr, vc, r, c)) continue;
      const vk = keyOf(vr, vc);
      if (walls.has(vk)) continue;
      if (closed.has(vk) || inOpen.has(vk)) continue;
      parent.set(vk, [u[0], u[1]]);
      open.push([vr, vc]);
      inOpen.add(vk);
      if (!canPush(steps.length)) break;
      steps.push({
        visited: copyCells(order),
        path: [],
        frontier: copyCells(open),
        line: 3,
        note: `Expand (${u[0]},${u[1]})->(${vr},${vc}) h=${manhattan([vr, vc], goal)}`,
      });
    }
  }

  if (found) {
    const full = sameCell(start, goal) ? [[start[0], start[1]] as [number, number]] : reconstructPath(parent, start, goal);
    if (full.length > 0) {
      pushReveal(steps, order, full, `Done — greedy len=${full.length} (not guaranteed optimal)`);
    } else if (canPush(steps.length)) {
      steps.push({
        visited: copyCells(order),
        path: [],
        frontier: [],
        line: 4,
        note: `Done — greedy unreachable visited=${order.length}`,
      });
    }
  } else {
    if (canPush(steps.length)) {
      steps.push({
        visited: copyCells(order),
        path: [],
        frontier: [],
        line: 4,
        note: `Done — greedy unreachable visited=${order.length}`,
      });
    }
  }
  return steps;
}

// ---------------------------------------------------------------------------
// A* (g + manhattan h, tie-break smaller h then row/col)
// Line map: 1 init, 2 pop-best, 3 relax/expand, 4 done
// ---------------------------------------------------------------------------
export function astarPath(
  rows: number,
  cols: number,
  walls: Set<string>,
  start: [number, number],
  goal: [number, number],
): PathStep[] {
  const r = Math.max(1, Math.floor(rows));
  const c = Math.max(1, Math.floor(cols));
  const steps: PathStep[] = [];
  const startKey = keyOf(start[0], start[1]);
  const goalKey = keyOf(goal[0], goal[1]);
  const parent = new Map<string, [number, number]>();
  const gScore = new Map<string, number>([[startKey, 0]]);
  const open: [number, number][] = [[start[0], start[1]]];
  const inOpen = new Set<string>([startKey]);
  const closed = new Set<string>();
  const order: [number, number][] = [];

  steps.push({
    visited: [],
    path: [],
    frontier: copyCells(open),
    line: 1,
    note: `Start A* (${start[0]},${start[1]}) g=0 h=${manhattan(start, goal)}`,
  });

  let found = sameCell(start, goal);
  while (open.length > 0) {
    if (!canPush(steps.length)) break;
    // Pop min f=g+h, tie-break smaller h then row/col.
    let best = 0;
    const first = open[0] as [number, number];
    let bestF = (gScore.get(keyOf(first[0], first[1])) ?? Infinity) + manhattan(first, goal);
    let bestH = manhattan(first, goal);
    for (let i = 1; i < open.length; i++) {
      const cell = open[i] as [number, number];
      const g = gScore.get(keyOf(cell[0], cell[1])) ?? Infinity;
      const h = manhattan(cell, goal);
      const f = g + h;
      const cur = open[best] as [number, number];
      if (
        f < bestF ||
        (f === bestF && h < bestH) ||
        (f === bestF && h === bestH && (cell[0] < cur[0] || (cell[0] === cur[0] && cell[1] < cur[1])))
      ) {
        best = i;
        bestF = f;
        bestH = h;
      }
    }
    const u = open.splice(best, 1)[0] as [number, number];
    const uk = keyOf(u[0], u[1]);
    inOpen.delete(uk);
    closed.add(uk);
    order.push([u[0], u[1]]);
    const ug = gScore.get(uk) ?? 0;
    steps.push({
      visited: copyCells(order),
      path: [],
      frontier: copyCells(open),
      line: 2,
      note: `Pop best (${u[0]},${u[1]}) g=${ug} h=${manhattan(u, goal)}`,
    });
    if (uk === goalKey) {
      found = true;
      break;
    }
    for (const d of DIRS) {
      const vr = u[0] + d[0];
      const vc = u[1] + d[1];
      if (!inBounds(vr, vc, r, c)) continue;
      const vk = keyOf(vr, vc);
      if (walls.has(vk)) continue;
      if (closed.has(vk)) continue;
      const tentative = ug + 1;
      const prev = gScore.get(vk);
      if (prev !== undefined && tentative >= prev) continue;
      gScore.set(vk, tentative);
      parent.set(vk, [u[0], u[1]]);
      if (!inOpen.has(vk)) {
        open.push([vr, vc]);
        inOpen.add(vk);
      }
      if (!canPush(steps.length)) break;
      steps.push({
        visited: copyCells(order),
        path: [],
        frontier: copyCells(open),
        line: 3,
        note: `Relax (${u[0]},${u[1]})->(${vr},${vc}) g=${tentative} f=${tentative + manhattan([vr, vc], goal)}`,
      });
    }
  }

  if (found) {
    const full = sameCell(start, goal) ? [[start[0], start[1]] as [number, number]] : reconstructPath(parent, start, goal);
    if (full.length > 0) {
      pushReveal(steps, order, full, `Done — optimal len=${full.length} visited=${order.length}`);
    } else if (canPush(steps.length)) {
      steps.push({
        visited: copyCells(order),
        path: [],
        frontier: [],
        line: 4,
        note: `Done — unreachable visited=${order.length}`,
      });
    }
  } else {
    if (canPush(steps.length)) {
      steps.push({
        visited: copyCells(order),
        path: [],
        frontier: [],
        line: 4,
        note: `Done — unreachable visited=${order.length}`,
      });
    }
  }
  return steps;
}

/** Dispatcher used by PathPage (12x12 default grid). */
export function stepsForPath(id: string, preset: string, seed: number): PathStep[] {
  const walls = wallsForPreset(preset, PATH_ROWS, PATH_COLS, seed);
  const low = id.toLowerCase();
  if (low === 'greedy') return greedyPath(PATH_ROWS, PATH_COLS, walls, PATH_START, PATH_GOAL);
  if (low === 'astar') return astarPath(PATH_ROWS, PATH_COLS, walls, PATH_START, PATH_GOAL);
  return bfsPath(PATH_ROWS, PATH_COLS, walls, PATH_START, PATH_GOAL);
}

// ---------------------------------------------------------------------------
// Curriculum content (code arrays: exactly 4 single lines <64 chars)
// ---------------------------------------------------------------------------
export interface PathAlgoMeta {
  title: string;
  pseudocode: [string, string, string, string];
  python: [string, string, string, string];
  cpp: [string, string, string, string];
  complexity: { best: string; avg: string; worst: string; space: string };
  bullets: [string, string, string];
  checks: [{ q: string; a: string }, { q: string; a: string }];
}

export const PATH_ALGOS: Record<PathAlgoId, PathAlgoMeta> = {
  bfs: {
    title: 'BFS Pathfinding',
    pseudocode: [
      'queue=[s]; parent[s]=none // 1 init',
      'u=queue.popleft() // 2 pop-best',
      'for w in nbrs(u): push new // 3 expand',
      'done: rebuild path via parent // 4 done',
    ],
    python: [
      'q=deque([s])  # 1 init',
      'u=q.popleft()  # 2 pop',
      'for w in nbrs(u): q.append(w)  # 3',
      'path=rebuild(parent)  # 4 done',
    ],
    cpp: [
      'queue<int> q; q.push(s); // 1 init',
      'int u=q.front(); q.pop(); // 2 pop',
      'for (w: nbrs(u)) q.push(w); // 3 exp',
      'rebuild path via parent; // 4 done',
    ],
    complexity: { best: 'O(R*C)', avg: 'O(R*C)', worst: 'O(R*C)', space: 'O(R*C)' },
    bullets: [
      'Queue expands in layers — first arrival uses fewest steps.',
      'Parent pointers rebuild one shortest path at the end.',
      'Worst case visits every free cell; stores queue + parents.',
    ],
    checks: [
      {
        q: 'Why is BFS optimal on a uniform grid?',
        a: 'Cells leave the queue in order of distance, so the goal pops via a shortest route.',
      },
      { q: 'What do visited and frontier show?', a: 'Visited are popped cells; frontier is the queue awaiting expansion.' },
    ],
  },
  greedy: {
    title: 'Greedy Best-First Search',
    pseudocode: [
      'open=[s]; h=manhattan // 1 init',
      'u=pop min h in open // 2 best',
      'for w in nbrs(u): push w,h // 3 exp',
      'done: rebuild via parent // 4 done',
    ],
    python: [
      'open=[s]  # 1 init h=manhattan',
      'u=min(open,key=h)  # 2 best',
      'for w in nbrs(u): open+=[w]  # 3',
      'path=rebuild(parent)  # 4 done',
    ],
    cpp: [
      'vector<C> open={s}; // 1 init',
      'u=popMinH(open); // 2 best',
      'for (w: nbrs(u)) push(w,h); // 3',
      'rebuild path; // 4 done',
    ],
    complexity: { best: 'O(L)', avg: 'O(R*C)', worst: 'O(R*C)', space: 'O(R*C)' },
    bullets: [
      'Picks smallest manhattan h — dives toward the goal fast.',
      'Ignores path cost g, so it can commit to a longer route.',
      'Same snapshots as BFS; done note is greedy, not optimal.',
    ],
    checks: [
      {
        q: 'When does greedy fail to be optimal?',
        a: 'It never reconsiders cost paid; a tempting corridor can hide a shorter lane.',
      },
      { q: 'How does it differ from A* here?', a: 'Greedy ranks by h alone; A* ranks by g+h with tie-breaks.' },
    ],
  },
  astar: {
    title: 'A* Pathfinding',
    pseudocode: [
      'open=[s]; g[s]=0 h=manh // 1 init',
      'u=pop min g+h, tie h // 2 best',
      'for w: relax g[w]=g[u]+1 // 3 exp',
      'done: optimal path via parent // 4',
    ],
    python: [
      'open=[s]; g={s:0}  # 1 init',
      'u=min(open,key=f)  # 2 best',
      'for w: relax g[w]=g[u]+1  # 3',
      'path=rebuild(parent)  # 4 done',
    ],
    cpp: [
      'open={s}; g[s]=0; // 1 init',
      'u=popMinF(open); // 2 best',
      'relax g[w]=g[u]+1; // 3 exp',
      'rebuild optimal path; // 4 done',
    ],
    complexity: { best: 'O(L)', avg: 'O(R*C)', worst: 'O(R*C)', space: 'O(R*C)' },
    bullets: [
      'Ranks by f=g+h; manhattan h is admissible on 4-dir grids.',
      'Tie-break smaller h then row/col keeps demos deterministic.',
      'Optimal with admissible h; degrades to BFS when h=0.',
    ],
    checks: [
      {
        q: 'Why is A* optimal here?',
        a: 'Uniform cost plus admissible manhattan h means first goal pop uses minimal g.',
      },
      { q: 'What does the tie-break do?', a: 'Equal-f nodes prefer smaller h, then row/col — same path every run.' },
    ],
  },
};
