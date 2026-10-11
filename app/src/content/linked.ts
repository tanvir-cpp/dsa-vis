// Linked-structure step generators + curriculum content.
//
// Line maps (1-indexed into LINKED_ALGOS[id].pseudocode):
//   list:  1 op-init, 2 walk to position, 3 link/unlink, 4 done
//   stack: 1 push, 2 top/pop, 3 link change, 4 done
//   queue: 1 enqueue, 2 dequeue front, 3 link change, 4 done

export interface ChainStep {
  values: number[];
  highlight: number | null;
  headMark: boolean;
  tailMark: boolean;
  line: number;
  note: string;
}

export type ListOp = 'traverse' | 'pushHead' | 'pushTail' | 'insertAt' | 'deleteAt';

export type LinkedId = 'list' | 'stack' | 'queue';

export interface LinkedAlgoMeta {
  title: string;
  pseudocode: string[];
  python: string[];
  cpp: string[];
  complexity: { best: string; avg: string; worst: string; space: string };
  bullets: string[];
  checks: { q: string; a: string }[];
}

/** Fixed demo pool; the size slider (2..6) takes a prefix. */
export const LINKED_POOL = [10, 20, 30, 40, 50, 60];

/** Hard cap shared by every generator below. */
const MAX_STEPS = 5000;

function canPush(steps: ChainStep[]): boolean {
  return steps.length < MAX_STEPS;
}

function fmt(values: number[]): string {
  return `[${values.join(',')}]`;
}

function clampPos(i: number, lo: number, hi: number): number {
  if (!Number.isFinite(i)) return lo;
  return Math.min(Math.max(Math.floor(i), lo), hi);
}

function listMarks(values: number[]): { headMark: boolean; tailMark: boolean } {
  return { headMark: values.length > 0, tailMark: values.length > 0 };
}

// ---------------------------------------------------------------------------
// Singly linked list ops — values = logical node order head -> tail.
// ---------------------------------------------------------------------------
export function listSteps(op: ListOp, values: number[], arg?: number): ChainStep[] {
  const base = [...values];
  const steps: ChainStep[] = [];
  const push = (s: ChainStep): void => {
    if (canPush(steps)) steps.push(s);
  };

  if (op === 'traverse') {
    push({
      values: [...base],
      highlight: null,
      ...listMarks(base),
      line: 1,
      note: `Traverse ${fmt(base)} — cur=head`,
    });
    for (let i = 0; i < base.length; i++) {
      push({
        values: [...base],
        highlight: i,
        ...listMarks(base),
        line: 2,
        note: `Visit node ${i} val=${base[i]} — read cur.val`,
      });
    }
    push({
      values: [...base],
      highlight: null,
      ...listMarks(base),
      line: 3,
      note: 'Follow next — cur=null, end of list',
    });
    push({
      values: [...base],
      highlight: null,
      ...listMarks(base),
      line: 4,
      note: `Done — visited ${fmt(base)}`,
    });
    return steps;
  }

  if (op === 'pushHead') {
    const headVal = base.length > 0 ? base[0] - 5 : 10;
    const after = [headVal, ...base];
    push({
      values: [...base],
      highlight: null,
      ...listMarks(base),
      line: 1,
      note: `PushHead ${headVal} — list ${fmt(base)}`,
    });
    push({
      values: [...base],
      highlight: null,
      ...listMarks(base),
      line: 2,
      note: 'No walk — head insert is O(1)',
    });
    push({
      values: [...after],
      highlight: 0,
      ...listMarks(after),
      line: 3,
      note: `Attach new->head — ${fmt(after)}`,
    });
    push({
      values: [...after],
      highlight: null,
      ...listMarks(after),
      line: 4,
      note: `Done — ${fmt(after)}`,
    });
    return steps;
  }

  if (op === 'pushTail') {
    const tailVal = base.length > 0 ? base[base.length - 1] + 10 : 10;
    const after = [...base, tailVal];
    push({
      values: [...base],
      highlight: null,
      ...listMarks(base),
      line: 1,
      note: `PushTail ${tailVal} — list ${fmt(base)}`,
    });
    if (base.length === 0) {
      push({
        values: [...base],
        highlight: null,
        ...listMarks(base),
        line: 2,
        note: 'Empty — tail becomes head',
      });
    }
    for (let i = 0; i < base.length; i++) {
      push({
        values: [...base],
        highlight: i,
        ...listMarks(base),
        line: 2,
        note: `Walk node ${i} val=${base[i]} — seek tail`,
      });
    }
    push({
      values: [...after],
      highlight: after.length - 1,
      ...listMarks(after),
      line: 3,
      note: `Attach tail->new — ${fmt(after)}`,
    });
    push({
      values: [...after],
      highlight: null,
      ...listMarks(after),
      line: 4,
      note: `Done — ${fmt(after)}`,
    });
    return steps;
  }

  if (op === 'insertAt') {
    const idx = clampPos(arg ?? 2, 0, base.length);
    let newVal: number;
    if (idx <= 0) {
      newVal = (base.length > 0 ? base[0] : 15) - 5;
    } else if (idx >= base.length) {
      newVal = (base.length > 0 ? base[base.length - 1] : 0) + 10;
    } else {
      newVal = Math.floor((base[idx - 1] + base[idx]) / 2);
      if (newVal === base[idx - 1] || newVal === base[idx]) newVal = base[idx - 1] + 1;
    }
    const after = [...base.slice(0, idx), newVal, ...base.slice(idx)];
    push({
      values: [...base],
      highlight: null,
      ...listMarks(base),
      line: 1,
      note: `Insert ${newVal} at i=${idx} — list ${fmt(base)}`,
    });
    if (idx === 0) {
      push({
        values: [...base],
        highlight: null,
        ...listMarks(base),
        line: 2,
        note: 'No walk — insert at head',
      });
    }
    for (let i = 0; i < idx && i < base.length; i++) {
      push({
        values: [...base],
        highlight: i,
        ...listMarks(base),
        line: 2,
        note: `Walk node ${i} val=${base[i]} — seek i=${idx}`,
      });
    }
    push({
      values: [...after],
      highlight: idx,
      ...listMarks(after),
      line: 3,
      note: `Link prev->new->cur — ${fmt(after)}`,
    });
    push({
      values: [...after],
      highlight: null,
      ...listMarks(after),
      line: 4,
      note: `Done — ${fmt(after)}`,
    });
    return steps;
  }

  // deleteAt
  if (base.length === 0) {
    push({
      values: [],
      highlight: null,
      headMark: false,
      tailMark: false,
      line: 1,
      note: 'DeleteAt — empty list',
    });
    push({
      values: [],
      highlight: null,
      headMark: false,
      tailMark: false,
      line: 4,
      note: 'Done — nothing to remove',
    });
    return steps;
  }
  const idx = clampPos(arg ?? 2, 0, base.length - 1);
  const removed = base[idx];
  const after = [...base.slice(0, idx), ...base.slice(idx + 1)];
  push({
    values: [...base],
    highlight: null,
    ...listMarks(base),
    line: 1,
    note: `DeleteAt i=${idx} — list ${fmt(base)}`,
  });
  for (let i = 0; i <= idx; i++) {
    push({
      values: [...base],
      highlight: i,
      ...listMarks(base),
      line: 2,
      note: `Walk node ${i} val=${base[i]} — seek i=${idx}`,
    });
  }
  push({
    values: [...after],
    highlight: after.length > 0 ? Math.min(idx, after.length - 1) : null,
    ...listMarks(after),
    line: 3,
    note: `Unlink node ${idx} (val=${removed}) — ${fmt(after)}`,
  });
  push({
    values: [...after],
    highlight: null,
    ...listMarks(after),
    line: 4,
    note: `Done — removed ${removed}, list ${fmt(after)}`,
  });
  return steps;
}

// ---------------------------------------------------------------------------
// Stack (linked) — top is the head; tail marker stays hidden.
// ---------------------------------------------------------------------------
export function stackSteps(values: number[]): ChainStep[] {
  const steps: ChainStep[] = [];
  const push = (s: ChainStep): void => {
    if (canPush(steps)) steps.push(s);
  };
  let cur: number[] = [];
  if (values.length === 0) {
    push({
      values: [],
      highlight: null,
      headMark: false,
      tailMark: false,
      line: 4,
      note: 'Done — empty stack',
    });
    return steps;
  }
  for (const v of values) {
    cur = [v, ...cur];
    push({
      values: [...cur],
      highlight: 0,
      headMark: true,
      tailMark: false,
      line: 1,
      note: `Push ${v} — top=${v}, stack ${fmt(cur)}`,
    });
  }
  const popped: number[] = [];
  for (let k = 0; k < 2 && cur.length > 0; k++) {
    const top = cur[0];
    push({
      values: [...cur],
      highlight: 0,
      headMark: true,
      tailMark: false,
      line: 2,
      note: `Top=${top} — pop`,
    });
    cur = cur.slice(1);
    popped.push(top);
    push({
      values: [...cur],
      highlight: cur.length > 0 ? 0 : null,
      headMark: cur.length > 0,
      tailMark: false,
      line: 3,
      note: `Unlink top — popped ${top}, stack ${fmt(cur)}`,
    });
  }
  push({
    values: [...cur],
    highlight: null,
    headMark: cur.length > 0,
    tailMark: false,
    line: 4,
    note: `Done — popped ${popped.join(', ')} — LIFO, stack ${fmt(cur)}`,
  });
  return steps;
}

// ---------------------------------------------------------------------------
// Queue (linked) — front is the head, rear is the tail.
// ---------------------------------------------------------------------------
export function queueSteps(values: number[]): ChainStep[] {
  const steps: ChainStep[] = [];
  const push = (s: ChainStep): void => {
    if (canPush(steps)) steps.push(s);
  };
  let cur: number[] = [];
  if (values.length === 0) {
    push({
      values: [],
      highlight: null,
      headMark: false,
      tailMark: false,
      line: 4,
      note: 'Done — empty queue',
    });
    return steps;
  }
  for (const v of values) {
    cur = [...cur, v];
    push({
      values: [...cur],
      highlight: cur.length - 1,
      headMark: true,
      tailMark: true,
      line: 1,
      note: `Enqueue ${v} — rear=${v}, queue ${fmt(cur)}`,
    });
  }
  const out: number[] = [];
  for (let k = 0; k < 2 && cur.length > 0; k++) {
    const front = cur[0];
    push({
      values: [...cur],
      highlight: 0,
      headMark: true,
      tailMark: true,
      line: 2,
      note: `Dequeue front=${front}`,
    });
    cur = cur.slice(1);
    out.push(front);
    push({
      values: [...cur],
      highlight: cur.length > 0 ? 0 : null,
      headMark: cur.length > 0,
      tailMark: cur.length > 0,
      line: 3,
      note: `Move front — dequeued ${front}, queue ${fmt(cur)}`,
    });
  }
  push({
    values: [...cur],
    highlight: null,
    headMark: cur.length > 0,
    tailMark: cur.length > 0,
    line: 4,
    note: `Done — dequeued ${out.join(', ')} — FIFO, queue ${fmt(cur)}`,
  });
  return steps;
}

export const LINKED_ALGOS: Record<LinkedId, LinkedAlgoMeta> = {
  list: {
    title: 'Singly Linked List',
    pseudocode: [
      'cur=head; prev=null // 1 start',
      'while cur && i<pos: step // 2 walk',
      'prev.next=new/skip // 3 link',
      'done — list updated // 4 done',
    ],
    python: [
      'cur = head  # 1 start at head',
      'while cur and i < pos: advance  # 2',
      'prev.next = new  # 3 link/unlink',
      '# done — list updated  # 4',
    ],
    cpp: [
      'Node* cur = head;  // 1 start',
      'while (cur && i < pos) step;  // 2',
      'prev->next = nw;  // 3 link',
      '// done — list updated  // 4',
    ],
    complexity: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(n)' },
    bullets: [
      'Head points at node 0; each node links next, tail links null.',
      'Insert/delete rewires prev.next — O(1) once positioned.',
      'Index access walks from head — O(n), no random access.',
    ],
    checks: [
      {
        q: 'Why is insert O(1) after the walk?',
        a: 'Only pointer rewiring — prev.next=new, new.next=cur.',
      },
      { q: 'Cost of reading node 5?', a: 'O(n) — walk five hops from head; no indexing.' },
    ],
  },
  stack: {
    title: 'Stack (Linked)',
    pseudocode: [
      'new->next=top; top=new // 1 push',
      'v=top->val // 2 peek / pop',
      'top=top->next // 3 unlink top',
      'done — LIFO order // 4 done',
    ],
    python: [
      'st.append(v)  # 1 push',
      'v = st[-1]  # 2 top / pop',
      'st.pop()  # 3 unlink top',
      '# done — LIFO order  # 4',
    ],
    cpp: [
      'st.push(v);  // 1 push',
      'v = st.top();  // 2 top / pop',
      'st.pop();  // 3 unlink top',
      '// done — LIFO order  // 4',
    ],
    complexity: { best: 'O(1)', avg: 'O(1)', worst: 'O(1)', space: 'O(n)' },
    bullets: [
      'Top is the head — push/pop rewires head in O(1).',
      'LIFO: the last pushed value is the first popped.',
      'No indexing — only top() and pop() read the stack.',
    ],
    checks: [
      { q: 'Why is pop O(1)?', a: 'Top is the head — one pointer move, no walk.' },
      { q: 'What order do pops come out?', a: 'Reverse of push order — LIFO.' },
    ],
  },
  queue: {
    title: 'Queue (Linked)',
    pseudocode: [
      'rear->next=new; rear=new // 1 enq',
      'v=front->val // 2 deq front',
      'front=front->next // 3 move',
      'done — FIFO order // 4 done',
    ],
    python: [
      'q.append(v)  # 1 enqueue',
      'v = q[0]  # 2 dequeue front',
      'q.popleft()  # 3 move front',
      '# done — FIFO order  # 4',
    ],
    cpp: [
      'q.push(v);  // 1 enqueue',
      'v = q.front();  // 2 dequeue',
      'q.pop();  // 3 move front',
      '// done — FIFO order  // 4',
    ],
    complexity: { best: 'O(1)', avg: 'O(1)', worst: 'O(1)', space: 'O(n)' },
    bullets: [
      'Front is the head, rear is the tail — both ends marked.',
      'Enqueue links after rear; dequeue moves front forward.',
      'FIFO: the first enqueued value is the first dequeued.',
    ],
    checks: [
      {
        q: 'Why track both front and rear?',
        a: 'Enqueue appends at rear O(1); dequeue moves front O(1).',
      },
      { q: 'What order do dequeues come out?', a: 'Enqueue order — FIFO.' },
    ],
  },
};
