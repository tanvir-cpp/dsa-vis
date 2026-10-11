import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import './Layout.css';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem('dsa-vis-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

const SORT_LINKS = [
  { to: '/sort/bubble', label: 'Bubble' },
  { to: '/sort/selection', label: 'Selection' },
  { to: '/sort/insertion', label: 'Insertion' },
  { to: '/sort/merge', label: 'Merge' },
  { to: '/sort/quick', label: 'Quick' },
];

const SEARCH_LINKS = [
  { to: '/search/linear', label: 'Linear' },
  { to: '/search/binary', label: 'Binary' },
];

const GRAPH_LINKS = [
  { to: '/graph/bfs', label: 'BFS' },
  { to: '/graph/dfs', label: 'DFS' },
  { to: '/graph/dijkstra', label: 'Dijkstra' },
  { to: '/graph/topo', label: 'Topo Sort' },
];

const DP_LINKS = [
  { to: '/dp/knapsack', label: 'Knapsack' },
  { to: '/dp/lcs', label: 'LCS' },
  { to: '/dp/lis', label: 'LIS' },
  { to: '/dp/coin', label: 'Coin Change' },
];

const STRING_LINKS = [
  { to: '/string/kmp', label: 'KMP' },
  { to: '/string/naive', label: 'Naive' },
];

const ARRAY_LINKS = [
  { to: '/arrays/twosum', label: 'Two Sum' },
  { to: '/arrays/sliding', label: 'Sliding Window' },
  { to: '/arrays/prefix', label: 'Prefix Sums' },
  { to: '/arrays/kadane', label: 'Kadane' },
  { to: '/arrays/rotate', label: 'Rotate' },
  { to: '/arrays/dedup', label: 'Dedup' },
];

const PATH_LINKS = [
  { to: '/path/bfs', label: 'BFS Path' },
  { to: '/path/greedy', label: 'Greedy' },
  { to: '/path/astar', label: 'A*' },
];

const TREE_LINKS = [
  { to: '/trees/bst', label: 'BST' },
  { to: '/trees/heap', label: 'Max-Heap' },
  { to: '/trie/insert', label: 'Trie Insert' },
  { to: '/trie/search', label: 'Trie Search' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('dsa-vis-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            DSA·vis
          </span>
        </Link>
        <div className="topbar-actions">
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label="Toggle color theme">
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <a
            className="gh-link"
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </header>
      <div className="shell-body">
        <nav className="sidebar" aria-label="Curriculum">
          <div className="nav-group">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Home
            </NavLink>
          </div>
          <div className="nav-group">
            <p className="nav-heading">Sorting</p>
            {SORT_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="nav-group">
            <p className="nav-heading">Searching</p>
            {SEARCH_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="nav-group">
            <p className="nav-heading">Structures</p>
            <NavLink to="/structures" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              BST / Union-Find
            </NavLink>
            <NavLink to="/linked/list" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Linked List
            </NavLink>
            <NavLink to="/linked/stack" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Stack
            </NavLink>
            <NavLink to="/linked/queue" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Queue
            </NavLink>
          </div>
          <div className="nav-group">
            <p className="nav-heading">Graphs</p>
            {GRAPH_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="nav-group">
            <p className="nav-heading">DP</p>
            {DP_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="nav-group">
            <p className="nav-heading">Strings</p>
            {STRING_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="nav-group">
            <p className="nav-heading">Arrays</p>
            {ARRAY_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="nav-group">
            <p className="nav-heading">Trees</p>
            {TREE_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="nav-group">
            <p className="nav-heading">Pathfinding</p>
            {PATH_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </nav>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
