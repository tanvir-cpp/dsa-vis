import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Module {
  title: string;
  desc: string;
  links: { to: string; label: string }[];
}

const MODULES: Module[] = [
  {
    title: 'Sorting',
    desc: 'Compare-based sorts, traced step by step.',
    links: [
      { to: '/sort/bubble', label: 'Bubble' },
      { to: '/sort/selection', label: 'Selection' },
      { to: '/sort/insertion', label: 'Insertion' },
      { to: '/sort/merge', label: 'Merge' },
      { to: '/sort/quick', label: 'Quick' },
    ],
  },
  {
    title: 'Searching',
    desc: 'Linear and binary search over arrays.',
    links: [
      { to: '/search/linear', label: 'Linear' },
      { to: '/search/binary', label: 'Binary' },
    ],
  },
  {
    title: 'Arrays',
    desc: 'Two pointers, sliding windows, prefix sums, Kadane, rotation, dedup.',
    links: [
      { to: '/arrays/twosum', label: 'Two Sum' },
      { to: '/arrays/sliding', label: 'Sliding Window' },
      { to: '/arrays/prefix', label: 'Prefix Sums' },
      { to: '/arrays/kadane', label: 'Kadane' },
      { to: '/arrays/rotate', label: 'Rotate' },
      { to: '/arrays/dedup', label: 'Dedup' },
    ],
  },
  {
    title: 'Structures',
    desc: 'BST, Union-Find, linked lists, stacks and queues.',
    links: [
      { to: '/structures', label: 'BST / Union-Find' },
      { to: '/linked/list', label: 'Linked List' },
      { to: '/linked/stack', label: 'Stack' },
      { to: '/linked/queue', label: 'Queue' },
    ],
  },
  {
    title: 'Graphs',
    desc: 'BFS, DFS, Dijkstra and topo sort on small demos.',
    links: [
      { to: '/graph/bfs', label: 'BFS' },
      { to: '/graph/dfs', label: 'DFS' },
      { to: '/graph/dijkstra', label: 'Dijkstra' },
      { to: '/graph/topo', label: 'Topo Sort' },
    ],
  },
  {
    title: 'DP',
    desc: 'Knapsack, LCS, LIS and coin change tables.',
    links: [
      { to: '/dp/knapsack', label: 'Knapsack' },
      { to: '/dp/lcs', label: 'LCS' },
      { to: '/dp/lis', label: 'LIS' },
      { to: '/dp/coin', label: 'Coin Change' },
    ],
  },
  {
    title: 'Strings',
    desc: 'KMP matching and trie prefix trees.',
    links: [
      { to: '/string/kmp', label: 'KMP' },
      { to: '/string/naive', label: 'Naive' },
      { to: '/trie/insert', label: 'Trie Insert' },
      { to: '/trie/search', label: 'Trie Search' },
    ],
  },
  {
    title: 'Trees',
    desc: 'BST inserts and max-heap build as real trees.',
    links: [
      { to: '/trees/bst', label: 'BST' },
      { to: '/trees/heap', label: 'Max-Heap' },
    ],
  },
  {
    title: 'Pathfinding',
    desc: 'BFS vs greedy vs A* on grids with walls.',
    links: [
      { to: '/path/bfs', label: 'BFS Path' },
      { to: '/path/greedy', label: 'Greedy' },
      { to: '/path/astar', label: 'A*' },
    ],
  },
];

export default function Home(): ReactNode {
  return (
    <div>
      <h1>Data structures &amp; algorithms, visualized</h1>
      <p>
        Pick a module. Each visualizer steps through an exact trace: array state,
        comparisons, swaps, and the source line behind them.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
          marginTop: 20,
        }}
      >
        {MODULES.map((m) => (
          <section
            key={m.title}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '14px 16px',
              background: 'var(--surface)',
            }}
          >
            <h2 style={{ margin: '0 0 4px', fontSize: 16 }}>{m.title}</h2>
            <p style={{ margin: '0 0 10px', color: 'var(--muted)', fontSize: 14 }}>{m.desc}</p>
            {m.links.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
                {m.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Coming soon.</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
