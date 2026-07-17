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

// 출처 계열별로 공식 규정을 웹에서 직접 확인한 준비물 기준선(2026-07-17).
// - Q-Net 원서접수 유의사항(신분증 미지참 시 당해 시험 정지·무효, 전자·통신기기 소지·착용만으로 무효):
//   https://www.q-net.or.kr/rcv002.do?id=rcv002_baseInfo&gSite=Q&gId=
// - Q-Net 공학용계산기 허용군·초기화 규정: https://q-net.or.kr/rcv002.do?gId=&gSite=Q&id=rcv002_calculator
// - Q-Net 수험자 지참 준비물 조회(실기 종목별): https://www.q-net.or.kr/rcv013.do?id=rcv01312&gSite=Q&gId=
// - 데이터자격검정 응시자 유의사항(신분증, 검정색 사인펜·볼펜, 전자기기 소지·착용만으로 무효):
//   https://dataq.or.kr/www/accept/warning.do
// - 대한상공회의소 시험 안내(신분증·수험표 미지참 시 응시 불가): https://license.korcham.net/ex/examInfo1.do
// - 한국생산성본부(KPC) 수험자 유의사항(신분증+수험표 필수, 미지참 시 응시 불가·환불 불가, 대학생 학생증 불인정, 사진 부착 수험표):
//   https://license.kpc.or.kr/nasec/cstmrcnter/useinfo/selectExnstnotice.do
// - 한국공인회계사회 AT자격시험 준비물·유효 신분증(신분증·수험표·필기구·일반계산기, 부정행위 시 2년 정지):
//   https://at.kicpa.or.kr/home/help/help02001v.jsp?bbs_sno=600
const SOURCE_PREPARATION_VERSION = "source-official-v1";
const QNET_CALCULATOR_URL = "https://q-net.or.kr/rcv002.do?gId=&gSite=Q&id=rcv002_calculator";
const QNET_ITEMS_URL = "https://www.q-net.or.kr/rcv013.do?id=rcv01312&gSite=Q&gId=";
const KDATA_WARNING_URL = "https://dataq.or.kr/www/accept/warning.do";
const KORCHAM_INFO_URL = "https://license.korcham.net/ex/examInfo1.do";
const KPC_NOTICE_URL = "https://license.kpc.or.kr/nasec/cstmrcnter/useinfo/selectExnstnotice.do";
const AT_ITEMS_URL = "https://at.kicpa.or.kr/home/help/help02001v.jsp?bbs_sno=600";

type SourceFamily = "qnet" | "kdata" | "korcham" | "kpc" | "at";

const SOURCE_FAMILY_BY_ID: Record<string, SourceFamily> = {
  "qnet-technical-plan-2026": "qnet",
  "qnet-professional-calendar-2026": "qnet",
  "kdata-calendar-2026": "kdata",
  "korcham-calendar-2026": "korcham",
  "kpc-current-registration-2026": "kpc",
  "at-calendar-2026": "at",
};

type PrepDraft = {
  id: string;
  category: PreparationItem["category"];
  label: string;
  detail: string;
  importance: PreparationItem["importance"];
  stage?: PreparationItem["stage"];
  sourceUrl: string;
  // 이전 general-v2 체크리스트에서 대응되는 항목 id(사용자 체크 이전 보존용)
  legacyOf?: string;
};

function sourcePreparation(examId: string, family: SourceFamily, officialUrl: string, practical: boolean): PreparationItem[] {
  const sourceLabelByFamily: Record<SourceFamily, string> = {
    qnet: "Q-Net 원서접수 유의사항",
    kdata: "데이터자격검정 응시자 유의사항",
    korcham: "대한상공회의소 시험 안내",
    kpc: "KPC 수험자 유의사항",
    at: "AT자격시험 준비물 안내",
  };
  const drafts: PrepDraft[] = [];
  if (family === "qnet") {
    drafts.push(
      { id: "identity", category: "identity", label: "공단 인정 신분증", detail: "미지참 시 당해 시험이 정지(퇴실)·무효 처리돼요. 인정 신분증 범위를 원서접수 유의사항에서 확인하세요.", importance: "required", sourceUrl: officialUrl, legacyOf: "identity-ready" },
      { id: "ticket", category: "ticket", label: "수험표", detail: "Q-Net에서 출력해 지참하세요. 시험 일시·장소·입실 시각이 적혀 있어요.", importance: "required", sourceUrl: officialUrl, legacyOf: "ticket-check" },
      { id: "black-pen", category: "writing", label: "흑색 볼펜류 필기구", detail: "답안·서명 작성용으로 준비하세요. 여분 한 개를 함께 챙기면 좋아요.", importance: "required", sourceUrl: officialUrl, legacyOf: "writing-check" },
      { id: "calculator", category: "calculator", label: "공학용 계산기(허용군 기종만)", detail: "계산기가 필요한 종목은 허용군 기종만 초기화(리셋) 후 쓸 수 있어요. 직접 초기화가 안 되는 기종은 사용 불가라 허용 목록을 꼭 확인하세요.", importance: "recommended", sourceUrl: QNET_CALCULATOR_URL },
      { id: "prohibited", category: "forbidden", label: "전자·통신기기 반입 금지", detail: "휴대전화·스마트워치 등은 사용하지 않아도 소지·착용만으로 당해 시험이 정지·무효 처리돼요.", importance: "forbidden", sourceUrl: officialUrl, legacyOf: "prohibited-check" },
    );
    if (practical) {
      drafts.push({ id: "practical-tools", category: "tool", label: "실기 종목별 지참 준비물", detail: "실기 지참물은 종목·회차마다 달라요. Q-Net 수험자 지참 준비물 조회에서 종목명으로 확인하세요.", importance: "required", stage: "practical", sourceUrl: QNET_ITEMS_URL, legacyOf: "practical-tools-check" });
    }
  } else if (family === "kdata") {
    drafts.push(
      { id: "identity", category: "identity", label: "규정 신분증", detail: "규정 신분증이 없으면 응시할 수 없어요. 인정 범위를 응시자 유의사항에서 확인하세요.", importance: "required", sourceUrl: KDATA_WARNING_URL, legacyOf: "identity-ready" },
      { id: "ticket", category: "ticket", label: "수험표", detail: "시험 중에는 수험표를 포함한 소지품을 가방에 넣거나 책상 아래에 두어야 해요.", importance: "required", sourceUrl: KDATA_WARNING_URL, legacyOf: "ticket-check" },
      { id: "black-pen", category: "writing", label: "검정색 컴퓨터용 사인펜·검정 볼펜", detail: "필기 답안은 검정색만 인정돼요. 연필·유색펜은 판독 불가 시 0점 처리될 수 있어요. (실기는 필기구도 책상 위에 둘 수 없어요)", importance: "required", sourceUrl: KDATA_WARNING_URL, legacyOf: "writing-check" },
      { id: "prohibited", category: "forbidden", label: "전자·통신기기 반입 금지", detail: "휴대전화·스마트워치 등은 사용 여부와 관계없이 소지·착용만으로 해당 시험이 중지·무효 처리돼요.", importance: "forbidden", sourceUrl: KDATA_WARNING_URL, legacyOf: "prohibited-check" },
    );
  } else if (family === "kpc") {
    drafts.push(
      { id: "identity", category: "identity", label: "규정 신분증(원본)", detail: "주민등록증·운전면허증·여권·공무원증·청소년증 등 원본만 인정돼요. 대학생 학생증은 인정 안 되고, 미지참 시 응시·환불이 안 되니 꼭 챙기세요.", importance: "required", sourceUrl: KPC_NOTICE_URL, legacyOf: "identity-ready" },
      { id: "ticket", category: "ticket", label: "사진이 부착된 수험표", detail: "사진이 등록·출력된 수험표여야 해요. 사진 미등록·미부착이면 응시할 수 없어요.", importance: "required", sourceUrl: KPC_NOTICE_URL, legacyOf: "ticket-check" },
    );
  } else if (family === "at") {
    drafts.push(
      { id: "identity", category: "identity", label: "유효한 신분증", detail: "주민등록증·운전면허증·여권·청소년증·고교 학생증·공무원증 등이 인정돼요. 대면·비대면에 따라 인정 범위가 조금 달라 준비물 안내에서 확인하세요.", importance: "required", sourceUrl: AT_ITEMS_URL, legacyOf: "identity-ready" },
      { id: "ticket", category: "ticket", label: "수험표(대면 시험)", detail: "대면 시험은 수험표를 지참하세요. 비대면은 안내 절차를 따르면 돼요.", importance: "required", sourceUrl: AT_ITEMS_URL, legacyOf: "ticket-check" },
      { id: "writing", category: "writing", label: "필기구", detail: "답안·메모용 필기구를 준비하세요.", importance: "required", sourceUrl: AT_ITEMS_URL, legacyOf: "writing-check" },
      { id: "calculator", category: "calculator", label: "일반계산기", detail: "회계·세무 계산용 일반계산기를 지참하세요(공학용·프로그램 계산기 아님).", importance: "recommended", sourceUrl: AT_ITEMS_URL },
      { id: "prohibited", category: "forbidden", label: "부정행위 주의", detail: "부정행위가 적발되면 이후 2년간 AT자격시험 응시가 정지돼요. 전자기기 사용 규정을 지키세요.", importance: "forbidden", sourceUrl: AT_ITEMS_URL, legacyOf: "prohibited-check" },
    );
  } else {
    drafts.push(
      { id: "identity", category: "identity", label: "신분증", detail: "시험 당일 신분증을 지참하고 책상 위에 꺼내 두세요. 미지참 시 응시할 수 없어요.", importance: "required", sourceUrl: KORCHAM_INFO_URL, legacyOf: "identity-ready" },
      { id: "ticket", category: "ticket", label: "수험표", detail: "신분증과 함께 반드시 지참하세요. 미지참 시 응시할 수 없어요.", importance: "required", sourceUrl: KORCHAM_INFO_URL, legacyOf: "ticket-check" },
    );
  }
  const items: PreparationItem[] = drafts.map((draft) => ({
    id: `${examId}:${SOURCE_PREPARATION_VERSION}:${draft.id}`,
    category: draft.category,
    label: draft.label,
    detail: draft.detail,
    required: draft.importance === "required",
    officialSourceUrl: draft.sourceUrl,
    importance: draft.importance,
    stage: draft.stage ?? "all",
    sourceVerified: true,
    sourceType: "official",
    sourceLabel: sourceLabelByFamily[family],
    lastVerifiedAt: CATALOG_UPDATED_AT,
    preparationVersion: SOURCE_PREPARATION_VERSION,
    legacyIds: [
      ...(draft.category === "identity" ? [`${examId}-identity-check`, `${examId}:general-v1:official-check`] : []),
      ...(draft.legacyOf ? [`${examId}:general-v2:${draft.legacyOf}`] : []),
    ],
  }));
  // 입실 안내와 최종 확인은 일반 안내로 덧붙여, 검증 항목과 안내 항목을 구분한다.
  const generic = genericPreparation(examId, officialUrl, false);
  const arrival = generic.find((item) => item.category === "arrival");
  const finalCheck = generic.find((item) => item.id.endsWith(":official-final-check"));
  if (arrival) items.push(arrival);
  if (finalCheck) items.push(finalCheck);
  return items;
}

export const exams: Exam[] = examSeeds.map((seed) => {
  const officialUrl = seed.source.officialUrl;
  const sourceFamily = SOURCE_FAMILY_BY_ID[seed.source.id];
  const preparationVersion = seed.preparationVersion
    ?? (seed.preparation ? `${seed.id}-v1` : sourceFamily ? SOURCE_PREPARATION_VERSION : GENERIC_PREPARATION_VERSION);
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
    })) ?? (sourceFamily
      ? sourcePreparation(seed.id, sourceFamily, officialUrl, seed.practical)
      : genericPreparation(seed.id, officialUrl, seed.practical)),
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
