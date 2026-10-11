import './BinaryTreeSvg.css';

export interface BinaryTreeNode {
  id: number;
  value: number;
  left: number | null;
  right: number | null;
}

export interface BinaryTreeSvgProps {
  nodes: BinaryTreeNode[];
  root: number | null;
  highlight: number | null;
  visited?: number[];
  ariaLabel?: string;
}

const GAP_X = 44;
const GAP_Y = 52;
const TOP = 24;
const LEFT_PAD = 24;
const NODE_R = 15;

interface Placed {
  x: number;
  y: number;
}

function nodeClass(id: number, highlight: number | null, seen: Set<number>): string {
  if (highlight === id) return 'tnode tnode-current';
  if (seen.has(id)) return 'tnode tnode-visited';
  return 'tnode tnode-default';
}

export default function BinaryTreeSvg({
  nodes,
  root,
  highlight,
  visited = [],
  ariaLabel,
}: BinaryTreeSvgProps) {
  const seen = new Set<number>(visited);
  const byId = new Map<number, BinaryTreeNode>();
  for (const n of nodes) byId.set(n.id, n);

  const label =
    ariaLabel ??
    `Binary tree with ${nodes.length} nodes` +
      (root === null || root === undefined ? ', empty' : `, root ${root}`) +
      (highlight === null || highlight === undefined ? '' : `, current ${highlight}`);

  const legend = (
    <div className="tree-legend">
      <span>
        <i className="dot dot-current" />
        Current
      </span>
      <span>
        <i className="dot dot-visited" />
        Visited
      </span>
      <span>
        <i className="dot dot-default" />
        Plain
      </span>
    </div>
  );

  if (root === null || root === undefined || !byId.has(root)) {
    return (
      <div className="treesvg-wrap">
        <p className="tree-empty">Empty tree.</p>
        <svg className="treesvg" viewBox="0 0 200 60" role="img" aria-label={label} />
        {legend}
      </div>
    );
  }

  const rootId: number = root;

  // Depth via BFS from root.
  const depth = new Map<number, number>();
  depth.set(rootId, 0);
  const queue: number[] = [rootId];
  while (queue.length > 0) {
    const id = queue.shift() as number;
    const node = byId.get(id);
    if (!node) continue;
    const d = depth.get(id) ?? 0;
    const children: (number | null)[] = [node.left, node.right];
    for (const c of children) {
      if (c === null || c === undefined) continue;
      if (!byId.has(c) || depth.has(c)) continue;
      depth.set(c, d + 1);
      queue.push(c);
    }
  }

  // Inorder index drives x; only nodes reachable from root are placed.
  const order = new Map<number, number>();
  const guard = new Set<number>();
  const inorder = (id: number | null | undefined): void => {
    if (id === null || id === undefined) return;
    if (guard.has(id)) return;
    const node = byId.get(id);
    if (!node) return;
    guard.add(id);
    inorder(node.left);
    order.set(id, order.size);
    inorder(node.right);
  };
  inorder(rootId);

  const pos = new Map<number, Placed>();
  let maxDepth = 0;
  for (const entry of order) {
    const d = depth.get(entry[0]) ?? 0;
    if (d > maxDepth) maxDepth = d;
    pos.set(entry[0], { x: entry[1] * GAP_X + LEFT_PAD, y: d * GAP_Y + TOP });
  }

  const count = order.size;
  const width = Math.max(200, count * GAP_X + 16);
  const height = maxDepth * GAP_Y + 64;

  const edges: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const n of nodes) {
    const p = pos.get(n.id);
    if (!p) continue;
    const kids: (number | null)[] = [n.left, n.right];
    for (const k of kids) {
      if (k === null || k === undefined) continue;
      const q = pos.get(k);
      if (!q) continue;
      edges.push({ key: `${n.id}-${k}`, x1: p.x, y1: p.y, x2: q.x, y2: q.y });
    }
  }

  return (
    <div className="treesvg-wrap">
      <svg className="treesvg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        {edges.map((e) => (
          <line key={e.key} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} className="tedge" />
        ))}
        {nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const current = highlight === n.id;
          return (
            <g key={n.id}>
              <circle cx={p.x} cy={p.y} r={NODE_R} className={nodeClass(n.id, highlight, seen)}>
                <title>{`node ${n.id} value=${n.value}`}</title>
              </circle>
              <text
                x={p.x}
                y={p.y + 4}
                textAnchor="middle"
                className={current ? 'tlabel tlabel-current' : 'tlabel'}
              >
                {n.value}
              </text>
            </g>
          );
        })}
      </svg>
      {legend}
    </div>
  );
}
