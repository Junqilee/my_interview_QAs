import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useBank } from "../App";
import { DIRECTIONS, QUESTION_TYPES, allTags } from "../lib/constants";
import { emptySettings, filterBank, buildQueue } from "../lib/selection";
import { getPrefs, savePrefs, saveSession, getAllReviewRecords } from "../lib/store";
import type { Direction, PracticeSession, PracticeSettings, QuestionType, RevealStage } from "../lib/types";

export default function Setup() {
  const { bank } = useBank();
  const nav = useNavigate();
  const loc = useLocation();
  const [s, setS] = useState<PracticeSettings>(emptySettings());

  useEffect(() => {
    getPrefs().then((p) => {
      const init = p ?? emptySettings();
      const st = loc.state as any;
      if (st?.direction) init.direction = st.direction as Direction;
      if (st?.mode) init.mode = st.mode as "random" | "sequential";
      const qt = sessionStorage.getItem("quickTag");
      if (qt) {
        init.tags = [qt];
        sessionStorage.removeItem("quickTag");
      }
      setS(init);
    });
  }, []);

  const toggleType = (t: QuestionType) => {
    setS((prev) => {
      const has = prev.types.includes(t);
      return { ...prev, types: has ? prev.types.filter((x) => x !== t) : [...prev.types, t] };
    });
  };

  const toggleTag = (t: string) => {
    setS((prev) => {
      const has = prev.tags.includes(t);
      return { ...prev, tags: has ? prev.tags.filter((x) => x !== t) : [...prev.tags, t] };
    });
  };

  const tagOptions = useMemo(() => allTags(bank, s.direction), [bank, s.direction]);

  const filtered = useMemo(() => filterBank(bank, s), [bank, s]);
  const filteredCount = filtered.length;

  const start = async () => {
    if (filteredCount === 0) return;
    const records = await getAllReviewRecords();
    const reviewMap = new Map(records.map((r) => [r.questionId, r]));
    const queue = buildQueue(filtered, s, reviewMap);
    const session: PracticeSession = {
      id: `s_${Date.now()}`,
      settings: s,
      queue,
      index: 0,
      stage: "question" as RevealStage,
      startedAt: new Date().toISOString(),
      ratedIds: [],
    };
    await savePrefs(s);
    await saveSession(session);
    nav(`/session/${session.id}`);
  };

  return (
    <div className="space-y-5">
      <h1 className="pt-2 text-xl font-bold text-white">复习设置</h1>

      <Section title="方向">
        <div className="flex flex-wrap gap-2">
          <Chip active={s.direction === "all"} onClick={() => setS({ ...s, direction: "all", tags: [] })}>
            全部
          </Chip>
          {DIRECTIONS.map((d) => (
            <Chip
              key={d.value}
              active={s.direction === d.value}
              onClick={() => setS({ ...s, direction: d.value, tags: [] })}
            >
              {d.emoji} {d.short}
            </Chip>
          ))}
        </div>
      </Section>

      {tagOptions.length > 0 && (
        <Section title={`知识点标签（可多选）${s.tags.length ? ` · 已选 ${s.tags.length}` : ""}`}>
          <div className="flex flex-wrap gap-2">
            <Chip active={s.tags.length === 0} onClick={() => setS({ ...s, tags: [] })}>
              不限标签
            </Chip>
            {tagOptions.map((t) => (
              <Chip key={t} active={s.tags.includes(t)} onClick={() => toggleTag(t)}>
                {t}
              </Chip>
            ))}
          </div>
        </Section>
      )}

      <Section title="问题类型（可多选）">
        <div className="flex flex-wrap gap-2">
          {QUESTION_TYPES.map((t) => (
            <Chip key={t.value} active={s.types.includes(t.value)} onClick={() => toggleType(t.value)}>
              {t.emoji} {t.label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="出题方式">
        <div className="flex gap-2">
          <Chip active={s.mode === "random"} onClick={() => setS({ ...s, mode: "random" })}>
            🎲 随机
          </Chip>
          <Chip active={s.mode === "sequential"} onClick={() => setS({ ...s, mode: "sequential" })}>
            📚 顺序（由浅入深）
          </Chip>
        </div>
      </Section>

      <Section title={`每次题数：${s.count}`}>
        <input
          type="range"
          min={1}
          max={50}
          value={s.count}
          onChange={(e) => setS({ ...s, count: Number(e.target.value) })}
          className="w-full accent-indigo-500"
        />
      </Section>

      <Section title="难度区间">
        <div className="flex items-center gap-3 text-sm">
          <select
            value={s.difficultyMin}
            onChange={(e) => setS({ ...s, difficultyMin: Math.min(Number(e.target.value), s.difficultyMax) })}
            className="rounded-lg bg-slate-700 px-2 py-1"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-slate-400">~</span>
          <select
            value={s.difficultyMax}
            onChange={(e) => setS({ ...s, difficultyMax: Math.max(Number(e.target.value), s.difficultyMin) })}
            className="rounded-lg bg-slate-700 px-2 py-1"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </Section>

      <Section title="其他选项">
        <label className="flex items-center justify-between py-1 text-sm">
          <span>优先出题本 / 薄弱题</span>
          <input
            type="checkbox"
            checked={s.priorityWrong}
            onChange={(e) => setS({ ...s, priorityWrong: e.target.checked })}
            className="h-5 w-5 accent-indigo-500"
          />
        </label>
        <label className="flex items-center justify-between py-1 text-sm">
          <span>包含面试真题</span>
          <input
            type="checkbox"
            checked={s.includeRealInterview}
            onChange={(e) => setS({ ...s, includeRealInterview: e.target.checked })}
            className="h-5 w-5 accent-indigo-500"
          />
        </label>
      </Section>

      <div className="card text-sm text-slate-400">
        当前筛选命中 <span className="font-semibold text-white">{filteredCount}</span> 道题
        {filteredCount === 0 && <span className="text-rose-400"> · 请放宽条件</span>}
      </div>

      <button onClick={start} disabled={filteredCount === 0} className="btn-primary btn-block tap">
        开始（{Math.min(s.count, filteredCount)} 题）
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="mb-2 text-sm font-semibold text-slate-200">{title}</div>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm transition ${
        active ? "bg-indigo-600 text-white" : "bg-slate-700/60 text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
