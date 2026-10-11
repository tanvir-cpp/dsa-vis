// Trie step generators + curriculum content.
//
// Line maps (1-indexed into TRIE_ALGOS[id].pseudocode):
//   insert: 1 new word, 2 walk/create per char, 3 mark terminal, 4 done
//   search: 1 query, 2 walk per char, 3 hit/miss result, 4 done

export interface TrieNodeSnap {
  id: number;
  label: string;
  terminal: boolean;
  parent: number | null;
}

export interface TrieStep {
  nodes: TrieNodeSnap[];
  highlight: number | null;
  prefix: string;
  line: number;
  note: string;
}

export interface TrieAlgoMeta {
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

const DEFAULT_WORDS = ['app', 'apple', 'ape', 'bat', 'bar'];

interface MutableNode {
  id: number;
  label: string;
  terminal: boolean;
  parent: number | null;
  children: Map<string, number>;
}

function newTrie(): MutableNode[] {
  return [{ id: 0, label: '', terminal: false, parent: null, children: new Map() }];
}

function snap(nodes: MutableNode[]): TrieNodeSnap[] {
  return nodes.map((n) => ({ id: n.id, label: n.label, terminal: n.terminal, parent: n.parent }));
}

function canPush(steps: TrieStep[]): boolean {
  return steps.length < MAX_STEPS;
}

function findChild(nodes: MutableNode[], cur: number, ch: string): number | null {
  const node = nodes[cur];
  if (!node) return null;
  const next = node.children.get(ch);
  return next === undefined ? null : next;
}

function addChild(nodes: MutableNode[], cur: number, ch: string): number {
  const id = nodes.length;
  const parent = nodes[cur];
  if (!parent) return cur;
  nodes.push({ id, label: ch, terminal: false, parent: cur, children: new Map() });
  parent.children.set(ch, id);
  return id;
}

// ---------------------------------------------------------------------------
// Insert — line map: 1 new word, 2 walk/create, 3 mark terminal, 4 done
// ---------------------------------------------------------------------------

export function trieInsertSteps(words: string[] = DEFAULT_WORDS): TrieStep[] {
  const nodes = newTrie();
  const steps: TrieStep[] = [];
  for (const word of words) {
    if (!canPush(steps)) break;
    steps.push({
      nodes: snap(nodes),
      highlight: null,
      prefix: '',
      line: 1,
      note: `new word "${word}"`,
    });
    let cur = 0;
    for (let i = 0; i < word.length; i++) {
      if (!canPush(steps)) break;
      const ch = word[i] ?? '';
      const prefix = word.slice(0, i + 1);
      const next = findChild(nodes, cur, ch);
      if (next !== null) {
        cur = next;
        steps.push({
          nodes: snap(nodes),
          highlight: cur,
          prefix,
          line: 2,
          note: `take '${ch}' → node ${cur}`,
        });
      } else {
        cur = addChild(nodes, cur, ch);
        steps.push({
          nodes: snap(nodes),
          highlight: cur,
          prefix,
          line: 2,
          note: `new node ${cur} for '${ch}'`,
        });
      }
    }
    if (!canPush(steps)) break;
    const end = nodes[cur];
    if (end) end.terminal = true;
    steps.push({
      nodes: snap(nodes),
      highlight: cur,
      prefix: word,
      line: 3,
      note: `mark terminal at node ${cur} ("${word}")`,
    });
  }
  if (canPush(steps)) {
    steps.push({
      nodes: snap(nodes),
      highlight: null,
      prefix: '',
      line: 4,
      note: `done — ${nodes.length} nodes, ${words.length} words`,
    });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Search — line map: 1 query, 2 walk, 3 hit/miss, 4 done
// ---------------------------------------------------------------------------

export function trieSearchSteps(words: string[], query: string): TrieStep[] {
  // Build the trie silently — only the query walk is traced.
  const nodes = newTrie();
  for (const word of words) {
    let cur = 0;
    for (const ch of word) {
      const next = findChild(nodes, cur, ch);
      cur = next !== null ? next : addChild(nodes, cur, ch);
    }
    const end = nodes[cur];
    if (end) end.terminal = true;
  }

  const steps: TrieStep[] = [];
  const push = (s: TrieStep): void => {
    if (canPush(steps)) steps.push(s);
  };

  if (query.length === 0) {
    push({ nodes: snap(nodes), highlight: null, prefix: '', line: 4, note: 'done — empty query' });
    return steps;
  }

  push({
    nodes: snap(nodes),
    highlight: 0,
    prefix: '',
    line: 1,
    note: `query "${query}" over ${nodes.length} nodes`,
  });

  let cur = 0;
  for (let i = 0; i < query.length; i++) {
    const ch = query[i] ?? '';
    const prefix = query.slice(0, i + 1);
    const next = findChild(nodes, cur, ch);
    if (next === null) {
      push({
        nodes: snap(nodes),
        highlight: cur,
        prefix,
        line: 3,
        note: `missing at '${ch}' after "${prefix.slice(0, -1)}"`,
      });
      push({
        nodes: snap(nodes),
        highlight: null,
        prefix,
        line: 4,
        note: `done — miss for "${query}"`,
      });
      return steps;
    }
    cur = next;
    push({
      nodes: snap(nodes),
      highlight: cur,
      prefix,
      line: 2,
      note: `take '${ch}' → node ${cur}`,
    });
  }

  const end = nodes[cur];
  if (end && end.terminal) {
    push({
      nodes: snap(nodes),
      highlight: cur,
      prefix: query,
      line: 3,
      note: `found "${query}", terminal at node ${cur}`,
    });
    push({
      nodes: snap(nodes),
      highlight: cur,
      prefix: query,
      line: 4,
      note: `done — hit for "${query}"`,
    });
  } else {
    push({
      nodes: snap(nodes),
      highlight: cur,
      prefix: query,
      line: 3,
      note: `prefix ok but not terminal at node ${cur}`,
    });
    push({
      nodes: snap(nodes),
      highlight: null,
      prefix: query,
      line: 4,
      note: `done — miss for "${query}"`,
    });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Curriculum content — pseudocode/python/cpp each hold 4 single lines (<64).
// ---------------------------------------------------------------------------

export const TRIE_ALGOS: Record<'insert' | 'search', TrieAlgoMeta> = {
  insert: {
    title: 'Trie Insert',
    pseudocode: [
      'node=root; take new word w // 1 new',
      'for c in w: walk/create child // 2 walk',
      'mark word-end node terminal // 3 mark',
      'done — N nodes stored // 4 done',
    ],
    python: [
      'node = root  # 1 new word',
      'for c in w: walk or add child  # 2 walk',
      'node.terminal = True  # 3 mark',
      '# done — N nodes stored  # 4 done',
    ],
    cpp: [
      'Node *node = root; // 1 new word',
      'for (c : w) walk or add child; // 2 walk',
      'node->terminal = true; // 3 mark',
      '// done — N nodes stored; // 4 done',
    ],
    complexity: { best: 'O(L)', avg: 'O(L)', worst: 'O(L)', space: 'O(N)' },
    bullets: [
      'Each word walks one edge per char, adding a node only on a miss.',
      'Word-end nodes are flagged terminal; shared prefixes share nodes.',
      'Space is O(N) for N total inserted characters.',
    ],
    checks: [
      {
        q: 'Why do "app" and "apple" share nodes?',
        a: 'Common prefixes share one path; "apple" extends the "app" chain with two more nodes.',
      },
      {
        q: 'What marks a complete word?',
        a: 'The terminal flag on the word-end node — a prefix alone is not a word.',
      },
    ],
  },
  search: {
    title: 'Trie Search',
    pseudocode: [
      'node=root; query=q // 1 query',
      'for c in q: follow child // 2 walk',
      'hit if terminal else miss // 3 result',
      'done — report hit/miss // 4 done',
    ],
    python: [
      'node = root  # 1 query',
      'for c in q: follow child  # 2 walk',
      'hit = node.terminal  # 3 result',
      '# done — report hit/miss  # 4 done',
    ],
    cpp: [
      'Node *node = root; // 1 query',
      'for (c : q) node = child(c); // 2 walk',
      'hit = node && node->terminal; // 3 result',
      '// done — report hit/miss; // 4 done',
    ],
    complexity: { best: 'O(L)', avg: 'O(L)', worst: 'O(L)', space: 'O(N)' },
    bullets: [
      'Search follows one child edge per query char — no branching.',
      'A hit needs the full walk plus a terminal flag at the end node.',
      'A miss stops at the first missing edge or a non-terminal end.',
    ],
    checks: [
      {
        q: 'Why can a full walk still miss?',
        a: 'The prefix may exist without a terminal flag — e.g. "ap" inside ["app"].',
      },
      {
        q: 'What does a trie search cost?',
        a: 'O(L) for query length L — one edge lookup per character.',
      },
    ],
  },
};
