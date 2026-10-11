//! Traced array techniques: two-sum on sorted input, sliding window
//! maximum, prefix sums, Kadane's max-subarray, right rotation by
//! reversal, and sorted dedup.
//!
//! Conventions mirror `sorting.rs`:
//! - deterministic input via [`Lcg`], small values for readability,
//! - `n` clamped to `0..=100`,
//! - steps capped at [`MAX_STEPS`] with early break,
//! - line numbers match the 5 single-line code blocks per algo on the TS side.

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

/// Deterministic array of length `n` with values in `[5, 40]` inclusive.
fn gen_small(n: usize, seed: u64) -> Vec<i32> {
    let mut rng = Lcg::new(seed);
    (0..n).map(|_| rng.gen_range(5, 40)).collect()
}

// ---------------------------------------------------------------------------
// Two sum on sorted input
// Pseudocode line map:
//   1 `l = 0, r = n-1`
//   2 `while l < r`
//   3 `compare a[l] + a[r] vs target` (compare=[l,r])
//   4 `move l += 1 or r -= 1`
//   5 `done found-at / not-found`
// comparisons counts sum-vs-target compares; swaps unused.
// ---------------------------------------------------------------------------
pub fn two_sum_sorted_steps(n: usize, seed: u64, target: i32) -> Vec<Step> {
    let n = n.min(100);
    if n == 0 {
        return empty_done();
    }
    let mut a = gen_small(n, seed);
    a.sort_unstable();
    let mut steps = Vec::new();
    let mut comparisons: usize = 0;
    let swaps: usize = 0;

    push_capped(
        &mut steps,
        Step::new(
            a.clone(),
            None,
            None,
            None,
            1,
            format!("init l=0 r={} target={target}", n - 1),
            comparisons,
            swaps,
        ),
    );

    if n == 1 {
        comparisons += 1;
        push_capped(
            &mut steps,
            Step::mark_compare(
                &a,
                0,
                0,
                None,
                3,
                format!("a[0]={} vs {target} (need a pair)", a[0]),
                comparisons,
                swaps,
            ),
        );
        if !capped(&steps) {
            push_capped(
                &mut steps,
                Step::done(&a, None, 5, format!("done {target} not found"), comparisons, swaps),
            );
        }
        return steps;
    }

    let mut l: usize = 0;
    let mut r: usize = n - 1;
    while l < r {
        if capped(&steps) {
            break;
        }
        comparisons += 1;
        let sum = a[l] + a[r];
        if !push_capped(
            &mut steps,
            Step::mark_compare(
                &a,
                l,
                r,
                None,
                3,
                format!("a[{l}]={} + a[{r}]={} = {sum} vs {target}", a[l], a[r]),
                comparisons,
                swaps,
            ),
        ) {
            break;
        }
        if sum == target {
            push_capped(
                &mut steps,
                Step::done(&a, None, 5, format!("done found {target} at [{l},{r}]"), comparisons, swaps),
            );
            return steps;
        }
        if capped(&steps) {
            break;
        }
        if sum < target {
            l += 1;
            push_capped(
                &mut steps,
                Step::new(a.clone(), None, None, None, 4, format!("{sum} < {target}, l={l}"), comparisons, swaps),
            );
        } else {
            r -= 1;
            push_capped(
                &mut steps,
                Step::new(a.clone(), None, None, None, 4, format!("{sum} > {target}, r={r}"), comparisons, swaps),
            );
        }
    }

    if !capped(&steps) {
        push_capped(
            &mut steps,
            Step::done(&a, None, 5, format!("done {target} not found"), comparisons, swaps),
        );
    }
    steps
}

// ---------------------------------------------------------------------------
// Sliding window maximum sum of fixed size k
// Pseudocode line map:
//   1 `first window [0..k]`
//   2 `slide window [i..i+k]` (compare=[i,i+k-1] window bounds)
//   3 `compare window sum vs best`
//   4 `done best sum + window`
// k clamped to 1..=n; swaps unused.
// ---------------------------------------------------------------------------
pub fn sliding_window_steps(n: usize, seed: u64, k: usize) -> Vec<Step> {
    let n = n.min(100);
    if n == 0 {
        return empty_done();
    }
    let a = gen_small(n, seed);
    let k = k.max(1).min(n);
    let mut steps = Vec::new();
    let mut comparisons: usize = 0;

    let first: i32 = a[..k].iter().sum();
    let mut best = first;
    let mut best_start: usize = 0;
    push_capped(
        &mut steps,
        Step::new(
            a.clone(),
            Some([0, k - 1]),
            None,
            None,
            1,
            format!("init window [0..{k}] sum={first}"),
            comparisons,
            0,
        ),
    );

    if k == n {
        push_capped(
            &mut steps,
            Step::done(&a, None, 4, format!("done best sum={best} window [0..{k}]"), comparisons, 0),
        );
        return steps;
    }

    for i in 1..=n - k {
        if capped(&steps) {
            break;
        }
        let sum: i32 = a[i..i + k].iter().sum();
        if !push_capped(
            &mut steps,
            Step::mark_compare(
                &a,
                i,
                i + k - 1,
                None,
                2,
                format!("slide window [{i}..{}] sum={sum}", i + k),
                comparisons,
                0,
            ),
        ) {
            break;
        }
        if capped(&steps) {
            break;
        }
        comparisons += 1;
        if sum > best {
            best = sum;
            best_start = i;
            push_capped(
                &mut steps,
                Step::mark_compare(
                    &a,
                    i,
                    i + k - 1,
                    None,
                    3,
                    format!("{sum} > best, new best={best} at [{i}..{}]", i + k),
                    comparisons,
                    0,
                ),
            );
        } else {
            push_capped(
                &mut steps,
                Step::mark_compare(
                    &a,
                    i,
                    i + k - 1,
                    None,
                    3,
                    format!("{sum} <= best={best}, keep [{best_start}..{}]", best_start + k),
                    comparisons,
                    0,
                ),
            );
        }
    }

    if !capped(&steps) {
        push_capped(
            &mut steps,
            Step::done(
                &a,
                None,
                4,
                format!("done best sum={best} window [{best_start}..{}]", best_start + k),
                comparisons,
                0,
            ),
        );
    }
    steps
}

// ---------------------------------------------------------------------------
// Prefix sums
// Pseudocode line map:
//   1 `init prefix zeros`
//   2 `loop i`
//   3 `pref[i] = pref[i-1] + a[i]` (compare=[i,i], note shows equation)
//   4 `done`
// The visualized array is the prefix array filling progressively;
// sorted_from: None mid-trace (the compare outline carries the meaning),
// Some(0) at done so the finished prefix glows. (Empty input: line-5 trivial done.)
// ---------------------------------------------------------------------------
pub fn prefix_sum_steps(n: usize, seed: u64) -> Vec<Step> {
    let n = n.min(100);
    if n == 0 {
        return empty_done();
    }
    let mut rng = Lcg::new(seed);
    let a: Vec<i32> = (0..n).map(|_| rng.gen_range(5, 40)).collect();
    let mut pref = vec![0i32; n];
    let mut steps = Vec::new();

    push_capped(
        &mut steps,
        Step::new(pref.clone(), None, None, None, 1, format!("init prefix zeros n={n}"), 0, 0),
    );

    for i in 0..n {
        if capped(&steps) {
            break;
        }
        if !push_capped(
            &mut steps,
            Step::new(pref.clone(), Some([i, i]), None, None, 2, format!("loop i={i}"), 0, 0),
        ) {
            break;
        }
        if capped(&steps) {
            break;
        }
        if i == 0 {
            pref[0] = a[0];
            push_capped(
                &mut steps,
                Step::new(pref.clone(), Some([0, 0]), None, None, 3, format!("pref[0]=a[0]={}", a[0]), 0, 0),
            );
        } else {
            let s = pref[i - 1] + a[i];
            pref[i] = s;
            push_capped(
                &mut steps,
                Step::new(
                    pref.clone(),
                    Some([i, i]),
                    None,
                    None,
                    3,
                    format!("pref[{i}]=pref[{}]+a[{i}]={}+{}={s}", i - 1, pref[i - 1], a[i]),
                    0,
                    0,
                ),
            );
        }
    }

    if !capped(&steps) {
        push_capped(
            &mut steps,
            Step::done(&pref, Some(0), 5, format!("done prefix total={}", pref[n - 1]), 0, 0),
        );
    }
    steps
}

// ---------------------------------------------------------------------------
// Kadane's maximum subarray
// Pseudocode line map:
//   1 `init cur = best = a[0]`
//   2 `loop i`
//   3 `extend (cur+a[i]) vs restart (a[i])` (compare=[i,i], note has values)
//   4 `update best` (only when best improves)
//   5 `done best value + range`
// Array is fixed; values in [-20, 50] so negatives occur.
// ---------------------------------------------------------------------------
fn kadane_trace(a: &[i32]) -> Vec<Step> {
    if a.is_empty() {
        return empty_done();
    }
    let n = a.len();
    let mut steps = Vec::new();
    let mut comparisons: usize = 0;

    let mut cur = a[0];
    let mut best = a[0];
    let mut cur_l: usize = 0;
    let mut bl: usize = 0;
    let mut br: usize = 0;

    push_capped(
        &mut steps,
        Step::mark_single(a, 0, 1, format!("init cur=best=a[0]={}", a[0]), comparisons, 0),
    );

    if n == 1 {
        push_capped(
            &mut steps,
            Step::done(a, None, 5, format!("done best={best} range [0..1]"), comparisons, 0),
        );
        return steps;
    }

    for i in 1..n {
        if capped(&steps) {
            break;
        }
        comparisons += 1;
        let extend = cur + a[i];
        if !push_capped(
            &mut steps,
            Step::new(
                a.to_vec(),
                Some([i, i]),
                None,
                None,
                3,
                format!("i={i} a[i]={} cur={cur} extend={extend} vs restart={} best={best}", a[i], a[i]),
                comparisons,
                0,
            ),
        ) {
            break;
        }
        if a[i] > extend {
            cur = a[i];
            cur_l = i;
        } else {
            cur = extend;
        }
        if capped(&steps) {
            break;
        }
        if cur > best {
            best = cur;
            bl = cur_l;
            br = i;
            push_capped(
                &mut steps,
                Step::mark_single(a, i, 4, format!("new best={best} range [{bl}..{}]", br + 1), comparisons, 0),
            );
        }
    }

    if !capped(&steps) {
        push_capped(
            &mut steps,
            Step::done(a, None, 5, format!("done best={best} range [{bl}..{}]", br + 1), comparisons, 0),
        );
    }
    steps
}

pub fn kadane_steps(n: usize, seed: u64) -> Vec<Step> {
    let n = n.min(100);
    if n == 0 {
        return empty_done();
    }
    let mut rng = Lcg::new(seed);
    let a: Vec<i32> = (0..n).map(|_| rng.gen_range(-20, 50)).collect();
    kadane_trace(&a)
}

// ---------------------------------------------------------------------------
// Right rotation by k via 3 reversals (real swaps)
// Pseudocode line map:
//   1 `reverse all`
//   2 `reverse first k`
//   3 `reverse rest`
//   4 `done` (+ extra line-5 `done` so highlight reaches end)
// swaps counts real swaps; comparisons unused.
// ---------------------------------------------------------------------------
fn reverse_range(
    a: &mut Vec<i32>,
    steps: &mut Vec<Step>,
    lo: usize,
    hi: usize,
    line: usize,
    swaps: &mut usize,
) -> bool {
    // Reverse a[lo..hi].
    let (mut l, mut r) = (lo, hi);
    while l < r {
        r -= 1;
        if l >= r {
            break;
        }
        if capped(steps) {
            return false;
        }
        a.swap(l, r);
        *swaps += 1;
        if !push_capped(
            steps,
            Step::mark_swap(a, l, r, None, line, format!("reverse swap [{l}]<->[{r}]"), 0, *swaps),
        ) {
            return false;
        }
        l += 1;
    }
    true
}

pub fn rotate_steps(n: usize, seed: u64, k: usize) -> Vec<Step> {
    let n = n.min(100);
    if n == 0 {
        return empty_done();
    }
    let mut a = gen_small(n, seed);
    let k = k % n;
    let mut steps = Vec::new();
    let mut swaps: usize = 0;

    push_capped(
        &mut steps,
        Step::new(a.clone(), None, None, None, 1, format!("start right-rotate by {k} n={n}"), 0, swaps),
    );

    if n == 1 || k == 0 {
        push_capped(
            &mut steps,
            Step::done(&a, None, 4, format!("done rotated by {k} (no-op)"), 0, swaps),
        );
        push_capped(
            &mut steps,
            Step::done(&a, None, 5, format!("done rotated by {k} (no-op)"), 0, swaps),
        );
        return steps;
    }

    if !reverse_range(&mut a, &mut steps, 0, n, 1, &mut swaps) {
        return steps;
    }
    if !reverse_range(&mut a, &mut steps, 0, k, 2, &mut swaps) {
        return steps;
    }
    if !reverse_range(&mut a, &mut steps, k, n, 3, &mut swaps) {
        return steps;
    }

    if !capped(&steps) {
        push_capped(
            &mut steps,
            Step::done(&a, None, 4, format!("done right-rotated by {k}"), 0, swaps),
        );
        push_capped(
            &mut steps,
            Step::done(&a, None, 5, format!("done right-rotated by {k}"), 0, swaps),
        );
    }
    steps
}

// ---------------------------------------------------------------------------
// Dedup of a sorted array with forced duplicates
// Pseudocode line map:
//   1 `init w = 0`
//   2 `scan i`
//   3 `compare dup? a[i] vs a[w]` (compare=[i,w])
//   4 `write a[w] / skip` (swap=[i,w] on writes)
//   5 `done new length`
// Values in 1..=max(2, n/2) force duplicates; comparisons counts dup
// compares; swaps counts writes. Final array is truncated to new length.
// ---------------------------------------------------------------------------
pub fn dedup_sorted_steps(n: usize, seed: u64) -> Vec<Step> {
    let n = n.min(100);
    if n == 0 {
        return empty_done();
    }
    let vmax = (n as i32 / 2).max(2);
    let mut rng = Lcg::new(seed);
    let mut a: Vec<i32> = (0..n).map(|_| rng.gen_range(1, vmax)).collect();
    a.sort_unstable();
    let mut steps = Vec::new();
    let mut comparisons: usize = 0;
    let mut swaps: usize = 0;

    push_capped(
        &mut steps,
        Step::new(a.clone(), None, None, None, 1, format!("init sorted w=0 n={n}"), comparisons, swaps),
    );

    if n == 1 {
        push_capped(
            &mut steps,
            Step::done(&a, None, 5, "done new length 1", comparisons, swaps),
        );
        return steps;
    }

    let mut w: usize = 0;
    for i in 1..n {
        if capped(&steps) {
            break;
        }
        if !push_capped(
            &mut steps,
            Step::mark_single(&a, i, 2, format!("scan i={i} val={}", a[i]), comparisons, swaps),
        ) {
            break;
        }
        if capped(&steps) {
            break;
        }
        comparisons += 1;
        if !push_capped(
            &mut steps,
            Step::mark_compare(&a, i, w, None, 3, format!("a[{i}]={} vs a[{w}]={} dup?", a[i], a[w]), comparisons, swaps),
        ) {
            break;
        }
        if capped(&steps) {
            break;
        }
        if a[i] != a[w] {
            w += 1;
            a[w] = a[i];
            swaps += 1;
            push_capped(
                &mut steps,
                Step::mark_swap(&a, i, w, None, 4, format!("write a[{w}]={} (w={w})", a[i]), comparisons, swaps),
            );
        } else {
            push_capped(
                &mut steps,
                Step::new(a.clone(), None, None, None, 4, format!("skip dup a[{i}]={}", a[i]), comparisons, swaps),
            );
        }
    }

    if !capped(&steps) {
        a.truncate(w + 1);
        push_capped(
            &mut steps,
            Step::done(&a, None, 5, format!("done new length {}", w + 1), comparisons, swaps),
        );
    }
    steps
}

#[cfg(test)]
mod tests {
    use super::*;

    fn brute_max_window(a: &[i32], k: usize) -> i32 {
        let mut best = i32::MIN;
        for i in 0..=a.len() - k {
            best = best.max(a[i..i + k].iter().sum());
        }
        best
    }

    fn brute_best_subarray(a: &[i32]) -> i32 {
        let mut best = a[0];
        for i in 0..a.len() {
            let mut s = 0;
            for a_j in a.iter().skip(i) {
                s += *a_j;
                best = best.max(s);
            }
        }
        best
    }

    #[test]
    fn two_sum_found_pair_sums_to_target() {
        let n = 12;
        let seed = 42;
        let mut arr = gen_small(n, seed);
        arr.sort_unstable();
        let target = arr[2] + arr[9];
        let steps = two_sum_sorted_steps(n, seed, target);
        let last = steps.last().unwrap();
        assert!(last.note.contains("found"), "last note: {}", last.note);
        assert_eq!(last.line, 5);
        // some compare step must reference a pair summing to target
        assert!(steps.iter().any(|s| match s.compare {
            Some([x, y]) if x < last.array.len() && y < last.array.len() =>
                last.array[x] + last.array[y] == target,
            _ => false,
        }));
        assert!(steps.len() <= MAX_STEPS);
    }

    #[test]
    fn two_sum_not_found() {
        // max pair sum is 40+40=80, so 1000 is impossible
        let steps = two_sum_sorted_steps(10, 3, 1000);
        let last = steps.last().unwrap();
        assert!(last.note.contains("not found"), "last note: {}", last.note);
        assert_eq!(last.line, 5);
    }

    #[test]
    fn sliding_max_equals_brute_force() {
        for (n, seed, k) in [(10, 1, 3), (15, 7, 1), (12, 99, 12), (8, 5, 50), (9, 3, 0)] {
            let steps = sliding_window_steps(n, seed, k);
            let last = steps.last().unwrap();
            let a = gen_small(n.min(100), seed);
            let kk = k.max(1).min(n.min(100));
            assert_eq!(last.array, a);
            let expected = brute_max_window(&a, kk);
            assert!(
                last.note.contains(&format!("best sum={expected}")),
                "n={n} k={k} note: {}",
                last.note
            );
            assert_eq!(last.line, 4);
        }
    }

    #[test]
    fn prefix_array_correct() {
        let (n, seed) = (10, 11);
        let steps = prefix_sum_steps(n, seed);
        let last = steps.last().unwrap();
        let mut rng = Lcg::new(seed);
        let a: Vec<i32> = (0..n).map(|_| rng.gen_range(5, 40)).collect();
        let mut expected = vec![0; n];
        let mut s = 0;
        for (i, v) in a.iter().enumerate() {
            s += *v;
            expected[i] = s;
        }
        assert_eq!(last.array, expected);
        assert_eq!(last.line, 5);
        assert!(steps.iter().any(|st| st.note.contains("pref[1]=pref[0]+a[1]")));
    }

    #[test]
    fn kadane_matches_brute_force() {
        for seed in [0, 1, 2, 42, 99, 1234] {
            let n = 15;
            let mut rng = Lcg::new(seed);
            let a: Vec<i32> = (0..n).map(|_| rng.gen_range(-20, 50)).collect();
            let steps = kadane_steps(n, seed);
            let last = steps.last().unwrap();
            assert_eq!(last.array, a, "array must stay fixed");
            assert!(
                last.note.contains(&format!("best={}", brute_best_subarray(&a))),
                "seed {seed} note: {}",
                last.note
            );
            assert_eq!(last.line, 5);
        }
    }

    #[test]
    fn kadane_all_negative() {
        let a = vec![-5, -2, -9, -1, -7];
        let steps = kadane_trace(&a);
        let last = steps.last().unwrap();
        assert!(last.note.contains("best=-1"), "note: {}", last.note);
        assert_eq!(last.line, 5);
    }

    #[test]
    fn rotate_matches_expected() {
        for (n, seed, k) in [(10, 4, 3), (8, 9, 0), (7, 2, 25), (1, 0, 5)] {
            let steps = rotate_steps(n, seed, k);
            let last = steps.last().unwrap();
            let mut expected = gen_small(n.min(100), seed);
            let nn = expected.len();
            if nn > 0 {
                expected.rotate_right(k % nn);
            }
            assert_eq!(last.array, expected, "n={n} k={k}");
            assert_eq!(last.line, 5);
        }
        // real swaps counted on a non-trivial rotation
        let steps = rotate_steps(10, 4, 3);
        assert!(steps.last().unwrap().swaps > 0);
        assert!(steps.iter().any(|s| s.line == 4));
    }

    #[test]
    fn dedup_sorted_unique_correct_len() {
        let (n, seed) = (20, 6);
        let steps = dedup_sorted_steps(n, seed);
        let last = steps.last().unwrap();
        let vmax = (n as i32 / 2).max(2);
        let mut rng = Lcg::new(seed);
        let mut a: Vec<i32> = (0..n).map(|_| rng.gen_range(1, vmax)).collect();
        a.sort_unstable();
        a.dedup();
        assert_eq!(last.array, a);
        assert_eq!(last.line, 5);
        assert!(last.note.contains(&format!("new length {}", a.len())));
    }

    #[test]
    fn empty_inputs_single_done_step() {
        let cases = [
            two_sum_sorted_steps(0, 0, 5),
            sliding_window_steps(0, 0, 3),
            prefix_sum_steps(0, 0),
            kadane_steps(0, 0),
            rotate_steps(0, 0, 2),
            dedup_sorted_steps(0, 0),
        ];
        for steps in &cases {
            assert_eq!(steps.len(), 1);
            assert_eq!(steps[0].line, 5);
            assert!(steps[0].note.contains("done trivially"), "note: {}", steps[0].note);
            assert!(steps[0].array.is_empty());
        }
    }

    #[test]
    fn singleton_paths_sane() {
        assert_eq!(two_sum_sorted_steps(1, 0, 5).last().unwrap().line, 5);
        assert_eq!(sliding_window_steps(1, 0, 1).last().unwrap().array.len(), 1);
        assert_eq!(prefix_sum_steps(1, 3).last().unwrap().array.len(), 1);
        assert_eq!(kadane_steps(1, 3).last().unwrap().line, 5);
        assert_eq!(rotate_steps(1, 0, 7).last().unwrap().line, 5);
        assert_eq!(dedup_sorted_steps(1, 0).last().unwrap().array.len(), 1);
    }

    #[test]
    fn step_cap_respected_on_n100() {
        assert!(two_sum_sorted_steps(100, 1, 7).len() <= MAX_STEPS);
        assert!(sliding_window_steps(100, 1, 10).len() <= MAX_STEPS);
        assert!(prefix_sum_steps(100, 1).len() <= MAX_STEPS);
        assert!(kadane_steps(100, 1).len() <= MAX_STEPS);
        assert!(rotate_steps(100, 1, 37).len() <= MAX_STEPS);
        assert!(dedup_sorted_steps(100, 1).len() <= MAX_STEPS);
        // n clamps to 100
        assert_eq!(
            two_sum_sorted_steps(500, 1, 7).len(),
            two_sum_sorted_steps(100, 1, 7).len()
        );
        assert_eq!(prefix_sum_steps(500, 1).last().unwrap().array.len(), 100);
    }

    #[test]
    fn deterministic_and_lines_in_range() {
        assert_eq!(kadane_steps(20, 77), kadane_steps(20, 77));
        assert_eq!(rotate_steps(20, 77, 5), rotate_steps(20, 77, 5));
        assert_eq!(dedup_sorted_steps(20, 77), dedup_sorted_steps(20, 77));
        for steps in [
            two_sum_sorted_steps(10, 1, 30),
            sliding_window_steps(10, 1, 3),
            prefix_sum_steps(10, 1),
            kadane_steps(10, 1),
            rotate_steps(10, 1, 4),
            dedup_sorted_steps(10, 1),
        ] {
            assert!(!steps.is_empty());
            for s in &steps {
                assert!((1..=5).contains(&s.line), "line={} note={}", s.line, s.note);
            }
        }
    }
}
