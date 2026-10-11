use serde::{Deserialize, Serialize};

/// Single deterministic visualization step.
///
/// JSON contract (snake_case, must match exactly):
/// {
///   array: number[],
///   compare: [number, number] | null,
///   swap: [number, number] | null,
///   sorted_from: number | null,
///   line: number,
///   note: string,
///   comparisons: number,
///   swaps: number
/// }
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Step {
    pub array: Vec<i32>,
    pub compare: Option<[usize; 2]>,
    pub swap: Option<[usize; 2]>,
    pub sorted_from: Option<usize>,
    pub line: usize,
    pub note: String,
    pub comparisons: usize,
    pub swaps: usize,
}

impl Step {
    pub fn new(
        array: Vec<i32>,
        compare: Option<[usize; 2]>,
        swap: Option<[usize; 2]>,
        sorted_from: Option<usize>,
        line: usize,
        note: impl Into<String>,
        comparisons: usize,
        swaps: usize,
    ) -> Self {
        Self {
            array,
            compare,
            swap,
            sorted_from,
            line,
            note: note.into(),
            comparisons,
            swaps,
        }
    }

    /// Initial snapshot (line 1, no marks).
    pub fn initial(array: &[i32], line: usize, note: impl Into<String>) -> Self {
        Self::new(array.to_vec(), None, None, None, line, note, 0, 0)
    }

    /// Compare mark helper: `Step::mark_compare(&arr, i, j, ...)`.
    pub fn mark_compare(
        array: &[i32],
        a: usize,
        b: usize,
        sorted_from: Option<usize>,
        line: usize,
        note: impl Into<String>,
        comparisons: usize,
        swaps: usize,
    ) -> Self {
        Self::new(
            array.to_vec(),
            Some([a, b]),
            None,
            sorted_from,
            line,
            note,
            comparisons,
            swaps,
        )
    }

    /// Swap mark helper.
    pub fn mark_swap(
        array: &[i32],
        a: usize,
        b: usize,
        sorted_from: Option<usize>,
        line: usize,
        note: impl Into<String>,
        comparisons: usize,
        swaps: usize,
    ) -> Self {
        Self::new(
            array.to_vec(),
            None,
            Some([a, b]),
            sorted_from,
            line,
            note,
            comparisons,
            swaps,
        )
    }

    /// Compare + swap both set (rare; useful for atomic swap visualization).
    pub fn mark_compare_swap(
        array: &[i32],
        a: usize,
        b: usize,
        sorted_from: Option<usize>,
        line: usize,
        note: impl Into<String>,
        comparisons: usize,
        swaps: usize,
    ) -> Self {
        Self::new(
            array.to_vec(),
            Some([a, b]),
            Some([a, b]),
            sorted_from,
            line,
            note,
            comparisons,
            swaps,
        )
    }

    /// Single-index mark helper for searches (mid / i).
    /// Encoded as [idx, idx] to satisfy the `[number, number] | null` contract.
    pub fn mark_single(
        array: &[i32],
        idx: usize,
        line: usize,
        note: impl Into<String>,
        comparisons: usize,
        swaps: usize,
    ) -> Self {
        Self::new(
            array.to_vec(),
            Some([idx, idx]),
            None,
            None,
            line,
            note,
            comparisons,
            swaps,
        )
    }

    /// Done helper (no marks, keeps final counters).
    pub fn done(
        array: &[i32],
        sorted_from: Option<usize>,
        line: usize,
        note: impl Into<String>,
        comparisons: usize,
        swaps: usize,
    ) -> Self {
        Self::new(
            array.to_vec(),
            None,
            None,
            sorted_from,
            line,
            note,
            comparisons,
            swaps,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn step_json_contract_shape() {
        let s = Step::new(
            vec![3, 1, 2],
            Some([0, 1]),
            None,
            None,
            3,
            "compare",
            1,
            0,
        );
        let v = serde_json::to_value(&s).unwrap();
        assert_eq!(v["array"], serde_json::json!([3, 1, 2]));
        assert_eq!(v["compare"], serde_json::json!([0, 1]));
        assert_eq!(v["swap"], serde_json::Value::Null);
        assert_eq!(v["sorted_from"], serde_json::Value::Null);
        assert_eq!(v["line"], serde_json::json!(3));
        assert_eq!(v["note"], serde_json::json!("compare"));
        assert_eq!(v["comparisons"], serde_json::json!(1));
        assert_eq!(v["swaps"], serde_json::json!(0));
        // exact field set
        let mut keys: Vec<&str> = v.as_object().unwrap().keys().map(|k| k.as_str()).collect();
        keys.sort_unstable();
        assert_eq!(
            keys,
            vec![
                "array",
                "compare",
                "comparisons",
                "line",
                "note",
                "sorted_from",
                "swap",
                "swaps"
            ]
        );
    }

    #[test]
    fn mark_helpers_encode_correctly() {
        let a = vec![5, 1];
        let c = Step::mark_compare(&a, 0, 1, None, 3, "c", 1, 0);
        assert_eq!(c.compare, Some([0, 1]));
        assert_eq!(c.swap, None);
        let s = Step::mark_swap(&a, 0, 1, Some(1), 4, "s", 1, 1);
        assert_eq!(s.swap, Some([0, 1]));
        assert_eq!(s.sorted_from, Some(1));
        let m = Step::mark_single(&a, 1, 2, "m", 2, 0);
        assert_eq!(m.compare, Some([1, 1]));
    }
}
