import type { Direction, QuestionType, InterviewQuestion, SourceType } from "./types";

const SKIP_PREFIX = [
  "结论", "一句话", "核心", "第一性", "关系", "收口", "记忆", "关键",
  "补充", "定义", "名词", "定位", "状态", "说明", "读法", "目标",
  "经验法则", "数学", "串讲", "本质", "小例子", "记忆例子", "对照",
];

const HEADING = /^(#{2,3})\s+(.*?)\s*$/;
const QPAT = /^(?:Q(\d+)|补充\s*Q|(\d+)\.\s+(?!\d))(.*)$/;
const ASCII = /[A-Za-z]/;

export interface ParseOpts {
  direction: Direction;
  questionType: QuestionType;
  tag: string;
  sourceLabel: string;
  sourceFile?: string;
  sourceType?: SourceType;
}

function extractKeywords(text: string): string[] {
  const cands = text.match(/\*\*(.+?)\*\*/g) || [];
  const kws: string[] = [];
  const seen = new Set<string>();
  for (const raw of cands) {
    let c = raw.replace(/^\*\*|\*\*$/g, "").trim().replace(/[：:]$/, "").trim();
    if (!c) continue;
    if (SKIP_PREFIX.some((p) => c.startsWith(p))) continue;
    const m = c.match(/^([^（(]+?)[（(]/);
    const term = (m ? m[1] : c).trim().replace(/[：: "''．.。]/g, "");
    if (!term || term.length > 22) continue;
    const hasAscii = ASCII.test(term);
    const ok = hasAscii ? term.length <= 14 : term.length >= 2 && term.length <= 5;
    if (!ok) continue;
    if (seen.has(term)) continue;
    seen.add(term);
    kws.push(term);
    if (kws.length >= 8) break;
  }
  return kws;
}

function extractExplanation(text: string): string {
  const m = text.match(/\*\*(一句话|结论)[：:]\s*([\s\S]*?)\*\*/);
  return m ? m[2].trim() : "";
}

/**
 * 解析一份 Markdown 问答集为题目数组。
 * 兼容两种标题风格：
 *   ## Q1：xxx / ## 补充 Q：xxx          （Agent 01 章）
 *   ## 1. xxx  /  ### 1. xxx           （Agent 03/11/12/13 章 & 供应链）
 * 自动从 **加粗** 抽关键词，从 **一句话/结论：...** 抽一句话解释。
 */
export function parseMarkdownQuestions(md: string, opts: ParseOpts): InterviewQuestion[] {
  const lines = md.split(/\r?\n/);
  const headings: { i: number; level: number; text: string }[] = [];
  lines.forEach((ln, i) => {
    const m = HEADING.exec(ln);
    if (m) headings.push({ i, level: m[1].length, text: m[2].trim() });
  });
  const qheads = headings.filter((h) => QPAT.test(h.text));
  const out: InterviewQuestion[] = [];
  qheads.forEach((h, idx) => {
    const start = h.i + 1;
    const end = idx + 1 < qheads.length ? qheads[idx + 1].i : lines.length;
    let body = lines.slice(start, end).join("\n").replace(/^---+\s*$/gm, "").trim();
    body = body.replace(/\n{3,}/g, "\n\n");
    const expl = extractExplanation(body);
    if (expl) {
      const stripped = body.replace(/\*\*(一句话|结论)[：:][\s\S]*?\*\*\n?/, "");
      if (stripped.trim().length >= 10) body = stripped.trim();
    }
    const kws = extractKeywords(body);
    const m = QPAT.exec(h.text)!;
    let qtext: string;
    let qid: string;
    if (m[1]) {
      qtext = h.text.replace(/^Q\d+[.\：:]\s*/, "");
      qid = `${opts.sourceLabel}-q${m[1]}`;
    } else if (h.text.startsWith("补充")) {
      qtext = h.text.replace(/^补充\s*Q[.\：:]\s*/, "");
      qid = `${opts.sourceLabel}-sup`;
    } else {
      qtext = h.text.replace(/^\d+[.\：:]\s*/, "");
      qid = `${opts.sourceLabel}-${h.level}-${m[2]}`;
    }
    qtext = qtext.trim();
    if (!qtext) return;
    out.push({
      id: qid,
      direction: opts.direction,
      questionType: opts.questionType,
      question: qtext,
      keywords: kws,
      answer: body,
      explanation: expl,
      difficulty: 3,
      orderPath: [opts.sourceLabel],
      tags: opts.tag ? [opts.tag] : [],
      source: { type: opts.sourceType || "knowledge_note", section: opts.sourceLabel, file: opts.sourceFile },
      status: "approved",
      version: 1,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
  });
  return out;
}
