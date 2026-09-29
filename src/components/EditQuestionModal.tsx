import { useState } from "react";
import { DIRECTIONS, QUESTION_TYPES } from "../lib/constants";
import type {
  Direction,
  QuestionType,
  InterviewQuestion,
  QuestionOverride,
  QuestionSource,
  SourceType,
} from "../lib/types";

const SOURCE_TYPES: SourceType[] = [
  "project_note",
  "knowledge_note",
  "scenario_seed",
  "real_interview",
];

type Status = "draft" | "approved" | "archived";

export default function EditQuestionModal({
  question,
  onClose,
  onSave,
  onCreate,
  mode = "edit",
}: {
  question: InterviewQuestion;
  onClose: () => void;
  onSave?: (o: QuestionOverride) => Promise<void>;
  onCreate?: (q: InterviewQuestion) => Promise<void>;
  mode?: "edit" | "create";
}) {
  const [direction, setDirection] = useState<Direction>(question.direction);
  const [questionType, setQuestionType] = useState<QuestionType>(question.questionType);
  const [questionText, setQuestionText] = useState(question.question);
  const [keywords, setKeywords] = useState(question.keywords.join("\n"));
  const [answer, setAnswer] = useState(question.answer);
  const [explanation, setExplanation] = useState(question.explanation || "");
  const [hasCode, setHasCode] = useState(!!question.code);
  const [codeLang, setCodeLang] = useState(question.code?.language || "python");
  const [codeContent, setCodeContent] = useState(question.code?.content || "");
  const [followUps, setFollowUps] = useState((question.followUps || []).join("\n"));
  const [difficulty, setDifficulty] = useState<number>(question.difficulty);
  const [status, setStatus] = useState<Status>(question.status);
  const [sourceType, setSourceType] = useState<SourceType>(question.source.type);
  const [sourceSection, setSourceSection] = useState(question.source.section || "");
  const [sourceCompany, setSourceCompany] = useState(question.source.interviewCompany || "");
  const [sourceDate, setSourceDate] = useState(question.source.interviewDate || "");
  const [orderPath, setOrderPath] = useState((question.orderPath || []).join("\n"));
  const [tags, setTags] = useState((question.tags || []).join("\n"));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!questionText.trim()) return;
    setSaving(true);
    const full: InterviewQuestion = {
      ...question,
      direction,
      questionType,
      question: questionText.trim(),
      keywords: keywords.split("\n").map((s) => s.trim()).filter(Boolean),
      answer: answer.trim(),
      explanation: explanation.trim(),
      code: hasCode ? { language: codeLang.trim() || "python", content: codeContent } : undefined,
      followUps: followUps.split("\n").map((s) => s.trim()).filter(Boolean),
      difficulty: difficulty as 1 | 2 | 3 | 4 | 5,
      orderPath: orderPath.split("\n").map((s) => s.trim()).filter(Boolean),
      tags: tags.split(/[\n,，]/).map((s) => s.trim()).filter(Boolean),
      source: {
        ...question.source,
        type: sourceType,
        section: sourceSection.trim() || undefined,
        interviewCompany: sourceCompany.trim() || undefined,
        interviewDate: sourceDate.trim() || undefined,
      } as QuestionSource,
      status,
      version: question.version + 1,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    try {
      if (mode === "create" && onCreate) {
        const id =
          question.id && question.id !== "new"
            ? question.id
            : `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        await onCreate({ ...full, id });
      } else if (onSave) {
        await onSave({ id: question.id, patch: full, updatedAt: Date.now() });
      }
    } finally {
      setSaving(false);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-slate-900 p-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{mode === "create" ? "新建题目" : "编辑题目"}</h2>
          <button onClick={onClose} className="text-slate-400">✕</button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="方向">
              <Select
                value={direction}
                onChange={(v) => setDirection(v as Direction)}
                options={DIRECTIONS.map((d) => ({ value: d.value, label: d.short }))}
              />
            </Field>
            <Field label="题型">
              <Select
                value={questionType}
                onChange={(v) => setQuestionType(v as QuestionType)}
                options={QUESTION_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />
            </Field>
          </div>
          <Field label="问题">
            <Textarea rows={3} value={questionText} onChange={setQuestionText} />
          </Field>
          <Field label="关键词（每行一条）">
            <Textarea rows={2} value={keywords} onChange={setKeywords} />
          </Field>
          <Field label="完整回答">
            <Textarea rows={4} value={answer} onChange={setAnswer} />
          </Field>
          <Field label="解释 / 讲解">
            <Textarea rows={3} value={explanation} onChange={setExplanation} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={hasCode}
              onChange={(e) => setHasCode(e.target.checked)}
              className="h-5 w-5 accent-indigo-500"
            />
            包含代码示例
          </label>
          {hasCode && (
            <div className="space-y-2 rounded-lg border border-slate-700 p-3">
              <Field label="代码语言">
                <Input value={codeLang} onChange={setCodeLang} placeholder="python / cpp / ..." />
              </Field>
              <Field label="代码内容">
                <Textarea rows={5} value={codeContent} onChange={setCodeContent} className="font-mono" />
              </Field>
            </div>
          )}
          <Field label="追问（每行一条）">
            <Textarea rows={2} value={followUps} onChange={setFollowUps} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="难度 (1-5)">
              <Select
                value={String(difficulty)}
                onChange={(v) => setDifficulty(Number(v))}
                options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
              />
            </Field>
            <Field label="状态">
              <Select
                value={status}
                onChange={(v) => setStatus(v as Status)}
                options={[
                  { value: "draft", label: "draft" },
                  { value: "approved", label: "approved" },
                  { value: "archived", label: "archived" },
                ]}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="来源类型">
              <Select
                value={sourceType}
                onChange={(v) => setSourceType(v as SourceType)}
                options={SOURCE_TYPES.map((s) => ({ value: s, label: s }))}
              />
            </Field>
            <Field label="来源备注 / 章节">
              <Input value={sourceSection} onChange={setSourceSection} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="面试公司（真题）">
              <Input value={sourceCompany} onChange={setSourceCompany} />
            </Field>
            <Field label="面试日期（真题）">
              <Input value={sourceDate} onChange={setSourceDate} placeholder="2026-09-20" />
            </Field>
          </div>
          <Field label="顺序路径 orderPath（每行一条）">
            <Textarea rows={2} value={orderPath} onChange={setOrderPath} />
          </Field>
          <Field label="标签（每行或逗号分隔）">
            <Textarea rows={2} value={tags} onChange={setTags} />
          </Field>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="btn-primary btn-block tap flex-1 bg-slate-700">
              取消
            </button>
            <button
              onClick={save}
              disabled={!questionText.trim() || saving}
              className="btn-primary btn-block tap flex-1 disabled:opacity-40"
            >
              {saving ? "保存中…" : mode === "create" ? "创建题目" : "保存修改"}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {mode === "create"
              ? "创建后保存到本机 IndexedDB，立即进入复习题库；可随时在题库中编辑 / 隐藏。"
              : "修改仅保存在本机 IndexedDB 覆盖层，不影响内置种子；可随时在题库中「恢复」还原。"}
          </p>
        </div>
      </div>
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
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
    />
  );
}
function Textarea({ cls: _c, ...props }: any) {
  return (
    <textarea
      {...props}
      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
    />
  );
}
function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
