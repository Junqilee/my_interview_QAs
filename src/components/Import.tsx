import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBank } from "../App";
import { DIRECTIONS, QUESTION_TYPES, directionMeta, typeMeta } from "../lib/constants";
import { addCustomQuestion } from "../lib/store";
import { parseMarkdownQuestions } from "../lib/mdImport";
import type { Direction, QuestionType, InterviewQuestion } from "../lib/types";

export default function Import() {
  const nav = useNavigate();
  const { bank, reloadAll } = useBank();
  const [direction, setDirection] = useState<Direction>("agent_llm_application");
  const [questionType, setQuestionType] = useState<QuestionType>("theory");
  const [tagInput, setTagInput] = useState("");
  const [preview, setPreview] = useState<InterviewQuestion[]>([]);
  const [imported, setImported] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const all: InterviewQuestion[] = [];
    const seen = new Set<string>();
    for (const f of Array.from(files)) {
      if (!f.name.toLowerCase().endsWith(".md")) continue;
      const text = await f.text();
      const label = f.name.replace(/\.md$/i, "");
      const tag = tagInput.trim() || label;
      const parsed = parseMarkdownQuestions(text, {
        direction,
        questionType,
        tag,
        sourceLabel: label,
        sourceFile: f.name,
      });
      for (const q of parsed) {
        if (seen.has(q.id)) continue;
        seen.add(q.id);
        all.push(q);
      }
    }
    setPreview(all);
    setImported(null);
  };

  const doImport = async () => {
    if (preview.length === 0) return;
    const existing = new Set(bank.map((q) => q.id));
    let added = 0;
    let skipped = 0;
    for (const q of preview) {
      if (existing.has(q.id)) {
        skipped++;
        continue;
      }
      await addCustomQuestion(q);
      added++;
    }
    await reloadAll();
    setImported(added);
    setPreview([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">批量导入 md</h1>
        <button onClick={() => nav("/browse")} className="text-sm text-slate-400">← 题库</button>
      </div>
      <p className="text-sm text-slate-400">
        上传一个或多个 Markdown 问答集（类似「供应链基础概念问答集」格式）。自动识别 <code>## Q1：</code> / <code>## 1. </code> 标题，
        抽关键词与一句话解释，逐题写入本机题库。
      </p>

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

      <Field label="标签（留空则用文件名）">
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          placeholder="如 供应链基础 / RAG"
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
        />
      </Field>

      <input
        ref={fileRef}
        type="file"
        accept=".md,text/markdown"
        multiple
        onChange={(e) => onFiles(e.target.files)}
        className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-white"
      />

      {preview.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-200">预览 {preview.length} 题</span>
            <button onClick={doImport} className="btn-primary tap px-4 py-1.5 text-sm">导入这 {preview.length} 题</button>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {preview.map((q) => (
              <div key={q.id} className="rounded-lg bg-slate-800/60 p-2">
                <div className="mb-0.5 flex flex-wrap gap-2 text-xs">
                  <span style={{ color: directionMeta(q.direction).color }}>{directionMeta(q.direction).short}</span>
                  <span className="text-slate-400">{typeMeta(q.questionType).label}</span>
                  {q.tags.map((t) => (
                    <span key={t} className="rounded bg-slate-700 px-1.5 text-slate-300">{t}</span>
                  ))}
                </div>
                <p className="text-sm text-slate-100">{q.question}</p>
                {q.keywords.length > 0 && (
                  <p className="mt-0.5 text-xs text-amber-300">🔑 {q.keywords.join(" / ")}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {imported !== null && (
        <div className="rounded-lg bg-emerald-900/40 p-3 text-sm text-emerald-300">
          ✅ 已导入 {imported} 题到本机题库。在「题库」可继续编辑 / 隐藏。
        </div>
      )}

      <p className="text-xs text-slate-500">
        提示：导入的题目保存在本机 IndexedDB（与内置种子分开），需换设备时请在「统计 → 导出我的题库 JSON」备份。
      </p>
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
