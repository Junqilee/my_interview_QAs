import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBank } from "../App";
import { DIRECTIONS, allTags } from "../lib/constants";
import { getAllReviewRecords, getCustomQuestions } from "../lib/store";
import type { InterviewQuestion, ReviewRecord } from "../lib/types";

export default function Home() {
  const { bank, custom } = useBank();
  const nav = useNavigate();
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [customList, setCustomList] = useState<InterviewQuestion[]>([]);

  useEffect(() => {
    getAllReviewRecords().then(setRecords);
    getCustomQuestions().then(setCustomList);
  }, [custom]);

  const weak = records.filter((r) => r.status === "unknown" || r.status === "uncertain");
  const realList = customList.filter((q) => q.questionType === "real_interview");
  const byDir = (d: string) => bank.filter((q) => q.direction === d).length;
  const quickTags = useMemo(() => allTags(bank), [bank]);

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <h1 className="text-2xl font-bold text-white">秋招模拟面试</h1>
        <p className="mt-1 text-sm text-slate-400">
          四方向 · 四题型 · 题目 → 关键词 → 完整回答，随时随地开刷
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {DIRECTIONS.map((d) => (
          <button
            key={d.value}
            onClick={() => nav("/setup", { state: { direction: d.value } })}
            className="card tap flex flex-col items-start text-left hover:border-indigo-500"
            style={{ borderLeft: `4px solid ${d.color}` }}
          >
            <span className="text-2xl">{d.emoji}</span>
            <span className="mt-1 text-sm font-semibold text-white">{d.short}</span>
            <span className="text-xs text-slate-400">{byDir(d.value)} 题</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => nav("/setup", { state: { mode: "random" } })} className="btn-primary tap">
          🎲 开始随机复习
        </button>
        <button onClick={() => nav("/setup", { state: { mode: "sequential" } })} className="btn-ghost tap">
          📚 开始顺序学习
        </button>
      </div>

      <div className="card">
        <h2 className="mb-2 text-sm font-semibold text-indigo-300">按知识点刷题</h2>
        <div className="flex flex-wrap gap-2">
          {quickTags.map((t) => (
            <button
              key={t}
              onClick={() => {
                sessionStorage.setItem("quickTag", t);
                nav("/setup");
              }}
              className="rounded-full bg-slate-700/60 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-indigo-600 hover:text-white"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">薄弱 / 错题</span>
          <span className="font-semibold text-amber-400">{weak.length}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-slate-400">题库总数</span>
          <span className="font-semibold text-white">{bank.length}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-slate-400">我的真题</span>
          <span className="font-semibold text-white">{realList.length}</span>
        </div>
      </div>

      {weak.length > 0 && (
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold text-amber-300">最近薄弱题</h2>
          <ul className="space-y-1">
            {weak.slice(0, 3).map((r) => {
              const q = bank.find((x) => x.id === r.questionId);
              return q ? (
                <li key={r.questionId} className="truncate text-sm text-slate-300">
                  · {q.question}
                </li>
              ) : null;
            })}
          </ul>
        </div>
      )}

      <div className="card">
        <h2 className="mb-2 text-sm font-semibold text-indigo-300">最近添加的面试真题</h2>
        {realList.length === 0 ? (
          <p className="text-sm text-slate-500">
            还没有。面完试把被问到的问题记下来 → 点底部「新增」✍️
          </p>
        ) : (
          <ul className="space-y-1">
            {realList
              .slice()
              .reverse()
              .slice(0, 3)
              .map((q) => (
                <li key={q.id} className="truncate text-sm text-slate-300">
                  · {q.question}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
