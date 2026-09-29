import { describe, it, expect } from "vitest";
import { parseMarkdownQuestions } from "../src/lib/mdImport";

const SAMPLE = `# 测试问答集

## Q1：一句话说清什么是 X？

**结论：X 是一个能自主决策的系统。**

- 普通聊天是**开环**；
- X 是**闭环**。

## 2. 第二个问题怎么答？

**一句话**：先讲定义。

正文内容…

### 3. 第三个子问题？

子问题答案。

## 补充 Q：补充的问题？

补充答案。
`;

describe("parseMarkdownQuestions", () => {
  const opts = {
    direction: "agent_llm_application" as const,
    questionType: "theory" as const,
    tag: "测试",
    sourceLabel: "test-x",
    sourceFile: "test.md",
  };

  it("识别 Q / 数字 / 补充 三种标题风格", () => {
    const qs = parseMarkdownQuestions(SAMPLE, opts);
    expect(qs.map((q) => q.id)).toEqual([
      "test-x-q1",
      "test-x-2-2",
      "test-x-3-3",
      "test-x-sup",
    ]);
  });

  it("抽取问题与关键词、一句话解释", () => {
    const qs = parseMarkdownQuestions(SAMPLE, opts);
    const q1 = qs.find((q) => q.id === "test-x-q1")!;
    expect(q1.question).toContain("一句话说清什么是 X");
    expect(q1.explanation).toContain("X 是一个能自主决策的系统");
    expect(q1.keywords).toContain("开环");
    expect(q1.keywords).toContain("闭环");
    // 元信息标签（结论/一句话）不应进关键词
    expect(q1.keywords).not.toContain("结论");
  });

  it("填入 schema 必填字段", () => {
    const qs = parseMarkdownQuestions(SAMPLE, opts);
    for (const q of qs) {
      expect(q.direction).toBe("agent_llm_application");
      expect(q.questionType).toBe("theory");
      expect(q.status).toBe("approved");
      expect(Array.isArray(q.keywords)).toBe(true);
      expect(Array.isArray(q.orderPath)).toBe(true);
      expect(Array.isArray(q.tags)).toBe(true);
      expect(q.source.type).toBe("knowledge_note");
    }
  });
});
