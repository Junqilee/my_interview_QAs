import type { Direction, QuestionType, InterviewQuestion } from "./types";

/** 构建版本号：改动后手动递增，用户可在「题库」页看到，用于确认设备跑的是不是最新版 */
export const APP_BUILD = "2026-09-29.r13";

export const DIRECTIONS: { value: Direction; label: string; short: string; color: string; emoji: string }[] = [
  { value: "autonomous_driving_simulation", label: "智驾仿真算法工程师", short: "智驾仿真", color: "#3b82f6", emoji: "🚗" },
  { value: "agent_llm_application", label: "AI Agent / 大模型应用工程师", short: "AI Agent", color: "#a855f7", emoji: "🤖" },
  { value: "operations_optimization", label: "运筹优化算法 / 物流优化调度", short: "运筹优化", color: "#10b981", emoji: "📦" },
  { value: "supply_chain", label: "供应链优化 / 库存调度", short: "供应链", color: "#f59e0b", emoji: "🔗" },
];

export const QUESTION_TYPES: { value: QuestionType; label: string; desc: string; emoji: string }[] = [
  { value: "project_drill", label: "项目经历拷打", desc: "主问题 + 渐进追问", emoji: "🔥" },
  { value: "theory", label: "八股知识", desc: "概念 / 原理 / 对比", emoji: "📚" },
  { value: "scenario", label: "开放性场景题", desc: "分析 / 建模 / 权衡", emoji: "🌐" },
  { value: "real_interview", label: "面试真题", desc: "真实被问到的问题", emoji: "🎯" },
];

export function directionMeta(d: Direction) {
  return DIRECTIONS.find((x) => x.value === d)!;
}
export function typeMeta(t: QuestionType) {
  return QUESTION_TYPES.find((x) => x.value === t)!;
}

/** 题库去重后的全部知识点标签（可按方向过滤） */
export function allTags(bank: InterviewQuestion[], direction?: Direction | "all"): string[] {
  const set = new Set<string>();
  for (const q of bank) {
    if (direction && direction !== "all" && q.direction !== direction) continue;
    for (const t of q.tags) set.add(t);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "zh"));
}
