import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBank } from "../App";
import { DIRECTIONS, QUESTION_TYPES } from "../lib/constants";
import { addCustomQuestion } from "../lib/store";
import type { Direction, QuestionType, InterviewQuestion } from "../lib/types";

export default function AddReal() {
  const nav = useNavigate();
  const { reloadCustom } = useBank();
  const [direction, setDirection] = useState<Direction>("agent_llm_application");
  const [questionType, setQuestionType] = useState<QuestionType>("real_interview");
  const [question, setQuestion] = useState("");
  const [keywords, setKeywords] = useState("");
  const [answer, setAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [followups, setFollowups] = useState("");
  const [tags, setTags] = useState("");
  const [orderPath, setOrderPath] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const [company, setCompany] = useState("");
  const [round, setRound] = useState("");
  const [date, setDate] = useState("");
  const [saved, setSaved] = useState(false);

  const isReal = questionType === "real_interview";
  const canSave = question.trim() && answer.trim();

  const save = async () => {
    if (!canSave) return;
    const q: InterviewQuestion = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      direction,
      questionType,
      question: question.trim(),
      keywords: keywords.split("\n").map((s) => s.trim()).filter(Boolean),
      answer: answer.trim(),
      explanation: explanation.trim(),
      followUps: followups.split("\n").map((s) => s.trim()).filter(Boolean),
      difficulty: difficulty as 1 | 2 | 3 | 4 | 5,
      orderPath: orderPath.split("\n").map((s) => s.trim()).filter(Boolean),
      tags: tags.split(/[\n,，]/).map((s) => s.trim()).filter(Boolean),
      source: isReal
        ? {
            type: "real_interview",
            interviewCompany: company.trim(),
            interviewDate: date.trim(),
            section: round.trim(),
          }
        : { type: "knowledge_note", section: orderPath.trim() || undefined },
      status: "approved",
      version: 1,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    await addCustomQuestion(q);
    await reloadCustom();
    setSaved(true);
    setTimeout(() => nav("/progress"), 600);
  };

  if (saved) {
    return <div className="pt-10 text-center text-emerald-400">✅ 已保存，稍后跳转…</div>;
  }

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-xl font-bold text-white">新增题目</h1>
      <p className="text-sm text-slate-400">单条录入任意方向 / 题型（真题、八股、项目、场景均可）。批量请用「题库 → 📥 导入 md」。</p>

      <Section label="方向">
        <div className="flex flex-wrap gap-2">
          {DIRECTIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDirection(d.value)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                direction === d.value ? "bg-indigo-600 text-white" : "bg-slate-700/60 text-slate-200"
              }`}
            >
              {d.emoji} {d.short}
            </button>
          ))}
        </div>
      </Section>

      <Section label="题型">
        <div className="flex flex-wrap gap-2">
          {QUESTION_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setQuestionType(t.value)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                questionType === t.value ? "bg-indigo-600 text-white" : "bg-slate-700/60 text-slate-200"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Field label="问题 *">
        <Textarea rows={3} value={question} onChange={setQuestion} placeholder="题目内容" />
      </Field>
      <Field label="关键词（每行一条，三级展开第一屏显示）">
        <Textarea rows={2} value={keywords} onChange={setKeywords} placeholder="关键词1\n关键词2" />
      </Field>
      <Field label="完整回答 *">
        <Textarea rows={5} value={answer} onChange={setAnswer} placeholder="完整回答 / 要点" />
      </Field>
      <Field label="解释 / 讲解（一句话结论，可选）">
        <Textarea rows={2} value={explanation} onChange={setExplanation} placeholder="核心一句话、延伸" />
      </Field>
      <Field label="追问（每行一条，可选）">
        <Textarea rows={2} value={followups} onChange={setFollowups} placeholder="追问1\n追问2" />
      </Field>

      {isReal && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="公司">
              <Input value={company} onChange={setCompany} placeholder="携程 / 大疆" />
            </Field>
            <Field label="轮次">
              <Input value={round} onChange={setRound} placeholder="一面" />
            </Field>
          </div>
          <Field label="面试日期">
            <Input value={date} onChange={setDate} placeholder="2026-09-20" />
          </Field>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="难度 (1-5)">
          <select
            value={String(difficulty)}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </Field>
        <Field label="顺序路径（可选，每行）">
          <Input value={orderPath} onChange={setOrderPath} placeholder="第1批 / 章节" />
        </Field>
      </div>
      <Field label="标签（每行或逗号分隔，可选）">
        <Textarea rows={2} value={tags} onChange={setTags} placeholder="标签1, 标签2" />
      </Field>

      <button onClick={save} disabled={!canSave} className="btn-primary btn-block tap disabled:opacity-40">
        保存题目
      </button>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium text-slate-300">{label}</div>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-slate-300">{label}</div>
      {children}
    </label>
  );
}
function Input({ cls: _c, ...props }: any) {
  return <input {...props} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />;
}
function Textarea({ cls: _c, ...props }: any) {
  return <textarea {...props} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />;
}
