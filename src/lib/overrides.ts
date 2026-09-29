import type { InterviewQuestion, QuestionOverride } from "./types";

export type OverrideState = "deleted" | "edited" | null;

export function overrideState(o: QuestionOverride | undefined): OverrideState {
  if (!o) return null;
  if (o.deleted) return "deleted";
  if (o.patch) return "edited";
  return null;
}

/**
 * Apply the IndexedDB override layer on top of the base bank.
 * - deleted overrides are excluded from the effective bank
 * - patch overrides are merged over the base question (id is pinned)
 * The base bank (seed + custom) is never mutated; overrides live separately,
 * so any edit is restorable by clearing the override.
 */
export function applyOverrides(
  bank: InterviewQuestion[],
  overrides: Record<string, QuestionOverride>
): InterviewQuestion[] {
  const out: InterviewQuestion[] = [];
  for (const q of bank) {
    const o = overrides[q.id];
    if (!o) {
      out.push(q);
      continue;
    }
    if (o.deleted) continue;
    if (o.patch) {
      out.push({ ...q, ...o.patch, id: q.id });
    } else {
      out.push(q);
    }
  }
  return out;
}
