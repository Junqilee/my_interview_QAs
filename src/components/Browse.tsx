import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBank } from "../App";
import { DIRECTIONS, QUESTION_TYPES, directionMeta, typeMeta, allTags, APP_BUILD } from "../lib/constants";
import { filterBank } from "../lib/filter";
import { overrideState } from "../lib/overrides";
import { addCustomQuestion } from "../lib/store";
import { blankQuestion } from "../lib/types";
import type { Direction, QuestionType, InterviewQuestion } from "../lib/types";
import EditQuestionModal from "./EditQuestionModal";

function chipCls(active: boolean) {
  return `rounded-full px-3 py-1.5 text-sm ${
    active ? "bg-indigo-600 text-white" : "bg-slate-700/60 text-slate-200"
  }`;
}

export default function Browse() {
  const { baseBank, overrides, saveQuestionOverride, clearQuestionOverride, reloadAll } = useBank();
  const nav = useNavigate();
  const [dir, setDir] = useState<Direction | "all">("all");
  const [type, setType] = useState<QuestionType | "all">("all");
  const [tag, setTag] = useState<string>("all");
  const [q, setQ] = useState("");
  const [onlyEdited, setOnlyEdited] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<InterviewQuestion | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useMemo(() => {
    const arr = filterBank(baseBank, { dir, type, tag, onlyEdited, q, overrides });
    // 按方向分组（智驾→Agent→运筹→供应链），组内保持原有顺序，浏览时更可预期
    const dirOrder = (d: Direction) => DIRECTIONS.findIndex((x) => x.value === d);
    return arr
      .map((q0, i) => ({ q0, i }))
      .sort((a, b) => dirOrder(a.q0.direction) - dirOrder(b.q0.direction) || a.i - b.i)
      .map((x) => x.q0);
  }, [baseBank, dir, type, tag, q, onlyEdited, overrides]);

  const tagOptions = useMemo(() => allTags(baseBank, dir), [baseBank, dir]);

  const onDelete = async (id: string) => {
    if (!confirm("确定隐藏这道题？（仍可在题库中恢复）")) return;
    await saveQuestionOverride({ id, deleted: true, updatedAt: Date.now() });
  };

  // 彻底清掉可能卡住的旧版缓存：注销 Service Worker + 清空 Cache Storage + 硬刷新。
  // 出现"筛选/列表不随操作更新"时，通常是设备上残留旧版 PWA 缓存，点此即可恢复。
  const forceRefresh = async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {
      /* 忽略：非 PWA 环境 */
    }
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {
      /* 忽略 */
    }
    window.location.reload(true);
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-white">题库浏览 / 编辑</h1>
        <div className="flex gap-2">
          <button onClick={() => setCreating(true)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white">
            ＋ 新题
          </button>
          <button onClick={() => nav("/import")} className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-100">
            📥 导入 md
          </button>
        </div>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索问题…"
        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
      />
      <div className="flex flex-wrap gap-2">
        <button className={chipCls(dir === "all")} onClick={() => setDir("all")}>全部</button>
        {DIRECTIONS.map((d) => (
          <button key={d.value} className={chipCls(dir === d.value)} onClick={() => setDir(d.value)}>
            {d.emoji} {d.short}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className={chipCls(type === "all")} onClick={() => setType("all")}>全部</button>
        {QUESTION_TYPES.map((t) => (
          <button key={t.value} className={chipCls(type === t.value)} onClick={() => setType(t.value)}>
            {t.emoji} {t.label}
          </button>
        ))}
        <button className={chipCls(onlyEdited)} onClick={() => setOnlyEdited((v) => !v)}>仅显示已编辑</button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">标签</span>
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="flex-1 rounded-lg bg-slate-700 px-2 py-1 text-sm text-slate-100"
        >
          <option value="all">全部标签</option>
          {tagOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {(dir !== "all" || type !== "all" || tag !== "all") && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
          <span>已筛选：</span>
          {dir !== "all" && <span className="chip bg-indigo-900/40 text-indigo-200">{directionMeta(dir as Direction).short}</span>}
          {type !== "all" && <span className="chip bg-indigo-900/40 text-indigo-200">{typeMeta(type as QuestionType).label}</span>}
          {tag !== "all" && <span className="chip bg-indigo-900/40 text-indigo-200">{tag}</span>}
        </div>
      )}
      <p className="text-xs text-slate-500">
        {list.length} 道题 · 内置题可直接改 / 隐藏（存本机覆盖层，可随时恢复）· build {APP_BUILD}
      </p>
      <button
        onClick={forceRefresh}
        className="text-xs text-slate-400 underline decoration-dotted hover:text-indigo-300"
      >
        🧹 强制刷新（清缓存）— 筛选/列表异常时点这里
      </button>

      <div className="space-y-2">
        {list.map((item) => {
          const isOpen = open === item.id;
          const dm = directionMeta(item.direction);
          const tm = typeMeta(item.questionType);
          const st = overrideState(overrides[item.id]);
          return (
            <div key={item.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => setOpen(isOpen ? null : item.id)} className="flex-1 text-left">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="chip bg-slate-700/60" style={{ color: dm.color }}>{dm.short}</span>
                    <span className="chip bg-slate-700/60 text-slate-200">{tm.label}</span>
                    {st === "edited" && <span className="chip bg-amber-900/40 text-amber-200">已编辑</span>}
                    {st === "deleted" && <span className="chip bg-rose-900/40 text-rose-200">已隐藏</span>}
                  </div>
                  <p className="text-[15px] text-slate-100">{item.question}</p>
                </button>
                <div className="flex shrink-0 flex-col gap-1">
                  <button onClick={() => setEditing(item)} className="rounded-md bg-slate-700 px-2 py-1 text-xs text-slate-100">
                    编辑
                  </button>
                  {st === "deleted" ? (
                    <button
                      onClick={() => clearQuestionOverride(item.id)}
                      className="rounded-md bg-emerald-700 px-2 py-1 text-xs text-white"
                    >
                      恢复
                    </button>
                  ) : (
                    <button
                      onClick={() => onDelete(item.id)}
                      className="rounded-md bg-rose-700/80 px-2 py-1 text-xs text-white"
                    >
                      隐藏
                    </button>
                  )}
                </div>
              </div>
              {isOpen && (
                <div className="mt-3 space-y-2 border-t border-slate-700 pt-3">
                  <div className="flex flex-wrap gap-1">
                    {item.keywords.map((k, i) => (
                      <span key={i} className="chip bg-amber-900/40 text-amber-200">{k}</span>
                    ))}
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-100">{item.answer}</p>
                  {item.explanation && (
                    <p className="whitespace-pre-wrap text-sm text-slate-300">💡 {item.explanation}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <EditQuestionModal
          question={editing}
          onClose={() => setEditing(null)}
          onSave={saveQuestionOverride}
        />
      )}

      {creating && (
        <EditQuestionModal
          mode="create"
          question={blankQuestion()}
          onClose={() => setCreating(false)}
          onCreate={async (q) => {
            await addCustomQuestion(q);
            await reloadAll();
          }}
        />
      )}
    </div>
  );
}
