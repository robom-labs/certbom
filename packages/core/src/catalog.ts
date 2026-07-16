// 공식 일정 스냅샷을 앱에서 쓰는 시험 카탈로그와 탐색 도우미로 변환한다.
import { CATALOG_DATA_VERSION, CATALOG_UPDATED_AT, catalogSources, examSeeds } from "./catalog-data";
import type { Exam, ExamEvent, HomeSummaryFilter, PreparationItem } from "./model";

export { CATALOG_DATA_VERSION, CATALOG_UPDATED_AT, catalogSources };

const GENERIC_PREPARATION_VERSION = "general-v2";
export const UPCOMING_EXAM_HORIZON_DAYS = 14;

const genericPreparation = (examId: string, source: string, practical: boolean): PreparationItem[] => {
  const item = (
    id: string,
    category: PreparationItem["category"],
    label: string,
    detail: string,
    legacyIds: string[] = [],
  ): PreparationItem => ({
    id: `${examId}:${GENERIC_PREPARATION_VERSION}:${id}`,
    category,
    label,
    detail,
    required: false,
    officialSourceUrl: source,
    importance: "recommended",
    stage: "all",
    sourceVerified: false,
    sourceType: "general",
    sourceLabel: "일반 시험 준비 안내",
    lastVerifiedAt: CATALOG_UPDATED_AT,
    preparationVersion: GENERIC_PREPARATION_VERSION,
    legacyIds,
  });

  return [
    item(
      "identity-ready",
      "identity",
      "사진이 있는 신분증 챙기기",
      "인정되는 신분증 종류는 시험마다 달라요. 신분증을 먼저 챙기고 공식 응시요강의 인정 범위를 확인하세요.",
      [`${examId}-identity-check`, `${examId}:general-v1:official-check`],
    ),
    item(
      "ticket-check",
      "ticket",
      "수험표 발급·출력 여부 확인",
      "모바일 수험표 허용 여부와 출력 필요 여부가 시험마다 달라요. 공식 접수처에서 수험표 상태를 확인하세요.",
    ),
    item(
      "writing-check",
      "writing",
      "필기구 종류 확인하고 여분 챙기기",
      "검정 볼펜·연필·컴퓨터용 사인펜 등 허용 필기구가 다를 수 있어요. 공고 확인 뒤 여분 한 개를 함께 준비하세요.",
    ),
    ...(practical ? [item(
      "practical-tools-check",
      "tool",
      "실기 도구·재료 목록 다시 확인",
      "실기 종목은 회차별 지급 도구와 개인 지참 도구가 달라질 수 있어요. 시험 전날 최신 공개문제를 포함한 공식 목록을 대조하세요.",
    )] : []),
    item(
      "prohibited-check",
      "forbidden",
      "전자기기·반입 금지 물품 확인",
      "휴대전화·스마트워치·계산기 등 반입과 보관 규칙이 시험마다 달라요. 전원을 끄는 시점과 허용 기종을 공식 안내에서 확인하세요.",
    ),
    item(
      "arrival-check",
      "arrival",
      "시험장·입실 마감·이동 시간 확인",
      "시험장 주소와 입실 마감 시각을 확인하고 이동 시간에 여유를 두세요. 날짜만 확인된 시험에는 임의 시각을 만들지 않습니다.",
    ),
    item(
      "official-final-check",
      "other",
      "최신 공식 응시요강 최종 확인",
      "위 항목은 먼저 챙길 수 있는 일반 안내예요. 시험별 확정 준비물·복장·서류·도구는 공식 원문이 최종 기준입니다.",
    ),
  ];
};

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
      sourceType: item.sourceType ?? "official",
      sourceLabel: item.sourceLabel ?? seed.source.name,
      lastVerifiedAt: item.lastVerifiedAt ?? CATALOG_UPDATED_AT,
      preparationVersion,
      legacyIds: [
        ...(item.legacyIds ?? []),
        preserveId ? item.id : `${seed.id}-${item.id}`,
      ],
    })) ?? genericPreparation(seed.id, officialUrl, seed.practical),
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
