import type { TrieNodeSnap } from '../../content/trie';
import './TrieSvg.css';

export interface TrieSvgProps {
  nodes: TrieNodeSnap[];
  highlight: number | null;
  visited?: number[];
}

const R = 14;
const RING_R = 18;
const X_GAP = 40;
const Y_GAP = 56;
const Y_TOP = 28;
const PAD_X = 28;
const PAD_Y = 30;

interface Pt {
  x: number;
  y: number;
}

function depthOf(
  id: number,
  byId: Map<number, TrieNodeSnap>,
  memo: Map<number, number>,
  trail: Set<number>,
): number {
  const hit = memo.get(id);
  if (hit !== undefined) return hit;
  const n = byId.get(id);
  if (!n || n.parent === null || !byId.has(n.parent) || trail.has(id)) {
    memo.set(id, 0);
    return 0;
  }
  trail.add(id);
  const d = depthOf(n.parent, byId, memo, trail) + 1;
  trail.delete(id);
  memo.set(id, d);
  return d;
}

function nodeClass(id: number, highlight: number | null, visited: number[]): string {
  if (highlight === id) return 'tnode tnode-current';
  if (visited.includes(id)) return 'tnode tnode-visited';
  return 'tnode tnode-default';
}

export default function TrieSvg({ nodes, highlight, visited }: TrieSvgProps) {
  const seen: number[] = visited ?? [];

  const byId = new Map<number, TrieNodeSnap>();
  for (const n of nodes) byId.set(n.id, n);

  // Rebuild children map from parent ids; sort by edge char for stable order.
  const children = new Map<number, number[]>();
  for (const n of nodes) children.set(n.id, []);
  for (const n of nodes) {
    if (n.parent !== null && children.has(n.parent)) {
      children.get(n.parent)?.push(n.id);
    }
  }
  for (const ids of children.values()) {
    ids.sort((a, b) => {
      const la = byId.get(a)?.label ?? '';
      const lb = byId.get(b)?.label ?? '';
      return la < lb ? -1 : la > lb ? 1 : a - b;
    });
  }

  const memo = new Map<number, number>();
  const pos = new Map<number, Pt>();
  const placed = new Set<number>();
  let cursor = 0;

  // DFS leaf-order: leaves take the next slot left-to-right,
  // internal nodes center over the mean of their children.
  const place = (id: number): number => {
    const existing = pos.get(id);
    if (existing !== undefined) return existing.x;
    if (placed.has(id)) return cursor * X_GAP;
    placed.add(id);
    const kids = (children.get(id) ?? []).filter((k) => !placed.has(k));
    const y = depthOf(id, byId, memo, new Set()) * Y_GAP + Y_TOP;
    if (kids.length === 0) {
      const x = cursor * X_GAP;
      cursor += 1;
      pos.set(id, { x, y });
      return x;
    }
    const xs = kids.map((k) => place(k));
    const x = xs.reduce((a, b) => a + b, 0) / xs.length;
    pos.set(id, { x, y });
    return x;
  };

  if (byId.has(0)) place(0);
  for (const n of nodes) {
    if (!placed.has(n.id)) place(n.id);
  }

  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  let first = true;
  for (const p of pos.values()) {
    if (first) {
      minX = p.x;
      maxX = p.x;
      minY = p.y;
      maxY = p.y;
      first = false;
    } else {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }

  const w = pos.size === 0 ? 240 : Math.max(240, maxX - minX + PAD_X * 2);
  const h = pos.size === 0 ? 160 : Math.max(160, maxY - minY + PAD_Y * 2);
  const vx = pos.size === 0 ? 0 : (minX + maxX) / 2 - w / 2;
  const vy = pos.size === 0 ? 0 : (minY + maxY) / 2 - h / 2;

  const terminals = nodes.filter((n) => n.terminal).length;
  const ariaLabel =
    `Trie with ${nodes.length} nodes` +
    (highlight === null ? ', no current node' : `, current node ${highlight}`) +
    `, ${terminals} terminal`;

  return (
    <div className="triesvg-wrap">
      <svg className="triesvg" viewBox={`${vx} ${vy} ${w} ${h}`} role="img" aria-label={ariaLabel}>
        {nodes.map((n) => {
          if (n.parent === null) return null;
          const a = pos.get(n.parent);
          const b = pos.get(n.id);
          if (!a || !b) return null;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          return (
            <g key={`e-${n.id}`}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="tedge" />
              <text x={mx} y={my - 4} textAnchor="middle" className="tedge-label">
                {n.label}
              </text>
            </g>
          );
        })}
        {nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const isCurrent = highlight === n.id;
          const isRoot = n.parent === null;
          return (
            <g key={n.id}>
              {n.terminal && <circle cx={p.x} cy={p.y} r={RING_R} className="tnode-ring" />}
              <circle cx={p.x} cy={p.y} r={R} className={nodeClass(n.id, highlight, seen)}>
                <title>
                  {isRoot ? 'root' : `node ${n.id} '${n.label}'${n.terminal ? ' terminal' : ''}`}
                </title>
              </circle>
              <text
                x={p.x}
                y={p.y + 4}
                textAnchor="middle"
                className={isCurrent ? 'tlabel tlabel-current' : 'tlabel'}
              >
                {isRoot ? '·' : n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="trie-legend">
        <span>
          <i className="dot dot-current" />
          Current
        </span>
        <span>
          <i className="dot dot-terminal" />
          Terminal
        </span>
        <span>
          <i className="dot dot-default" />
          Plain
        </span>
      </div>
    </div>
  );
}
