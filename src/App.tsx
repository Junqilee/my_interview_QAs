import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import type { InterviewQuestion, QuestionOverride } from "./lib/types";
import { seedBank } from "./data";
import {
  getCustomQuestions,
  getOverrides,
  saveOverride,
  clearOverride,
} from "./lib/store";
import { applyOverrides, overrideState } from "./lib/overrides";
import Home from "./components/Home";
import Setup from "./components/Setup";
import Session from "./components/Session";
import AddReal from "./components/AddReal";
import Browse from "./components/Browse";
import Progress from "./components/Progress";
import Import from "./components/Import";

interface BankCtx {
  bank: InterviewQuestion[];
  baseBank: InterviewQuestion[];
  custom: InterviewQuestion[];
  overrides: Record<string, QuestionOverride>;
  reloadAll: () => Promise<void>;
  reloadCustom: () => Promise<void>;
  getById: (id: string) => InterviewQuestion | undefined;
  saveQuestionOverride: (o: QuestionOverride) => Promise<void>;
  clearQuestionOverride: (id: string) => Promise<void>;
  overrideStateOf: (id: string) => "deleted" | "edited" | null;
}

const Ctx = createContext<BankCtx | null>(null);

export function useBank(): BankCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useBank must be used within BankProvider");
  return c;
}

function BankProvider({ children }: { children: ReactNode }) {
  const [custom, setCustom] = useState<InterviewQuestion[]>([]);
  const [overrides, setOverrides] = useState<Record<string, QuestionOverride>>({});

  const reloadAll = async () => {
    const [c, o] = await Promise.all([getCustomQuestions(), getOverrides()]);
    setCustom(c);
    setOverrides(o);
  };
  useEffect(() => {
    reloadAll();
  }, []);

  const baseBank = useMemo(() => [...seedBank, ...custom], [custom]);
  const bank = useMemo(() => applyOverrides(baseBank, overrides), [baseBank, overrides]);

  const saveQuestionOverride = async (o: QuestionOverride) => {
    await saveOverride(o);
    setOverrides((prev) => ({ ...prev, [o.id]: o }));
  };
  const clearQuestionOverride = async (id: string) => {
    await clearOverride(id);
    setOverrides((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
  };

  const getById = (id: string) => bank.find((q) => q.id === id);
  const overrideStateOf = (id: string) => overrideState(overrides[id]);

  return (
    <Ctx.Provider
      value={{
        bank,
        baseBank,
        custom,
        overrides,
        reloadAll,
        reloadCustom: reloadAll,
        getById,
        saveQuestionOverride,
        clearQuestionOverride,
        overrideStateOf,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

const NAV = [
  { to: "/", label: "首页", icon: "🏠" },
  { to: "/setup", label: "刷题", icon: "🎯" },
  { to: "/add", label: "新增", icon: "✍️" },
  { to: "/browse", label: "题库", icon: "📚" },
  { to: "/progress", label: "统计", icon: "📊" },
];

function NavBar() {
  const loc = useLocation();
  if (loc.pathname.startsWith("/session")) return null;
  return (
    <nav className="sticky bottom-0 z-20 flex border-t border-slate-700 bg-slate-900/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.to === "/"}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
              isActive ? "text-indigo-400" : "text-slate-400"
            }`
          }
        >
          <span className="text-lg leading-none">{n.icon}</span>
          {n.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function App() {
  return (
    <BankProvider>
      <div className="mx-auto flex min-h-full max-w-2xl flex-col">
        <main className="flex-1 px-4 pb-24 pt-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/session/:id" element={<Session />} />
            <Route path="/add" element={<AddReal />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/import" element={<Import />} />
            <Route path="/progress" element={<Progress />} />
          </Routes>
        </main>
        <NavBar />
      </div>
    </BankProvider>
  );
}
