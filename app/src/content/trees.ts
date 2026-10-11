// Tree step generators + curriculum content.
//
// Line maps (1-indexed into TREE_ALGOS[id].pseudocode):
//   bst:  1 key, 2 walk/compare, 3 attach, 4 done
//   heap: 1 sift-start, 2 compare children, 3 swap/sift, 4 done

export interface TreeNode {
  id: number;
  value: number;
  left: number | null;
  right: number | null;
}

export interface TreeStep {
  nodes: TreeNode[];
  root: number | null;
  highlight: number | null;
  visited: number[];
  line: number;
  note: string;
}

export interface TreeAlgoMeta {
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

function canPush(steps: TreeStep[]): boolean {
  return steps.length < MAX_STEPS;
}

function snap(nodes: TreeNode[]): TreeNode[] {
  return nodes.map((n) => ({ ...n }));
}

function inorderValues(nodes: TreeNode[], root: number | null): number[] {
  const byId = new Map<number, TreeNode>();
  for (const n of nodes) byId.set(n.id, n);
  const out: number[] = [];
  const seen = new Set<number>();
  const walk = (id: number | null | undefined): void => {
    if (id === null || id === undefined) return;
    if (seen.has(id)) return;
    const node = byId.get(id);
    if (!node) return;
    seen.add(id);
    walk(node.left);
    out.push(node.value);
    walk(node.right);
  };
  walk(root);
  return out;
}

/** Rebuild linked nodes from a heap array: id = index, complete-tree links. */
function arrayToNodes(a: number[]): { nodes: TreeNode[]; root: number | null } {
  const nodes: TreeNode[] = a.map((value, id) => ({
    id,
    value,
    left: 2 * id + 1 < a.length ? 2 * id + 1 : null,
    right: 2 * id + 2 < a.length ? 2 * id + 2 : null,
  }));
  return { nodes, root: a.length > 0 ? 0 : null };
}

function heapStr(a: number[]): string {
  return `heap=[${a.join(',')}]`;
}

// ---------------------------------------------------------------------------
// BST insert — line map: 1 key, 2 walk/compare, 3 attach, 4 done
// ---------------------------------------------------------------------------
const BST_DEFAULT = [50, 30, 70, 20, 40, 60, 80];

export function bstSteps(values: number[] = BST_DEFAULT): TreeStep[] {
  const keys = (Array.isArray(values) ? values : []).filter((v) => Number.isFinite(v));
  const steps: TreeStep[] = [];
  const nodes: TreeNode[] = [];
  const byId = new Map<number, TreeNode>();
  let root: number | null = null;
  let nextId = 0;
  const visited: number[] = [];

  if (keys.length === 0) {
    steps.push({ nodes: [], root: null, highlight: null, visited: [], line: 4, note: 'Done — empty tree' });
    return steps;
  }

  for (const key of keys) {
    if (!canPush(steps)) break;
    steps.push({
      nodes: snap(nodes),
      root,
      highlight: null,
      visited: [...visited],
      line: 1,
      note: `Insert key=${key}`,
    });

    if (root === null) {
      const id = nextId++;
      const node: TreeNode = { id, value: key, left: null, right: null };
      nodes.push(node);
      byId.set(id, node);
      root = id;
      if (!canPush(steps)) break;
      steps.push({
        nodes: snap(nodes),
        root,
        highlight: id,
        visited: [...visited],
        line: 3,
        note: `Attach ${key} as root`,
      });
      visited.push(id);
      if (!canPush(steps)) break;
      steps.push({
        nodes: snap(nodes),
        root,
        highlight: id,
        visited: [...visited],
        line: 4,
        note: `Inserted ${key} — inorder=[${inorderValues(nodes, root).join(',')}]`,
      });
      continue;
    }

    let cur: number | null = root;
    let parent: number | null = null;
    let went = '';
    while (cur !== null) {
      if (!canPush(steps)) break;
      const curNode = byId.get(cur);
      if (!curNode) break;
      const cmp =
        key < curNode.value
          ? `${curNode.value} > ${key} go left`
          : key > curNode.value
            ? `${curNode.value} < ${key} go right`
            : `${key} == ${curNode.value} go right`;
      steps.push({
        nodes: snap(nodes),
        root,
        highlight: cur,
        visited: [...visited],
        line: 2,
        note: cmp,
      });
      parent = cur;
      if (key < curNode.value) {
        went = 'left';
        cur = curNode.left;
      } else {
        went = 'right';
        cur = curNode.right;
      }
    }
    if (!canPush(steps)) break;
    const id = nextId++;
    const node: TreeNode = { id, value: key, left: null, right: null };
    nodes.push(node);
    byId.set(id, node);
    const p = parent !== null ? byId.get(parent) : undefined;
    if (p && went === 'left') p.left = id;
    else if (p) p.right = id;
    steps.push({
      nodes: snap(nodes),
      root,
      highlight: id,
      visited: [...visited],
      line: 3,
      note: p ? `Attach ${key} as ${went} of ${p.value}` : `Attach ${key} as root`,
    });
    visited.push(id);
    if (!canPush(steps)) break;
    steps.push({
      nodes: snap(nodes),
      root,
      highlight: id,
      visited: [...visited],
      line: 4,
      note: `Inserted ${key} — inorder=[${inorderValues(nodes, root).join(',')}]`,
    });
  }

  if (canPush(steps)) {
    steps.push({
      nodes: snap(nodes),
      root,
      highlight: null,
      visited: [...visited],
      line: 4,
      note: `Done — BST inorder=[${inorderValues(nodes, root).join(',')}]`,
    });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Max-heap build (sift-down) + one extract-max.
// Line map: 1 sift-start, 2 compare children, 3 swap/sift, 4 done
// ---------------------------------------------------------------------------
const HEAP_DEFAULT = [20, 50, 30, 10, 40, 60, 80];

export function heapSteps(values: number[] = HEAP_DEFAULT): TreeStep[] {
  const a = (Array.isArray(values) ? values : []).filter((v) => Number.isFinite(v));
  const steps: TreeStep[] = [];

  const snapHeap = (highlight: number | null, visited: number[], line: number, note: string): void => {
    if (!canPush(steps)) return;
    const built = arrayToNodes(a);
    steps.push({ nodes: built.nodes, root: built.root, highlight, visited: [...visited], line, note });
  };

  if (a.length === 0) {
    snapHeap(null, [], 4, 'Done — empty heap');
    return steps;
  }

  const childDesc = (i: number): string => {
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    if (right < a.length) return `L=${a[left]},R=${a[right]}`;
    return `L=${a[left]}`;
  };

  const siftFrom = (start: number, visited: number[]): void => {
    let i = start;
    for (;;) {
      if (!canPush(steps)) return;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left >= a.length) return;
      let largest = i;
      if (a[left] > a[largest]) largest = left;
      if (right < a.length && a[right] > a[largest]) largest = right;
      snapHeap(largest, visited, 2, `Compare i=${i} (${a[i]}) vs ${childDesc(i)} — ${heapStr(a)}`);
      if (largest === i) return;
      const tmp = a[i];
      a[i] = a[largest];
      a[largest] = tmp;
      snapHeap(largest, visited, 3, `Swap i=${i} <-> ${largest} — ${heapStr(a)}`);
      i = largest;
    }
  };

  // Build: sift-down from last parent to root.
  const doneRoots: number[] = [];
  for (let start = Math.floor(a.length / 2) - 1; start >= 0; start--) {
    if (!canPush(steps)) break;
    snapHeap(start, [...doneRoots], 1, `Sift-down i=${start} (val=${a[start]}) — ${heapStr(a)}`);
    siftFrom(start, [...doneRoots]);
    doneRoots.push(start);
  }
  if (!canPush(steps)) return steps;
  const allIds = a.map((_, idx) => idx);
  snapHeap(null, allIds, 4, `Done — max-heap valid, ${heapStr(a)}`);

  // One extract-max: swap root with last, pop, sift-down root.
  if (a.length > 0 && canPush(steps)) {
    const last = a.length - 1;
    const tmp = a[0];
    a[0] = a[last];
    a[last] = tmp;
    snapHeap(
      last,
      allIds.filter((id) => id !== last),
      3,
      `Swap root ${a[last]} with last ${a[0]} — ${heapStr(a)}`,
    );
    const max = a.pop() as number;
    const remaining = a.map((_, idx) => idx);
    if (canPush(steps)) {
      const rest = arrayToNodes(a);
      steps.push({
        nodes: rest.nodes,
        root: rest.root,
        highlight: null,
        visited: [...remaining],
        line: 3,
        note: `Extract max=${max} — ${heapStr(a)}`,
      });
    }
    if (a.length > 0 && canPush(steps)) {
      snapHeap(0, [...remaining], 1, `Sift-down i=0 (val=${a[0]}) — ${heapStr(a)}`);
      siftFrom(0, [...remaining]);
    }
    if (canPush(steps)) {
      snapHeap(null, [...remaining], 4, `Done — extracted max=${max}, ${heapStr(a)}`);
    }
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Curriculum content — pseudocode/python/cpp each hold 4 single lines (<64 chars).
// ---------------------------------------------------------------------------
export const TREE_ALGOS: Record<'bst' | 'heap', TreeAlgoMeta> = {
  bst: {
    title: 'Binary Search Tree Insert',
    pseudocode: [
      'key=k; cur=root, par=null      // 1 key',
      'while cur: k<cur?left:right     // 2 walk',
      'attach k under par (or root)    // 3 link',
      'done — inorder sorted           // 4 done',
    ],
    python: [
      'par, cur = None, root  # 1 key',
      'while cur: cur = cur.L if k < cur.v else cur.R  # 2 walk',
      'link k under par or root  # 3 link',
      '# done — inorder sorted  # 4 done',
    ],
    cpp: [
      'Node *cur = root, *par = nullptr; // 1 key',
      'while (cur) cur = k < cur->v ? cur->L : cur->R; // 2 walk',
      'link k under par (or root = k); // 3 link',
      '// done — inorder sorted; // 4 done',
    ],
    complexity: { best: 'O(log n)', avg: 'O(log n)', worst: 'O(n)', space: 'O(n)' },
    bullets: [
      'Left holds smaller keys, right holds larger — inorder reads sorted.',
      'Walk from the root compares once per level until a null link.',
      'Degenerate inserts (sorted input) chain to O(n) height.',
    ],
    checks: [
      {
        q: 'Where does a new key attach?',
        a: 'As a leaf: the walk ends at a null left/right link of its parent.',
      },
      {
        q: 'Why is the final note an inorder list?',
        a: 'Inorder of a BST is sorted, so it verifies placement of every key.',
      },
    ],
  },
  heap: {
    title: 'Max-Heap Build + Extract-Max',
    pseudocode: [
      'for i = lastParent..0: sift(i)  // 1 sift',
      'm = max(i, left, right)         // 2 compare',
      'swap + sift down if m != i      // 3 swap',
      'done — heap valid; pop max      // 4 done',
    ],
    python: [
      'for i in range(n // 2 - 1, -1, -1):  # 1 sift',
      '    m = argmax(i, L, R)  # 2 compare',
      '    swap + sift down  # 3 swap',
      '# done — heap valid, pop max  # 4 done',
    ],
    cpp: [
      'for (int i = n/2-1; i >= 0; --i) // 1 sift',
      '    m = largest(i, L, R); // 2 compare',
      '    swap + sift down; // 3 swap',
      '// done — heap valid, pop max; // 4 done',
    ],
    complexity: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    bullets: [
      'Build runs sift-down from the last parent up to the root, in place.',
      'Sift-down swaps the node with its largest child until the heap holds.',
      'Extract-max moves the last element to the root, pops, then sifts.',
    ],
    checks: [
      {
        q: 'Why start the build at the last parent, not a leaf?',
        a: 'Leaves already satisfy the heap property; the last parent is the lowest node that can violate it.',
      },
      {
        q: 'What does the array mirror show?',
        a: 'The heap array after each mutation — the tree is rebuilt from it every step.',
      },
    ],
  },
};
