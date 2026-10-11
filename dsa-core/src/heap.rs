//! Traced max-heap operations: bottom-up build, push (sift-up),
//! and pop-max (swap root-last + sift-down).
//!
//! Conventions mirror `arrays.rs` / `sorting.rs`:
//! - deterministic input via [`Lcg`], values in `[5, 60]` for readability,
//! - `n` clamped to `0..=100`,
//! - steps capped at [`MAX_STEPS`] with early break,
//! - line numbers match the 5 single-line code blocks per algo.
//!
//! Pseudocode line maps:
//! - build:
//!   1 `start sift-down at i`
//!   2 `compare children (compare=[i, child])`
//!   3 `swap + sift (swap=[i, largest])`
//!   4 `done heap-valid` (+ extra line-5 `done` so highlight reaches end)
//! - push:
//!   1 `sift-up start (new value)`
//!   2 `compare parent (compare=[parent, child])`
//!   3 `swap with parent (swap=[parent, child])`
//!   4 `done heap-valid` (+ extra line-5 `done`)
//! - pop:
//!   1 `extract start (swap root-last)`
//!   2 `compare children (compare=[i, child])`
//!   3 `swap + sift (swap=[i, largest])`
//!   4 `done extracted max` (+ extra line-5 `done`)
//!
//! `sorted_from`: always `None` mid-trace. Final `done` uses `None` for
//! build/push (heap, not sorted) and `Some(0)` for pop (finished glow,
//! following the `prefix_sum_steps` precedent; `None` when empty).

use crate::prng::Lcg;
use crate::sorting::MAX_STEPS;
use crate::steps::Step;

fn push_capped(steps: &mut Vec<Step>, step: Step) -> bool {
    if steps.len() >= MAX_STEPS {
        return false;
    }
    steps.push(step);
    true
}

fn capped(steps: &[Step]) -> bool {
    steps.len() >= MAX_STEPS
}

/// Single `line: 5, note: done trivially` step for all `n == 0` inputs.
fn empty_done() -> Vec<Step> {
    vec![Step::done(&[], None, 5, "done trivially (empty)", 0, 0)]
}

/// Deterministic array of length `n` with values in `[5, 60]` inclusive.
fn gen_heap(n: usize, seed: u64) -> Vec<i32> {
    let mut rng = Lcg::new(seed);
    (0..n).map(|_| rng.gen_range(5, 60)).collect()
}

fn is_max_heap(a: &[i32]) -> bool {
    for i in 0..a.len() {
        let l = 2 * i + 1;
        let r = 2 * i + 2;
        if l < a.len() && a[i] < a[l] {
            return false;
        }
        if r < a.len() && a[i] < a[r] {
            return false;
        }
    }
    true
}

/// Sift-down from `start` within `a[..heap_size]`, emitting line-2
/// compares (`compare=[i, child]`) and line-3 swaps (`swap=[i, largest]`).
/// Returns `false` if the step cap was hit (caller should abort).
fn sift_down_trace(
    a: &mut Vec<i32>,
    steps: &mut Vec<Step>,
    start: usize,
    heap_size: usize,
    comparisons: &mut usize,
    swaps: &mut usize,
) -> bool {
    let mut i = start;
    loop {
        if capped(steps) {
            return false;
        }
        let l = 2 * i + 1;
        let r = 2 * i + 2;
        let mut largest = i;
        if l < heap_size {
            *comparisons += 1;
            if !push_capped(
                steps,
                Step::mark_compare(
                    a,
                    i,
                    l,
                    None,
                    2,
                    format!("compare a[{i}]={} vs left a[{l}]={}", a[i], a[l]),
                    *comparisons,
                    *swaps,
                ),
            ) {
                return false;
            }
            if a[l] > a[largest] {
                largest = l;
            }
        }
        if capped(steps) {
            return false;
        }
        if r < heap_size {
            *comparisons += 1;
            if !push_capped(
                steps,
                Step::mark_compare(
                    a,
                    i,
                    r,
                    None,
                    2,
                    format!(
                        "compare a[{i}]={} vs right a[{r}]={} largest={largest}",
                        a[i], a[r]
                    ),
                    *comparisons,
                    *swaps,
                ),
            ) {
                return false;
            }
            if a[r] > a[largest] {
                largest = r;
            }
        }
        if largest != i {
            a.swap(i, largest);
            *swaps += 1;
            if !push_capped(
                steps,
                Step::mark_swap(
                    a,
                    i,
                    largest,
                    None,
                    3,
                    format!("swap a[{i}]<->a[{largest}] sift to {largest}"),
                    *comparisons,
                    *swaps,
                ),
            ) {
                return false;
            }
            i = largest;
        } else {
            break;
        }
    }
    true
}

/// Bottom-up heapify of `a[..heap_size]` emitting line-1 starts plus
/// line-2/3 via [`sift_down_trace`]. Returns `false` if capped.
fn heapify_trace(
    a: &mut Vec<i32>,
    steps: &mut Vec<Step>,
    heap_size: usize,
    comparisons: &mut usize,
    swaps: &mut usize,
) -> bool {
    if heap_size < 2 {
        return true;
    }
    for i in (0..heap_size / 2).rev() {
        if capped(steps) {
            return false;
        }
        if !push_capped(
            steps,
            Step::new(
                a.clone(),
                None,
                None,
                None,
                1,
                format!("sift-down start i={i} val={}", a[i]),
                *comparisons,
                *swaps,
            ),
        ) {
            return false;
        }
        if !sift_down_trace(a, steps, i, heap_size, comparisons, swaps) {
            return false;
        }
    }
    true
}

fn done_pair(
    steps: &mut Vec<Step>,
    a: &[i32],
    sorted_from: Option<usize>,
    note: String,
    comparisons: usize,
    swaps: usize,
) {
    if capped(steps) {
        return;
    }
    push_capped(
        steps,
        Step::done(a, sorted_from, 4, note.clone(), comparisons, swaps),
    );
    push_capped(
        steps,
        Step::done(a, sorted_from, 5, note, comparisons, swaps),
    );
}

// ---------------------------------------------------------------------------
// Build: bottom-up max-heap via sift-down.
// ---------------------------------------------------------------------------
pub fn heap_build_steps(n: usize, seed: u64) -> Vec<Step> {
    let n = n.min(100);
    if n == 0 {
        return empty_done();
    }
    let mut a = gen_heap(n, seed);
    let mut steps = Vec::new();
    let mut comparisons: usize = 0;
    let mut swaps: usize = 0;

    push_capped(
        &mut steps,
        Step::new(
            a.clone(),
            None,
            None,
            None,
            1,
            format!("initial array n={n} seed={seed}"),
            comparisons,
            swaps,
        ),
    );

    if n == 1 {
        done_pair(
            &mut steps,
            &a,
            None,
            format!("done heap-valid single [{}]", a[0]),
            comparisons,
            swaps,
        );
        return steps;
    }

    if !heapify_trace(&mut a, &mut steps, n, &mut comparisons, &mut swaps) {
        return steps;
    }
    debug_assert!(is_max_heap(&a));

    if !capped(&steps) {
        done_pair(
            &mut steps,
            &a,
            None,
            format!("done heap-valid n={n} root={}", a[0]),
            comparisons,
            swaps,
        );
    }
    steps
}

// ---------------------------------------------------------------------------
// Push: build heap of `n`, then push one value with sift-up.
// ---------------------------------------------------------------------------
pub fn heap_push_steps(n: usize, seed: u64) -> Vec<Step> {
    let n = n.min(100);
    let mut rng = Lcg::new(seed);
    let mut a: Vec<i32> = (0..n).map(|_| rng.gen_range(5, 60)).collect();
    let pushed = rng.gen_range(5, 60);
    let mut steps = Vec::new();
    let mut comparisons: usize = 0;
    let mut swaps: usize = 0;

    if n == 0 {
        push_capped(
            &mut steps,
            Step::new(
                a.clone(),
                None,
                None,
                None,
                1,
                format!("initial empty heap push val={pushed}"),
                comparisons,
                swaps,
            ),
        );
        a.push(pushed);
        push_capped(
            &mut steps,
            Step::new(
                a.clone(),
                None,
                None,
                None,
                1,
                format!("sift-up start idx=0 val={pushed} (single)"),
                comparisons,
                swaps,
            ),
        );
        done_pair(
            &mut steps,
            &a,
            None,
            format!("done heap-valid push {pushed} n=1"),
            comparisons,
            swaps,
        );
        return steps;
    }

    push_capped(
        &mut steps,
        Step::new(
            a.clone(),
            None,
            None,
            None,
            1,
            format!("initial array n={n} seed={seed} push val={pushed}"),
            comparisons,
            swaps,
        ),
    );

    if !heapify_trace(&mut a, &mut steps, n, &mut comparisons, &mut swaps) {
        return steps;
    }

    if capped(&steps) {
        return steps;
    }
    a.push(pushed);
    let mut i = a.len() - 1;
    if !push_capped(
        &mut steps,
        Step::new(
            a.clone(),
            None,
            None,
            None,
            1,
            format!("sift-up start idx={i} val={pushed}"),
            comparisons,
            swaps,
        ),
    ) {
        return steps;
    }

    while i > 0 {
        if capped(&steps) {
            break;
        }
        let parent = (i - 1) / 2;
        comparisons += 1;
        if !push_capped(
            &mut steps,
            Step::mark_compare(
                &a,
                parent,
                i,
                None,
                2,
                format!("compare parent a[{parent}]={} vs child a[{i}]={}", a[parent], a[i]),
                comparisons,
                swaps,
            ),
        ) {
            break;
        }
        if a[i] > a[parent] {
            a.swap(i, parent);
            swaps += 1;
            if !push_capped(
                &mut steps,
                Step::mark_swap(
                    &a,
                    parent,
                    i,
                    None,
                    3,
                    format!("swap parent a[{parent}]<->a[{i}] sift-up to {parent}"),
                    comparisons,
                    swaps,
                ),
            ) {
                break;
            }
            i = parent;
        } else {
            break;
        }
    }

    if !capped(&steps) {
        done_pair(
            &mut steps,
            &a,
            None,
            format!("done heap-valid push {pushed} n={} root={}", a.len(), a[0]),
            comparisons,
            swaps,
        );
    }
    steps
}

// ---------------------------------------------------------------------------
// Pop: build heap of `n`, then extract max (swap root-last + sift-down).
// Final array holds the remaining heap (len `n-1`); note carries the max.
// ---------------------------------------------------------------------------
pub fn heap_pop_steps(n: usize, seed: u64) -> Vec<Step> {
    let n = n.min(100);
    if n == 0 {
        return empty_done();
    }
    let mut a = gen_heap(n, seed);
    let mut steps = Vec::new();
    let mut comparisons: usize = 0;
    let mut swaps: usize = 0;

    push_capped(
        &mut steps,
        Step::new(
            a.clone(),
            None,
            None,
            None,
            1,
            format!("initial array n={n} seed={seed} extract-max"),
            comparisons,
            swaps,
        ),
    );

    if !heapify_trace(&mut a, &mut steps, n, &mut comparisons, &mut swaps) {
        return steps;
    }
    if capped(&steps) {
        return steps;
    }

    let max = a[0];
    let last = a.len() - 1;
    if !push_capped(
        &mut steps,
        Step::new(
            a.clone(),
            None,
            None,
            None,
            1,
            format!("extract max={max} swap root<->last[{last}]"),
            comparisons,
            swaps,
        ),
    ) {
        return steps;
    }
    if capped(&steps) {
        return steps;
    }
    a.swap(0, last);
    swaps += 1;
    if !push_capped(
        &mut steps,
        Step::mark_swap(
            &a,
            0,
            last,
            None,
            3,
            format!("swap root<->last max={max} to end"),
            comparisons,
            swaps,
        ),
    ) {
        return steps;
    }
    a.pop();

    if !a.is_empty() {
        if capped(&steps) {
            return steps;
        }
        push_capped(
            &mut steps,
            Step::new(
                a.clone(),
                None,
                None,
                None,
                1,
                format!("sift-down start i=0 after extract max={max}"),
                comparisons,
                swaps,
            ),
        );
        let heap_len = a.len();
        if !sift_down_trace(&mut a, &mut steps, 0, heap_len, &mut comparisons, &mut swaps) {
            return steps;
        }
    }

    if !capped(&steps) {
        let sorted_from = if a.is_empty() { None } else { Some(0) };
        let note = if a.is_empty() {
            format!("done extracted max={max} heap empty")
        } else {
            format!("done extracted max={max} n={} root={}", a.len(), a[0])
        };
        done_pair(&mut steps, &a, sorted_from, note, comparisons, swaps);
    }
    steps
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_max_heap(a: &[i32]) {
        for i in 0..a.len() {
            let l = 2 * i + 1;
            let r = 2 * i + 2;
            if l < a.len() {
                assert!(a[i] >= a[l], "heap violated at {i}: {} < {l}={}", a[i], a[l]);
            }
            if r < a.len() {
                assert!(a[i] >= a[r], "heap violated at {i}: {} < {r}={}", a[i], a[r]);
            }
        }
    }

    #[test]
    fn build_satisfies_max_heap() {
        for (n, seed) in [(10, 1), (15, 7), (25, 42), (50, 99), (100, 3)] {
            let steps = heap_build_steps(n, seed);
            let last = steps.last().unwrap();
            assert_max_heap(&last.array);
            assert_eq!(last.array.len(), n.min(100));
            assert_eq!(last.line, 5);
            assert!(last.note.contains("heap-valid"), "note: {}", last.note);
            // values in range
            for v in &last.array {
                assert!((5..=60).contains(v), "value {v} out of range");
            }
        }
    }

    #[test]
    fn build_compare_swap_marks_sane() {
        let steps = heap_build_steps(12, 5);
        assert!(steps.iter().any(|s| s.line == 1));
        assert!(steps.iter().any(|s| s.line == 2));
        // swap may or may not occur for a given seed; use a seed sweep
        let any_swap = (0..20).any(|seed| heap_build_steps(20, seed).iter().any(|s| s.swap.is_some()));
        assert!(any_swap, "expected some seed to emit swaps");
        for s in &steps {
            assert!((1..=5).contains(&s.line), "line={} note={}", s.line, s.note);
            if let Some([x, y]) = s.compare {
                assert!(x < s.array.len() && y < s.array.len());
            }
            if let Some([x, y]) = s.swap {
                assert!(x < s.array.len() && y < s.array.len());
            }
            assert!(s.sorted_from.is_none(), "build mid/final sorted_from must be None");
        }
        // done pair: line 4 then line 5 with same array
        assert_eq!(steps[steps.len() - 2].line, 4);
        assert_eq!(steps[steps.len() - 1].line, 5);
        assert_eq!(steps[steps.len() - 2].array, steps[steps.len() - 1].array);
    }

    #[test]
    fn push_results_in_heap_and_contains_value() {
        for (n, seed) in [(5, 1), (10, 42), (1, 7), (0, 9), (30, 123)] {
            let steps = heap_push_steps(n, seed);
            let last = steps.last().unwrap();
            assert_max_heap(&last.array);
            assert_eq!(last.array.len(), n.min(100) + 1);
            assert_eq!(last.line, 5);
            // pushed value = next rng output after n draws
            let mut rng = Lcg::new(seed);
            for _ in 0..n.min(100) {
                rng.gen_range(5, 60);
            }
            let pushed = rng.gen_range(5, 60);
            assert!(last.array.contains(&pushed), "pushed {pushed} missing in {:?}", last.array);
            assert!(last.note.contains(&format!("{pushed}")), "note: {}", last.note);
            for s in &steps {
                assert!((1..=5).contains(&s.line));
            }
        }
    }

    #[test]
    fn pop_extracts_max_and_remaining_is_heap() {
        for (n, seed) in [(10, 1), (15, 42), (30, 7), (5, 99)] {
            let before = heap_build_steps(n, seed);
            let heap = &before.last().unwrap().array;
            let expected_max = *heap.iter().max().unwrap();
            let steps = heap_pop_steps(n, seed);
            let last = steps.last().unwrap();
            assert_eq!(last.array.len(), n - 1);
            assert_max_heap(&last.array);
            assert!(last.note.contains(&format!("{expected_max}")), "note: {}", last.note);
            assert_eq!(last.sorted_from, Some(0));
            assert_eq!(last.line, 5);
            // swap root-last emitted
            assert!(steps.iter().any(|s| s.swap == Some([0, n - 1])), "no root-last swap");
            // mid-trace sorted_from all None except final pair
            for s in &steps[..steps.len() - 2] {
                assert!(s.sorted_from.is_none(), "mid sorted_from must be None: {:?}", s);
            }
        }
    }

    #[test]
    fn pop_singleton_leaves_empty() {
        let steps = heap_pop_steps(1, 4);
        let last = steps.last().unwrap();
        assert!(last.array.is_empty());
        assert_eq!(last.line, 5);
        assert!(last.note.contains("extracted max"), "note: {}", last.note);
    }

    #[test]
    fn empty_and_singleton_trivial() {
        let b0 = heap_build_steps(0, 0);
        assert_eq!(b0.len(), 1);
        assert_eq!(b0[0].line, 5);
        assert!(b0[0].note.contains("done trivially"));

        let p0 = heap_pop_steps(0, 0);
        assert_eq!(p0.len(), 1);
        assert_eq!(p0[0].line, 5);

        let b1 = heap_build_steps(1, 0);
        assert_eq!(b1.last().unwrap().line, 5);
        assert_eq!(b1.last().unwrap().array.len(), 1);
        assert_eq!(b1[b1.len() - 2].line, 4);

        // push from empty yields single-element heap
        let push0 = heap_push_steps(0, 3);
        assert_eq!(push0.last().unwrap().array.len(), 1);
        assert_eq!(push0.last().unwrap().line, 5);
    }

    #[test]
    fn heap_cap_and_determinism() {
        assert!(heap_build_steps(100, 1).len() <= MAX_STEPS);
        assert!(heap_push_steps(100, 1).len() <= MAX_STEPS);
        assert!(heap_pop_steps(100, 1).len() <= MAX_STEPS);
        assert_eq!(heap_build_steps(500, 1).len(), heap_build_steps(100, 1).len());
        assert_eq!(heap_build_steps(20, 77), heap_build_steps(20, 77));
        assert_eq!(heap_push_steps(20, 77), heap_push_steps(20, 77));
        assert_eq!(heap_pop_steps(20, 77), heap_pop_steps(20, 77));
        for steps in [
            heap_build_steps(12, 2),
            heap_push_steps(12, 2),
            heap_pop_steps(12, 2),
        ] {
            assert!(!steps.is_empty());
            for s in &steps {
                assert!((1..=5).contains(&s.line));
            }
        }
    }

    #[test]
    fn heap_json_roundtrips() {
        for steps in [
            heap_build_steps(10, 1),
            heap_push_steps(10, 1),
            heap_pop_steps(10, 1),
        ] {
            let s = serde_json::to_string(&steps).unwrap();
            let back: Vec<Step> = serde_json::from_str(&s).unwrap();
            assert_eq!(back, steps);
        }
    }
}
