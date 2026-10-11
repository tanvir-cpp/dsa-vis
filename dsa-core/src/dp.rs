use serde::{Deserialize, Serialize};

/// Single DP visualization step.
///
/// JSON contract (snake_case):
/// {
///   table: number[][],
///   cell: [number, number] | null,
///   line: number,
///   note: string
/// }
/// For 1-D DPs (LIS / coin change) the table is a single row: `table = [dp]`
/// and the focused cell is `cell = [0, i]`.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DpStep {
    pub table: Vec<Vec<i32>>,
    pub cell: Option<[usize; 2]>,
    pub line: usize,
    pub note: String,
}

/// Hard cap on emitted DP steps (prevents explosion / OOM).
pub const MAX_DP_STEPS: usize = 10_000;

fn push_capped(steps: &mut Vec<DpStep>, step: DpStep) -> bool {
    if steps.len() >= MAX_DP_STEPS {
        return false;
    }
    steps.push(step);
    true
}

fn capped(steps: &[DpStep]) -> bool {
    steps.len() >= MAX_DP_STEPS
}

// ---------------------------------------------------------------------------
// 0/1 Knapsack
// Pseudocode line map:
//   1 `init row0/col0 = 0`
//   2 `for i in 1..=n (loop items)`
//   3 `compare skip vs take -> dp[i][w]`
//   4 `done (note optimal value)`
// ---------------------------------------------------------------------------
pub fn knapsack_steps(weights: &[i32], values: &[i32], cap: usize) -> Vec<DpStep> {
    let n = weights.len().min(values.len());
    if n == 0 {
        return vec![DpStep {
            table: vec![vec![0; cap.saturating_add(1)]],
            cell: None,
            line: 4,
            note: "done optimal=0 empty".to_string(),
        }];
    }
    let mut dp = vec![vec![0i32; cap + 1]; n + 1];
    let mut steps = Vec::new();

    push_capped(
        &mut steps,
        DpStep {
            table: dp.clone(),
            cell: None,
            line: 1,
            note: format!("init row0/col0 zero n={n} cap={cap}"),
        },
    );

    'outer: for i in 1..=n {
        if capped(&steps) {
            break;
        }
        let w_item = weights[i - 1];
        let v_item = values[i - 1];
        if !push_capped(
            &mut steps,
            DpStep {
                table: dp.clone(),
                cell: Some([i, 0]),
                line: 2,
                note: format!("item {} w={w_item} v={v_item}", i - 1),
            },
        ) {
            break;
        }
        for w in 0..=cap {
            if capped(&steps) {
                break 'outer;
            }
            let skip = dp[i - 1][w];
            let take_ok = w_item >= 0 && (w as i32) >= w_item;
            let take = if take_ok {
                dp[i - 1][(w as i32 - w_item) as usize].saturating_add(v_item)
            } else {
                i32::MIN
            };
            let best = if take_ok { skip.max(take) } else { skip };
            dp[i][w] = best;
            let take_str = if take_ok {
                take.to_string()
            } else {
                "N/A".to_string()
            };
            let decision = if take_ok && take > skip { "take" } else { "skip" };
            if !push_capped(
                &mut steps,
                DpStep {
                    table: dp.clone(),
                    cell: Some([i, w]),
                    line: 3,
                    note: format!(
                        "compare skip={skip} vs take={take_str} -> dp[{i}][{w}]={best} ({decision})"
                    ),
                },
            ) {
                break 'outer;
            }
        }
    }

    if !capped(&steps) {
        let opt = dp[n][cap];
        push_capped(
            &mut steps,
            DpStep {
                table: dp.clone(),
                cell: Some([n, cap]),
                line: 4,
                note: format!("done optimal={opt}"),
            },
        );
    }
    steps
}

// ---------------------------------------------------------------------------
// LCS (chars; dp (m+1)x(n+1))
// Pseudocode line map:
//   1 `init dp zero`
//   2 `loop rows (outer i)`
//   3 `match/mismatch -> dp[i][j]`
//   4 `done + reconstruct note`
// ---------------------------------------------------------------------------
pub fn lcs_steps(a: &str, b: &str) -> Vec<DpStep> {
    let ac: Vec<char> = a.chars().collect();
    let bc: Vec<char> = b.chars().collect();
    let m = ac.len();
    let n = bc.len();
    if m == 0 || n == 0 {
        let table = vec![vec![0; n + 1]; m + 1];
        return vec![DpStep {
            table,
            cell: None,
            line: 4,
            note: "done lcs_len=0 lcs=\"\" empty".to_string(),
        }];
    }
    let mut dp = vec![vec![0i32; n + 1]; m + 1];
    let mut steps = Vec::new();

    push_capped(
        &mut steps,
        DpStep {
            table: dp.clone(),
            cell: None,
            line: 1,
            note: format!("init {m}x{n} zero"),
        },
    );

    'outer: for i in 1..=m {
        if capped(&steps) {
            break;
        }
        if !push_capped(
            &mut steps,
            DpStep {
                table: dp.clone(),
                cell: Some([i, 0]),
                line: 2,
                note: format!("row {i} char '{}'", ac[i - 1]),
            },
        ) {
            break;
        }
        for j in 1..=n {
            if capped(&steps) {
                break 'outer;
            }
            let note;
            if ac[i - 1] == bc[j - 1] {
                dp[i][j] = dp[i - 1][j - 1] + 1;
                note = format!(
                    "match '{}' dp[{i}][{j}]={}",
                    ac[i - 1],
                    dp[i][j]
                );
            } else {
                dp[i][j] = dp[i - 1][j].max(dp[i][j - 1]);
                note = format!(
                    "mismatch '{}' vs '{}' dp[{i}][{j}]={}",
                    ac[i - 1],
                    bc[j - 1],
                    dp[i][j]
                );
            }
            if !push_capped(
                &mut steps,
                DpStep {
                    table: dp.clone(),
                    cell: Some([i, j]),
                    line: 3,
                    note,
                },
            ) {
                break 'outer;
            }
        }
    }

    if !capped(&steps) {
        // reconstruct one LCS by backtracking
        let mut i = m;
        let mut j = n;
        let mut rev: Vec<char> = Vec::new();
        while i > 0 && j > 0 {
            if ac[i - 1] == bc[j - 1] {
                rev.push(ac[i - 1]);
                i -= 1;
                j -= 1;
            } else if dp[i - 1][j] >= dp[i][j - 1] {
                i -= 1;
            } else {
                j -= 1;
            }
        }
        rev.reverse();
        let lcs: String = rev.iter().collect();
        let len = dp[m][n];
        push_capped(
            &mut steps,
            DpStep {
                table: dp.clone(),
                cell: Some([m, n]),
                line: 4,
                note: format!("done lcs_len={len} lcs=\"{lcs}\""),
            },
        );
    }
    steps
}

// ---------------------------------------------------------------------------
// LIS (1-D dp shown as single-row table; cell=[0,i])
// Pseudocode line map:
//   1 `init dp[i]=1`
//   2 `outer i`
//   3 `inner compare arr[j] vs arr[i]`
//   4 `done (note lis length)`
// ---------------------------------------------------------------------------
pub fn lis_steps(arr: &[i32]) -> Vec<DpStep> {
    if arr.is_empty() {
        return vec![DpStep {
            table: vec![Vec::new()],
            cell: None,
            line: 4,
            note: "done lis_len=0 empty".to_string(),
        }];
    }
    let n = arr.len();
    let mut dp = vec![1i32; n];
    let mut steps = Vec::new();

    push_capped(
        &mut steps,
        DpStep {
            table: vec![dp.clone()],
            cell: None,
            line: 1,
            note: format!("init dp ones n={n}"),
        },
    );

    'outer: for i in 0..n {
        if capped(&steps) {
            break;
        }
        if !push_capped(
            &mut steps,
            DpStep {
                table: vec![dp.clone()],
                cell: Some([0, i]),
                line: 2,
                note: format!("outer i={i} val={}", arr[i]),
            },
        ) {
            break;
        }
        for j in 0..i {
            if capped(&steps) {
                break 'outer;
            }
            let mut note = format!(
                "compare arr[{j}]={} vs arr[{i}]={} dp[{i}]={}",
                arr[j],
                arr[i],
                dp[i]
            );
            if arr[j] < arr[i] && dp[j] + 1 > dp[i] {
                dp[i] = dp[j] + 1;
                note = format!(
                    "compare arr[{j}]={} vs arr[{i}]={} update dp[{i}]={}",
                    arr[j],
                    arr[i],
                    dp[i]
                );
            }
            if !push_capped(
                &mut steps,
                DpStep {
                    table: vec![dp.clone()],
                    cell: Some([0, i]),
                    line: 3,
                    note,
                },
            ) {
                break 'outer;
            }
        }
    }

    if !capped(&steps) {
        let best = *dp.iter().max().unwrap_or(&0);
        push_capped(
            &mut steps,
            DpStep {
                table: vec![dp.clone()],
                cell: Some([0, n - 1]),
                line: 4,
                note: format!("done lis_len={best} dp={dp:?}"),
            },
        );
    }
    steps
}

// ---------------------------------------------------------------------------
// Coin change min-coins (1-D dp; INF = amount+1; cell=[0,i])
// Pseudocode line map:
//   1 `init dp[0]=0 rest INF`
//   2 `outer amount i`
//   3 `inner compare coin c -> dp[i]`
//   4 `done (note min-coins or impossible)`
// ---------------------------------------------------------------------------
pub fn coin_steps(coins: &[i32], amount: usize) -> Vec<DpStep> {
    let pos: Vec<i32> = coins.iter().copied().filter(|&c| c > 0).collect();
    let inf = amount as i32 + 1;
    if pos.is_empty() || amount == 0 {
        let mut dp = vec![inf; amount + 1];
        if amount < dp.len() {
            dp[0] = 0;
        }
        let note = if amount == 0 {
            "done min_coins=0 empty".to_string()
        } else {
            "done min_coins=-1 impossible empty".to_string()
        };
        return vec![DpStep {
            table: vec![dp],
            cell: None,
            line: 4,
            note,
        }];
    }
    let mut dp = vec![inf; amount + 1];
    dp[0] = 0;
    let mut steps = Vec::new();

    push_capped(
        &mut steps,
        DpStep {
            table: vec![dp.clone()],
            cell: None,
            line: 1,
            note: format!("init amount={amount} coins={pos:?}"),
        },
    );

    'outer: for i in 1..=amount {
        if capped(&steps) {
            break;
        }
        if !push_capped(
            &mut steps,
            DpStep {
                table: vec![dp.clone()],
                cell: Some([0, i]),
                line: 2,
                note: format!("outer amount {i}"),
            },
        ) {
            break;
        }
        for &c in &pos {
            if capped(&steps) {
                break 'outer;
            }
            let cu = c as usize;
            let mut note;
            if cu <= i && dp[i - cu] != inf {
                let cand = dp[i - cu] + 1;
                if cand < dp[i] {
                    dp[i] = cand;
                    note = format!("coin {c} take dp[{i}]={} (improved)", dp[i]);
                } else {
                    note = format!("coin {c} cand={cand} dp[{i}]={} no improvement", dp[i]);
                }
            } else {
                note = format!("coin {c} skip dp[{i}]={}", dp[i]);
            }
            let _ = &mut note;
            if !push_capped(
                &mut steps,
                DpStep {
                    table: vec![dp.clone()],
                    cell: Some([0, i]),
                    line: 3,
                    note,
                },
            ) {
                break 'outer;
            }
        }
    }

    if !capped(&steps) {
        let ans = dp[amount];
        let note = if ans == inf {
            format!("done min_coins=-1 impossible amount={amount}")
        } else {
            format!("done min_coins={ans} amount={amount}")
        };
        push_capped(
            &mut steps,
            DpStep {
                table: vec![dp.clone()],
                cell: Some([0, amount]),
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

    fn has_lines(steps: &[DpStep], lines: &[usize]) -> bool {
        lines.iter().all(|l| steps.iter().any(|s| s.line == *l))
    }

    #[test]
    fn knapsack_classic_optimal() {
        let steps = knapsack_steps(&[1, 2, 3], &[6, 10, 12], 5);
        assert!(!steps.is_empty());
        assert_eq!(steps[0].line, 1);
        assert_eq!(steps.last().unwrap().line, 4);
        assert!(has_lines(&steps, &[1, 2, 3, 4]));
        let last = steps.last().unwrap();
        assert_eq!(last.table[3][5], 22);
        assert!(last.note.contains("22"), "note: {}", last.note);
        assert!(steps.len() <= MAX_DP_STEPS);
    }

    #[test]
    fn lcs_length_correct() {
        let steps = lcs_steps("ABCBDAB", "BDCABA");
        assert!(!steps.is_empty());
        assert_eq!(steps[0].line, 1);
        assert_eq!(steps.last().unwrap().line, 4);
        assert!(has_lines(&steps, &[1, 2, 3, 4]));
        let last = steps.last().unwrap();
        let m = "ABCBDAB".chars().count();
        let n = "BDCABA".chars().count();
        assert_eq!(last.table[m][n], 4);
        assert!(last.note.contains("lcs_len=4"), "note: {}", last.note);
        // simple case
        let s2 = lcs_steps("abcde", "ace");
        let last2 = s2.last().unwrap();
        assert_eq!(last2.table[5][3], 3);
    }

    #[test]
    fn lis_length_correct() {
        let arr = [10, 9, 2, 5, 3, 7, 101, 18];
        let steps = lis_steps(&arr);
        assert!(!steps.is_empty());
        assert_eq!(steps[0].line, 1);
        assert_eq!(steps.last().unwrap().line, 4);
        assert!(has_lines(&steps, &[1, 2, 3, 4]));
        let last = steps.last().unwrap();
        // single-row table
        assert_eq!(last.table.len(), 1);
        let best = *last.table[0].iter().max().unwrap();
        assert_eq!(best, 4);
        assert!(last.note.contains("lis_len=4"), "note: {}", last.note);
        // cells for 1-D use row 0
        assert!(steps.iter().filter(|s| s.line == 2).all(|s| s.cell.map(|c| c[0]) == Some(0)));
    }

    #[test]
    fn coin_min_coins_correct() {
        let steps = coin_steps(&[1, 2, 5], 11);
        assert!(!steps.is_empty());
        assert_eq!(steps[0].line, 1);
        assert_eq!(steps.last().unwrap().line, 4);
        assert!(has_lines(&steps, &[1, 2, 3, 4]));
        let last = steps.last().unwrap();
        assert_eq!(last.table[0][11], 3);
        assert!(last.note.contains("min_coins=3"), "note: {}", last.note);
        // impossible case
        let imp = coin_steps(&[2], 3);
        let last_imp = imp.last().unwrap();
        assert!(last_imp.note.contains("-1") || last_imp.note.contains("impossible"));
    }

    #[test]
    fn dp_empty_edge_cases_single_done() {
        let k = knapsack_steps(&[], &[], 5);
        assert_eq!(k.len(), 1);
        assert_eq!(k[0].line, 4);

        let l = lcs_steps("", "abc");
        assert_eq!(l.len(), 1);
        assert_eq!(l[0].line, 4);
        let l2 = lcs_steps("abc", "");
        assert_eq!(l2.len(), 1);

        let li = lis_steps(&[]);
        assert_eq!(li.len(), 1);
        assert_eq!(li[0].line, 4);

        let c = coin_steps(&[], 5);
        assert_eq!(c.len(), 1);
        assert_eq!(c[0].line, 4);
        let c0 = coin_steps(&[1, 2], 0);
        assert_eq!(c0.len(), 1);
        assert_eq!(c0[0].line, 4);
    }

    #[test]
    fn dp_step_cap_respected() {
        // knapsack 100x100 = 10k cells -> must cap
        let w: Vec<i32> = (1..=100).map(|x| (x % 10 + 1) as i32).collect();
        let v: Vec<i32> = (1..=100).map(|x| (x % 7 + 1) as i32).collect();
        let k = knapsack_steps(&w, &v, 100);
        assert!(k.len() <= MAX_DP_STEPS, "len={}", k.len());

        // lcs 120x120
        let a: String = (0..120).map(|i| (b'a' + (i % 26) as u8) as char).collect();
        let b: String = (0..120).map(|i| (b'z' - (i % 26) as u8) as char).collect();
        let l = lcs_steps(&a, &b);
        assert!(l.len() <= MAX_DP_STEPS, "len={}", l.len());

        // lis 200 elements O(n^2) steps
        let arr: Vec<i32> = (0..200).map(|x| (x * 37 % 101) as i32).collect();
        let li = lis_steps(&arr);
        assert!(li.len() <= MAX_DP_STEPS, "len={}", li.len());

        // coin amount 2000 x 3 coins
        let c = coin_steps(&[1, 3, 4], 2000);
        assert!(c.len() <= MAX_DP_STEPS, "len={}", c.len());
    }

    #[test]
    fn dp_step_json_roundtrip() {
        let steps = knapsack_steps(&[1, 2], &[3, 4], 3);
        let s = serde_json::to_string(&steps).unwrap();
        let back: Vec<DpStep> = serde_json::from_str(&s).unwrap();
        assert_eq!(back.len(), steps.len());
    }
}
