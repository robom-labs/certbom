// 자격증봄 전역에서 공유하는 시험·일정·추천 도메인 타입을 정의한다.
export type ScheduleType = "round" | "rolling" | "announcement";
export type TimePrecision = "exact" | "conventional" | "date-only";
export type TrustLevel = "official-api" | "official-notice" | "manual-review" | "unverified";

export type ExamEventType =
  | "application-open"
  | "application-close"
  | "ticket"
  | "venue"
  | "exam"
  | "result"
  | "changed"
  | "cancelled";

export type ExamEvent = {
  id: string;
  examId: string;
  type: ExamEventType;
  title: string;
  startAt: string;
  endAt?: string;
  timePrecision: TimePrecision;
  officialSourceUrl: string;
  confirmed: boolean;
  regionCode?: string;
};

export type PreparationItem = {
  id: string;
  category: "identity" | "ticket" | "writing" | "calculator" | "tool" | "clothing" | "document" | "forbidden" | "arrival";
  label: string;
  detail: string;
  required: boolean;
  officialSourceUrl: string;
};

export type Exam = {
  id: string;
  slug: string;
  name: string;
  shortName?: string;
  organizer: string;
  category: string;
  goals: string[];
  description: string;
  officialUrl: string;
  applicationUrl?: string;
  scheduleType: ScheduleType;
  trustLevel: TrustLevel;
  lastVerifiedAt: string;
  timePrecision: TimePrecision;
  practical: boolean;
  eligibilityRestricted: boolean;
  duration: "short" | "medium" | "long";
  feeLabel?: string;
  caution: string;
  events: ExamEvent[];
  preparation: PreparationItem[];
};

export type RecommendationProfile = {
  goal: string;
  interest: string;
  duration: "short" | "medium" | "long";
  practicalPossible: boolean;
  eligibilityRestrictedAllowed: boolean;
};

export type RecommendationResult = {
  exam: Exam;
  score: number;
  reasons: string[];
  cautions: string[];
  ruleVersion: string;
};
