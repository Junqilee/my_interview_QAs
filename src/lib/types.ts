export type Direction =
  | "autonomous_driving_simulation"
  | "agent_llm_application"
  | "operations_optimization"
  | "supply_chain";

export type QuestionType =
  | "project_drill"
  | "theory"
  | "scenario"
  | "real_interview";

export type RevealStage = "question" | "keywords" | "answer";

export type Rating = "known" | "uncertain" | "unknown";

export type SourceType =
  | "project_note"
  | "knowledge_note"
  | "scenario_seed"
  | "real_interview";

export interface QuestionCode {
  language: string;
  content: string;
}

export interface QuestionSource {
  type: SourceType;
  file?: string;
  section?: string;
  interviewCompany?: string;
  interviewDate?: string;
}

export interface InterviewQuestion {
  id: string;
  direction: Direction;
  questionType: QuestionType;
  title?: string;
  question: string;
  keywords: string[];
  answer: string;
  explanation: string;
  code?: QuestionCode;
  followUps?: string[];
  parentQuestionId?: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  orderPath: string[];
  tags: string[];
  source: QuestionSource;
  status: "draft" | "approved" | "archived";
  version: number;
  updatedAt: string;
}

export interface QuestionOverride {
  id: string;
  deleted?: boolean;
  patch?: Partial<InterviewQuestion>;
  updatedAt: number;
}

export interface ReviewRecord {
  questionId: string;
  status?: Rating;
  rating?: "again" | "hard" | "good" | "easy";
  reviewCount: number;
  lastReviewedAt: string;
  nextReviewAt?: string;
  revealStage: RevealStage;
}

export interface PracticeSettings {
  direction: Direction | "all";
  types: QuestionType[];
  mode: "random" | "sequential";
  count: number;
  priorityWrong: boolean;
  includeRealInterview: boolean;
  difficultyMin: number;
  difficultyMax: number;
  tags: string[];
}

export interface PracticeSession {
  id: string;
  settings: PracticeSettings;
  queue: string[];
  index: number;
  stage: RevealStage;
  startedAt: string;
  ratedIds: string[];
}

/** 新建题目时的空白模板 */
export function blankQuestion(): InterviewQuestion {
  return {
    id: "new",
    direction: "agent_llm_application",
    questionType: "theory",
    question: "",
    keywords: [],
    answer: "",
    explanation: "",
    difficulty: 3,
    orderPath: [],
    tags: [],
    source: { type: "knowledge_note" },
    status: "draft",
    version: 1,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}
