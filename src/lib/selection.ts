import type { InterviewQuestion, PracticeSettings, QuestionType, ReviewRecord } from "./types";

export function filterBank(
  bank: InterviewQuestion[],
  settings: PracticeSettings
): InterviewQuestion[] {
  const types = new Set<QuestionType>(settings.types);
  if (!settings.includeRealInterview) types.delete("real_interview");

  return bank.filter((q) => {
    if (q.status !== "approved") return false;
    if (settings.direction !== "all" && q.direction !== settings.direction) return false;
    if (!types.has(q.questionType)) return false;
    if (q.difficulty < settings.difficultyMin || q.difficulty > settings.difficultyMax) return false;
    if (settings.tags.length > 0 && !settings.tags.some((t) => q.tags.includes(t))) return false;
    return true;
  });
}

function cmpOrderPath(a: string[], b: string[]): number {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] ?? "";
    const y = b[i] ?? "";
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildQueue(
  filtered: InterviewQuestion[],
  settings: PracticeSettings,
  reviewMap: Map<string, ReviewRecord>,
  recentIds: string[] = []
): string[] {
  if (filtered.length === 0) return [];

  if (settings.mode === "sequential") {
    const sorted = [...filtered].sort((a, b) => {
      const o = cmpOrderPath(a.orderPath, b.orderPath);
      if (o !== 0) return o;
      return a.difficulty - b.difficulty;
    });
    return sorted.slice(0, settings.count).map((q) => q.id);
  }

  // random
  let pool = [...filtered];
  const recent = new Set(recentIds);
  const weak = pool.filter((q) => {
    const r = reviewMap.get(q.id);
    return r && (r.status === "unknown" || r.status === "uncertain");
  });
  const normal = pool.filter((q) => !recent.has(q.id) && !weak.includes(q));
  const recentPool = pool.filter((q) => recent.has(q.id) && !weak.includes(q));

  let ordered: InterviewQuestion[];
  if (settings.priorityWrong && weak.length > 0) {
    ordered = [...shuffle(weak), ...shuffle(normal), ...shuffle(recentPool)];
  } else {
    ordered = [...shuffle(normal), ...shuffle(weak), ...shuffle(recentPool)];
  }
  return ordered.slice(0, settings.count).map((q) => q.id);
}

export function emptySettings(): PracticeSettings {
  return {
    direction: "all",
    types: ["project_drill", "theory", "scenario", "real_interview"],
    mode: "random",
    count: 10,
    priorityWrong: false,
    includeRealInterview: true,
    difficultyMin: 1,
    difficultyMax: 5,
    tags: [],
  };
}
