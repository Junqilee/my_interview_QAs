import type { InterviewQuestion } from "./types";

const DIRS = ["autonomous_driving_simulation", "agent_llm_application", "operations_optimization", "supply_chain"];
const TYPES = ["project_drill", "theory", "scenario", "real_interview"];
const STATUSES = ["draft", "approved", "archived"];

export function validateQuestion(q: any): string[] {
  const errs: string[] = [];
  if (typeof q?.id !== "string" || !q.id) errs.push("id 必填且为字符串");
  if (!DIRS.includes(q?.direction)) errs.push(`direction 非法: ${q?.direction}`);
  if (!TYPES.includes(q?.questionType)) errs.push(`questionType 非法: ${q?.questionType}`);
  if (typeof q?.question !== "string" || !q.question.trim()) errs.push("question 必填");
  if (!Array.isArray(q?.keywords)) errs.push("keywords 必须是数组");
  if (typeof q?.answer !== "string" || !q.answer.trim()) errs.push("answer 必填");
  if (typeof q?.explanation !== "string") errs.push("explanation 必填");
  if (q?.difficulty !== undefined && ![1, 2, 3, 4, 5].includes(q.difficulty))
    errs.push("difficulty 必须是 1-5");
  if (!Array.isArray(q?.orderPath)) errs.push("orderPath 必须是数组");
  if (!Array.isArray(q?.tags)) errs.push("tags 必须是数组");
  if (!q?.source || typeof q.source !== "object") errs.push("source 必填");
  else if (!["project_note", "knowledge_note", "scenario_seed", "real_interview"].includes(q.source.type))
    errs.push(`source.type 非法: ${q.source?.type}`);
  if (!STATUSES.includes(q?.status)) errs.push(`status 非法: ${q?.status}`);
  if (typeof q?.version !== "number") errs.push("version 必须是数字");
  if (typeof q?.updatedAt !== "string") errs.push("updatedAt 必填");
  return errs;
}

export function validateBank(bank: any[]): { valid: number; invalid: { id: string; errors: string[] }[] } {
  const invalid: { id: string; errors: string[] }[] = [];
  let valid = 0;
  for (const q of bank) {
    const e = validateQuestion(q);
    if (e.length === 0) valid++;
    else invalid.push({ id: q?.id ?? "(无id)", errors: e });
  }
  return { valid, invalid };
}
