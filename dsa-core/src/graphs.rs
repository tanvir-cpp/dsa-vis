use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

/// Single graph visualization step (own struct; does not reuse array `Step`).
///
/// JSON contract (snake_case):
/// {
///   current: number | null,
///   visited_order: number[],
///   frontier: number[],
///   dist: (number | null)[],
///   parent: (number | null)[],
///   line: number,
///   note: string
/// }
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GraphStep {
    pub current: Option<usize>,
    pub visited_order: Vec<usize>,
    pub frontier: Vec<usize>,
    pub dist: Vec<Option<i32>>,
    pub parent: Vec<Option<usize>>,
    pub line: usize,
    pub note: String,
}

/// Hard cap on emitted graph steps (prevents explosion / OOM on dense graphs).
pub const MAX_GRAPH_STEPS: usize = 10000;

fn push_capped(steps: &mut Vec<GraphStep>, step: GraphStep) -> bool {
    if steps.len() >= MAX_GRAPH_STEPS {
        return false;
    }
    steps.push(step);
    true
}

fn capped(steps: &[GraphStep]) -> bool {
    steps.len() >= MAX_GRAPH_STEPS
}

fn done_step(
    visited_order: Vec<usize>,
    dist: Vec<Option<i32>>,
    parent: Vec<Option<usize>>,
    note: String,
) -> GraphStep {
    GraphStep {
        current: None,
        visited_order,
        frontier: Vec::new(),
        dist,
        parent,
        line: 4,
        note,
    }
}

fn empty_done() -> Vec<GraphStep> {
    vec![GraphStep {
        current: None,
        visited_order: Vec::new(),
        frontier: Vec::new(),
        dist: Vec::new(),
        parent: Vec::new(),
        line: 4,
        note: "done: empty graph".to_string(),
    }]
}

fn invalid_start(n: usize, start: usize) -> Vec<GraphStep> {
    vec![GraphStep {
        current: None,
        visited_order: Vec::new(),
        frontier: Vec::new(),
        dist: vec![None; n],
        parent: vec![None; n],
        line: 4,
        note: format!("done: invalid start {start} >= n {n}"),
    }]
}

/// Build directed adjacency list, skipping out-of-bounds edges and self-loops,
/// sorting + deduping neighbors for deterministic traces.
fn build_adj(n: usize, edges: &[(usize, usize)]) -> Vec<Vec<usize>> {
    let mut adj = vec![Vec::<usize>::new(); n];
    for &(u, v) in edges {
        if u >= n || v >= n {
            continue;
        }
        if u == v {
            // tolerate self-loop: ignore for traversal
            continue;
        }
        adj[u].push(v);
    }
    for nbrs in adj.iter_mut() {
        nbrs.sort_unstable();
        nbrs.dedup();
    }
    adj
}

/// Build directed weighted adjacency list, keeping minimum weight on duplicate
/// edges, skipping out-of-bounds and self-loops.
fn build_adj_weighted(n: usize, edges: &[(usize, usize, i32)]) -> Vec<Vec<(usize, i32)>> {
    let mut adj = vec![Vec::<(usize, i32)>::new(); n];
    for &(u, v, w) in edges {
        if u >= n || v >= n {
            continue;
        }
        if u == v {
            continue;
        }
        adj[u].push((v, w));
    }
    for nbrs in adj.iter_mut() {
        // sort by (neighbor, weight) so dedup below keeps minimum weight
        nbrs.sort_unstable();
        let mut deduped: Vec<(usize, i32)> = Vec::with_capacity(nbrs.len());
        for &(v, w) in nbrs.iter() {
            if let Some(last) = deduped.last() {
                if last.0 == v {
                    // already kept minimum weight (sorted), skip heavier dup
                    continue;
                }
            }
            deduped.push((v, w));
        }
        *nbrs = deduped;
    }
    adj
}

// ---------------------------------------------------------------------------
// BFS (directed edges u->v; for undirected graphs pass both directions)
// Pseudocode line map:
//   1 `init queue with start`
//   2 `u = dequeue`
//   3 `visit neighbors of u (enqueue undiscovered)`
//   4 `done`
// dist = hop count from start (None = unreachable).
// ---------------------------------------------------------------------------
pub fn bfs_steps(n: usize, edges: &[(usize, usize)], start: usize) -> Vec<GraphStep> {
    if n == 0 {
        return empty_done();
    }
    if start >= n {
        return invalid_start(n, start);
    }
    let adj = build_adj(n, edges);
    let mut steps = Vec::new();
    let mut dist: Vec<Option<i32>> = vec![None; n];
    let mut parent: Vec<Option<usize>> = vec![None; n];
    let mut visited = vec![false; n];
    let mut in_queue = vec![false; n];
    let mut queue: VecDeque<usize> = VecDeque::new();

    dist[start] = Some(0);
    queue.push_back(start);
    in_queue[start] = true;

    push_capped(
        &mut steps,
        GraphStep {
            current: None,
            visited_order: Vec::new(),
            frontier: vec![start],
            dist: dist.clone(),
            parent: parent.clone(),
            line: 1,
            note: format!("init queue start={start}"),
        },
    );

    let mut order: Vec<usize> = Vec::new();
    while let Some(u) = queue.pop_front() {
        if capped(&steps) {
            break;
        }
        in_queue[u] = false;
        if visited[u] {
            continue;
        }
        visited[u] = true;
        order.push(u);

        if !push_capped(
            &mut steps,
            GraphStep {
                current: Some(u),
                visited_order: order.clone(),
                frontier: queue.iter().copied().collect(),
                dist: dist.clone(),
                parent: parent.clone(),
                line: 2,
                note: format!("dequeue {u}"),
            },
        ) {
            break;
        }
        if capped(&steps) {
            break;
        }

        let mut discovered: Vec<usize> = Vec::new();
        for &v in &adj[u] {
            if visited[v] || in_queue[v] {
                continue;
            }
            dist[v] = Some(dist[u].unwrap_or(0).saturating_add(1));
            parent[v] = Some(u);
            queue.push_back(v);
            in_queue[v] = true;
            discovered.push(v);
        }
        let note = if discovered.is_empty() {
            format!("visit neighbors of {u}: none new")
        } else {
            format!("visit neighbors of {u}: discovered {discovered:?}")
        };
        if !push_capped(
            &mut steps,
            GraphStep {
                current: Some(u),
                visited_order: order.clone(),
                frontier: queue.iter().copied().collect(),
                dist: dist.clone(),
                parent: parent.clone(),
                line: 3,
                note,
            },
        ) {
            break;
        }
    }

    if !capped(&steps) {
        let k = order.len();
        let _ = push_capped(
            &mut steps,
            done_step(
                order,
                dist,
                parent,
                format!("done visited={k} start={start}"),
            ),
        );
        // fix note to report visited count accurately (last step)
        if let Some(last) = steps.last_mut() {
            let k = last.visited_order.len();
            last.note = format!("done visited={k} start={start}");
        }
    }
    steps
}

// ---------------------------------------------------------------------------
// DFS iterative with explicit stack (directed edges).
// Pseudocode line map:
//   1 `init stack with start`
//   2 `u = pop`
//   3 `explore neighbors of u (push undiscovered)`
//   4 `done`
// dist = depth from start (None = unreachable).
// ---------------------------------------------------------------------------
pub fn dfs_steps(n: usize, edges: &[(usize, usize)], start: usize) -> Vec<GraphStep> {
    if n == 0 {
        return empty_done();
    }
    if start >= n {
        return invalid_start(n, start);
    }
    let adj = build_adj(n, edges);
    let mut steps = Vec::new();
    let mut dist: Vec<Option<i32>> = vec![None; n];
    let mut parent: Vec<Option<usize>> = vec![None; n];
    let mut visited = vec![false; n];
    let mut stack: Vec<usize> = Vec::new();

    dist[start] = Some(0);
    stack.push(start);

    push_capped(
        &mut steps,
        GraphStep {
            current: None,
            visited_order: Vec::new(),
            frontier: stack.clone(),
            dist: dist.clone(),
            parent: parent.clone(),
            line: 1,
            note: format!("init stack start={start}"),
        },
    );

    let mut order: Vec<usize> = Vec::new();
    while let Some(u) = stack.pop() {
        if capped(&steps) {
            break;
        }
        if visited[u] {
            continue;
        }
        visited[u] = true;
        order.push(u);

        if !push_capped(
            &mut steps,
            GraphStep {
                current: Some(u),
                visited_order: order.clone(),
                frontier: stack.clone(),
                dist: dist.clone(),
                parent: parent.clone(),
                line: 2,
                note: format!("pop {u}"),
            },
        ) {
            break;
        }
        if capped(&steps) {
            break;
        }

        // Push neighbors in reverse sorted order so smallest is on top.
        let mut pushed: Vec<usize> = Vec::new();
        for &v in adj[u].iter().rev() {
            if visited[v] {
                continue;
            }
            if dist[v].is_none() {
                dist[v] = Some(dist[u].unwrap_or(0).saturating_add(1));
                parent[v] = Some(u);
            }
            stack.push(v);
            pushed.push(v);
        }
        pushed.reverse();
        let note = if pushed.is_empty() {
            format!("explore neighbors of {u}: none new")
        } else {
            format!("explore neighbors of {u}: pushed {pushed:?}")
        };
        if !push_capped(
            &mut steps,
            GraphStep {
                current: Some(u),
                visited_order: order.clone(),
                frontier: stack.clone(),
                dist: dist.clone(),
                parent: parent.clone(),
                line: 3,
                note,
            },
        ) {
            break;
        }
    }

    if !capped(&steps) {
        let _ = push_capped(
            &mut steps,
            done_step(
                order.clone(),
                dist,
                parent,
                String::new(), // replaced below
            ),
        );
        if let Some(last) = steps.last_mut() {
            let k = last.visited_order.len();
            last.note = format!("done visited={k} start={start}");
        }
    }
    steps
}

// ---------------------------------------------------------------------------
// Dijkstra O(n^2) (directed, non-negative weights expected; negative weights
// are tolerated but may yield incorrect distances).
// Pseudocode line map:
//   1 `init dist[start]=0`
//   2 `pick min unvisited u`
//   3 `relax edges u->v`
//   4 `done`
// A dist snapshot is recorded on every line-2 pick and every line-3 relax
// attempt (note says "improved" vs "no improvement").
// ---------------------------------------------------------------------------
pub fn dijkstra_steps(n: usize, edges: &[(usize, usize, i32)], start: usize) -> Vec<GraphStep> {
    if n == 0 {
        return empty_done();
    }
    if start >= n {
        return invalid_start(n, start);
    }
    let adj = build_adj_weighted(n, edges);
    let mut steps = Vec::new();
    let mut dist: Vec<Option<i32>> = vec![None; n];
    let mut parent: Vec<Option<usize>> = vec![None; n];
    let mut visited = vec![false; n];
    let mut order: Vec<usize> = Vec::new();

    dist[start] = Some(0);

    push_capped(
        &mut steps,
        GraphStep {
            current: None,
            visited_order: Vec::new(),
            frontier: vec![start],
            dist: dist.clone(),
            parent: parent.clone(),
            line: 1,
            note: format!("init dist start={start}"),
        },
    );

    loop {
        if capped(&steps) {
            break;
        }
        // Pick min unvisited with finite dist.
        let mut u_opt: Option<usize> = None;
        let mut best = i32::MAX;
        for i in 0..n {
            if visited[i] {
                continue;
            }
            if let Some(d) = dist[i] {
                if d < best {
                    best = d;
                    u_opt = Some(i);
                }
            }
        }
        let u = match u_opt {
            None => break, // remaining nodes unreachable
            Some(u) => u,
        };
        visited[u] = true;
        order.push(u);
        let frontier: Vec<usize> = (0..n)
            .filter(|&i| !visited[i] && dist[i].is_some())
            .collect();

        if !push_capped(
            &mut steps,
            GraphStep {
                current: Some(u),
                visited_order: order.clone(),
                frontier,
                dist: dist.clone(),
                parent: parent.clone(),
                line: 2,
                note: format!("pick min unvisited {u} dist={best}"),
            },
        ) {
            break;
        }

        for &(v, w) in &adj[u] {
            if capped(&steps) {
                break;
            }
            if visited[v] {
                continue;
            }
            let nd = dist[u].unwrap_or(i32::MAX).saturating_add(w);
            if dist[v].is_none_or(|d| nd < d) {
                dist[v] = Some(nd);
                parent[v] = Some(u);
                let frontier: Vec<usize> = (0..n)
                    .filter(|&i| !visited[i] && dist[i].is_some())
                    .collect();
                if !push_capped(
                    &mut steps,
                    GraphStep {
                        current: Some(u),
                        visited_order: order.clone(),
                        frontier,
                        dist: dist.clone(),
                        parent: parent.clone(),
                        line: 3,
                        note: format!("relax {u}->{v} w={w} improved dist={nd}"),
                    },
                ) {
                    break;
                }
            } else {
                let frontier: Vec<usize> = (0..n)
                    .filter(|&i| !visited[i] && dist[i].is_some())
                    .collect();
                if !push_capped(
                    &mut steps,
                    GraphStep {
                        current: Some(u),
                        visited_order: order.clone(),
                        frontier,
                        dist: dist.clone(),
                        parent: parent.clone(),
                        line: 3,
                        note: format!("relax {u}->{v} w={w} no improvement"),
                    },
                ) {
                    break;
                }
            }
        }
    }

    if !capped(&steps) {
        let _ = push_capped(
            &mut steps,
            done_step(order.clone(), dist, parent, String::new()),
        );
        if let Some(last) = steps.last_mut() {
            let k = last.visited_order.len();
            last.note = format!("done visited={k} start={start}");
        }
    }
    steps
}

// ---------------------------------------------------------------------------
// Topological sort (Kahn's algorithm, directed).
// Pseudocode line map:
//   1 `compute indegree`
//   2 `queue zero-indegree nodes`
//   3 `pop u + reduce successors`
//   4 `done / detect cycle`
// dist[] reuses the snapshot slot to hold indegree (Some(deg)) per node.
// parent[] is unused (all None).
// Done note mentions "cycle" when order.len() < n.
// ---------------------------------------------------------------------------
pub fn topo_steps(n: usize, edges: &[(usize, usize)]) -> Vec<GraphStep> {
    if n == 0 {
        return empty_done();
    }
    // Dedupe (including self-loops: a self-loop is a cycle and must be kept).
    let mut uniq: Vec<(usize, usize)> = Vec::new();
    for &(u, v) in edges {
        if u >= n || v >= n {
            continue;
        }
        uniq.push((u, v));
    }
    uniq.sort_unstable();
    uniq.dedup();

    let mut adj = vec![Vec::<usize>::new(); n];
    let mut indeg = vec![0i32; n];
    for &(u, v) in &uniq {
        adj[u].push(v);
        indeg[v] = indeg[v].saturating_add(1);
    }
    for nbrs in adj.iter_mut() {
        nbrs.sort_unstable();
    }
    let snapshot = |indeg: &[i32]| indeg.iter().map(|&d| Some(d)).collect::<Vec<_>>();

    let mut steps = Vec::new();
    push_capped(
        &mut steps,
        GraphStep {
            current: None,
            visited_order: Vec::new(),
            frontier: Vec::new(),
            dist: snapshot(&indeg),
            parent: vec![None; n],
            line: 1,
            note: "compute indegree".to_string(),
        },
    );

    let mut queue: VecDeque<usize> = VecDeque::new();
    for i in 0..n {
        if indeg[i] == 0 {
            queue.push_back(i);
        }
    }
    if !push_capped(
        &mut steps,
        GraphStep {
            current: None,
            visited_order: Vec::new(),
            frontier: queue.iter().copied().collect(),
            dist: snapshot(&indeg),
            parent: vec![None; n],
            line: 2,
            note: format!("queue zero-indegree count={}", queue.len()),
        },
    ) {
        return steps;
    }

    let mut order: Vec<usize> = Vec::new();
    while let Some(u) = queue.pop_front() {
        if capped(&steps) {
            break;
        }
        order.push(u);
        for &v in &adj[u] {
            indeg[v] = indeg[v].saturating_sub(1);
            if indeg[v] == 0 {
                queue.push_back(v);
            }
        }
        if !push_capped(
            &mut steps,
            GraphStep {
                current: Some(u),
                visited_order: order.clone(),
                frontier: queue.iter().copied().collect(),
                dist: snapshot(&indeg),
                parent: vec![None; n],
                line: 3,
                note: format!("pop {u} reduce successors"),
            },
        ) {
            break;
        }
    }

    if !capped(&steps) {
        let note = if order.len() < n {
            format!(
                "done: cycle detected order.len()={} < n={n}",
                order.len()
            )
        } else {
            format!("done topo order len={} n={n}", order.len())
        };
        let _ = push_capped(
            &mut steps,
            GraphStep {
                current: None,
                visited_order: order,
                frontier: Vec::new(),
                dist: snapshot(&indeg),
                parent: vec![None; n],
                line: 4,
                note,
            },
        );
    }
    steps
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn bfs_visits_all_reachable_in_order() {
        let edges = [(0usize, 1usize), (0, 2), (1, 3), (2, 3)];
        let steps = bfs_steps(4, &edges, 0);
        assert!(!steps.is_empty());
        assert_eq!(steps[0].line, 1);
        assert!(steps.iter().any(|s| s.line == 2));
        assert!(steps.iter().any(|s| s.line == 3));
        assert_eq!(steps.last().unwrap().line, 4);
        let last = steps.last().unwrap();
        assert_eq!(last.visited_order, vec![0, 1, 2, 3]);
        assert_eq!(
            last.dist,
            vec![Some(0), Some(1), Some(1), Some(2)]
        );
        assert_eq!(last.parent[1], Some(0));
        assert_eq!(last.parent[2], Some(0));
        assert!(steps.len() <= MAX_GRAPH_STEPS);
    }

    #[test]
    fn dfs_visits_all() {
        let edges = [(0usize, 1usize), (0, 2), (1, 3), (2, 3)];
        let steps = dfs_steps(4, &edges, 0);
        assert!(!steps.is_empty());
        assert_eq!(steps[0].line, 1);
        assert_eq!(steps.last().unwrap().line, 4);
        let last = steps.last().unwrap();
        assert_eq!(last.visited_order.len(), 4);
        assert_eq!(last.visited_order[0], 0);
        let set: HashSet<usize> = last.visited_order.iter().copied().collect();
        assert_eq!(set, HashSet::from([0, 1, 2, 3]));
        assert!(steps.len() <= MAX_GRAPH_STEPS);
    }

    #[test]
    fn dijkstra_distances_correct() {
        let edges = [
            (0usize, 1usize, 1i32),
            (0, 2, 4),
            (1, 2, 2),
            (1, 3, 5),
            (2, 3, 1),
        ];
        let steps = dijkstra_steps(4, &edges, 0);
        assert!(!steps.is_empty());
        assert_eq!(steps[0].line, 1);
        assert_eq!(steps.last().unwrap().line, 4);
        let last = steps.last().unwrap();
        assert_eq!(last.dist, vec![Some(0), Some(1), Some(3), Some(4)]);
        // every relax records a dist snapshot (line 3 present)
        assert!(steps.iter().any(|s| s.line == 3));
        assert!(steps.len() <= MAX_GRAPH_STEPS);
    }

    #[test]
    fn topo_valid_order_on_dag() {
        let edges = [(0usize, 1usize), (0, 2), (1, 3), (2, 3)];
        let steps = topo_steps(4, &edges);
        assert_eq!(steps[0].line, 1);
        assert_eq!(steps.last().unwrap().line, 4);
        let last = steps.last().unwrap();
        assert_eq!(last.visited_order.len(), 4);
        let pos = |x: usize| last.visited_order.iter().position(|&y| y == x).unwrap();
        assert!(pos(0) < pos(1));
        assert!(pos(0) < pos(2));
        assert!(pos(1) < pos(3));
        assert!(pos(2) < pos(3));
        assert!(!last.note.contains("cycle"));
    }

    #[test]
    fn topo_cycle_detection_note() {
        let edges = [(0usize, 1usize), (1, 2), (2, 0)];
        let steps = topo_steps(3, &edges);
        let last = steps.last().unwrap();
        assert_eq!(last.line, 4);
        assert!(last.visited_order.len() < 3);
        assert!(
            last.note.contains("cycle"),
            "expected cycle note, got: {}",
            last.note
        );
    }

    #[test]
    fn empty_graph_edge_case() {
        let b = bfs_steps(0, &[], 0);
        assert_eq!(b.len(), 1);
        assert_eq!(b[0].line, 4);

        let d = dfs_steps(0, &[], 0);
        assert_eq!(d.len(), 1);
        assert_eq!(d[0].line, 4);

        let j = dijkstra_steps(0, &[], 0);
        assert_eq!(j.len(), 1);
        assert_eq!(j[0].line, 4);

        let t = topo_steps(0, &[]);
        assert_eq!(t.len(), 1);
        assert_eq!(t[0].line, 4);

        // invalid start
        let bad = bfs_steps(3, &[], 5);
        assert_eq!(bad.len(), 1);
        assert_eq!(bad[0].line, 4);

        let bad2 = dfs_steps(2, &[(0, 1)], 7);
        assert_eq!(bad2.len(), 1);

        let bad3 = dijkstra_steps(2, &[(0, 1, 1)], 9);
        assert_eq!(bad3.len(), 1);
    }

    #[test]
    fn self_loops_and_dupes_tolerated() {
        let edges = [
            (0usize, 0usize), // self-loop
            (0, 1),
            (0, 1), // dupe
            (1, 1), // self-loop
            (1, 2),
        ];
        let b = bfs_steps(3, &edges, 0);
        assert_eq!(b.last().unwrap().visited_order, vec![0, 1, 2]);

        let d = dfs_steps(3, &edges, 0);
        assert_eq!(d.last().unwrap().visited_order.len(), 3);

        let j = dijkstra_steps(3, &[(0, 0, 1), (0, 1, 2), (0, 1, 2), (1, 2, 3)], 0);
        assert_eq!(j.last().unwrap().dist, vec![Some(0), Some(2), Some(5)]);
    }

    #[test]
    fn step_cap_respected_clique_50() {
        let n = 50usize;
        let mut edges: Vec<(usize, usize)> = Vec::new();
        for i in 0..n {
            for j in 0..n {
                if i != j {
                    edges.push((i, j));
                }
            }
        }
        let b = bfs_steps(n, &edges, 0);
        assert!(b.len() <= MAX_GRAPH_STEPS, "bfs len={}", b.len());

        let d = dfs_steps(n, &edges, 0);
        assert!(d.len() <= MAX_GRAPH_STEPS, "dfs len={}", d.len());

        let t = topo_steps(n, &edges);
        assert!(t.len() <= MAX_GRAPH_STEPS, "topo len={}", t.len());

        let w: Vec<(usize, usize, i32)> = edges.iter().map(|&(u, v)| (u, v, 1)).collect();
        let j = dijkstra_steps(n, &w, 0);
        assert!(j.len() <= MAX_GRAPH_STEPS, "dijkstra len={}", j.len());
    }

    #[test]
    fn graph_step_json_roundtrip() {
        let steps = bfs_steps(3, &[(0, 1), (1, 2)], 0);
        let s = serde_json::to_string(&steps).unwrap();
        let back: Vec<GraphStep> = serde_json::from_str(&s).unwrap();
        assert_eq!(back.len(), steps.len());
    }
}
