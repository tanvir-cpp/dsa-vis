/// Simple deterministic LCG (no `rand` / `getrandom`, WASM-safe).
///
/// Recurrence: `state = state * A + C (mod 2^64)`
/// with `A = 6364136223846793005` (Knuth MMIX) and `C = 1`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Lcg {
    state: u64,
}

impl Lcg {
    pub fn new(seed: u64) -> Self {
        Self { state: seed }
    }

    /// Advance state and return raw u64.
    pub fn next(&mut self) -> u64 {
        self.state = self
            .state
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1);
        self.state
    }

    /// Return value in inclusive range `[lo, hi]`.
    pub fn gen_range(&mut self, lo: i32, hi: i32) -> i32 {
        assert!(lo <= hi, "gen_range: lo must be <= hi");
        let span = (hi as i64 - lo as i64 + 1) as u64;
        (lo as i64 + (self.next() % span) as i64) as i32
    }

    /// In-place Fisher–Yates shuffle.
    pub fn shuffle(&mut self, data: &mut [i32]) {
        if data.len() < 2 {
            return;
        }
        for i in (1..data.len()).rev() {
            let j = (self.next() % (i as u64 + 1)) as usize;
            data.swap(i, j);
        }
    }

    /// Current raw state (useful for tests).
    pub fn state(&self) -> u64 {
        self.state
    }
}

/// Free-function shuffle for `Vec<i32>` with explicit seed.
pub fn shuffle(data: &mut Vec<i32>, seed: u64) {
    let mut rng = Lcg::new(seed);
    rng.shuffle(data);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deterministic_same_seed() {
        let mut a = Lcg::new(42);
        let mut b = Lcg::new(42);
        for _ in 0..100 {
            assert_eq!(a.next(), b.next());
        }
    }

    #[test]
    fn different_seeds_differ() {
        let mut a = Lcg::new(1);
        let mut b = Lcg::new(2);
        assert_ne!(a.next(), b.next());
    }

    #[test]
    fn gen_range_bounds_inclusive() {
        let mut rng = Lcg::new(7);
        for _ in 0..1000 {
            let v = rng.gen_range(5, 100);
            assert!((5..=100).contains(&v), "out of range: {v}");
        }
        // degenerate range always returns lo
        let mut rng = Lcg::new(0);
        assert_eq!(rng.gen_range(3, 3), 3);
    }

    #[test]
    fn shuffle_deterministic_and_permutation() {
        let mut a = vec![1, 2, 3, 4, 5];
        let mut b = vec![1, 2, 3, 4, 5];
        shuffle(&mut a, 123);
        shuffle(&mut b, 123);
        assert_eq!(a, b);
        let mut sorted = a.clone();
        sorted.sort_unstable();
        assert_eq!(sorted, vec![1, 2, 3, 4, 5]);

        let mut c = vec![1, 2, 3, 4, 5];
        shuffle(&mut c, 999);
        // overwhelmingly likely to differ from seed 123 (not a strict guarantee,
        // but true for this LCG; if flaky, relax to determinism check above)
        assert_ne!(a, c);
    }
}
