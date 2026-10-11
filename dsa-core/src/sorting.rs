use crate::prng::Lcg;
use crate::steps::Step;

/// Hard cap on emitted steps (prevents explosion / OOM on large n).
pub const MAX_STEPS: usize = 10_000;

/// Generate deterministic array of length `n` with values in `[5, 100]` inclusive.
pub fn generate_array(n: usize, seed: u64) -> Vec<i32> {
    let mut rng = Lcg::new(seed);
    (0..n).map(|_| rng.gen_range(5, 100)).collect()
}

fn push_capped(steps: &mut Vec<Step>, step: Step) -> bool {
    if steps.len() >= MAX_STEPS {
        return false;
    }
    steps.push(step);
    true
}

fn capped(steps: &Vec<Step>) -> bool {
    steps.len() >= MAX_STEPS
}

// ---------------------------------------------------------------------------
// Bubble sort
// Pseudocode line map:
//   1 `for i in 0..n`
//   2 `for j in 0..n-i-1`
//   3 `if a[j] > a[j+1]`
//   4 `swap`
//   5 `done`
// Only lines 1/3/4/5 are emitted as standalone steps; line 2 is the inner-loop
// scope containing the compare (3) / swap (4) steps.
// sorted_from: suffix start already sorted (None until first pass completes).
// ---------------------------------------------------------------------------
pub fn bubble_sort_steps(n: usize, seed: u64) -> Vec<Step> {
    let mut a = generate_array(n, seed);
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

    if n < 2 {
        push_capped(
            &mut steps,
            Step::done(&a, if n == 1 { Some(0) } else { None }, 5, "done", comparisons, swaps),
        );
        return steps;
    }

    'outer: for i in 0..n {
        if capped(&steps) {
            break;
        }
        let sorted_from = if i == 0 { None } else { Some(n - i) };
        let end = n - i - 1;
        for j in 0..end {
            if capped(&steps) {
                break 'outer;
            }
            comparisons += 1;
            let need_swap = a[j] > a[j + 1];
            if !push_capped(
                &mut steps,
                Step::mark_compare(
                    &a,
                    j,
                    j + 1,
                    sorted_from,
                    3,
                    format!(
                        "compare a[{j}]={} vs a[{}]={}",
                        a[j],
                        j + 1,
                        a[j + 1]
                    ),
                    comparisons,
                    swaps,
                ),
            ) {
                break 'outer;
            }
            if need_swap {
                a.swap(j, j + 1);
                swaps += 1;
                if !push_capped(
                    &mut steps,
                    Step::mark_swap(
                        &a,
                        j,
                        j + 1,
                        sorted_from,
                        4,
                        format!("swap {j} and {}", j + 1),
                        comparisons,
                        swaps,
                    ),
                ) {
                    break 'outer;
                }
            }
        }
    }

    if !capped(&steps) {
        push_capped(
            &mut steps,
            Step::done(&a, Some(0), 5, "done — array sorted", comparisons, swaps),
        );
    }
    steps
}

// ---------------------------------------------------------------------------
// Selection sort (max-to-end variant so `sorted_from` suffix semantics hold).
// Pseudocode line map:
//   1 `for i in 0..n`
//   2 `max_idx = 0`
//   3 `for j in 1..n-i`
//   4 `if a[j] > a[max_idx]`
//   5 `swap a[n-i-1] with a[max_idx]`
//   6 `done`
// sorted_from: suffix start already sorted (same convention as bubble).
// ---------------------------------------------------------------------------
pub fn selection_sort_steps(n: usize, seed: u64) -> Vec<Step> {
    let mut a = generate_array(n, seed);
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

    if n < 2 {
        push_capped(
            &mut steps,
            Step::done(&a, if n == 1 { Some(0) } else { None }, 6, "done", comparisons, swaps),
        );
        return steps;
    }

    'outer: for i in 0..n {
        if capped(&steps) {
            break;
        }
        if n - i < 2 {
            break;
        }
        let end = n - i - 1; // destination for max
        let sorted_from = if i == 0 { None } else { Some(n - i) };
        let mut max_idx: usize = 0;
        for j in 1..=end {
            if capped(&steps) {
                break 'outer;
            }
            comparisons += 1;
            let is_new_max = a[j] > a[max_idx];
            if !push_capped(
                &mut steps,
                Step::mark_compare(
                    &a,
                    j,
                    max_idx,
                    sorted_from,
                    4,
                    format!("compare a[{j}]={} vs max a[{max_idx}]={}", a[j], a[max_idx]),
                    comparisons,
                    swaps,
                ),
            ) {
                break 'outer;
            }
            if is_new_max {
                max_idx = j;
            }
        }
        if capped(&steps) {
            break;
        }
        if max_idx != end {
            a.swap(max_idx, end);
            swaps += 1;
            if !push_capped(
                &mut steps,
                Step::mark_swap(
                    &a,
                    max_idx,
                    end,
                    sorted_from,
                    5,
                    format!("swap max {max_idx} with {end}"),
                    comparisons,
                    swaps,
                ),
            ) {
                break;
            }
        }
    }

    if !capped(&steps) {
        push_capped(
            &mut steps,
            Step::done(&a, Some(0), 6, "done — array sorted", comparisons, swaps),
        );
    }
    steps
}

// ---------------------------------------------------------------------------
// Insertion sort
// Pseudocode line map:
//   1 `for i in 1..n`
//   2 `key = a[i], j = i-1`
//   3 `while j>=0 and a[j] > key`
//   4 `shift a[j+1] = a[j]`
//   5 `insert key`
//   6 `done`
// sorted_from: None (prefix is sorted, not representable as suffix).
// Shifts are counted as swaps/moves.
// ---------------------------------------------------------------------------
pub fn insertion_sort_steps(n: usize, seed: u64) -> Vec<Step> {
    let mut a = generate_array(n, seed);
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

    if n < 2 {
        push_capped(
            &mut steps,
            Step::done(&a, None, 6, "done", comparisons, swaps),
        );
        return steps;
    }

    'outer: for i in 1..n {
        if capped(&steps) {
            break;
        }
        let key = a[i];
        let mut j: isize = i as isize - 1;
        let mut moved = false;
        while j >= 0 {
            if capped(&steps) {
                break 'outer;
            }
            let jj = j as usize;
            comparisons += 1;
            let greater = a[jj] > key;
            if !push_capped(
                &mut steps,
                Step::mark_compare(
                    &a,
                    jj,
                    jj + 1,
                    None,
                    3,
                    format!("compare a[{jj}]={} vs key {key}", a[jj]),
                    comparisons,
                    swaps,
                ),
            ) {
                break 'outer;
            }
            if !greater {
                break;
            }
            // shift a[j] -> a[j+1]
            a[jj + 1] = a[jj];
            swaps += 1;
            moved = true;
            if !push_capped(
                &mut steps,
                Step::mark_swap(
                    &a,
                    jj,
                    jj + 1,
                    None,
                    4,
                    format!("shift a[{jj}] to {}", jj + 1),
                    comparisons,
                    swaps,
                ),
            ) {
                break 'outer;
            }
            j -= 1;
        }
        if capped(&steps) {
            break;
        }
        let pos = (j + 1) as usize;
        if moved {
            a[pos] = key;
            if !push_capped(
                &mut steps,
                Step::new(
                    a.clone(),
                    None,
                    None,
                    None,
                    5,
                    format!("insert key {key} at {pos}"),
                    comparisons,
                    swaps,
                ),
            ) {
                break;
            }
        }
    }

    if !capped(&steps) {
        push_capped(
            &mut steps,
            Step::done(&a, None, 6, "done — array sorted", comparisons, swaps),
        );
    }
    steps
}

// ---------------------------------------------------------------------------
// Merge sort
// Pseudocode line map:
//   1 `if lo >= hi return`
//   2 `mid = (lo+hi)/2, sort halves`
//   3 `merge: compare L[i] vs R[j]`
//   4 `copy remaining / write back`
//   5 `done`
// sorted_from: None.
// Compare steps (line 3) carry compare=[left_idx, right_idx].
// Write-back steps (line 4) carry swap=[k, k] to highlight destination.
// Each write counts as one swap/move.
// ---------------------------------------------------------------------------
pub fn merge_sort_steps(n: usize, seed: u64) -> Vec<Step> {
    let mut a = generate_array(n, seed);
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

    if n >= 2 {
        merge_rec(&mut a, 0, n, &mut steps, &mut comparisons, &mut swaps);
    }

    if !capped(&steps) {
        push_capped(
            &mut steps,
            Step::done(&a, None, 5, "done — array sorted", comparisons, swaps),
        );
    }
    steps
}

fn merge_rec(
    a: &mut Vec<i32>,
    lo: usize,
    hi: usize, // exclusive
    steps: &mut Vec<Step>,
    comparisons: &mut usize,
    swaps: &mut usize,
) -> bool {
    // returns false if step cap reached (unwind quickly)
    if hi - lo <= 1 || capped(steps) {
        return !capped(steps);
    }
    let mid = (lo + hi) / 2;
    if !merge_rec(a, lo, mid, steps, comparisons, swaps) {
        return false;
    }
    if !merge_rec(a, mid, hi, steps, comparisons, swaps) {
        return false;
    }
    let left = a[lo..mid].to_vec();
    let right = a[mid..hi].to_vec();
    let (mut i, mut j, mut k) = (0usize, 0usize, lo);
    while i < left.len() && j < right.len() {
        if capped(steps) {
            return false;
        }
        *comparisons += 1;
        if !push_capped(
            steps,
            Step::mark_compare(
                a,
                lo + i,
                mid + j,
                None,
                3,
                format!("merge compare L[{}]={} vs R[{}]={}", i, left[i], j, right[j]),
                *comparisons,
                *swaps,
            ),
        ) {
            return false;
        }
        if left[i] <= right[j] {
            a[k] = left[i];
            i += 1;
        } else {
            a[k] = right[j];
            j += 1;
        }
        *swaps += 1;
        let written = a[k];
        if !push_capped(
            steps,
            Step::new(
                a.clone(),
                None,
                Some([k, k]),
                None,
                4,
                format!("write {written} at {k}"),
                *comparisons,
                *swaps,
            ),
        ) {
            return false;
        }
        k += 1;
    }
    while i < left.len() {
        if capped(steps) {
            return false;
        }
        a[k] = left[i];
        *swaps += 1;
        let written = a[k];
        if !push_capped(
            steps,
            Step::new(
                a.clone(),
                None,
                Some([k, k]),
                None,
                4,
                format!("copy remaining left {written} at {k}"),
                *comparisons,
                *swaps,
            ),
        ) {
            return false;
        }
        i += 1;
        k += 1;
    }
    while j < right.len() {
        if capped(steps) {
            return false;
        }
        a[k] = right[j];
        *swaps += 1;
        let written = a[k];
        if !push_capped(
            steps,
            Step::new(
                a.clone(),
                None,
                Some([k, k]),
                None,
                4,
                format!("copy remaining right {written} at {k}"),
                *comparisons,
                *swaps,
            ),
        ) {
            return false;
        }
        j += 1;
        k += 1;
    }
    true
}

// ---------------------------------------------------------------------------
// Quick sort (Lomuto partition, pivot = a[hi])
// Pseudocode line map:
//   1 `partition: pivot = a[hi]`
//   2 `if a[j] < pivot`
//   3 `swap to smaller region`
//   4 `place pivot, recurse`
//   5 `done`
// sorted_from: None.
// ---------------------------------------------------------------------------
pub fn quick_sort_steps(n: usize, seed: u64) -> Vec<Step> {
    let mut a = generate_array(n, seed);
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

    if n >= 2 {
        quick_rec(&mut a, 0, n as isize - 1, &mut steps, &mut comparisons, &mut swaps);
    }

    if !capped(&steps) {
        push_capped(
            &mut steps,
            Step::done(&a, None, 5, "done — array sorted", comparisons, swaps),
        );
    }
    steps
}

fn quick_rec(
    a: &mut Vec<i32>,
    lo: isize,
    hi: isize,
    steps: &mut Vec<Step>,
    comparisons: &mut usize,
    swaps: &mut usize,
) -> bool {
    if lo >= hi || capped(steps) {
        return !capped(steps);
    }
    let lo_u = lo as usize;
    let hi_u = hi as usize;
    let pivot = a[hi_u];
    let mut i = lo - 1;
    for j in lo..hi {
        if capped(steps) {
            return false;
        }
        let j_u = j as usize;
        *comparisons += 1;
        let less = a[j_u] < pivot;
        if !push_capped(
            steps,
            Step::mark_compare(
                a,
                j_u,
                hi_u,
                None,
                2,
                format!("compare a[{j_u}]={} vs pivot {pivot}", a[j_u]),
                *comparisons,
                *swaps,
            ),
        ) {
            return false;
        }
        if less {
            i += 1;
            let i_u = i as usize;
            if i_u != j_u {
                a.swap(i_u, j_u);
                *swaps += 1;
                if !push_capped(
                    steps,
                    Step::mark_swap(
                        a,
                        i_u,
                        j_u,
                        None,
                        3,
                        format!("swap {i_u} and {j_u}"),
                        *comparisons,
                        *swaps,
                    ),
                ) {
                    return false;
                }
            }
        }
    }
    let p = (i + 1) as usize;
    if p != hi_u {
        a.swap(p, hi_u);
        *swaps += 1;
    }
    if capped(steps) {
        return false;
    }
    // Only emit a pivot-placement step when it actually moved, to save budget.
    if p != hi_u {
        if !push_capped(
            steps,
            Step::mark_swap(
                a,
                p,
                hi_u,
                None,
                4,
                format!("place pivot {pivot} at {p}"),
                *comparisons,
                *swaps,
            ),
        ) {
            return false;
        }
    } else if !push_capped(
        steps,
        Step::new(
            a.clone(),
            None,
            None,
            None,
            4,
            format!("pivot {pivot} already at {p}"),
            *comparisons,
            *swaps,
        ),
    ) {
        return false;
    }
    let _ = lo_u;
    if !quick_rec(a, lo, p as isize - 1, steps, comparisons, swaps) {
        return false;
    }
    quick_rec(a, p as isize + 1, hi, steps, comparisons, swaps)
}

// ---------------------------------------------------------------------------
// Linear search
// Pseudocode line map:
//   1 `for i in 0..n`
//   2 `if a[i] == target`
//   3 `done / found / not found`
// Each probe is line 2 with compare=[i, i]; terminal step is line 3.
// ---------------------------------------------------------------------------
pub fn linear_search_steps(n: usize, seed: u64, target: i32) -> Vec<Step> {
    let a = generate_array(n, seed);
    let mut steps = Vec::new();
    let mut comparisons: usize = 0;

    push_capped(
        &mut steps,
        Step::new(
            a.clone(),
            None,
            None,
            None,
            1,
            format!("linear search target={target} n={n}"),
            comparisons,
            0,
        ),
    );

    for i in 0..n {
        if capped(&steps) {
            break;
        }
        comparisons += 1;
        if !push_capped(
            &mut steps,
            Step::new(
                a.clone(),
                Some([i, i]),
                None,
                None,
                2,
                format!("check a[{i}]={} vs {target}", a[i]),
                comparisons,
                0,
            ),
        ) {
            break;
        }
        if a[i] == target {
            push_capped(
                &mut steps,
                Step::done(&a, None, 3, format!("found {target} at {i}"), comparisons, 0),
            );
            return steps;
        }
    }

    if !capped(&steps) {
        push_capped(
            &mut steps,
            Step::done(&a, None, 3, format!("{target} not found"), comparisons, 0),
        );
    }
    steps
}

// ---------------------------------------------------------------------------
// Binary search (array is generate_array sorted ascending)
// Pseudocode line map:
//   1 `lo=0, hi=n-1`
//   2 `mid=(lo+hi)/2 compare`
//   3 `adjust lo/hi`
//   4 `done / found`
// Each probe emits line 2 (compare=[mid, mid]); adjustments emit line 3.
// ---------------------------------------------------------------------------
pub fn binary_search_steps(n: usize, seed: u64, target: i32) -> Vec<Step> {
    let mut a = generate_array(n, seed);
    a.sort_unstable();
    let mut steps = Vec::new();
    let mut comparisons: usize = 0;

    push_capped(
        &mut steps,
        Step::new(
            a.clone(),
            None,
            None,
            None,
            1,
            format!("binary search target={target} n={n} (sorted)"),
            comparisons,
            0,
        ),
    );

    if n == 0 {
        push_capped(
            &mut steps,
            Step::done(&a, None, 4, format!("{target} not found (empty)"), comparisons, 0),
        );
        return steps;
    }

    let mut lo: isize = 0;
    let mut hi: isize = n as isize - 1;
    while lo <= hi {
        if capped(&steps) {
            break;
        }
        let mid = ((lo + hi) / 2) as usize;
        comparisons += 1;
        if !push_capped(
            &mut steps,
            Step::new(
                a.clone(),
                Some([mid, mid]),
                None,
                None,
                2,
                format!("compare a[{mid}]={} vs {target}", a[mid]),
                comparisons,
                0,
            ),
        ) {
            break;
        }
        if a[mid] == target {
            push_capped(
                &mut steps,
                Step::done(&a, None, 4, format!("found {target} at {mid}"), comparisons, 0),
            );
            return steps;
        }
        if capped(&steps) {
            break;
        }
        if a[mid] < target {
            lo = mid as isize + 1;
            push_capped(
                &mut steps,
                Step::new(
                    a.clone(),
                    None,
                    None,
                    None,
                    3,
                    format!("a[{mid}] < {target}, lo={lo}"),
                    comparisons,
                    0,
                ),
            );
        } else {
            hi = mid as isize - 1;
            push_capped(
                &mut steps,
                Step::new(
                    a.clone(),
                    None,
                    None,
                    None,
                    3,
                    format!("a[{mid}] > {target}, hi={hi}"),
                    comparisons,
                    0,
                ),
            );
        }
    }

    if !capped(&steps) {
        push_capped(
            &mut steps,
            Step::done(&a, None, 4, format!("{target} not found"), comparisons, 0),
        );
    }
    steps
}

#[cfg(test)]
mod tests {
    use super::*;

    fn is_sorted(v: &[i32]) -> bool {
        v.windows(2).all(|w| w[0] <= w[1])
    }

    #[test]
    fn bubble_sorts_and_last_sorted() {
        let steps = bubble_sort_steps(10, 42);
        assert!(!steps.is_empty());
        let last = steps.last().unwrap();
        assert!(is_sorted(&last.array), "last array not sorted: {:?}", last.array);
        assert_eq!(last.sorted_from, Some(0));
        assert_eq!(last.line, 5);
        // counters monotonic
        for w in steps.windows(2) {
            assert!(w[1].comparisons >= w[0].comparisons);
            assert!(w[1].swaps >= w[0].swaps);
        }
        assert!(steps.len() <= MAX_STEPS);
    }

    #[test]
    fn selection_sorts() {
        let steps = selection_sort_steps(10, 7);
        let last = steps.last().unwrap();
        assert!(is_sorted(&last.array));
        assert_eq!(last.line, 6);
        assert!(steps.len() <= MAX_STEPS);
    }

    #[test]
    fn insertion_sorts() {
        let steps = insertion_sort_steps(10, 7);
        let last = steps.last().unwrap();
        assert!(is_sorted(&last.array));
        assert!(steps.len() <= MAX_STEPS);
    }

    #[test]
    fn quick_correctness_small_n() {
        for seed in [0, 1, 42, 99] {
            let steps = quick_sort_steps(8, seed);
            let last = steps.last().unwrap();
            assert!(is_sorted(&last.array), "seed {seed}: {:?}", last.array);
        }
    }

    #[test]
    fn merge_correctness_small_n() {
        for seed in [0, 1, 42, 99] {
            let steps = merge_sort_steps(8, seed);
            let last = steps.last().unwrap();
            assert!(is_sorted(&last.array), "seed {seed}: {:?}", last.array);
        }
    }

    #[test]
    fn all_sorts_agree_on_same_input() {
        let n = 12;
        let seed = 1234;
        let mut expected = generate_array(n, seed);
        expected.sort_unstable();
        for steps in [
            bubble_sort_steps(n, seed),
            selection_sort_steps(n, seed),
            insertion_sort_steps(n, seed),
            merge_sort_steps(n, seed),
            quick_sort_steps(n, seed),
        ] {
            assert_eq!(&steps.last().unwrap().array, &expected);
        }
    }

    #[test]
    fn binary_search_finds_target() {
        let n = 15;
        let seed = 42;
        let mut arr = generate_array(n, seed);
        arr.sort_unstable();
        let target = arr[arr.len() / 2];
        let steps = binary_search_steps(n, seed, target);
        let last = steps.last().unwrap();
        assert!(last.note.contains("found"), "last note: {}", last.note);
        // some compare step must point at a mid holding the target
        assert!(steps.iter().any(|s| match s.compare {
            Some([m, _]) if m < last.array.len() => last.array[m] == target,
            _ => false,
        }));
    }

    #[test]
    fn linear_search_finds_target() {
        let n = 10;
        let seed = 5;
        let arr = generate_array(n, seed);
        let target = arr[3];
        let steps = linear_search_steps(n, seed, target);
        assert!(steps.last().unwrap().note.contains("found"));
    }

    #[test]
    fn step_cap_respected() {
        // bubble on large n would explode without cap
        let steps = bubble_sort_steps(500, 1);
        assert!(steps.len() <= MAX_STEPS, "len={}", steps.len());
        assert_eq!(steps.len(), MAX_STEPS);
        // quick/merge caps too
        assert!(quick_sort_steps(500, 1).len() <= MAX_STEPS);
        assert!(merge_sort_steps(500, 1).len() <= MAX_STEPS);
    }

    #[test]
    fn empty_and_singleton() {
        assert_eq!(bubble_sort_steps(0, 0).last().unwrap().array.len(), 0);
        assert_eq!(bubble_sort_steps(1, 0).last().unwrap().sorted_from, Some(0));
        assert_eq!(merge_sort_steps(0, 0).last().unwrap().array.len(), 0);
        assert_eq!(quick_sort_steps(1, 0).last().unwrap().array.len(), 1);
        assert!(binary_search_steps(0, 0, 5).last().unwrap().note.contains("not found"));
    }
}
