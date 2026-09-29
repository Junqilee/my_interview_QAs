import { openDB, type IDBPDatabase } from "idb";
import type {
  InterviewQuestion,
  PracticeSession,
  PracticeSettings,
  ReviewRecord,
  QuestionOverride,
} from "./types";

const DB_NAME = "interview-trainer";
const DB_VERSION = 2;

let dbp: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbp) {
    dbp = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("review_records"))
          db.createObjectStore("review_records", { keyPath: "questionId" });
        if (!db.objectStoreNames.contains("sessions"))
          db.createObjectStore("sessions", { keyPath: "id" });
        if (!db.objectStoreNames.contains("custom_questions"))
          db.createObjectStore("custom_questions", { keyPath: "id" });
        if (!db.objectStoreNames.contains("prefs"))
          db.createObjectStore("prefs", { keyPath: "key" });
        if (!db.objectStoreNames.contains("overrides"))
          db.createObjectStore("overrides", { keyPath: "id" });
      },
    });
  }
  return dbp;
}

// ---------- review records ----------
export async function putReviewRecord(rec: ReviewRecord) {
  const db = await getDB();
  await db.put("review_records", rec);
}
export async function getReviewRecord(id: string): Promise<ReviewRecord | undefined> {
  const db = await getDB();
  return db.get("review_records", id);
}
export async function getAllReviewRecords(): Promise<ReviewRecord[]> {
  const db = await getDB();
  return db.getAll("review_records");
}
export async function getWrongBook(): Promise<ReviewRecord[]> {
  const all = await getAllReviewRecords();
  return all.filter((r) => r.status === "unknown" || r.status === "uncertain");
}

// ---------- sessions (current practice) ----------
export async function saveSession(s: PracticeSession) {
  const db = await getDB();
  await db.put("sessions", s);
}
export async function getSession(id: string): Promise<PracticeSession | undefined> {
  const db = await getDB();
  return db.get("sessions", id);
}
export async function clearSession(id: string) {
  const db = await getDB();
  await db.delete("sessions", id);
}

// ---------- prefs ----------
export async function savePrefs(p: PracticeSettings) {
  const db = await getDB();
  await db.put("prefs", { key: "settings", value: p });
}
export async function getPrefs(): Promise<PracticeSettings | undefined> {
  const db = await getDB();
  const r = await db.get("prefs", "settings");
  return r?.value;
}

// ---------- custom (user-added real interviews) ----------
export async function addCustomQuestion(q: InterviewQuestion) {
  const db = await getDB();
  await db.put("custom_questions", q);
}
export async function getCustomQuestions(): Promise<InterviewQuestion[]> {
  const db = await getDB();
  return db.getAll("custom_questions");
}
export async function deleteCustomQuestion(id: string) {
  const db = await getDB();
  await db.delete("custom_questions", id);
}

// ---------- overrides (question-bank edit layer) ----------
export async function getOverrides(): Promise<Record<string, QuestionOverride>> {
  const db = await getDB();
  const all = await db.getAll("overrides");
  const map: Record<string, QuestionOverride> = {};
  for (const o of all) map[o.id] = o;
  return map;
}
export async function saveOverride(o: QuestionOverride) {
  const db = await getDB();
  await db.put("overrides", o);
}
export async function clearOverride(id: string) {
  const db = await getDB();
  await db.delete("overrides", id);
}
