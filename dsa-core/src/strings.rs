use serde::{Deserialize, Serialize};

/// Single string-matching visualization step.
///
/// JSON contract (snake_case):
/// {
///   ti: number | null,
///   pi: number | null,
///   line: number,
///   note: string
/// }
/// `ti` = text index, `pi` = pattern index (char indices, not bytes).
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct StrStep {
    pub ti: Option<usize>,
    pub pi: Option<usize>,
    pub line: usize,
    pub note: String,
}

/// Hard cap on emitted string steps.
pub const MAX_STR_STEPS: usize = 10_000;

fn push_capped(steps: &mut Vec<StrStep>, step: StrStep) -> bool {
    if steps.len() >= MAX_STR_STEPS {
        return false;
    }
    steps.push(step);
    true
}

fn capped(steps: &[StrStep]) -> bool {
    steps.len() >= MAX_STR_STEPS
}

fn empty_pattern_done() -> Vec<StrStep> {
    vec![StrStep {
        ti: None,
        pi: None,
        line: 4,
        note: "done: empty pattern".to_string(),
    }]
}

/// Prefix function (LPS array) for KMP, over chars.
pub fn kmp_prefix(pattern: &str) -> Vec<usize> {
    let p: Vec<char> = pattern.chars().collect();
    let m = p.len();
    let mut lps = vec![0usize; m];
    let mut len = 0usize;
    let mut i = 1usize;
    while i < m {
        if p[i] == p[len] {
            len += 1;
            lps[i] = len;
            i += 1;
        } else if len != 0 {
            len = lps[len - 1];
        } else {
            lps[i] = 0;
            i += 1;
        }
    }
    lps
}

// ---------------------------------------------------------------------------
// KMP search
// Pseudocode line map:
//   1 `build lps`
//   2 `scan text (ti)`
//   3 `match / mismatch + fallback`
//   4 `done (found at idx | not found)`
// ---------------------------------------------------------------------------
pub fn kmp_steps(text: &str, pat: &str) -> Vec<StrStep> {
    if pat.is_empty() {
        return empty_pattern_done();
    }
    let t: Vec<char> = text.chars().collect();
    let p: Vec<char> = pat.chars().collect();
    let n = t.len();
    let m = p.len();
    let lps = kmp_prefix(pat);
    let mut steps = Vec::new();

    push_capped(
        &mut steps,
        StrStep {
            ti: None,
            pi: None,
            line: 1,
            note: format!("build lps for \"{pat}\" lps={lps:?}"),
        },
    );

    let mut j = 0usize;
    let mut found: Option<usize> = None;

    'outer: for ti in 0..n {
        if capped(&steps) {
            break;
        }
        if !push_capped(
            &mut steps,
            StrStep {
                ti: Some(ti),
                pi: Some(j.min(m.saturating_sub(1))),
                line: 2,
                note: format!("scan ti={ti} pi={j}"),
            },
        ) {
            break;
        }
        // fallback loop for mismatches with j > 0
        while j > 0 && t[ti] != p[j] {
            if capped(&steps) {
                break 'outer;
            }
            let fb = lps[j - 1];
            if !push_capped(
                &mut steps,
                StrStep {
                    ti: Some(ti),
                    pi: Some(j),
                    line: 3,
                    note: format!("mismatch ti={ti} pi={j} fallback to {fb}"),
                },
            ) {
                break 'outer;
            }
            j = fb;
        }
        if capped(&steps) {
            break;
        }
        if t[ti] == p[j] {
            if !push_capped(
                &mut steps,
                StrStep {
                    ti: Some(ti),
                    pi: Some(j),
                    line: 3,
                    note: format!("match ti={ti} pi={j} '{}'", t[ti]),
                },
            ) {
                break;
            }
            j += 1;
            if j == m {
                found = Some(ti + 1 - m);
                break;
            }
        } else {
            // j == 0 mismatch, no fallback
            if !push_capped(
                &mut steps,
                StrStep {
                    ti: Some(ti),
                    pi: Some(0),
                    line: 3,
                    note: format!("mismatch ti={ti} pi=0 '{}' vs '{}'", t[ti], p[0]),
                },
            ) {
                break;
            }
        }
    }

    if !capped(&steps) {
        let note = match found {
            Some(idx) => format!("done found at {idx} pat=\"{pat}\""),
            None => format!("done not found pat=\"{pat}\""),
        };
        push_capped(
            &mut steps,
            StrStep {
                ti: found,
                pi: None,
                line: 4,
                note,
            },
        );
    }
    steps
}

// ---------------------------------------------------------------------------
// Naive search (same line shape as KMP)
//   1 `init`
//   2 `scan start s`
//   3 `match / mismatch`
//   4 `done (found at idx | not found)`
// ---------------------------------------------------------------------------
pub fn naive_steps(text: &str, pat: &str) -> Vec<StrStep> {
    if pat.is_empty() {
        return empty_pattern_done();
    }
    let t: Vec<char> = text.chars().collect();
    let p: Vec<char> = pat.chars().collect();
    let n = t.len();
    let m = p.len();
    let mut steps = Vec::new();

    push_capped(
        &mut steps,
        StrStep {
            ti: None,
            pi: None,
            line: 1,
            note: format!("init naive search text_len={n} pat_len={m} pat=\"{pat}\""),
        },
    );

    let mut found: Option<usize> = None;
    if m <= n {
        'outer: for s in 0..=(n - m) {
            if capped(&steps) {
                break;
            }
            if !push_capped(
                &mut steps,
                StrStep {
                    ti: Some(s),
                    pi: Some(0),
                    line: 2,
                    note: format!("scan start {s}"),
                },
            ) {
                break;
            }
            let mut ok = true;
            for j in 0..m {
                if capped(&steps) {
                    break 'outer;
                }
                let ti = s + j;
                if t[ti] == p[j] {
                    if !push_capped(
                        &mut steps,
                        StrStep {
                            ti: Some(ti),
                            pi: Some(j),
                            line: 3,
                            note: format!("match ti={ti} pi={j} '{}'", t[ti]),
                        },
                    ) {
                        break 'outer;
                    }
                } else {
                    if !push_capped(
                        &mut steps,
                        StrStep {
                            ti: Some(ti),
                            pi: Some(j),
                            line: 3,
                            note: format!("mismatch ti={ti} pi={j} '{}' vs '{}'", t[ti], p[j]),
                        },
                    ) {
                        break 'outer;
                    }
                    ok = false;
                    break;
                }
            }
            if ok {
                found = Some(s);
                break;
            }
        }
    }

    if !capped(&steps) {
        let note = match found {
            Some(idx) => format!("done found at {idx} pat=\"{pat}\""),
            None => format!("done not found pat=\"{pat}\""),
        };
        push_capped(
            &mut steps,
            StrStep {
                ti: found,
                pi: None,
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

    fn last_found_idx(steps: &[StrStep]) -> Option<usize> {
        steps.last().and_then(|s| s.ti)
    }

    #[test]
    fn kmp_prefix_correct() {
        assert_eq!(kmp_prefix("abab"), vec![0, 0, 1, 2]);
        assert_eq!(kmp_prefix("aaaa"), vec![0, 1, 2, 3]);
        assert_eq!(kmp_prefix("abc"), vec![0, 0, 0]);
        assert_eq!(kmp_prefix(""), Vec::<usize>::new());
        assert_eq!(kmp_prefix("aabaabaaa"), vec![0, 1, 0, 1, 2, 3, 4, 5, 2]);
    }

    #[test]
    fn kmp_finds_match() {
        let steps = kmp_steps("hello world", "world");
        assert!(!steps.is_empty());
        assert_eq!(steps[0].line, 1);
        assert_eq!(steps.last().unwrap().line, 4);
        assert!(steps.iter().any(|s| s.line == 2));
        assert!(steps.iter().any(|s| s.line == 3));
        assert_eq!(last_found_idx(&steps), Some(6));
        assert!(
            steps.last().unwrap().note.contains("found at 6"),
            "note: {}",
            steps.last().unwrap().note
        );

        let s2 = kmp_steps("abxabcabcaby", "abcaby");
        assert_eq!(last_found_idx(&s2), Some(6));
    }

    #[test]
    fn kmp_not_found() {
        let steps = kmp_steps("abcdef", "xyz");
        assert_eq!(steps.last().unwrap().line, 4);
        assert_eq!(last_found_idx(&steps), None);
        assert!(steps.last().unwrap().note.contains("not found"));
    }

    #[test]
    fn naive_agrees_with_kmp_found_index() {
        let cases = [
            ("hello world", "world"),
            ("abxabcabcaby", "abcaby"),
            ("aaaaa", "aa"),
            ("abcdef", "xyz"),
            ("abc", "abcd"),
            ("", "a"),
        ];
        for (text, pat) in cases {
            let k = kmp_steps(text, pat);
            let nv = naive_steps(text, pat);
            assert_eq!(
                last_found_idx(&k),
                last_found_idx(&nv),
                "text={text:?} pat={pat:?} kmp={:?} naive={:?}",
                k.last().unwrap().note,
                nv.last().unwrap().note
            );
            assert_eq!(nv.last().unwrap().line, 4);
            assert_eq!(nv[0].line, 1);
        }
        // naive line shape
        let nv = naive_steps("hello world", "world");
        assert!(nv.iter().any(|s| s.line == 2));
        assert!(nv.iter().any(|s| s.line == 3));
    }

    #[test]
    fn strings_empty_pattern_single_done() {
        let k = kmp_steps("abc", "");
        assert_eq!(k.len(), 1);
        assert_eq!(k[0].line, 4);
        assert!(k[0].note.contains("empty"));

        let nv = naive_steps("abc", "");
        assert_eq!(nv.len(), 1);
        assert_eq!(nv[0].line, 4);

        // empty text with non-empty pat: init + done (not single, but done)
        let e = kmp_steps("", "a");
        assert_eq!(e.last().unwrap().line, 4);
        assert_eq!(last_found_idx(&e), None);
        let e2 = naive_steps("", "a");
        assert_eq!(e2.last().unwrap().line, 4);
    }

    #[test]
    fn strings_step_cap_respected() {
        let text: String = "a".repeat(6000) + "b";
        let pat = "aaab";
        let k = kmp_steps(&text, pat);
        assert!(k.len() <= MAX_STR_STEPS, "len={}", k.len());

        let nv = naive_steps(&("a".repeat(3000)), "aaaaab");
        assert!(nv.len() <= MAX_STR_STEPS, "len={}", nv.len());
    }

    #[test]
    fn str_step_json_roundtrip() {
        let steps = kmp_steps("hello", "ll");
        let s = serde_json::to_string(&steps).unwrap();
        let back: Vec<StrStep> = serde_json::from_str(&s).unwrap();
        assert_eq!(back.len(), steps.len());
    }
}
