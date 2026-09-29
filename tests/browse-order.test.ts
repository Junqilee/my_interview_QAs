import { describe, it, expect } from "vitest";
import { filterBank } from "../src/lib/filter";
import { seedBank } from "../src/data";
import { DIRECTIONS } from "../src/lib/constants";

const dirOrder = (d: string) => DIRECTIONS.findIndex((x) => x.value === d);

/** 与 Browse.tsx 相同的「方向分组 + 组内原序」排序逻辑 */
function sortForBrowse(arr: ReturnType<typeof filterBank>) {
  return arr
    .map((q, i) => ({ q, i }))
    .sort((a, b) => dirOrder(a.q.direction) - dirOrder(b.q.direction) || a.i - b.i)
    .map((x) => x.q);
}

describe("Browse 筛选 + 排序回归", () => {
  it("运筹优化+八股知识：结果全是运筹题，首题是章节地图，无 Agent 题混入", () => {
    const raw = filterBank(seedBank, {
      dir: "operations_optimization", type: "theory", tag: "all",
      onlyEdited: false, q: "", overrides: {},
    });
    expect(raw.length).toBe(75);
    expect(raw.some((q) => q.direction === "agent_llm_application")).toBe(false);
    expect(raw[0].question).toContain("整体地图");
  });

  it("全量视图：按方向分组排序（智驾→Agent→运筹→供应链），组内保持原序", () => {
    const sorted = sortForBrowse(seedBank);
    const dirs = sorted.map((q) => q.direction);
    const firstIdxOf = (d: string) => dirs.indexOf(d);
    expect(firstIdxOf("autonomous_driving_simulation")).toBeLessThan(firstIdxOf("agent_llm_application"));
    expect(firstIdxOf("agent_llm_application")).toBeLessThan(firstIdxOf("operations_optimization"));
    expect(firstIdxOf("operations_optimization")).toBeLessThan(firstIdxOf("supply_chain"));
    // 稳定性：运筹组内第一题仍是章节地图
    const opsFirst = sorted.find((q) => q.direction === "operations_optimization");
    expect(opsFirst!.question).toContain("整体地图");
  });
});
