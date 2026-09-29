import { describe, it, expect } from "vitest";
import { applyOverrides, overrideState } from "../src/lib/overrides";
import type { InterviewQuestion, QuestionOverride } from "../src/lib/types";

const base: InterviewQuestion = {
  id: "q1",
  direction: "agent_llm_application",
  questionType: "theory",
  question: "原问题",
  keywords: ["a"],
  answer: "原回答",
  explanation: "原解释",
  difficulty: 3,
  orderPath: [],
  tags: [],
  source: { type: "knowledge_note" },
  status: "approved",
  version: 1,
  updatedAt: "2026-09-26",
};

describe("applyOverrides", () => {
  it("returns bank unchanged when there are no overrides", () => {
    expect(applyOverrides([base], {})).toEqual([base]);
  });

  it("merges a patch but preserves the question id", () => {
    const o: QuestionOverride = { id: "q1", patch: { answer: "新回答", version: 2 }, updatedAt: 1 };
    const out = applyOverrides([base], { q1: o });
    expect(out).toHaveLength(1);
    expect(out[0].answer).toBe("新回答");
    expect(out[0].id).toBe("q1");
    expect(out[0].question).toBe("原问题");
  });

  it("excludes deleted questions from the effective bank", () => {
    const o: QuestionOverride = { id: "q1", deleted: true, updatedAt: 1 };
    expect(applyOverrides([base], { q1: o })).toEqual([]);
  });

  it("keeps a non-overridden question while overriding another", () => {
    const other: InterviewQuestion = { ...base, id: "q2", question: "另一题" };
    const o: QuestionOverride = { id: "q1", patch: { answer: "x" }, updatedAt: 1 };
    const out = applyOverrides([base, other], { q1: o });
    expect(out.map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(out[1].question).toBe("另一题");
  });
});

describe("overrideState", () => {
  it("detects deleted / edited / none", () => {
    expect(overrideState({ id: "q1", deleted: true, updatedAt: 1 })).toBe("deleted");
    expect(overrideState({ id: "q1", patch: { answer: "x" }, updatedAt: 1 })).toBe("edited");
    expect(overrideState(undefined)).toBeNull();
  });
});
