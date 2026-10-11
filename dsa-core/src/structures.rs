use serde::{Deserialize, Serialize};

/// Single data-structure visualization step.
///
/// JSON contract (snake_case):
/// {
///   state: number[],
///   highlight: number | null,
///   line: number,
///   note: string
/// }
/// For BST `state` is the sorted vec snapshot; `highlight` is the inserted
/// index. For union-find `state` is the parent array; `highlight` marks the
/// affected index.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct DsStep {
    pub state: Vec<i32>,
    pub highlight: Option<usize>,
    pub line: usize,
    pub note: String,
}

/// Hard cap on emitted DS steps.
pub const MAX_DS_STEPS: usize = 10_000;

fn push_capped(steps: &mut Vec<DsStep>, step: DsStep) -> bool {
    if steps.len() >= MAX_DS_STEPS {
        return false;
    }
    steps.push(step);
    true
}

fn capped(steps: &[DsStep]) -> bool {
    steps.len() >= MAX_DS_STEPS
}

// ---------------------------------------------------------------------------
// BST insertions simulated into a sorted vec.
// Pseudocode line map:
//   1 `init empty`
//   2 `search path for value`
//   3 `insert at pos`
//   4 `done (sorted)`
// Path is the binary-search decision chain (L/R/M + mid index).
// ---------------------------------------------------------------------------
pub fn bst_insert_steps(values: &[i32]) -> Vec<DsStep> {
    if values.is_empty() {
        return vec![DsStep {
            state: Vec::new(),
            highlight: None,
            line: 4,
            note: "done: empty bst".to_string(),
        }];
    }
    let mut steps = Vec::new();
    let mut sorted: Vec<i32> = Vec::new();

    push_capped(
        &mut steps,
        DsStep {
            state: sorted.clone(),
            highlight: None,
            line: 1,
            note: format!("init empty bst values={values:?}"),
        },
    );

    for &v in values {
        if capped(&steps) {
            break;
        }
        // binary-search path over current sorted vec
        let mut path_parts: Vec<String> = Vec::new();
        let mut l = 0isize;
        let mut r = sorted.len() as isize - 1;
        while l <= r {
            let mid = ((l + r) / 2) as usize;
            if sorted[mid] == v {
                path_parts.push(format!("M{mid}"));
                break;
            } else if sorted[mid] < v {
                path_parts.push(format!("R{mid}"));
                l = mid as isize + 1;
            } else {
                path_parts.push(format!("L{mid}"));
                r = mid as isize - 1;
            }
        }
        let path = if path_parts.is_empty() {
            "root".to_string()
        } else {
            path_parts.join("->")
        };

        if !push_capped(
            &mut steps,
            DsStep {
                state: sorted.clone(),
                highlight: None,
                line: 2,
                note: format!("search {v} path {path}"),
            },
        ) {
            break;
        }
        if capped(&steps) {
            break;
        }
        let pos = match sorted.binary_search(&v) {
            Ok(p) | Err(p) => p,
        };
        sorted.insert(pos, v);
        if !push_capped(
            &mut steps,
            DsStep {
                state: sorted.clone(),
                highlight: Some(pos),
                line: 3,
                note: format!("insert {v} at {pos} path {path}"),
            },
        ) {
            break;
        }
    }

    if !capped(&steps) {
        push_capped(
            &mut steps,
            DsStep {
                state: sorted.clone(),
                highlight: None,
                line: 4,
                note: format!("done bst size={} sorted", sorted.len()),
            },
        );
    }
    steps
}

fn find_compress(parent: &mut Vec<i32>, mut x: usize) -> usize {
    let mut root = x;
    while parent[root] as usize != root {
        root = parent[root] as usize;
    }
    // path compression
    while parent[x] as usize != x {
        let nxt = parent[x] as usize;
        parent[x] = root as i32;
        x = nxt;
    }
    root
}

// ---------------------------------------------------------------------------
// Union-Find (parent array, union by attaching ra -> rb).
// Pseudocode line map:
//   1 `init parent[i]=i`
//   2 `find roots (path compression)`
//   3 `union / already connected / skip invalid`
//   4 `done (components count)`
// ---------------------------------------------------------------------------
pub fn unionfind_steps(n: usize, unions: &[(usize, usize)]) -> Vec<DsStep> {
    if n == 0 {
        return vec![DsStep {
            state: Vec::new(),
            highlight: None,
            line: 4,
            note: "done: empty unionfind".to_string(),
        }];
    }
    let mut parent: Vec<i32> = (0..n as i32).collect();
    let mut steps = Vec::new();

    push_capped(
        &mut steps,
        DsStep {
            state: parent.clone(),
            highlight: None,
            line: 1,
            note: format!("init parent n={n}"),
        },
    );

    for &(a, b) in unions {
        if capped(&steps) {
            break;
        }
        if a >= n || b >= n {
            if !push_capped(
                &mut steps,
                DsStep {
                    state: parent.clone(),
                    highlight: None,
                    line: 3,
                    note: format!("skip invalid union ({a},{b}) n={n}"),
                },
            ) {
                break;
            }
            continue;
        }
        let ra = find_compress(&mut parent, a);
        let rb = find_compress(&mut parent, b);
        if !push_capped(
            &mut steps,
            DsStep {
                state: parent.clone(),
                highlight: Some(a),
                line: 2,
                note: format!("find roots {a}->{ra} {b}->{rb} path compression"),
            },
        ) {
            break;
        }
        if capped(&steps) {
            break;
        }
        if ra != rb {
            parent[ra] = rb as i32;
            if !push_capped(
                &mut steps,
                DsStep {
                    state: parent.clone(),
                    highlight: Some(ra),
                    line: 3,
                    note: format!("union ({a},{b}) roots {ra},{rb} parent[{ra}]={rb}"),
                },
            ) {
                break;
            }
        } else if !push_capped(
            &mut steps,
            DsStep {
                state: parent.clone(),
                highlight: Some(a),
                line: 3,
                note: format!("already connected ({a},{b}) root {ra}"),
            },
        ) {
            break;
        }
    }

    if !capped(&steps) {
        // count components via fresh finds on a clone
        let mut tmp = parent.clone();
        let mut roots = std::collections::HashSet::new();
        for i in 0..n {
            roots.insert(find_compress(&mut tmp, i));
        }
        let k = roots.len();
        push_capped(
            &mut steps,
            DsStep {
                state: parent.clone(),
                highlight: None,
                line: 4,
                note: format!("done components={k} n={n}"),
            },
        );
    }
    steps
}

#[cfg(test)]
mod tests {
    use super::*;

    fn find_root(parent: &[i32], mut x: usize) -> usize {
        while parent[x] as usize != x {
            x = parent[x] as usize;
        }
        x
    }

    #[test]
    fn bst_sorted_invariant() {
        let values = [5, 3, 7, 1, 4, 6, 8];
        let steps = bst_insert_steps(&values);
        assert!(!steps.is_empty());
        assert_eq!(steps[0].line, 1);
        assert_eq!(steps.last().unwrap().line, 4);
        assert!(steps.iter().any(|s| s.line == 2));
        assert!(steps.iter().any(|s| s.line == 3));
        let last = steps.last().unwrap();
        let mut sorted = values.to_vec();
        sorted.sort_unstable();
        assert_eq!(last.state, sorted);
        assert!(last.state.windows(2).all(|w| w[0] <= w[1]));
        // each insert highlights its position
        for s in steps.iter().filter(|s| s.line == 3) {
            let idx = s.highlight.unwrap();
            assert!(idx < s.state.len());
        }
        // notes carry path
        assert!(steps.iter().filter(|s| s.line == 2 || s.line == 3).all(|s| s.note.contains("path")));
        assert!(steps.len() <= MAX_DS_STEPS);
    }

    #[test]
    fn unionfind_connectivity() {
        let steps = unionfind_steps(5, &[(0, 1), (1, 2), (3, 4)]);
        assert!(!steps.is_empty());
        assert_eq!(steps[0].line, 1);
        assert_eq!(steps.last().unwrap().line, 4);
        assert!(steps.iter().any(|s| s.line == 2));
        assert!(steps.iter().any(|s| s.line == 3));
        let last = steps.last().unwrap();
        assert_eq!(find_root(&last.state, 0), find_root(&last.state, 2));
        assert_eq!(find_root(&last.state, 3), find_root(&last.state, 4));
        assert_ne!(find_root(&last.state, 0), find_root(&last.state, 3));
        assert!(last.note.contains("components=2"), "note: {}", last.note);
        assert!(steps.len() <= MAX_DS_STEPS);
    }

    #[test]
    fn ds_empty_edge_cases() {
        let b = bst_insert_steps(&[]);
        assert_eq!(b.len(), 1);
        assert_eq!(b[0].line, 4);

        let u = unionfind_steps(0, &[]);
        assert_eq!(u.len(), 1);
        assert_eq!(u[0].line, 4);

        // no unions: init + done
        let u2 = unionfind_steps(3, &[]);
        assert_eq!(u2.first().unwrap().line, 1);
        assert_eq!(u2.last().unwrap().line, 4);
    }

    #[test]
    fn ds_step_cap_respected() {
        let big: Vec<i32> = (0..4000).map(|x| (x * 7919 % 5000) as i32).collect();
        let b = bst_insert_steps(&big);
        assert!(b.len() <= MAX_DS_STEPS, "len={}", b.len());

        let unions: Vec<(usize, usize)> = (0..6000).map(|i| (i % 1000, (i + 1) % 1000)).collect();
        let u = unionfind_steps(1000, &unions);
        assert!(u.len() <= MAX_DS_STEPS, "len={}", u.len());
    }

    #[test]
    fn unionfind_invalid_tolerated() {
        let steps = unionfind_steps(3, &[(0, 1), (5, 6), (1, 2)]);
        assert_eq!(steps.last().unwrap().line, 4);
        let last = steps.last().unwrap();
        assert_eq!(find_root(&last.state, 0), find_root(&last.state, 2));
    }

    #[test]
    fn ds_step_json_roundtrip() {
        let steps = bst_insert_steps(&[3, 1, 2]);
        let s = serde_json::to_string(&steps).unwrap();
        let back: Vec<DsStep> = serde_json::from_str(&s).unwrap();
        assert_eq!(back.len(), steps.len());
    }
}
