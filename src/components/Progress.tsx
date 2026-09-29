import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBank } from "../App";
import { DIRECTIONS, QUESTION_TYPES, directionMeta } from "../lib/constants";
import { getAllReviewRecords, getCustomQuestions } from "../lib/store";
import type { InterviewQuestion, ReviewRecord } from "../lib/types";

export default function Progress() {
  const { bank, custom } = useBank();
  const nav = useNavigate();
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [customList, setCustomList] = useState<InterviewQuestion[]>([]);

  useEffect(() => {
    getAllReviewRecords().then(setRecords);
    getCustomQuestions().then(setCustomList);
  }, [custom]);

  const known = records.filter((r) => r.status === "known").length;
  const uncertain = records.filter((r) => r.status === "uncertain").length;
  const unknown = records.filter((r) => r.status === "unknown").length;
  const wrong = records.filter((r) => r.status === "unknown" || r.status === "uncertain");

  const byDir = DIRECTIONS.map((d) => ({
    d,
    total: bank.filter((q) => q.direction === d.value).length,
    reviewed: records.filter((r) => bank.find((q) => q.id === r.questionId)?.direction === d.value).length,
  }));

  const exportCustom = () => {
    const blob = new Blob([JSON.stringify(customList, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-interview-questions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-xl font-bold text-white">学习统计</h1>

      <div className="card">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">自评分布</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat n={known} label="掌握" color="text-emerald-400" />
          <Stat n={uncertain} label="模糊" color="text-amber-400" />
          <Stat n={unknown} label="不会" color="text-rose-400" />
        </div>
      </div>

      <div className="card space-y-2">
        <h2 className="text-sm font-semibold text-slate-300">各方向覆盖</h2>
        {byDir.map(({ d, total, reviewed }) => (
          <div key={d.value} className="flex items-center gap-2 text-sm">
            <span style={{ color: d.color }}>{d.emoji} {d.short}</span>
            <span className="ml-auto text-slate-400">{reviewed}/{total} 已练</span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-sm border-t border-slate-700 pt-2">
          <span>题型分布</span>
          <span className="ml-auto text-slate-400">
            {QUESTION_TYPES.map((t) => `${t.label} ${bank.filter((q) => q.questionType === t.value).length}`).join(" · ")}
          </span>
        </div>
      </div>

      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-amber-300">薄弱 / 错题本（{wrong.length}）</h2>
        </div>
        {wrong.length === 0 ? (
          <p className="text-sm text-slate-500">还没有。把不会的题标「不会 / 加错题本」会自动进来。</p>
        ) : (
          <ul className="space-y-1">
            {wrong.map((r) => {
              const q = bank.find((x) => x.id === r.questionId);
              return q ? (
                <li key={r.questionId} className="truncate text-sm text-slate-300">
                  · {directionMeta(q.direction).short}｜{q.question}
                </li>
              ) : null;
            })}
          </ul>
        )}
      </div>

      <div className="card space-y-2">
        <h2 className="text-sm font-semibold text-slate-300">我的真题 / 自建题（{customList.length}）</h2>
        <button onClick={exportCustom} className="btn-ghost btn-block tap">⬇️ 导出我的题库 JSON</button>
        <p className="text-xs text-slate-500">导出后可用于备份或在其他设备导入（第二阶段能力）。</p>
      </div>

      <button onClick={() => nav("/setup")} className="btn-primary btn-block tap">开始新一轮复习</button>
    </div>
  );
}

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className="rounded-xl bg-slate-700/40 py-3">
      <div className={`text-2xl font-bold ${color}`}>{n}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
