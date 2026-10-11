// Step schema. Must match Rust side (dsa-core) exactly — do not extend
// without updating the trace emitter.
export interface AlgoStep {
  array: number[];
  compare: [number, number] | null;
  swap: [number, number] | null;
  sorted_from: number | null;
  line: number;
  note: string;
  comparisons: number;
  swaps: number;
}
