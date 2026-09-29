import { describe, it, expect } from "vitest";
import { filterBank, buildQueue, emptySettings } from "../src/lib/selection";
import type { InterviewQuestion, PracticeSettings, ReviewRecord } from "../src/lib/types";

function mk(id: string, dir: any, type: any, order: string[], diff = 3): InterviewQuestion {
  return {
    id,
    direction: dir,
    questionType: type,
    question: `Q ${id}`,
    keywords: [],
    answer: "a",
    explanation: "e",
    difficulty: diff as any,
    orderPath: order,
    tags: [],
    source: { type: "knowledge_note" },
    status: "approved",
    version: 1,
    updatedAt: "2026-01-01",
  };
}

const bank: InterviewQuestion[] = [
  mk("a1", "agent_llm_application", "theory", ["A", "1"], 1),
  mk("a2", "agent_llm_application", "theory", ["A", "2"], 2),
  mk("a3", "agent_llm_application", "project_drill", ["A", "3"], 3),
  mk("o1", "operations_optimization", "scenario", ["O", "1"], 4),
  mk("d1", "autonomous_driving_simulation", "project_drill", ["D", "1"], 5),
];

describe("filterBank", () => {
  it("按方向过滤", () => {
    const s = { ...emptySettings(), direction: "agent_llm_application" as const };
    expect(filterBank(bank, s).map((q) => q.id)).toEqual(["a1", "a2", "a3"]);
  });
  it("按类型过滤 + 排除真题", () => {
    const s = { ...emptySettings(), types: ["theory"], includeRealInterview: false } as PracticeSettings;
    expect(filterBank(bank, s).map((q) => q.id)).toEqual(["a1", "a2"]);
  });
  it("按难度区间过滤", () => {
    const s = { ...emptySettings(), difficultyMin: 3, difficultyMax: 5 } as PracticeSettings;
    expect(filterBank(bank, s).map((q) => q.id)).toEqual(["a3", "o1", "d1"]);
  });
});

describe("buildQueue", () => {
  it("顺序模式按 orderPath 排序并截断到 count", () => {
    const s = { ...emptySettings(), mode: "sequential" as const, count: 2, direction: "agent_llm_application" as const, types: ["theory"] } as PracticeSettings;
    const q = buildQueue(filterBank(bank, s), s, new Map());
    expect(q).toEqual(["a1", "a2"]);
  });

  it("随机模式返回不超过 count 且来自候选集", () => {
    const s = { ...emptySettings(), mode: "random" as const, count: 2, direction: "all" as const } as PracticeSettings;
    const q = buildQueue(bank, s, new Map());
    expect(q.length).toBe(2);
    q.forEach((id) => expect(bank.find((b) => b.id === id)).toBeTruthy());
  });

  it("priorityWrong 时把薄弱题排到前面（可复现性弱，仅验证包含）", () => {
    const s = { ...emptySettings(), mode: "random" as const, count: 5, priorityWrong: true } as PracticeSettings;
    const weak: ReviewRecord = { questionId: "o1", status: "unknown", reviewCount: 1, lastReviewedAt: "", revealStage: "answer" };
    const q = buildQueue(bank, s, new Map([["o1", weak]]));
    expect(q[0]).toBe("o1");
  });

  it("随机模式不重复出现同一题", () => {
    const s = { ...emptySettings(), mode: "random" as const, count: 5 } as PracticeSettings;
    const q = buildQueue(bank, s, new Map());
    expect(new Set(q).size).toBe(q.length);
  });
});
