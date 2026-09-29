import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBank } from "../App";
import { directionMeta, typeMeta } from "../lib/constants";
import { getSession, saveSession, putReviewRecord, getReviewRecord } from "../lib/store";
import type { InterviewQuestion, PracticeSession, Rating, RevealStage, ReviewRecord } from "../lib/types";

type RateVal = "known" | "uncertain" | "unknown" | "wrongbook";

export default function Session() {
  const { id } = useParams();
  const nav = useNavigate();
  const { getById } = useBank();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    getSession(id).then((s) => {
      setSession(s ?? null);
      setLoaded(true);
    });
  }, [id]);

  const q: InterviewQuestion | undefined = useMemo(
    () => (session ? getById(session.queue[session.index]) : undefined),
    [session, getById]
  );

  const total = session?.queue.length ?? 0;
  const idx = session?.index ?? 0;
  const stage = session?.stage ?? "question";
  const done = !!session && idx >= total;

  const persist = (s: PracticeSession) => {
    setSession(s);
    saveSession(s);
  };

  const advanceStage = () => {
    if (!session || !q) return;
    const next: RevealStage = stage === "question" ? "keywords" : "answer";
    persist({ ...session, stage: next });
  };

  const rate = async (val: RateVal) => {
    if (!session || !q) return;
    const ratingMap: Record<RateVal, Rating> = {
      known: "known",
      uncertain: "uncertain",
      unknown: "unknown",
      wrongbook: "unknown",
    };
    const prev = await getReviewRecord(q.id);
    const rec: ReviewRecord = {
      questionId: q.id,
      status: ratingMap[val],
      reviewCount: (prev?.reviewCount ?? 0) + 1,
      lastReviewedAt: new Date().toISOString(),
      revealStage: "answer",
    };
    await putReviewRecord(rec);
    const ratedIds = [...session.ratedIds, q.id];
    const nextIndex = idx + 1;
    persist({
      ...session,
      index: nextIndex,
      stage: "question",
      ratedIds,
    });
  };

  const jump = (delta: number) => {
    if (!session) return;
    const ni = Math.max(0, Math.min(total - 1, idx + delta));
    persist({ ...session, index: ni, stage: "question" });
  };

  // keyboard
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (stage !== "answer") advanceStage();
      } else if (e.key.toLowerCase() === "n") {
        if (session) persist({ ...session, index: Math.min(total - 1, idx + 1), stage: "question" });
      } else if (["1", "2", "3", "4"].includes(e.key) && stage === "answer") {
        const map: Record<string, RateVal> = { "1": "known", "2": "uncertain", "3": "unknown", "4": "wrongbook" };
        rate(map[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, session, q, idx, total, done]);

  if (!loaded) return <div className="pt-10 text-center text-slate-400">加载中…</div>;
  if (!session) return <div className="pt-10 text-center text-slate-400">会话不存在，<button className="text-indigo-400 underline" onClick={() => nav("/")}>返回首页</button></div>;

  if (done) {
    const known = session.ratedIds.length;
    return (
      <div className="space-y-4 pt-10 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="text-xl font-bold text-white">本轮完成</h1>
        <p className="text-slate-400">共复习 {total} 题，已自评 {known} 题</p>
        <div className="card">
          <p className="text-sm text-slate-300">
            薄弱 / 不会的题已记入错题本，下次开启「优先薄弱题」即可重点练。
          </p>
        </div>
        <button className="btn-primary btn-block tap" onClick={() => nav("/setup")}>
          再来一轮
        </button>
        <button className="btn-ghost btn-block tap" onClick={() => nav("/")}>
          返回首页
        </button>
      </div>
    );
  }

  if (!q) return <div className="pt-10 text-center text-slate-400">题目缺失</div>;

  const dm = directionMeta(q.direction);
  const tm = typeMeta(q.questionType);

  return (
    <div className="space-y-3 pt-1">
      {/* progress */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span style={{ color: dm.color }}>{dm.emoji} {dm.short}</span>
        <span className="chip bg-slate-700/60 text-slate-200">{tm.emoji} {tm.label}</span>
        <span className="ml-auto">第 {idx + 1} / {total} 题</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-700">
        <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${((idx) / total) * 100}%` }} />
      </div>

      {/* question card (tappable to reveal) */}
      <div
        onClick={stage !== "answer" ? advanceStage : undefined}
        className="card min-h-[140px] cursor-pointer select-none active:scale-[0.99]"
        style={{ borderTop: `3px solid ${dm.color}` }}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs text-slate-500">难度 {"★".repeat(q.difficulty)}{"☆".repeat(5 - q.difficulty)}</span>
          {q.source.interviewCompany && (
            <span className="chip bg-rose-900/50 text-rose-300">🎯 {q.source.interviewCompany}</span>
          )}
        </div>
        <p className="text-lg font-medium leading-relaxed text-white">{q.question}</p>

        {stage === "question" && (
          <p className="mt-4 text-center text-sm text-indigo-300">👆 点击卡片 / 按空格 看「关键词」</p>
        )}
      </div>

      {/* keywords */}
      {stage !== "question" && (
        <div className="card" style={{ borderTop: "3px solid #f59e0b" }}>
          <div className="mb-2 text-sm font-semibold text-amber-300">🔑 关键词（先回忆，再看答案）</div>
          <div className="flex flex-wrap gap-2">
            {q.keywords.map((k, i) => (
              <span key={i} className="chip bg-amber-900/40 text-amber-200">
                {k}
              </span>
            ))}
          </div>
          {stage === "keywords" && (
            <button onClick={advanceStage} className="btn-ghost btn-block tap mt-4">
              📖 查看完整回答 + 解释
            </button>
          )}
        </div>
      )}

      {/* answer */}
      {stage === "answer" && (
        <div className="space-y-3">
          <div className="card" style={{ borderTop: "3px solid #10b981" }}>
            <div className="mb-2 text-sm font-semibold text-emerald-300">✅ 完整回答</div>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-100">{q.answer}</p>
          </div>

          {q.explanation && (
            <div className="card" style={{ borderTop: "3px solid #38bdf8" }}>
              <div className="mb-2 text-sm font-semibold text-sky-300">💡 解释 / 思路</div>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-200">{q.explanation}</p>
            </div>
          )}

          {q.code && (
            <div className="card" style={{ borderTop: "3px solid #a855f7" }}>
              <div className="mb-2 text-sm font-semibold text-purple-300">💻 代码（{q.code.language}）</div>
              <pre className="code-block">{q.code.content}</pre>
            </div>
          )}

          {q.followUps && q.followUps.length > 0 && (
            <div className="card" style={{ borderTop: "3px solid #fb7185" }}>
              <div className="mb-2 text-sm font-semibold text-rose-300">🔥 渐进追问（含答案与解释）</div>
              <ul className="space-y-2 pl-1 text-[14px] text-slate-200">
                {q.followUps.map((f, i) => (
                  <li key={i} className="whitespace-pre-wrap border-l-2 border-rose-700/50 pl-3">
                    {f
                      .replace(/(答[：:])/g, "\n▸ $1")
                      .replace(/(解释[：:])/g, "\n↳ $1")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {q.source.file && (
            <p className="px-1 text-xs text-slate-500">来源：{q.source.file}{q.source.section ? ` · ${q.source.section}` : ""}</p>
          )}

          {/* rating */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => rate("known")} className="btn bg-emerald-700/70 text-white tap">✅ 掌握 (1)</button>
            <button onClick={() => rate("uncertain")} className="btn bg-amber-700/70 text-white tap">🟡 模糊 (2)</button>
            <button onClick={() => rate("unknown")} className="btn bg-rose-800/70 text-white tap">❌ 不会 (3)</button>
            <button onClick={() => rate("wrongbook")} className="btn bg-slate-700 text-white tap">📌 加错题本 (4)</button>
          </div>
          <p className="text-center text-xs text-slate-500">快捷键：空格展开 · N 下一题 · 1/2/3/4 自评</p>
        </div>
      )}

      {/* prev/next */}
      <div className="flex gap-2">
        <button onClick={() => jump(-1)} disabled={idx === 0} className="btn-ghost flex-1 tap disabled:opacity-40">
          ← 上一张
        </button>
        <button onClick={() => jump(1)} className="btn-ghost flex-1 tap">
          下一张 →
        </button>
      </div>
    </div>
  );
}
