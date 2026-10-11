//! Traced singly-linked list / stack / queue over a vec snapshot.
//!
//! Own [`ChainStep`] struct (does not touch `structures.rs`):
//! ```json
//! { values: number[], highlight: number | null, head: boolean,
//!   tail: boolean, line: number, note: string }
//! ```
//! - `values` = list snapshot left-to-right (head at index 0),
//! - `highlight` = current node index (or `None`),
//! - `head` = `true` when non-empty (head node present),
//! - `tail` = `true` when `len > 1` (distinct tail present),
//! - `line` = pseudocode line `1..=4` (mirrors TS side).
//!
//! Pseudocode line maps (all `1..=4`):
//! - traverse:
//!   1 `init list`
//!   2 `visit node i`
//!   4 `done (visited len)`
//! - push_head:
//!   1 `init list`
//!   2 `new node v`
//!   3 `link new head`
//!   4 `done (len+1)`
//! - push_tail:
//!   1 `init list`
//!   2 `walk to tail`
//!   3 `link new tail`
//!   4 `done (len+1)`
//! - insert_at (clamped):
//!   1 `init list`
//!   2 `walk to idx`
//!   3 `splice v at idx`
//!   4 `done (len+1)`
//! - delete_at (oob safe):
//!   1 `init list`
//!   2 `walk to idx`
//!   3 `unlink idx`
//!   4 `done (len-1) / done oob`
//! - stack (push-all then pop-two):
//!   1 `init empty stack`
//!   2 `push v (top=v)`
//!   3 `pop top`
//!   4 `done LIFO`
//! - queue (enqueue-all then dequeue-two):
//!   1 `init empty queue`
//!   2 `enqueue v`
//!   3 `dequeue head`
//!   4 `done FIFO`
//!
//! Empty inputs for traverse / delete / stack / queue yield a single
//! line-4 `done`. Steps capped at [`MAX_CHAIN_STEPS`].

use serde::{Deserialize, Serialize};

/// Single chain (list / stack / queue) visualization step.
///
/// JSON contract (snake_case):
/// {
///   values: number[],
///   highlight: number | null,
///   head: boolean,
///   tail: boolean,
///   line: number,
///   note: string
/// }
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct ChainStep {
    pub values: Vec<i32>,
    pub highlight: Option<usize>,
    pub head: bool,
    pub tail: bool,
    pub line: usize,
    pub note: String,
}

/// Hard cap on emitted chain steps.
pub const MAX_CHAIN_STEPS: usize = 10_000;

fn push_capped(steps: &mut Vec<ChainStep>, step: ChainStep) -> bool {
    if steps.len() >= MAX_CHAIN_STEPS {
        return false;
    }
    steps.push(step);
    true
}

fn capped(steps: &[ChainStep]) -> bool {
    steps.len() >= MAX_CHAIN_STEPS
}

fn flags(values: &[i32]) -> (bool, bool) {
    (!values.is_empty(), values.len() > 1)
}

fn mk(values: Vec<i32>, highlight: Option<usize>, line: usize, note: String) -> ChainStep {
    let (head, tail) = flags(&values);
    ChainStep {
        values,
        highlight,
        head,
        tail,
        line,
        note,
    }
}

fn empty_done(kind: &str) -> Vec<ChainStep> {
    vec![mk(Vec::new(), None, 4, format!("done: empty {kind}"))]
}

/// Fixed demo prefix `[10, 20, 30, 40, 50, 60]` truncated to `n`.
pub fn demo_values(n: usize) -> Vec<i32> {
    const DEMO: [i32; 6] = [10, 20, 30, 40, 50, 60];
    DEMO[..n.min(DEMO.len())].to_vec()
}

// ---------------------------------------------------------------------------
// Singly-linked list
// ---------------------------------------------------------------------------

/// Traverse: init (1), one visit per index (2), done (4).
pub fn list_traverse_steps(values: &[i32]) -> Vec<ChainStep> {
    if values.is_empty() {
        return empty_done("list");
    }
    let mut steps = Vec::new();
    push_capped(
        &mut steps,
        mk(
            values.to_vec(),
            None,
            1,
            format!("init list len={} values={values:?}", values.len()),
        ),
    );
    for (i, &v) in values.iter().enumerate() {
        if capped(&steps) {
            break;
        }
        if !push_capped(
            &mut steps,
            mk(
                values.to_vec(),
                Some(i),
                2,
                format!("visit {i} val={v}"),
            ),
        ) {
            break;
        }
    }
    if !capped(&steps) {
        push_capped(
            &mut steps,
            mk(
                values.to_vec(),
                None,
                4,
                format!("done traverse len={} visited", values.len()),
            ),
        );
    }
    steps
}

/// Push head: init (1), new node (2), link head (3), done (4).
pub fn list_push_head_steps(values: &[i32], v: i32) -> Vec<ChainStep> {
    let mut steps = Vec::new();
    push_capped(
        &mut steps,
        mk(
            values.to_vec(),
            None,
            1,
            format!("init list len={} values={values:?}", values.len()),
        ),
    );
    if capped(&steps) {
        return steps;
    }
    if !push_capped(
        &mut steps,
        mk(
            values.to_vec(),
            None,
            2,
            format!("new node {v}"),
        ),
    ) {
        return steps;
    }
    if capped(&steps) {
        return steps;
    }
    let mut next = Vec::with_capacity(values.len() + 1);
    next.push(v);
    next.extend_from_slice(values);
    if !push_capped(
        &mut steps,
        mk(next.clone(), Some(0), 3, format!("link head {v} at 0")),
    ) {
        return steps;
    }
    if !capped(&steps) {
        push_capped(
            &mut steps,
            mk(next.clone(), Some(0), 4, format!("done push_head {v} len={}", next.len())),
        );
    }
    steps
}

/// Push tail: init (1), walk to tail (2 per node), link tail (3), done (4).
pub fn list_push_tail_steps(values: &[i32], v: i32) -> Vec<ChainStep> {
    let mut steps = Vec::new();
    push_capped(
        &mut steps,
        mk(
            values.to_vec(),
            None,
            1,
            format!("init list len={} values={values:?}", values.len()),
        ),
    );
    for (i, &cur) in values.iter().enumerate() {
        if capped(&steps) {
            break;
        }
        if !push_capped(
            &mut steps,
            mk(
                values.to_vec(),
                Some(i),
                2,
                format!("walk tail {i} val={cur}"),
            ),
        ) {
            break;
        }
    }
    if capped(&steps) {
        return steps;
    }
    let mut next = values.to_vec();
    next.push(v);
    let tail_idx = next.len() - 1;
    if !push_capped(
        &mut steps,
        mk(
            next.clone(),
            Some(tail_idx),
            3,
            format!("link tail {v} at {tail_idx}"),
        ),
    ) {
        return steps;
    }
    if !capped(&steps) {
        push_capped(
            &mut steps,
            mk(
                next.clone(),
                Some(tail_idx),
                4,
                format!("done push_tail {v} len={}", next.len()),
            ),
        );
    }
    steps
}

/// Insert at `idx` clamped to `len`: init (1), walk (2), splice (3), done (4).
pub fn list_insert_at_steps(values: &[i32], idx: usize, v: i32) -> Vec<ChainStep> {
    let at = idx.min(values.len());
    let mut steps = Vec::new();
    push_capped(
        &mut steps,
        mk(
            values.to_vec(),
            None,
            1,
            format!("init list len={} insert {v} at {idx} clamped {at}", values.len()),
        ),
    );
    for i in 0..at {
        if capped(&steps) {
            break;
        }
        if !push_capped(
            &mut steps,
            mk(
                values.to_vec(),
                Some(i),
                2,
                format!("walk {i} val={} to idx {at}", values[i]),
            ),
        ) {
            break;
        }
    }
    if capped(&steps) {
        return steps;
    }
    let mut next = values.to_vec();
    next.insert(at, v);
    if !push_capped(
        &mut steps,
        mk(next.clone(), Some(at), 3, format!("splice {v} at {at}")),
    ) {
        return steps;
    }
    if !capped(&steps) {
        push_capped(
            &mut steps,
            mk(
                next.clone(),
                Some(at),
                4,
                format!("done insert {v} at {at} len={}", next.len()),
            ),
        );
    }
    steps
}

/// Delete at `idx`; oob yields init (1) + done (4) with oob note, no panic.
pub fn list_delete_at_steps(values: &[i32], idx: usize) -> Vec<ChainStep> {
    if values.is_empty() {
        return vec![mk(
            Vec::new(),
            None,
            4,
            format!("done: empty list delete {idx} oob"),
        )];
    }
    if idx >= values.len() {
        let mut steps = Vec::new();
        push_capped(
            &mut steps,
            mk(
                values.to_vec(),
                None,
                1,
                format!("init list len={} values={values:?}", values.len()),
            ),
        );
        if !capped(&steps) {
            push_capped(
                &mut steps,
                mk(
                    values.to_vec(),
                    None,
                    4,
                    format!("done: delete idx {idx} out of bounds len={}", values.len()),
                ),
            );
        }
        return steps;
    }
    let mut steps = Vec::new();
    push_capped(
        &mut steps,
        mk(
            values.to_vec(),
            None,
            1,
            format!("init list len={} delete at {idx}", values.len()),
        ),
    );
    for i in 0..=idx {
        if capped(&steps) {
            break;
        }
        if !push_capped(
            &mut steps,
            mk(
                values.to_vec(),
                Some(i),
                2,
                format!("walk {i} val={} to idx {idx}", values[i]),
            ),
        ) {
            break;
        }
    }
    if capped(&steps) {
        return steps;
    }
    let removed = values[idx];
    let mut next = values.to_vec();
    next.remove(idx);
    let hl = if next.is_empty() {
        None
    } else {
        Some(idx.min(next.len() - 1))
    };
    if !push_capped(
        &mut steps,
        mk(next.clone(), hl, 3, format!("unlink idx {idx} val={removed}")),
    ) {
        return steps;
    }
    if !capped(&steps) {
        push_capped(
            &mut steps,
            mk(
                next.clone(),
                None,
                4,
                format!("done delete idx {idx} val={removed} len={}", next.len()),
            ),
        );
    }
    steps
}

// ---------------------------------------------------------------------------
// Stack (push-all then pop-two, LIFO)
// ---------------------------------------------------------------------------

/// Stack: init (1), pushes (2, top carried in note), pops (3, top value in
/// note), done (4) mentioning LIFO.
pub fn stack_steps(values: &[i32]) -> Vec<ChainStep> {
    if values.is_empty() {
        return empty_done("stack");
    }
    let mut steps = Vec::new();
    push_capped(
        &mut steps,
        mk(Vec::new(), None, 1, format!("init empty stack push={values:?}")),
    );
    let mut st: Vec<i32> = Vec::new();
    for &v in values {
        if capped(&steps) {
            break;
        }
        st.push(v);
        let top = st.len() - 1;
        if !push_capped(
            &mut steps,
            mk(st.clone(), Some(top), 2, format!("push {v} top={v}")),
        ) {
            break;
        }
    }
    if capped(&steps) {
        return steps;
    }
    for _ in 0..2.min(st.len()) {
        if capped(&steps) {
            break;
        }
        let top = st.pop().unwrap();
        let hl = if st.is_empty() { None } else { Some(st.len() - 1) };
        if !push_capped(
            &mut steps,
            mk(st.clone(), hl, 3, format!("pop {top} top={top}")),
        ) {
            break;
        }
    }
    if !capped(&steps) {
        push_capped(
            &mut steps,
            mk(
                st.clone(),
                None,
                4,
                format!("done stack size={} LIFO pop order", st.len()),
            ),
        );
    }
    steps
}

// ---------------------------------------------------------------------------
// Queue (enqueue-all then dequeue-two, FIFO)
// ---------------------------------------------------------------------------

/// Queue: init (1), enqueues (2), dequeues (3, head value in note), done (4)
/// mentioning FIFO. `head=true` when non-empty, `tail=true` when `len>1`.
pub fn queue_steps(values: &[i32]) -> Vec<ChainStep> {
    if values.is_empty() {
        return empty_done("queue");
    }
    let mut steps = Vec::new();
    push_capped(
        &mut steps,
        mk(Vec::new(), None, 1, format!("init empty queue enqueue={values:?}")),
    );
    let mut q: Vec<i32> = Vec::new();
    for &v in values {
        if capped(&steps) {
            break;
        }
        q.push(v);
        let tail_idx = q.len() - 1;
        if !push_capped(
            &mut steps,
            mk(q.clone(), Some(tail_idx), 2, format!("enqueue {v} tail={v}")),
        ) {
            break;
        }
    }
    if capped(&steps) {
        return steps;
    }
    for _ in 0..2.min(q.len()) {
        if capped(&steps) {
            break;
        }
        let head_val = q.remove(0);
        let hl = if q.is_empty() { None } else { Some(0) };
        if !push_capped(
            &mut steps,
            mk(q.clone(), hl, 3, format!("dequeue {head_val} head={head_val}")),
        ) {
            break;
        }
    }
    if !capped(&steps) {
        push_capped(
            &mut steps,
            mk(
                q.clone(),
                None,
                4,
                format!("done queue size={} FIFO dequeue order", q.len()),
            ),
        );
    }
    steps
}

#[cfg(test)]
mod tests {
    use super::*;

    fn demo4() -> Vec<i32> {
        demo_values(4)
    }

    #[test]
    fn demo_values_prefix() {
        assert_eq!(demo_values(0), Vec::<i32>::new());
        assert_eq!(demo_values(3), vec![10, 20, 30]);
        assert_eq!(demo_values(6), vec![10, 20, 30, 40, 50, 60]);
        assert_eq!(demo_values(99), vec![10, 20, 30, 40, 50, 60]);
    }

    #[test]
    fn traverse_visits_in_order() {
        let values = demo4();
        let steps = list_traverse_steps(&values);
        assert_eq!(steps[0].line, 1);
        assert_eq!(steps.last().unwrap().line, 4);
        let visits: Vec<usize> = steps
            .iter()
            .filter(|s| s.line == 2)
            .map(|s| s.highlight.unwrap())
            .collect();
        assert_eq!(visits, vec![0, 1, 2, 3]);
        for (i, s) in steps.iter().filter(|s| s.line == 2).enumerate() {
            assert_eq!(s.values, values);
            assert!(s.note.contains(&values[i].to_string()));
            assert!(s.head);
            assert_eq!(s.tail, values.len() > 1);
        }
        assert!(steps.iter().all(|s| (1..=4).contains(&s.line)));
        assert!(steps.len() <= MAX_CHAIN_STEPS);
    }

    #[test]
    fn push_head_puts_first() {
        let values = demo4();
        let steps = list_push_head_steps(&values, 99);
        assert_eq!(steps[0].line, 1);
        assert_eq!(steps.last().unwrap().line, 4);
        let last = steps.last().unwrap();
        assert_eq!(last.values[0], 99);
        assert_eq!(last.values[1..], values);
        let link = steps.iter().find(|s| s.line == 3).unwrap();
        assert_eq!(link.highlight, Some(0));
        assert!(steps.iter().all(|s| (1..=4).contains(&s.line)));
    }

    #[test]
    fn push_tail_appends() {
        let values = demo4();
        let steps = list_push_tail_steps(&values, 99);
        let last = steps.last().unwrap();
        assert_eq!(last.line, 4);
        assert_eq!(*last.values.last().unwrap(), 99);
        assert_eq!(&last.values[..values.len()], &values);
        let link = steps.iter().find(|s| s.line == 3).unwrap();
        assert_eq!(link.highlight, Some(values.len()));
        assert!(steps.iter().all(|s| (1..=4).contains(&s.line)));
    }

    #[test]
    fn insert_at_position_and_clamped() {
        let values = demo4(); // [10,20,30,40]
        let steps = list_insert_at_steps(&values, 2, 99);
        let last = steps.last().unwrap();
        assert_eq!(last.values, vec![10, 20, 99, 30, 40]);
        let link = steps.iter().find(|s| s.line == 3).unwrap();
        assert_eq!(link.highlight, Some(2));

        // clamp: idx far beyond len appends
        let big = list_insert_at_steps(&values, 100, 77);
        assert_eq!(big.last().unwrap().values, vec![10, 20, 30, 40, 77]);
        assert_eq!(
            big.iter().find(|s| s.line == 3).unwrap().highlight,
            Some(4)
        );
        assert!(steps.iter().all(|s| (1..=4).contains(&s.line)));
    }

    #[test]
    fn delete_at_removes_and_oob_safe() {
        let values = demo4();
        let steps = list_delete_at_steps(&values, 1);
        let last = steps.last().unwrap();
        assert_eq!(last.line, 4);
        assert_eq!(last.values, vec![10, 30, 40]);

        // oob: no panic, values unchanged, done note mentions bounds
        let oob = list_delete_at_steps(&values, 99);
        assert_eq!(oob.last().unwrap().line, 4);
        assert_eq!(oob.last().unwrap().values, values);
        assert!(oob.last().unwrap().note.contains("out of bounds"));

        // empty: single done
        let e = list_delete_at_steps(&[], 0);
        assert_eq!(e.len(), 1);
        assert_eq!(e[0].line, 4);
    }

    #[test]
    fn stack_pops_lifo() {
        let values = demo_values(3); // [10,20,30]
        let steps = stack_steps(&values);
        assert_eq!(steps[0].line, 1);
        assert_eq!(steps.last().unwrap().line, 4);
        assert!(steps.last().unwrap().note.contains("LIFO"));
        let pops: Vec<&ChainStep> = steps.iter().filter(|s| s.line == 3).collect();
        assert_eq!(pops.len(), 2);
        assert!(pops[0].note.contains("30"), "note: {}", pops[0].note);
        assert!(pops[1].note.contains("20"), "note: {}", pops[1].note);
        // final stack holds the remainder
        assert_eq!(steps.last().unwrap().values, vec![10]);
        // push notes carry top value
        for s in steps.iter().filter(|s| s.line == 2) {
            let top = *s.values.last().unwrap();
            assert!(s.note.contains(&top.to_string()));
        }
    }

    #[test]
    fn queue_dequeues_fifo() {
        let values = demo_values(3); // [10,20,30]
        let steps = queue_steps(&values);
        assert_eq!(steps[0].line, 1);
        assert_eq!(steps.last().unwrap().line, 4);
        let deqs: Vec<&ChainStep> = steps.iter().filter(|s| s.line == 3).collect();
        assert_eq!(deqs.len(), 2);
        assert!(deqs[0].note.contains("10"), "note: {}", deqs[0].note);
        assert!(deqs[1].note.contains("20"), "note: {}", deqs[1].note);
        assert_eq!(steps.last().unwrap().values, vec![30]);
        // head=true when non-empty, tail=true when len>1
        for s in steps.iter().skip(1) {
            if s.values.is_empty() {
                assert!(!s.head && !s.tail);
            } else {
                assert!(s.head);
                assert_eq!(s.tail, s.values.len() > 1);
            }
        }
    }

    #[test]
    fn empty_cases_single_done() {
        for steps in [
            list_traverse_steps(&[]),
            list_delete_at_steps(&[], 0),
            stack_steps(&[]),
            queue_steps(&[]),
        ] {
            assert_eq!(steps.len(), 1);
            assert_eq!(steps[0].line, 4);
            assert!(!steps[0].head);
            assert!(!steps[0].tail);
        }
    }

    #[test]
    fn chain_cap_respected() {
        let big: Vec<i32> = (0..20_000).map(|x| x as i32).collect();
        for steps in [
            list_traverse_steps(&big),
            stack_steps(&big),
            queue_steps(&big),
        ] {
            assert!(steps.len() <= MAX_CHAIN_STEPS, "len={}", steps.len());
        }
        assert_eq!(MAX_CHAIN_STEPS, 10_000);
    }

    #[test]
    fn chain_json_roundtrip() {
        let steps = list_traverse_steps(&demo_values(3));
        let s = serde_json::to_string(&steps).unwrap();
        let back: Vec<ChainStep> = serde_json::from_str(&s).unwrap();
        assert_eq!(back, steps);

        let st = stack_steps(&demo_values(3));
        let s2 = serde_json::to_string(&st).unwrap();
        let back2: Vec<ChainStep> = serde_json::from_str(&s2).unwrap();
        assert_eq!(back2, st);
    }
}
