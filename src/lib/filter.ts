import type { InterviewQuestion, QuestionOverride } from "./types";
import { overrideState } from "./overrides";

export interface FilterCriteria {
  dir: string; // Direction | "all"
  type: string; // QuestionType | "all"
  tag: string; // string | "all"
  onlyEdited: boolean;
  q: string;
  overrides: Record<string, QuestionOverride>;
}

/**
 * Pure filter used by the 题库 (Browse) page. Extracted so it can be unit-tested
 * independently of React. Returns only questions matching every active criterion.
 */
export function filterBank(
  bank: InterviewQuestion[],
  f: FilterCriteria
): InterviewQuestion[] {
  const needle = f.q.trim().toLowerCase();
  return bank.filter((x) => {
    if (f.dir !== "all" && x.direction !== f.dir) return false;
    if (f.type !== "all" && x.questionType !== f.type) return false;
    if (f.tag !== "all" && !x.tags.includes(f.tag)) return false;
    const st = overrideState(f.overrides[x.id]);
    if (f.onlyEdited && !st) return false;
    if (needle && !x.question.toLowerCase().includes(needle)) return false;
    return true;
  });
}
