import type { InterviewQuestion } from "../lib/types";
import seedFromNotes from "./seed-from-notes.json";
import drivingSeed from "./driving-seed.json";
import scenario from "./scenario.json";
import supplyChain from "./supply-chain.json";
import agentTheory from "./agent-theory.json";
import opsTheory from "./ops-theory.json";

export const seedBank: InterviewQuestion[] = (() => {
  const merged = [
    ...(seedFromNotes as unknown as InterviewQuestion[]),
    ...(drivingSeed as unknown as InterviewQuestion[]),
    ...(scenario as unknown as InterviewQuestion[]),
    ...(supplyChain as unknown as InterviewQuestion[]),
    ...(agentTheory as unknown as InterviewQuestion[]),
    ...(opsTheory as unknown as InterviewQuestion[]),
  ].filter((q) => q.status === "approved");
  // 去重保险：重复 id 会导致 React 渲染时 key 冲突，进而在列表筛选/重排时
  // 让旧卡片 DOM 残留（表现为"筛选后却仍显示其它方向的题"）。保留首次出现者。
  const seen = new Set<string>();
  return merged.filter((q) => {
    if (seen.has(q.id)) return false;
    seen.add(q.id);
    return true;
  });
})();

export function getSeedById(id: string): InterviewQuestion | undefined {
  return seedBank.find((q) => q.id === id);
}
