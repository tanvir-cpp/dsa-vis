pub mod arrays;
pub mod dp;
pub mod graphs;
pub mod heap;
pub mod linked;
pub mod prng;
pub mod sorting;
pub mod steps;
pub mod strings;
pub mod structures;
pub mod trie;

pub use arrays::{
    dedup_sorted_steps, kadane_steps, prefix_sum_steps, rotate_steps, sliding_window_steps,
    two_sum_sorted_steps,
};
pub use dp::{DpStep, coin_steps, knapsack_steps, lcs_steps, lis_steps};
pub use graphs::{GraphStep, bfs_steps, dfs_steps, dijkstra_steps, topo_steps};
pub use heap::{heap_build_steps, heap_pop_steps, heap_push_steps};
pub use linked::{
    ChainStep, demo_values, list_delete_at_steps, list_insert_at_steps, list_push_head_steps,
    list_push_tail_steps, list_traverse_steps, queue_steps, stack_steps,
};
pub use trie::{TrieStep, trie_insert_steps, trie_search_steps};

pub use prng::{Lcg, shuffle};
pub use sorting::{
    MAX_STEPS, binary_search_steps, bubble_sort_steps, generate_array, insertion_sort_steps,
    linear_search_steps, merge_sort_steps, quick_sort_steps, selection_sort_steps,
};
pub use steps::Step;
pub use strings::{StrStep, kmp_prefix, kmp_steps, naive_steps};
pub use structures::{DsStep, bst_insert_steps, unionfind_steps};

// ---- Native JSON helpers (usable in tests / host) ----
#[cfg(not(target_arch = "wasm32"))]
pub fn bubble_sort_steps_json(n: usize, seed: u64) -> String {
    serde_json::to_string(&bubble_sort_steps(n, seed)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn selection_sort_steps_json(n: usize, seed: u64) -> String {
    serde_json::to_string(&selection_sort_steps(n, seed)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn insertion_sort_steps_json(n: usize, seed: u64) -> String {
    serde_json::to_string(&insertion_sort_steps(n, seed)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn merge_sort_steps_json(n: usize, seed: u64) -> String {
    serde_json::to_string(&merge_sort_steps(n, seed)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn quick_sort_steps_json(n: usize, seed: u64) -> String {
    serde_json::to_string(&quick_sort_steps(n, seed)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn linear_search_steps_json(n: usize, seed: u64, target: i32) -> String {
    serde_json::to_string(&linear_search_steps(n, seed, target)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn binary_search_steps_json(n: usize, seed: u64, target: i32) -> String {
    serde_json::to_string(&binary_search_steps(n, seed, target)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn generate_array_json(n: usize, seed: u64) -> String {
    serde_json::to_string(&generate_array(n, seed)).expect("serialize array")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn bfs_steps_json(n: usize, edges: Vec<(usize, usize)>, start: usize) -> String {
    serde_json::to_string(&bfs_steps(n, &edges, start)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn dfs_steps_json(n: usize, edges: Vec<(usize, usize)>, start: usize) -> String {
    serde_json::to_string(&dfs_steps(n, &edges, start)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn dijkstra_steps_json(n: usize, edges: Vec<(usize, usize, i32)>, start: usize) -> String {
    serde_json::to_string(&dijkstra_steps(n, &edges, start)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn topo_steps_json(n: usize, edges: Vec<(usize, usize)>) -> String {
    serde_json::to_string(&topo_steps(n, &edges)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn knapsack_steps_json(weights: Vec<i32>, values: Vec<i32>, cap: usize) -> String {
    serde_json::to_string(&knapsack_steps(&weights, &values, cap)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn lcs_steps_json(a: String, b: String) -> String {
    serde_json::to_string(&lcs_steps(&a, &b)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn lis_steps_json(arr: Vec<i32>) -> String {
    serde_json::to_string(&lis_steps(&arr)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn coin_steps_json(coins: Vec<i32>, amount: usize) -> String {
    serde_json::to_string(&coin_steps(&coins, amount)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn kmp_prefix_json(pattern: String) -> String {
    serde_json::to_string(&kmp_prefix(&pattern)).expect("serialize prefix")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn kmp_steps_json(text: String, pat: String) -> String {
    serde_json::to_string(&kmp_steps(&text, &pat)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn naive_steps_json(text: String, pat: String) -> String {
    serde_json::to_string(&naive_steps(&text, &pat)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn bst_insert_steps_json(values: Vec<i32>) -> String {
    serde_json::to_string(&bst_insert_steps(&values)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn unionfind_steps_json(n: usize, unions: Vec<(usize, usize)>) -> String {
    serde_json::to_string(&unionfind_steps(n, &unions)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn two_sum_sorted_steps_json(n: usize, seed: u64, target: i32) -> String {
    serde_json::to_string(&two_sum_sorted_steps(n, seed, target)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn sliding_window_steps_json(n: usize, seed: u64, k: usize) -> String {
    serde_json::to_string(&sliding_window_steps(n, seed, k)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn prefix_sum_steps_json(n: usize, seed: u64) -> String {
    serde_json::to_string(&prefix_sum_steps(n, seed)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn kadane_steps_json(n: usize, seed: u64) -> String {
    serde_json::to_string(&kadane_steps(n, seed)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn rotate_steps_json(n: usize, seed: u64, k: usize) -> String {
    serde_json::to_string(&rotate_steps(n, seed, k)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn dedup_sorted_steps_json(n: usize, seed: u64) -> String {
    serde_json::to_string(&dedup_sorted_steps(n, seed)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn heap_build_steps_json(n: usize, seed: u64) -> String {
    serde_json::to_string(&heap_build_steps(n, seed)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn heap_push_steps_json(n: usize, seed: u64) -> String {
    serde_json::to_string(&heap_push_steps(n, seed)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn heap_pop_steps_json(n: usize, seed: u64) -> String {
    serde_json::to_string(&heap_pop_steps(n, seed)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn trie_insert_steps_json(words: Vec<String>) -> String {
    serde_json::to_string(&trie_insert_steps(&words)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn trie_search_steps_json(words: Vec<String>, queries: Vec<String>) -> String {
    serde_json::to_string(&trie_search_steps(&words, &queries)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn list_traverse_steps_json(values: Vec<i32>) -> String {
    serde_json::to_string(&list_traverse_steps(&values)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn list_push_head_steps_json(values: Vec<i32>, v: i32) -> String {
    serde_json::to_string(&list_push_head_steps(&values, v)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn list_push_tail_steps_json(values: Vec<i32>, v: i32) -> String {
    serde_json::to_string(&list_push_tail_steps(&values, v)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn list_insert_at_steps_json(values: Vec<i32>, idx: usize, v: i32) -> String {
    serde_json::to_string(&list_insert_at_steps(&values, idx, v)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn list_delete_at_steps_json(values: Vec<i32>, idx: usize) -> String {
    serde_json::to_string(&list_delete_at_steps(&values, idx)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn stack_steps_json(values: Vec<i32>) -> String {
    serde_json::to_string(&stack_steps(&values)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn queue_steps_json(values: Vec<i32>) -> String {
    serde_json::to_string(&queue_steps(&values)).expect("serialize steps")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn demo_values_json(n: usize) -> String {
    serde_json::to_string(&demo_values(n)).expect("serialize array")
}

// ---- WASM bindings ----
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
fn to_js<T: serde::Serialize>(v: &T) -> JsValue {
    serde_wasm_bindgen::to_js_value(v).expect("serialize to JsValue")
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn bubble_sort_steps_js(n: usize, seed: u64) -> JsValue {
    to_js(&bubble_sort_steps(n, seed))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn selection_sort_steps_js(n: usize, seed: u64) -> JsValue {
    to_js(&selection_sort_steps(n, seed))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn insertion_sort_steps_js(n: usize, seed: u64) -> JsValue {
    to_js(&insertion_sort_steps(n, seed))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn merge_sort_steps_js(n: usize, seed: u64) -> JsValue {
    to_js(&merge_sort_steps(n, seed))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn quick_sort_steps_js(n: usize, seed: u64) -> JsValue {
    to_js(&quick_sort_steps(n, seed))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn linear_search_steps_js(n: usize, seed: u64, target: i32) -> JsValue {
    to_js(&linear_search_steps(n, seed, target))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn binary_search_steps_js(n: usize, seed: u64, target: i32) -> JsValue {
    to_js(&binary_search_steps(n, seed, target))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn generate_array_js(n: usize, seed: u64) -> JsValue {
    to_js(&generate_array(n, seed))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn bfs_steps_js(n: usize, edges: JsValue, start: usize) -> JsValue {
    let edges: Vec<(usize, usize)> =
        serde_wasm_bindgen::from_js_value(&edges).unwrap_or_default();
    to_js(&bfs_steps(n, &edges, start))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn dfs_steps_js(n: usize, edges: JsValue, start: usize) -> JsValue {
    let edges: Vec<(usize, usize)> =
        serde_wasm_bindgen::from_js_value(&edges).unwrap_or_default();
    to_js(&dfs_steps(n, &edges, start))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn dijkstra_steps_js(n: usize, edges: JsValue, start: usize) -> JsValue {
    let edges: Vec<(usize, usize, i32)> =
        serde_wasm_bindgen::from_js_value(&edges).unwrap_or_default();
    to_js(&dijkstra_steps(n, &edges, start))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn topo_steps_js(n: usize, edges: JsValue) -> JsValue {
    let edges: Vec<(usize, usize)> =
        serde_wasm_bindgen::from_js_value(&edges).unwrap_or_default();
    to_js(&topo_steps(n, &edges))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn knapsack_steps_js(weights: JsValue, values: JsValue, cap: usize) -> JsValue {
    let weights: Vec<i32> = serde_wasm_bindgen::from_js_value(&weights).unwrap_or_default();
    let values: Vec<i32> = serde_wasm_bindgen::from_js_value(&values).unwrap_or_default();
    to_js(&knapsack_steps(&weights, &values, cap))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn lcs_steps_js(a: String, b: String) -> JsValue {
    to_js(&lcs_steps(&a, &b))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn lis_steps_js(arr: JsValue) -> JsValue {
    let arr: Vec<i32> = serde_wasm_bindgen::from_js_value(&arr).unwrap_or_default();
    to_js(&lis_steps(&arr))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn coin_steps_js(coins: JsValue, amount: usize) -> JsValue {
    let coins: Vec<i32> = serde_wasm_bindgen::from_js_value(&coins).unwrap_or_default();
    to_js(&coin_steps(&coins, amount))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn kmp_prefix_js(pattern: String) -> JsValue {
    to_js(&kmp_prefix(&pattern))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn kmp_steps_js(text: String, pat: String) -> JsValue {
    to_js(&kmp_steps(&text, &pat))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn naive_steps_js(text: String, pat: String) -> JsValue {
    to_js(&naive_steps(&text, &pat))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn bst_insert_steps_js(values: JsValue) -> JsValue {
    let values: Vec<i32> = serde_wasm_bindgen::from_js_value(&values).unwrap_or_default();
    to_js(&bst_insert_steps(&values))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn unionfind_steps_js(n: usize, unions: JsValue) -> JsValue {
    let unions: Vec<(usize, usize)> =
        serde_wasm_bindgen::from_js_value(&unions).unwrap_or_default();
    to_js(&unionfind_steps(n, &unions))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn two_sum_sorted_steps_js(n: usize, seed: u64, target: i32) -> JsValue {
    to_js(&two_sum_sorted_steps(n, seed, target))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn sliding_window_steps_js(n: usize, seed: u64, k: usize) -> JsValue {
    to_js(&sliding_window_steps(n, seed, k))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn prefix_sum_steps_js(n: usize, seed: u64) -> JsValue {
    to_js(&prefix_sum_steps(n, seed))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn kadane_steps_js(n: usize, seed: u64) -> JsValue {
    to_js(&kadane_steps(n, seed))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn rotate_steps_js(n: usize, seed: u64, k: usize) -> JsValue {
    to_js(&rotate_steps(n, seed, k))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn dedup_sorted_steps_js(n: usize, seed: u64) -> JsValue {
    to_js(&dedup_sorted_steps(n, seed))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn heap_build_steps_js(n: usize, seed: u64) -> JsValue {
    to_js(&heap_build_steps(n, seed))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn heap_push_steps_js(n: usize, seed: u64) -> JsValue {
    to_js(&heap_push_steps(n, seed))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn heap_pop_steps_js(n: usize, seed: u64) -> JsValue {
    to_js(&heap_pop_steps(n, seed))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn trie_insert_steps_js(words: JsValue) -> JsValue {
    let words: Vec<String> = serde_wasm_bindgen::from_js_value(&words).unwrap_or_default();
    to_js(&trie_insert_steps(&words))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn trie_search_steps_js(words: JsValue, queries: JsValue) -> JsValue {
    let words: Vec<String> = serde_wasm_bindgen::from_js_value(&words).unwrap_or_default();
    let queries: Vec<String> = serde_wasm_bindgen::from_js_value(&queries).unwrap_or_default();
    to_js(&trie_search_steps(&words, &queries))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn list_traverse_steps_js(values: JsValue) -> JsValue {
    let values: Vec<i32> = serde_wasm_bindgen::from_js_value(&values).unwrap_or_default();
    to_js(&list_traverse_steps(&values))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn list_push_head_steps_js(values: JsValue, v: i32) -> JsValue {
    let values: Vec<i32> = serde_wasm_bindgen::from_js_value(&values).unwrap_or_default();
    to_js(&list_push_head_steps(&values, v))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn list_push_tail_steps_js(values: JsValue, v: i32) -> JsValue {
    let values: Vec<i32> = serde_wasm_bindgen::from_js_value(&values).unwrap_or_default();
    to_js(&list_push_tail_steps(&values, v))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn list_insert_at_steps_js(values: JsValue, idx: usize, v: i32) -> JsValue {
    let values: Vec<i32> = serde_wasm_bindgen::from_js_value(&values).unwrap_or_default();
    to_js(&list_insert_at_steps(&values, idx, v))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn list_delete_at_steps_js(values: JsValue, idx: usize) -> JsValue {
    let values: Vec<i32> = serde_wasm_bindgen::from_js_value(&values).unwrap_or_default();
    to_js(&list_delete_at_steps(&values, idx))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn stack_steps_js(values: JsValue) -> JsValue {
    let values: Vec<i32> = serde_wasm_bindgen::from_js_value(&values).unwrap_or_default();
    to_js(&stack_steps(&values))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn queue_steps_js(values: JsValue) -> JsValue {
    let values: Vec<i32> = serde_wasm_bindgen::from_js_value(&values).unwrap_or_default();
    to_js(&queue_steps(&values))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn demo_values_js(n: usize) -> JsValue {
    to_js(&demo_values(n))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn native_json_helper_roundtrips() {
        let s = bubble_sort_steps_json(5, 1);
        let steps: Vec<Step> = serde_json::from_str(&s).unwrap();
        assert!(!steps.is_empty());
        assert!(steps.len() <= MAX_STEPS);
    }
}
