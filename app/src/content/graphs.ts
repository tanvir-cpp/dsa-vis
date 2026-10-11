// Graph step generators + curriculum content (P2).
// Line map (1-indexed into GRAPH_ALGOS[id].pseudocode):
//   1 init, 2 pop/min, 3 expand/relax, 4 done.

export interface GraphStep {
  current: number | null;
  visited_order: number[];
  frontier: number[];
  dist: (number | null)[];
  parent: (number | null)[];
  line: number;
  note: string;
}

export interface DemoGraph {
  n: number;
  edges: [number, number][];
  weighted?: [number, number, number][];
  positions: [number, number][];
  label: string;
}

export interface GraphAlgoMeta {
  title: string;
  pseudocode: string[];
  complexity: { best: string; avg: string; worst: string; space: string };
  bullets: string[];
  checks: { q: string; a: string }[];
}

const MAX_STEPS = 10000;

function canPush(steps: GraphStep[]): boolean {
  return steps.length < MAX_STEPS;
}

function clampStart(n: number, start: number): number {
  if (n <= 0) return 0;
  if (!Number.isFinite(start)) return 0;
  return Math.min(Math.max(Math.floor(start), 0), n - 1);
}

function buildAdj(n: number, edges: [number, number][]): number[][] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const e of edges) {
    const u = e[0];
    const v = e[1];
    if (!Number.isInteger(u) || !Number.isInteger(v)) continue;
    if (u < 0 || u >= n || v < 0 || v >= n) continue;
    if (u === v) continue;
    if (!adj[u].includes(v)) adj[u].push(v);
    if (!adj[v].includes(u)) adj[v].push(u);
  }
  for (let i = 0; i < n; i++) adj[i].sort((a, b) => a - b);
  return adj;
}

function buildDirectedAdj(n: number, edges: [number, number][]): number[][] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const e of edges) {
    const u = e[0];
    const v = e[1];
    if (!Number.isInteger(u) || !Number.isInteger(v)) continue;
    if (u < 0 || u >= n || v < 0 || v >= n) continue;
    if (u === v) continue;
    if (!adj[u].includes(v)) adj[u].push(v);
  }
  for (let i = 0; i < n; i++) adj[i].sort((a, b) => a - b);
  return adj;
}

function buildWeightedAdj(n: number, weighted: [number, number, number][]): { to: number; w: number }[][] {
  const adj: { to: number; w: number }[][] = Array.from({ length: n }, () => []);
  for (const e of weighted) {
    const u = e[0];
    const v = e[1];
    const w = e[2];
    if (!Number.isInteger(u) || !Number.isInteger(v)) continue;
    if (!Number.isFinite(w)) continue;
    if (u < 0 || u >= n || v < 0 || v >= n) continue;
    if (u === v) continue;
    adj[u].push({ to: v, w });
    adj[v].push({ to: u, w });
  }
  for (let i = 0; i < n; i++) adj[i].sort((a, b) => a.to - b.to);
  return adj;
}

function emptyDone(note: string): GraphStep[] {
  return [{ current: null, visited_order: [], frontier: [], dist: [], parent: [], line: 4, note }];
}

// ---------------------------------------------------------------------------
// BFS — line map: 1 init, 2 pop, 3 expand, 4 done
// ---------------------------------------------------------------------------
export function bfsSteps(n: number, edges: [number, number][], start: number): GraphStep[] {
  if (!Number.isFinite(n) || Math.floor(n) <= 0) return emptyDone('Done — empty graph');
  const size = Math.floor(n);
  const s = clampStart(size, start);
  const adj = buildAdj(size, edges);
  const dist: (number | null)[] = new Array(size).fill(null);
  const parent: (number | null)[] = new Array(size).fill(null);
  dist[s] = 0;
  const visited = new Set<number>([s]);
  const queue: number[] = [s];
  const order: number[] = [];
  const steps: GraphStep[] = [];
  steps.push({
    current: null,
    visited_order: [],
    frontier: [...queue],
    dist: [...dist],
    parent: [...parent],
    line: 1,
    note: `Start BFS from ${s} — queue=[${s}]`,
  });
  while (queue.length > 0) {
    if (!canPush(steps)) break;
    const u = queue.shift() as number;
    order.push(u);
    steps.push({
      current: u,
      visited_order: [...order],
      frontier: [...queue],
      dist: [...dist],
      parent: [...parent],
      line: 2,
      note: `Dequeue u=${u} — order [${order.join(',')}]`,
    });
    const nbrs = adj[u] ?? [];
    for (const v of nbrs) {
      if (visited.has(v)) continue;
      visited.add(v);
      dist[v] = (dist[u] ?? 0) + 1;
      parent[v] = u;
      queue.push(v);
      if (!canPush(steps)) break;
      steps.push({
        current: u,
        visited_order: [...order],
        frontier: [...queue],
        dist: [...dist],
        parent: [...parent],
        line: 3,
        note: `Expand ${u}->${v} — dist[${v}]=${dist[v]}, queue=[${queue.join(',')}]`,
      });
    }
  }
  if (canPush(steps)) {
    steps.push({
      current: null,
      visited_order: [...order],
      frontier: [],
      dist: [...dist],
      parent: [...parent],
      line: 4,
      note: `Done — BFS order [${order.join(',')}]`,
    });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// DFS (iterative, deterministic) — line map: 1 init, 2 pop/visit, 3 push, 4 done
// ---------------------------------------------------------------------------
export function dfsSteps(n: number, edges: [number, number][], start: number): GraphStep[] {
  if (!Number.isFinite(n) || Math.floor(n) <= 0) return emptyDone('Done — empty graph');
  const size = Math.floor(n);
  const s = clampStart(size, start);
  const adj = buildAdj(size, edges);
  const dist: (number | null)[] = new Array(size).fill(null);
  const parent: (number | null)[] = new Array(size).fill(null);
  dist[s] = 0;
  const visited = new Set<number>();
  const order: number[] = [];
  const stack: number[] = [s];
  const steps: GraphStep[] = [];
  steps.push({
    current: null,
    visited_order: [],
    frontier: [...stack],
    dist: [...dist],
    parent: [...parent],
    line: 1,
    note: `Start DFS from ${s} — stack=[${s}]`,
  });
  while (stack.length > 0) {
    if (!canPush(steps)) break;
    const u = stack.pop() as number;
    if (visited.has(u)) continue;
    visited.add(u);
    order.push(u);
    steps.push({
      current: u,
      visited_order: [...order],
      frontier: [...stack],
      dist: [...dist],
      parent: [...parent],
      line: 2,
      note: `Visit u=${u} — order [${order.join(',')}]`,
    });
    const nbrs = [...(adj[u] ?? [])].sort((a, b) => b - a);
    for (const v of nbrs) {
      if (visited.has(v) || stack.includes(v)) continue;
      if (v !== s && parent[v] === null) parent[v] = u;
      if (dist[v] === null) dist[v] = (dist[u] ?? 0) + 1;
      stack.push(v);
      if (!canPush(steps)) break;
      steps.push({
        current: u,
        visited_order: [...order],
        frontier: [...stack],
        dist: [...dist],
        parent: [...parent],
        line: 3,
        note: `Push ${v} from ${u} — stack=[${stack.join(',')}]`,
      });
    }
  }
  if (canPush(steps)) {
    steps.push({
      current: null,
      visited_order: [...order],
      frontier: [],
      dist: [...dist],
      parent: [...parent],
      line: 4,
      note: `Done — DFS order [${order.join(',')}]`,
    });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Dijkstra (O(V^2), deterministic tie-break by index)
// Line map: 1 init, 2 extract-min, 3 relax, 4 done
// ---------------------------------------------------------------------------
export function dijkstraSteps(
  n: number,
  weighted: [number, number, number][],
  start: number,
): GraphStep[] {
  if (!Number.isFinite(n) || Math.floor(n) <= 0) return emptyDone('Done — empty graph');
  const size = Math.floor(n);
  const s = clampStart(size, start);
  const adj = buildWeightedAdj(size, weighted);
  const dist: (number | null)[] = new Array(size).fill(null);
  const parent: (number | null)[] = new Array(size).fill(null);
  const done: boolean[] = new Array(size).fill(false);
  dist[s] = 0;
  const order: number[] = [];
  const steps: GraphStep[] = [];
  const frontierOf = (): number[] => {
    const f: number[] = [];
    for (let i = 0; i < size; i++) {
      if (!done[i] && dist[i] !== null) f.push(i);
    }
    return f;
  };
  steps.push({
    current: null,
    visited_order: [],
    frontier: frontierOf(),
    dist: [...dist],
    parent: [...parent],
    line: 1,
    note: `Start Dijkstra from ${s} — dist[${s}]=0`,
  });
  for (;;) {
    if (!canPush(steps)) break;
    let u: number | null = null;
    let best = Infinity;
    for (let i = 0; i < size; i++) {
      if (done[i] || dist[i] === null) continue;
      const d = dist[i] as number;
      if (d < best) {
        best = d;
        u = i;
      }
    }
    if (u === null) break;
    done[u] = true;
    order.push(u);
    steps.push({
      current: u,
      visited_order: [...order],
      frontier: frontierOf(),
      dist: [...dist],
      parent: [...parent],
      line: 2,
      note: `Extract-min u=${u} (dist=${dist[u]})`,
    });
    const nbrs = adj[u] ?? [];
    for (const e of nbrs) {
      const v = e.to;
      const w = e.w;
      if (done[v]) continue;
      const nd = (dist[u] as number) + w;
      if (dist[v] === null || nd < (dist[v] as number)) {
        dist[v] = nd;
        parent[v] = u;
        if (!canPush(steps)) break;
        steps.push({
          current: u,
          visited_order: [...order],
          frontier: frontierOf(),
          dist: [...dist],
          parent: [...parent],
          line: 3,
          note: `Relax ${u}->${v} (w=${w}) — dist[${v}]=${nd}`,
        });
      } else {
        if (!canPush(steps)) break;
        steps.push({
          current: u,
          visited_order: [...order],
          frontier: frontierOf(),
          dist: [...dist],
          parent: [...parent],
          line: 3,
          note: `Check ${u}->${v} (w=${w}) — no improvement (dist[${v}]=${dist[v]})`,
        });
      }
    }
  }
  if (canPush(steps)) {
    steps.push({
      current: null,
      visited_order: [...order],
      frontier: [],
      dist: [...dist],
      parent: [...parent],
      line: 4,
      note: `Done — dist [${dist.map((d) => (d === null ? '∞' : String(d))).join(',')}]`,
    });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Topo (Kahn, deterministic smallest-first)
// Line map: 1 init, 2 pop, 3 remove-edge/enqueue, 4 done
// ---------------------------------------------------------------------------
export function topoSteps(n: number, edges: [number, number][], _start?: number): GraphStep[] {
  void _start;
  if (!Number.isFinite(n) || Math.floor(n) <= 0) return emptyDone('Done — empty graph');
  const size = Math.floor(n);
  const adj = buildDirectedAdj(size, edges);
  const indeg: number[] = new Array(size).fill(0);
  for (let u = 0; u < size; u++) {
    for (const v of adj[u]) indeg[v] += 1;
  }
  const dist: (number | null)[] = new Array(size).fill(null);
  const parent: (number | null)[] = new Array(size).fill(null);
  const queue: number[] = [];
  for (let i = 0; i < size; i++) {
    if (indeg[i] === 0) queue.push(i);
  }
  queue.sort((a, b) => a - b);
  const order: number[] = [];
  const steps: GraphStep[] = [];
  steps.push({
    current: null,
    visited_order: [],
    frontier: [...queue],
    dist: [...dist],
    parent: [...parent],
    line: 1,
    note: `Start topo — indeg=[${indeg.join(',')}], queue=[${queue.join(',')}]`,
  });
  while (queue.length > 0) {
    if (!canPush(steps)) break;
    queue.sort((a, b) => a - b);
    const u = queue.shift() as number;
    order.push(u);
    steps.push({
      current: u,
      visited_order: [...order],
      frontier: [...queue],
      dist: [...dist],
      parent: [...parent],
      line: 2,
      note: `Pop u=${u} — order [${order.join(',')}]`,
    });
    const nbrs = adj[u] ?? [];
    for (const v of nbrs) {
      indeg[v] -= 1;
      if (indeg[v] === 0) {
        queue.push(v);
        if (!canPush(steps)) break;
        steps.push({
          current: u,
          visited_order: [...order],
          frontier: [...queue],
          dist: [...dist],
          parent: [...parent],
          line: 3,
          note: `Remove ${u}->${v} — indeg[${v}]=0, enqueue ${v}`,
        });
      } else {
        if (!canPush(steps)) break;
        steps.push({
          current: u,
          visited_order: [...order],
          frontier: [...queue],
          dist: [...dist],
          parent: [...parent],
          line: 3,
          note: `Remove ${u}->${v} — indeg[${v}]=${indeg[v]}`,
        });
      }
    }
  }
  if (canPush(steps)) {
    const cyclic = order.length !== size;
    steps.push({
      current: null,
      visited_order: [...order],
      frontier: [],
      dist: [...dist],
      parent: [...parent],
      line: 4,
      note: cyclic
        ? `Done — cycle detected, order [${order.join(',')}] (${order.length}/${size})`
        : `Done — topo order [${order.join(',')}]`,
    });
  }
  return steps;
}

/** Dispatcher used by GraphPage. */
export function stepsForGraph(id: string, demo: DemoGraph, start: number): GraphStep[] {
  switch (id) {
    case 'dfs':
      return dfsSteps(demo.n, demo.edges, start);
    case 'dijkstra': {
      const w: [number, number, number][] =
        demo.weighted ?? demo.edges.map((e): [number, number, number] => [e[0], e[1], 1]);
      return dijkstraSteps(demo.n, w, start);
    }
    case 'topo':
      return topoSteps(demo.n, demo.edges);
    case 'bfs':
    default:
      return bfsSteps(demo.n, demo.edges, start);
  }
}

export const DEMO_GRAPHS: Record<string, DemoGraph> = {
  line5: {
    n: 5,
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
    positions: [
      [40, 150],
      [120, 150],
      [200, 150],
      [280, 150],
      [360, 150],
    ],
    label: 'Line of 5 nodes',
  },
  grid6: {
    n: 6,
    edges: [
      [0, 1],
      [1, 2],
      [3, 4],
      [4, 5],
      [0, 3],
      [1, 4],
      [2, 5],
    ],
    positions: [
      [80, 70],
      [200, 70],
      [320, 70],
      [80, 230],
      [200, 230],
      [320, 230],
    ],
    label: '2x3 grid (6 nodes)',
  },
  weighted5: {
    n: 5,
    edges: [
      [0, 1],
      [0, 2],
      [1, 2],
      [1, 3],
      [2, 3],
      [3, 4],
    ],
    weighted: [
      [0, 1, 4],
      [0, 2, 1],
      [2, 1, 2],
      [1, 3, 1],
      [2, 3, 5],
      [3, 4, 3],
    ],
    positions: [
      [60, 150],
      [150, 70],
      [150, 230],
      [260, 150],
      [350, 150],
    ],
    label: 'Weighted 5 (Dijkstra demo)',
  },
};

export const GRAPH_ALGOS: Record<string, GraphAlgoMeta> = {
  bfs: {
    title: 'Breadth-First Search',
    pseudocode: [
      'queue=[s]; dist[s]=0            // 1 init',
      'while queue: u=queue.popleft()  // 2 pop',
      '  for v in adj[u]: visit new    // 3 expand',
      'done — level order              // 4 done',
    ],
    complexity: { best: 'O(V+E)', avg: 'O(V+E)', worst: 'O(V+E)', space: 'O(V)' },
    bullets: [
      'Queue yields level order — first visit to v uses the fewest edges.',
      'dist[] holds hop counts; parent[] rebuilds the BFS tree.',
      'Adjacency is scanned in sorted order so demos are deterministic.',
    ],
    checks: [
      {
        q: 'Why does BFS give shortest paths on unweighted graphs?',
        a: 'Nodes leave the queue in nondecreasing dist, so the first visit uses the fewest edges.',
      },
      { q: 'What does the frontier show?', a: 'Queue contents — discovered but not yet dequeued nodes.' },
    ],
  },
  dfs: {
    title: 'Depth-First Search',
    pseudocode: [
      'stack=[s]                       // 1 init',
      'while stack: u=stack.pop()      // 2 pop',
      '  for v in adj[u]: push new     // 3 expand',
      'done — depth-first order        // 4 done',
    ],
    complexity: { best: 'O(V+E)', avg: 'O(V+E)', worst: 'O(V+E)', space: 'O(V)' },
    bullets: [
      'Stack dives deep first — explores one branch before backtracking.',
      'parent[] records the DFS tree; order depends on adjacency order.',
      'Iterative version here visits smallest neighbors first for determinism.',
    ],
    checks: [
      {
        q: 'BFS vs DFS — when does DFS win?',
        a: 'Narrow/deep search, path existence, topo sort and cycle detection — O(h) stack vs O(V) queue.',
      },
      { q: 'What does the frontier show?', a: 'Stack contents — the current backtrack path plus pending branches.' },
    ],
  },
  dijkstra: {
    title: "Dijkstra's Algorithm",
    pseudocode: [
      'dist[s]=0; rest=inf             // 1 init',
      'u = unvisited min dist          // 2 extract-min',
      '  for (v,w): relax dist[v]      // 3 relax',
      'done — dist[] final             // 4 done',
    ],
    complexity: { best: 'O((V+E) log V)', avg: 'O((V+E) log V)', worst: 'O((V+E) log V)', space: 'O(V)' },
    bullets: [
      'Greedy: the unsettled min dist is final — needs non-negative weights.',
      'Relaxation lowers dist[v] via u whenever dist[u]+w is better.',
      'Tie-break by smallest index so the trace is deterministic.',
    ],
    checks: [
      {
        q: 'Why no negative weights?',
        a: 'A settled node could later improve via a negative edge, breaking the greedy guarantee.',
      },
      { q: 'What does the frontier show?', a: 'Unsettled nodes with finite dist — the extract-min candidates.' },
    ],
  },
  topo: {
    title: 'Topological Sort (Kahn)',
    pseudocode: [
      'indeg[v] for all v              // 1 init',
      'queue = indeg-0; u=pop()        // 2 pop',
      '  remove u->v; enqueue zeros    // 3 expand',
      'done — linear order or cycle    // 4 done',
    ],
    complexity: { best: 'O(V+E)', avg: 'O(V+E)', worst: 'O(V+E)', space: 'O(V)' },
    bullets: [
      'Only DAGs have a full order — leftover nodes mean a cycle.',
      'Smallest-first queue keeps the demo order deterministic.',
      'Edges here are directed u->v, unlike BFS/DFS demos.',
    ],
    checks: [
      { q: 'How is a cycle detected?', a: 'Order shorter than V — some nodes never reach indegree 0.' },
      { q: 'Why start with indegree-0 nodes?', a: 'They have no prerequisites, so they can safely come first.' },
    ],
  },
};
