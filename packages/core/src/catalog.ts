// 공식 일정 스냅샷을 앱에서 쓰는 시험 카탈로그와 탐색 도우미로 변환한다.
import { CATALOG_DATA_VERSION, CATALOG_UPDATED_AT, catalogSources, examSeeds } from "./catalog-data";
import type { Exam, ExamEvent, PreparationItem } from "./model";

export { CATALOG_DATA_VERSION, CATALOG_UPDATED_AT, catalogSources };

const genericPreparation = (examId: string, source: string): PreparationItem[] => [
  {
    id: `${examId}-identity-check`,
    category: "identity",
    label: "공식 신분증·준비물 기준 확인",
    detail: "시험별 인정 신분증과 반입 가능 물품을 최신 응시요강에서 확인하세요.",
    required: true,
    officialSourceUrl: source,
  },
];

export const exams: Exam[] = examSeeds.map((seed) => {
  const officialUrl = seed.source.officialUrl;
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
      id: preserveId ? item.id : `${seed.id}-${item.id}`,
      officialSourceUrl: item.officialSourceUrl ?? officialUrl,
    })) ?? genericPreparation(seed.id, officialUrl),
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
