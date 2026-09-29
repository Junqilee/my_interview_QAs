import { describe, it, expect } from "vitest";
import { filterBank } from "../src/lib/filter";
import type { InterviewQuestion, QuestionOverride } from "../src/lib/types";

function q(id: string, direction: any, questionType: any, tags: string[] = []): InterviewQuestion {
  return {
    id,
    direction,
    questionType,
    question: `问题 ${id}`,
    keywords: [],
    answer: "a",
    explanation: "e",
    followUps: [],
    difficulty: 3,
    orderPath: [id],
    tags,
    source: { type: "knowledge_note" },
    status: "approved",
    version: 1,
    updatedAt: "2026-09-26",
  };
}

const bank: InterviewQuestion[] = [
  q("a1", "agent_llm_application", "theory", ["RAG技术"]),
  q("a2", "agent_llm_application", "project_drill", ["基础概念"]),
  q("o1", "operations_optimization", "theory", ["线性规划与对偶"]),
  q("o2", "operations_optimization", "scenario", ["VRP"]),
  q("s1", "supply_chain", "theory", ["供应链基础"]),
];

const noOverrides: Record<string, QuestionOverride> = {};

describe("filterBank", () => {
  it("returns all when every criterion is 'all'", () => {
    const r = filterBank(bank, { dir: "all", type: "all", tag: "all", onlyEdited: false, q: "", overrides: noOverrides });
    expect(r.length).toBe(5);
  });

  it("filters by direction", () => {
    const r = filterBank(bank, { dir: "operations_optimization", type: "all", tag: "all", onlyEdited: false, q: "", overrides: noOverrides });
    expect(r.map((x) => x.id).sort()).toEqual(["o1", "o2"]);
  });

  it("filters by question type", () => {
    const r = filterBank(bank, { dir: "all", type: "theory", tag: "all", onlyEdited: false, q: "", overrides: noOverrides });
    expect(r.map((x) => x.id).sort()).toEqual(["a1", "o1", "s1"]);
  });

  it("filters by tag", () => {
    const r = filterBank(bank, { dir: "all", type: "all", tag: "VRP", onlyEdited: false, q: "", overrides: noOverrides });
    expect(r.map((x) => x.id)).toEqual(["o2"]);
  });

  it("combines direction + type (AND)", () => {
    const r = filterBank(bank, { dir: "operations_optimization", type: "theory", tag: "all", onlyEdited: false, q: "", overrides: noOverrides });
    expect(r.map((x) => x.id)).toEqual(["o1"]);
  });

  it("onlyEdited honors overrides", () => {
    const ov: Record<string, QuestionOverride> = { a1: { id: "a1", patch: { question: "x" } as any, updatedAt: 1 } };
    const edited = filterBank(bank, { dir: "all", type: "all", tag: "all", onlyEdited: true, q: "", overrides: ov });
    expect(edited.map((x) => x.id)).toEqual(["a1"]);
  });

  it("text search is case-insensitive on question", () => {
    const r = filterBank(bank, { dir: "all", type: "all", tag: "all", onlyEdited: false, q: "O1", overrides: noOverrides });
    expect(r.map((x) => x.id)).toEqual(["o1"]);
  });
});
