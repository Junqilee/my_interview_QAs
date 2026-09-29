import { describe, it, expect } from "vitest";
import { validateQuestion, validateBank } from "../src/lib/validate";
import { seedBank } from "../src/data";

describe("schema 校验", () => {
  it("整库种子题全部通过校验", () => {
    const { valid, invalid } = validateBank(seedBank as any[]);
    if (invalid.length > 0) {
      console.log("无效题目示例:", invalid.slice(0, 3));
    }
    expect(invalid.length).toBe(0);
    expect(valid).toBe(seedBank.length);
  });

  it("缺字段的题目应报错", () => {
    const bad = { id: "x", direction: "agent_llm_application" } as any;
    const errs = validateQuestion(bad);
    expect(errs.length).toBeGreaterThan(0);
  });

  it("非法 direction / type 应报错", () => {
    const bad = {
      id: "x",
      direction: "nope",
      questionType: "nope",
      question: "q",
      keywords: [],
      answer: "a",
      explanation: "e",
      difficulty: 3,
      orderPath: [],
      tags: [],
      source: { type: "real_interview" },
      status: "approved",
      version: 1,
      updatedAt: "2026-01-01",
    } as any;
    const errs = validateQuestion(bad);
    expect(errs.some((e) => e.includes("direction"))).toBe(true);
    expect(errs.some((e) => e.includes("questionType"))).toBe(true);
  });
});
