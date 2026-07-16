// 공식 일정 스냅샷을 앱에서 쓰는 시험 카탈로그와 탐색 도우미로 변환한다.
import { CATALOG_DATA_VERSION, CATALOG_UPDATED_AT, catalogSources, examSeeds } from "./catalog-data";
import type { Exam, ExamEvent, HomeSummaryFilter, PreparationItem } from "./model";

export { CATALOG_DATA_VERSION, CATALOG_UPDATED_AT, catalogSources };

const GENERIC_PREPARATION_VERSION = "general-v1";
export const UPCOMING_EXAM_HORIZON_DAYS = 14;

const genericPreparation = (examId: string, source: string): PreparationItem[] => [
  {
    id: `${examId}:${GENERIC_PREPARATION_VERSION}:official-check`,
    category: "other",
    label: "공식 세부 준비물 확인",
    detail: "이 시험은 아직 항목별 공식 준비물을 구조화하지 않았어요. 최신 응시요강에서 신분증·수험표·필기구·반입 금지 물품을 확인하세요.",
    required: true,
    officialSourceUrl: source,
    importance: "required",
    stage: "all",
    sourceVerified: false,
    lastVerifiedAt: CATALOG_UPDATED_AT,
    preparationVersion: GENERIC_PREPARATION_VERSION,
    legacyIds: [`${examId}-identity-check`],
  },
];

export const exams: Exam[] = examSeeds.map((seed) => {
  const officialUrl = seed.source.officialUrl;
  const preparationVersion = seed.preparationVersion ?? (seed.preparation ? `${seed.id}-v1` : GENERIC_PREPARATION_VERSION);
  return {
    id: seed.id,
    slug: seed.id,
    name: seed.name,
    shortName: seed.shortName,
    aliases: seed.aliases,
    organizer: seed.organizer,
    category: seed.category,
    sourceId: seed.source.id,
    sourceName: seed.source.name,
    goals: seed.goals,
    description: seed.description,
    officialUrl,
    applicationUrl: seed.source.applicationUrl,
    scheduleType: seed.scheduleType,
    trustLevel: seed.source.trustLevel,
    lastVerifiedAt: CATALOG_UPDATED_AT,
    timePrecision: seed.timePrecision,
    practical: seed.practical,
    eligibilityRestricted: seed.eligibilityRestricted,
    duration: seed.duration,
    feeLabel: seed.feeLabel,
    caution: seed.caution,
    events: seed.events.map((event) => ({
      ...event,
      id: `${seed.id}-${event.id}`,
      examId: seed.id,
      officialSourceUrl: event.officialSourceUrl ?? officialUrl,
      confirmed: true,
    })),
    preparation: seed.preparation?.map(({ preserveId, ...item }) => ({
      ...item,
      id: `${seed.id}:${preparationVersion}:${item.id}`,
      officialSourceUrl: item.officialSourceUrl ?? officialUrl,
      importance: item.importance ?? (item.required ? "required" : "recommended"),
      stage: item.stage ?? "all",
      sourceVerified: item.sourceVerified ?? true,
      lastVerifiedAt: item.lastVerifiedAt ?? CATALOG_UPDATED_AT,
      preparationVersion,
      legacyIds: [
        ...(item.legacyIds ?? []),
        preserveId ? item.id : `${seed.id}-${item.id}`,
      ],
    })) ?? genericPreparation(seed.id, officialUrl),
    preparationVersion,
  };
});

export const catalogStats = {
  examCount: exams.length,
  sourceCount: new Set(exams.map((exam) => exam.sourceId)).size,
  scheduledExamCount: exams.filter((exam) => exam.events.length > 0).length,
  eventCount: exams.reduce((sum, exam) => sum + exam.events.length, 0),
};

export function getExam(id: string) {
  return exams.find((exam) => exam.id === id);
}

function dateOnlyEnd(value: string) {
  const date = value.slice(0, 10);
  return new Date(`${date}T23:59:59+09:00`).getTime();
}

export function eventRelevantUntil(event: ExamEvent) {
  if (event.timePrecision === "date-only") return dateOnlyEnd(event.endAt ?? event.startAt);
  if (event.endAt) return new Date(event.endAt).getTime();
  return new Date(event.startAt).getTime();
}

export function getNextEvent(exam: Exam, now = new Date()) {
  return exam.events
    .filter((event) => eventRelevantUntil(event) >= now.getTime())
    .sort((a, b) => {
      const aStart = new Date(a.startAt).getTime();
      const bStart = new Date(b.startAt).getTime();
      const aActive = aStart <= now.getTime();
      const bActive = bStart <= now.getTime();
      if (aActive !== bActive) return aActive ? -1 : 1;
      return aStart - bStart;
    })[0];
}

export function getUpcomingEvents(now = new Date()) {
  return exams
    .flatMap((exam) => exam.events.map((event) => ({ exam, event })))
    .filter(({ event }) => eventRelevantUntil(event) >= now.getTime())
    .sort((a, b) => {
      const aStart = new Date(a.event.startAt).getTime();
      const bStart = new Date(b.event.startAt).getTime();
      const aActive = aStart <= now.getTime();
      const bActive = bStart <= now.getTime();
      if (aActive !== bActive) return aActive ? -1 : 1;
      return aStart - bStart;
    });
}

export function getUpcomingEventGroups(now = new Date()) {
  const groups = new Map<string, { exam: Exam; event: ExamEvent; exams: Exam[] }>();
  for (const { exam, event } of getUpcomingEvents(now)) {
    const key = event.groupKey ?? event.id;
    const current = groups.get(key);
    if (current) {
      current.exams.push(exam);
    } else {
      groups.set(key, { exam, event, exams: [exam] });
    }
  }
  return [...groups.values()];
}

export function isApplicationOpen(exam: Exam, now = new Date()) {
  return exam.events.some((event) => {
    if (event.type !== "application-open") return false;
    return new Date(event.startAt).getTime() <= now.getTime() && eventRelevantUntil(event) >= now.getTime();
  });
}

export function isApplicationUpcoming(exam: Exam, now = new Date(), horizonDays = UPCOMING_EXAM_HORIZON_DAYS) {
  const limit = now.getTime() + horizonDays * 24 * 60 * 60 * 1_000;
  return exam.events.some((event) => {
    if (event.type !== "application-open") return false;
    const start = new Date(event.startAt).getTime();
    return start > now.getTime() && start <= limit;
  });
}

export function isExamUpcoming(exam: Exam, now = new Date(), horizonDays = UPCOMING_EXAM_HORIZON_DAYS) {
  const limit = now.getTime() + horizonDays * 24 * 60 * 60 * 1_000;
  return exam.events.some((event) => {
    if (event.type !== "exam") return false;
    const start = new Date(event.startAt).getTime();
    return start <= limit && eventRelevantUntil(event) >= now.getTime();
  });
}

export function getHomeSummaryExams(filter: HomeSummaryFilter, now = new Date()) {
  const filtered = exams.filter((exam) => {
    if (filter === "open") return isApplicationOpen(exam, now);
    if (filter === "upcoming") return isExamUpcoming(exam, now);
    return true;
  });

  return filtered.sort((a, b) => {
    const aEvent = getNextEvent(a, now);
    const bEvent = getNextEvent(b, now);
    if (aEvent && bEvent) return new Date(aEvent.startAt).getTime() - new Date(bEvent.startAt).getTime();
    if (aEvent) return -1;
    if (bEvent) return 1;
    return a.name.localeCompare(b.name, "ko");
  });
}

export function migratePreparationIds(ids: string[]) {
  const currentIds = new Set(exams.flatMap((exam) => exam.preparation.map((item) => item.id)));
  const legacyToCurrent = new Map(
    exams.flatMap((exam) => exam.preparation.flatMap((item) => item.legacyIds.map((legacyId) => [legacyId, item.id] as const))),
  );
  return [...new Set(ids.flatMap((id) => {
    if (currentIds.has(id)) return [id];
    const migrated = legacyToCurrent.get(id);
    return migrated ? [migrated] : [];
  }))];
}
