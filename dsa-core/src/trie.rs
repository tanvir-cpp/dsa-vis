//! Traced trie (prefix tree) insert + search.
//!
//! Own [`TrieStep`] struct (does not reuse array `Step`):
//! ```json
//! { prefix: string, node: number, nodes: number, line: number, note: string }
//! ```
//! - `prefix` = current prefix string,
//! - `node` = current node id (root = 0),
//! - `nodes` = total node count after this step.
//!
//! Pseudocode line maps:
//! - insert:
//!   1 `new word`
//!   2 `walk / create char (node id, prefix)`
//!   3 `mark terminal`
//!   4 `done (word + node count)`
//! - search (trie built silently from `words`, then per query):
//!   1 `new query`
//!   2 `walk char`
//!   3 `result hit (found) / miss (missing)`
//!   4 `done (query count)`
//!
//! Steps capped at [`MAX_TRIE_STEPS`]; empty `words` (insert) or empty
//! `queries` (search) yield a single line-4 `done`.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Single trie visualization step.
///
/// JSON contract (snake_case):
/// {
///   prefix: string,
///   node: number,
///   nodes: number,
///   line: number,
///   note: string
/// }
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct TrieStep {
    pub prefix: String,
    pub node: usize,
    pub nodes: usize,
    pub line: usize,
    pub note: String,
}

/// Hard cap on emitted trie steps.
pub const MAX_TRIE_STEPS: usize = 10_000;

fn push_capped(steps: &mut Vec<TrieStep>, step: TrieStep) -> bool {
    if steps.len() >= MAX_TRIE_STEPS {
        return false;
    }
    steps.push(step);
    true
}

fn capped(steps: &[TrieStep]) -> bool {
    steps.len() >= MAX_TRIE_STEPS
}

struct Trie {
    children: Vec<BTreeMap<char, usize>>,
    terminal: Vec<bool>,
}

impl Trie {
    fn new() -> Self {
        Self {
            children: vec![BTreeMap::new()],
            terminal: vec![false],
        }
    }

    fn node_count(&self) -> usize {
        self.children.len()
    }

    /// Insert without emitting steps; returns terminal node id.
    fn insert_silent(&mut self, word: &str) -> usize {
        let mut cur = 0usize;
        for c in word.chars() {
            let next = if let Some(&n) = self.children[cur].get(&c) {
                n
            } else {
                let id = self.children.len();
                self.children.push(BTreeMap::new());
                self.terminal.push(false);
                self.children[cur].insert(c, id);
                id
            };
            cur = next;
        }
        self.terminal[cur] = true;
        cur
    }

    fn walk(&self, query: &str) -> (bool, usize, usize) {
        // Returns (found, fail_or_terminal_node, depth_walked).
        let mut cur = 0usize;
        let mut depth = 0usize;
        for c in query.chars() {
            match self.children[cur].get(&c) {
                Some(&n) => {
                    cur = n;
                    depth += 1;
                }
                None => return (false, cur, depth),
            }
        }
        (self.terminal[cur], cur, depth)
    }
}

// ---------------------------------------------------------------------------
// Insert
// ---------------------------------------------------------------------------
pub fn trie_insert_steps(words: &[String]) -> Vec<TrieStep> {
    if words.is_empty() {
        return vec![TrieStep {
            prefix: String::new(),
            node: 0,
            nodes: 1,
            line: 4,
            note: "done: empty 0 words 1 nodes".to_string(),
        }];
    }
    let mut trie = Trie::new();
    let mut steps = Vec::new();

    for word in words {
        if capped(&steps) {
            break;
        }
        if !push_capped(
            &mut steps,
            TrieStep {
                prefix: String::new(),
                node: 0,
                nodes: trie.node_count(),
                line: 1,
                note: format!("new word \"{word}\" nodes={}", trie.node_count()),
            },
        ) {
            break;
        }
        let mut cur = 0usize;
        let mut prefix = String::new();
        for c in word.chars() {
            if capped(&steps) {
                break;
            }
            prefix.push(c);
            let (next, is_new) = if let Some(&n) = trie.children[cur].get(&c) {
                (n, false)
            } else {
                let id = trie.children.len();
                trie.children.push(BTreeMap::new());
                trie.terminal.push(false);
                trie.children[cur].insert(c, id);
                (id, true)
            };
            cur = next;
            let action = if is_new { "create" } else { "walk" };
            if !push_capped(
                &mut steps,
                TrieStep {
                    prefix: prefix.clone(),
                    node: cur,
                    nodes: trie.node_count(),
                    line: 2,
                    note: format!("{action} '{c}' prefix=\"{prefix}\" node={cur} nodes={}", trie.node_count()),
                },
            ) {
                break;
            }
        }
        if capped(&steps) {
            break;
        }
        trie.terminal[cur] = true;
        if !push_capped(
            &mut steps,
            TrieStep {
                prefix: word.clone(),
                node: cur,
                nodes: trie.node_count(),
                line: 3,
                note: format!("mark terminal \"{word}\" node={cur} nodes={}", trie.node_count()),
            },
        ) {
            break;
        }
    }

    if !capped(&steps) {
        push_capped(
            &mut steps,
            TrieStep {
                prefix: String::new(),
                node: 0,
                nodes: trie.node_count(),
                line: 4,
                note: format!("done {} words {} nodes", words.len(), trie.node_count()),
            },
        );
    }
    steps
}

// ---------------------------------------------------------------------------
// Search: build trie silently, then trace each query.
// ---------------------------------------------------------------------------
pub fn trie_search_steps(words: &[String], queries: &[String]) -> Vec<TrieStep> {
    let mut trie = Trie::new();
    for w in words {
        trie.insert_silent(w);
    }
    if queries.is_empty() {
        return vec![TrieStep {
            prefix: String::new(),
            node: 0,
            nodes: trie.node_count(),
            line: 4,
            note: format!("done: 0 queries {} words {} nodes", words.len(), trie.node_count()),
        }];
    }
    let mut steps = Vec::new();

    for q in queries {
        if capped(&steps) {
            break;
        }
        if !push_capped(
            &mut steps,
            TrieStep {
                prefix: String::new(),
                node: 0,
                nodes: trie.node_count(),
                line: 1,
                note: format!("query \"{q}\" nodes={}", trie.node_count()),
            },
        ) {
            break;
        }
        let mut cur = 0usize;
        let mut prefix = String::new();
        let mut missing_at: Option<char> = None;
        for c in q.chars() {
            if capped(&steps) {
                break;
            }
            match trie.children[cur].get(&c) {
                Some(&n) => {
                    cur = n;
                    prefix.push(c);
                    if !push_capped(
                        &mut steps,
                        TrieStep {
                            prefix: prefix.clone(),
                            node: cur,
                            nodes: trie.node_count(),
                            line: 2,
                            note: format!("walk '{c}' prefix=\"{prefix}\" node={cur}"),
                        },
                    ) {
                        break;
                    }
                }
                None => {
                    missing_at = Some(c);
                    break;
                }
            }
        }
        if capped(&steps) {
            break;
        }
        // Empty query: walk loop does nothing; result = root terminal.
        let (found, note) = if missing_at.is_some() {
            let c = missing_at.unwrap();
            (
                false,
                format!("missing \"{q}\" no '{c}' after \"{prefix}\" node={cur}"),
            )
        } else if q.is_empty() {
            if trie.terminal[0] {
                (true, format!("found \"{q}\" (empty) node=0"))
            } else {
                (false, "missing \"\" (empty not inserted) node=0".to_string())
            }
        } else {
            let _ = trie.walk(q);
            if trie.terminal[cur] && prefix.len() == q.chars().count() {
                (true, format!("found \"{q}\" node={cur} prefix=\"{prefix}\""))
            } else {
                (false, format!("missing \"{q}\" prefix \"{prefix}\" not terminal node={cur}"))
            }
        };
        let _ = found;
        if !push_capped(
            &mut steps,
            TrieStep {
                prefix: prefix.clone(),
                node: cur,
                nodes: trie.node_count(),
                line: 3,
                note,
            },
        ) {
            break;
        }
    }

    if !capped(&steps) {
        push_capped(
            &mut steps,
            TrieStep {
                prefix: String::new(),
                node: 0,
                nodes: trie.node_count(),
                line: 4,
                note: format!("done {} queries {} words {} nodes", queries.len(), words.len(), trie.node_count()),
            },
        );
    }
    steps
}

#[cfg(test)]
mod tests {
    use super::*;

    fn s(words: &[&str]) -> Vec<String> {
        words.iter().map(|w| w.to_string()).collect()
    }

    #[test]
    fn insert_node_count_grows() {
        let words = s(&["app", "apple", "ape", "bat", "bar"]);
        let steps = trie_insert_steps(&words);
        assert!(!steps.is_empty());
        assert_eq!(steps[0].line, 1);
        assert_eq!(steps.last().unwrap().line, 4);
        assert!(steps.iter().any(|x| x.line == 2));
        assert!(steps.iter().any(|x| x.line == 3));
        let last = steps.last().unwrap();
        // distinct prefixes: app, appl, apple, ape, bat, bar + root
        // app(3)+le(2)+e(1)+t(1)+at? compute: root + a,p,p,l,e,e?,b,a,t,r?
        // exact: {a,ap,app,appl,apple,ape,ape?} -> nodes = 1 + 3(app) + 2(le) + 1(e for ape) + 3(bat) + 1(r for bar) = 11
        assert_eq!(last.nodes, 11, "nodes={} note={}", last.nodes, last.note);
        assert!(last.note.contains("5 words"), "note: {}", last.note);
        // nodes non-decreasing across steps
        let mut prev = 1usize;
        for st in &steps {
            assert!(st.nodes >= prev, "nodes went backwards: {:?}", st);
            prev = st.nodes;
            assert!((1..=4).contains(&st.line));
        }
        // terminal marks carry full word as prefix
        let terminals: Vec<&TrieStep> = steps.iter().filter(|x| x.line == 3).collect();
        assert_eq!(terminals.len(), 5);
        for (t, w) in terminals.iter().zip(words.iter()) {
            assert_eq!(t.prefix, *w);
        }
    }

    #[test]
    fn insert_prefix_sharing() {
        let one = trie_insert_steps(&s(&["app"]));
        let two = trie_insert_steps(&s(&["app", "apple"]));
        let n1 = one.last().unwrap().nodes;
        let n2 = two.last().unwrap().nodes;
        assert_eq!(n1, 4); // root + a,p,p
        assert_eq!(n2, 6); // + l,e
        assert!(n2 > n1);
    }

    #[test]
    fn search_finds_inserted_and_misses_absent() {
        let words = s(&["app", "apple", "ape", "bat", "bar"]);
        let queries = s(&["app", "apple", "apricot", "bat", "baz", ""]);
        let steps = trie_search_steps(&words, &queries);
        assert!(!steps.is_empty());
        assert_eq!(steps.last().unwrap().line, 4);
        let results: Vec<&TrieStep> = steps.iter().filter(|x| x.line == 3).collect();
        assert_eq!(results.len(), queries.len());
        // app found, apple found, apricot missing, bat found, baz missing, "" missing
        assert!(results[0].note.contains("found"), "note: {}", results[0].note);
        assert!(results[1].note.contains("found"), "note: {}", results[1].note);
        assert!(results[2].note.contains("missing"), "note: {}", results[2].note);
        assert!(results[3].note.contains("found"), "note: {}", results[3].note);
        assert!(results[4].note.contains("missing"), "note: {}", results[4].note);
        assert!(results[5].note.contains("missing"), "note: {}", results[5].note);
        // per-query line-1 present
        assert_eq!(steps.iter().filter(|x| x.line == 1).count(), queries.len());
        for x in &steps {
            assert!((1..=4).contains(&x.line));
        }
    }

    #[test]
    fn search_prefix_not_terminal_is_missing() {
        // "ap" is a prefix of "app" but not inserted itself
        let steps = trie_search_steps(&s(&["app"]), &s(&["ap"]));
        let res = steps.iter().find(|x| x.line == 3).unwrap();
        assert!(res.note.contains("missing"), "note: {}", res.note);
    }

    #[test]
    fn empty_cases_single_done() {
        let e = trie_insert_steps(&[]);
        assert_eq!(e.len(), 1);
        assert_eq!(e[0].line, 4);
        assert!(e[0].note.contains("0 words") || e[0].note.contains("empty"));

        let q0 = trie_search_steps(&s(&["app"]), &[]);
        assert_eq!(q0.len(), 1);
        assert_eq!(q0[0].line, 4);

        let both_empty = trie_search_steps(&[], &[]);
        assert_eq!(both_empty.len(), 1);
        assert_eq!(both_empty[0].line, 4);

        // empty trie + queries => all missing but still traced
        let miss = trie_search_steps(&[], &s(&["a"]));
        assert!(miss.len() > 1);
        let res = miss.iter().find(|x| x.line == 3).unwrap();
        assert!(res.note.contains("missing"));
    }

    #[test]
    fn trie_cap_respected() {
        // 3000 words x ~8 chars => >20000 candidate steps, must cap
        let words: Vec<String> = (0..3000).map(|i| format!("word{i:04}xyz")).collect();
        let steps = trie_insert_steps(&words);
        assert!(steps.len() <= MAX_TRIE_STEPS, "len={}", steps.len());

        let queries: Vec<String> = (0..3000).map(|i| format!("word{i:04}xyz")).collect();
        let ssteps = trie_search_steps(&words, &queries);
        assert!(ssteps.len() <= MAX_TRIE_STEPS, "len={}", ssteps.len());
    }

    #[test]
    fn trie_json_roundtrips() {
        let words = s(&["app", "apple", "ape", "bat", "bar"]);
        let ins = trie_insert_steps(&words);
        let json = serde_json::to_string(&ins).unwrap();
        let back: Vec<TrieStep> = serde_json::from_str(&json).unwrap();
        assert_eq!(back, ins);
        // contract keys
        let v = serde_json::to_value(&ins[0]).unwrap();
        let mut keys: Vec<&str> = v.as_object().unwrap().keys().map(|k| k.as_str()).collect();
        keys.sort_unstable();
        assert_eq!(keys, vec!["line", "node", "nodes", "note", "prefix"]);

        let sch = trie_search_steps(&words, &s(&["app", "nope"]));
        let s2 = serde_json::to_string(&sch).unwrap();
        let back2: Vec<TrieStep> = serde_json::from_str(&s2).unwrap();
        assert_eq!(back2, sch);
    }

    #[test]
    fn deterministic() {
        let words = s(&["app", "apple", "ape", "bat", "bar"]);
        assert_eq!(trie_insert_steps(&words), trie_insert_steps(&words));
        assert_eq!(
            trie_search_steps(&words, &s(&["app"])),
            trie_search_steps(&words, &s(&["app"]))
        );
    }
}
