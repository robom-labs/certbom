// 확장된 시험 카탈로그·공식 일정·추천·캘린더의 핵심 불변조건을 검증한다.
import { describe, expect, it } from "vitest";
import {
  CATALOG_DATA_VERSION,
  CATALOG_REVIEWED_AT,
  SOURCE_CONNECTION_STATUS,
  catalogStats,
  createCalendarIcs,
  createGoogleCalendarUrl,
  createIcs,
  eventRelevantUntil,
  exams,
  getExam,
  getExamAttempts,
  getHomeSummaryExams,
  getAttemptEvents,
  getNextAttemptEvent,
  getOfficialExamActions,
  getSameDayExamGroups,
  getUpcomingAttemptEvents,
  getUpcomingEventGroups,
  getUpcomingEvents,
  isApplicationOpen,
  isApplicationUpcoming,
  isExamUpcoming,
  migratePreparationIds,
  recommend,
} from "./index";

describe("시험 카탈로그", () => {
  it("카탈로그 검토 시각과 출처 연결 점검 시각을 구분한다", () => {
    expect(CATALOG_DATA_VERSION).toBe("2026.07.24-v4");
    expect(CATALOG_REVIEWED_AT).toBe("2026-07-24T14:30:00+09:00");
    expect(SOURCE_CONNECTION_STATUS.totalCount).toBe(8);
    expect(SOURCE_CONNECTION_STATUS.healthyCount).toBeGreaterThanOrEqual(0);
    expect(SOURCE_CONNECTION_STATUS.healthyCount).toBeLessThanOrEqual(SOURCE_CONNECTION_STATUS.totalCount);
    expect(SOURCE_CONNECTION_STATUS.healthyCount + SOURCE_CONNECTION_STATUS.failedSourceIds.length).toBe(
      SOURCE_CONNECTION_STATUS.totalCount,
    );
    expect(new Date(SOURCE_CONNECTION_STATUS.checkedAt).getTime()).toBeGreaterThan(
      new Date(CATALOG_REVIEWED_AT).getTime(),
    );

    expect(getExam("information-engineer")?.lastVerifiedAt).toBe("2026-08-22T19:41:37+09:00");
    const professionalExam = exams.find((exam) => exam.sourceId === "qnet-professional-calendar-2026");
    expect(professionalExam?.lastVerifiedAt).toBe("2026-07-16T15:00:00+09:00");
  });

  it("공식 출처 8곳의 시험 104개를 제공한다", () => {
    expect(exams).toHaveLength(104);
    expect(catalogStats.sourceCount).toBe(8);
    expect(catalogStats.scheduledExamCount).toBeGreaterThanOrEqual(70);
  });

  it("시험·일정·준비물 식별자가 서로 겹치지 않는다", () => {
    expect(new Set(exams.map((exam) => exam.id)).size).toBe(exams.length);
    const eventIds = exams.flatMap((exam) => exam.events.map((event) => event.id));
    const preparationIds = exams.flatMap((exam) => exam.preparation.map((item) => item.id));
    expect(new Set(eventIds).size).toBe(eventIds.length);
    expect(new Set(preparationIds).size).toBe(preparationIds.length);
  });

  it("상시시험에는 임의의 고정 이벤트를 만들지 않는다", () => {
    expect(exams.filter((exam) => exam.scheduleType === "rolling").every((exam) => exam.events.length === 0)).toBe(true);
  });

  it("화면에 노출되는 이벤트는 공식 링크와 확인 상태를 가진다", () => {
    for (const exam of exams) {
      expect(exam.officialUrl.startsWith("https://")).toBe(true);
      expect(exam.trustLevel).not.toBe("official-api");
      for (const event of exam.events) {
        expect(event.confirmed).toBe(true);
        expect(event.officialSourceUrl.startsWith("https://")).toBe(true);
      }
    }
  });

  it("현재 접수 중인 일정을 시간순 목록 맨 앞에 둔다", () => {
    const now = new Date("2026-07-16T12:00:00+09:00");
    const events = getUpcomingEvents(now);
    expect(events[0]?.event.id).toBe("logistics-manager-vacancy");
    expect(events[0] && isApplicationOpen(events[0].exam, now)).toBe(true);
  });

  it("날짜만 있는 접수 기간은 마지막 날이 끝날 때까지 유지한다", () => {
    const exam = getExam("logistics-manager");
    const event = exam?.events.find((item) => item.id.endsWith("vacancy"));
    if (!event) throw new Error("날짜 범위 테스트 일정이 없습니다.");
    expect(eventRelevantUntil(event)).toBeGreaterThan(new Date("2026-07-17T20:00:00+09:00").getTime());
  });

  it("여러 종목이 공유하는 회차는 홈에서 한 일정으로 묶는다", () => {
    const groups = getUpcomingEventGroups(new Date("2026-07-20T12:00:00+09:00"));
    const technicalRegistration = groups.find((item) => item.event.groupKey === "qnet-tech-r3-application");
    expect(technicalRegistration?.exams).toHaveLength(21);
  });

  it("명시적으로 검토한 Q-Net 회차·단계만 선택 가능한 일정으로 묶는다", () => {
    const engineer = getExam("information-engineer");
    if (!engineer) throw new Error("회차 선택 테스트용 시험이 없습니다.");
    const attempts = getExamAttempts(engineer);
    expect(attempts.map((attempt) => attempt.key)).toEqual([
      "qnet-technical-2026-r3-written",
      "qnet-technical-2026-r3-practical",
    ]);
    expect(getAttemptEvents(engineer, attempts[0]?.key).map((event) => event.type)).toEqual([
      "application-open",
      "application-open",
      "exam",
      "result",
    ]);
    expect(getAttemptEvents(engineer, attempts[1]?.key).every((event) => event.attemptStage === "practical")).toBe(true);
    const history = getExam("history-advanced");
    if (!history) throw new Error("회차 선택 제외 테스트용 시험이 없습니다.");
    expect(getExamAttempts(history)).toEqual([]);
  });

  it("선택한 회차 밖의 다음 일정은 보여주지 않는다", () => {
    const engineer = getExam("information-engineer");
    if (!engineer) throw new Error("회차 다음 일정 테스트용 시험이 없습니다.");
    const next = getNextAttemptEvent(engineer, "qnet-technical-2026-r3-practical", new Date("2026-09-10T12:00:00+09:00"));
    expect(next?.id).toBe("information-engineer-r3-practical-application-a");
  });

  it("오늘 기준으로 지난 회차 일정은 화면용 목록에서 제외한다", () => {
    const engineer = getExam("information-engineer");
    if (!engineer) throw new Error("오늘 기준 일정 테스트용 시험이 없습니다.");
    const now = new Date("2026-08-22T12:00:00+09:00");
    const events = getUpcomingAttemptEvents(engineer, undefined, now);

    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => eventRelevantUntil(event) >= now.getTime())).toBe(true);
    expect(events.some((event) => event.startAt.startsWith("2026-07-"))).toBe(false);
  });

  it("홈 요약 필터가 전체·현재 접수·14일 안 시험을 같은 판정 함수로 계산한다", () => {
    const now = new Date("2026-07-16T12:00:00+09:00");
    const all = getHomeSummaryExams("all", now);
    const open = getHomeSummaryExams("open", now);
    const upcoming = getHomeSummaryExams("upcoming", now);

    expect(all).toHaveLength(104);
    expect(open.length).toBeGreaterThan(0);
    expect(open.every((exam) => isApplicationOpen(exam, now))).toBe(true);
    expect(upcoming.length).toBeGreaterThan(0);
    expect(upcoming.every((exam) => isExamUpcoming(exam, now))).toBe(true);
    const history = getExam("history-advanced");
    if (!history) throw new Error("한국사 시험을 찾지 못했습니다.");
    expect(isApplicationUpcoming(history, now)).toBe(true);
  });

  it("날짜 전용 시험은 시험 당일에도 곧 시험으로 포함한다", () => {
    const exam = getExam("logistics-manager");
    if (!exam) throw new Error("물류관리사 시험을 찾지 못했습니다.");
    const examDayNoon = new Date("2026-07-25T12:00:00+09:00");
    expect(isExamUpcoming(exam, examDayNoon)).toBe(true);
  });

  it("공식 원서접수 종료 시각은 기관별 원문과 초 단위까지 일치한다", () => {
    const history = getExam("history-advanced");
    const sqld = getExam("sqld");
    const history80 = history?.events.find((event) => event.id === "history-advanced-80-application");
    const sqld63 = sqld?.events.find((event) => event.id === "sqld-63-application");

    expect(history80?.endAt).toBe("2026-09-22T17:00:00+09:00");
    expect(sqld63?.endAt).toBe("2026-10-16T17:59:59+09:00");
  });

  it("진행 중인 기간형 시험은 종료 전까지 곧 시험으로 포함한다", () => {
    const exam = getExam("information-engineer");
    if (!exam) throw new Error("정보처리기사 시험을 찾지 못했습니다.");
    const midPeriod = new Date("2026-08-20T12:00:00+09:00");
    expect(isExamUpcoming(exam, midPeriod)).toBe(true);
    const afterPeriod = new Date("2026-09-02T12:00:00+09:00");
    expect(isExamUpcoming(exam, afterPeriod)).toBe(false);
  });

  it("윤년 날짜 전용 일정은 KST 마지막 순간까지 유효하다", () => {
    expect(eventRelevantUntil({
      id: "leap-day",
      examId: "test",
      type: "exam",
      title: "윤년 시험",
      startAt: "2028-02-29T00:00:00+09:00",
      timePrecision: "date-only",
      officialSourceUrl: "https://example.com",
      confirmed: true,
    })).toBe(new Date("2028-02-29T23:59:59+09:00").getTime());
  });

  it("기존 준비물 체크 ID를 시험·버전별 안정 ID로 보존해 이전한다", () => {
    // 이전 general-v1 official-check와 general-v2 identity-ready가 모두 현재 출처 검증 ID로 이어져야 한다.
    expect(migratePreparationIds([
      "history-ticket",
      "information-engineer-identity-check",
      "information-engineer:general-v2:identity-ready",
      "missing",
    ])).toEqual([
      "history-advanced:history-v1:history-ticket",
      "information-engineer:source-official-v1:identity",
    ]);
    expect(exams.flatMap((exam) => exam.preparation).every((item) => item.id.split(":").length >= 3)).toBe(true);
  });

  it("공식 확인 출처가 없는 시험도 구체적인 일반 준비 체크리스트를 제공한다", () => {
    // 사이버국가고시센터(gosi) 시험은 출처별 규정을 웹에서 확인하지 않아 일반 체크리스트로 안내한다.
    const exam = getExam("national-civil-service-9");
    if (!exam) throw new Error("국가공무원 9급 시험을 찾지 못했습니다.");
    expect(exam.preparation.length).toBeGreaterThanOrEqual(6);
    expect(exam.preparation.every((item) => item.sourceType === "general" && item.sourceVerified === false)).toBe(true);
    expect(exam.preparation.map((item) => item.category)).toEqual(expect.arrayContaining([
      "identity",
      "ticket",
      "writing",
      "forbidden",
      "arrival",
    ]));
  });

  it("Q-Net·데이터·상의 시험은 웹에서 확인한 공식 준비물을 제공한다", () => {
    for (const id of ["information-engineer", "sqld", "computer-specialist-1"]) {
      const exam = getExam(id);
      if (!exam) continue;
      const official = exam.preparation.filter((item) => item.sourceType === "official" && item.sourceVerified);
      expect(official.length).toBeGreaterThanOrEqual(2);
      // 신분증 항목은 공식 출처 URL을 갖는다.
      const identity = official.find((item) => item.category === "identity");
      expect(identity?.officialSourceUrl).toMatch(/^https?:\/\//);
      expect(identity?.required).toBe(true);
    }
  });

  it("공식 준비물이 있는 시험은 검증 항목과 일반 안내를 섞더라도 검증 항목이 존재한다", () => {
    const exam = getExam("history-advanced");
    if (!exam) throw new Error("한국사 시험을 찾지 못했습니다.");
    expect(exam.preparation.every((item) => item.sourceType === "official" && item.sourceVerified)).toBe(true);
    // Q-Net 시험은 공식 검증 항목 + 입실/최종확인 일반 안내를 함께 제공한다.
    const qnet = getExam("information-engineer");
    expect(qnet?.preparation.some((item) => item.sourceType === "official")).toBe(true);
    expect(qnet?.preparation.some((item) => item.category === "arrival")).toBe(true);
  });
});

describe("추천", () => {
  it("응시자격 제한을 원치 않으면 제한 없는 시험을 우선한다", () => {
    const result = recommend({ goal: "취업", interest: "전체", duration: "short", practicalPossible: true, eligibilityRestrictedAllowed: false });
    expect(result[0]?.exam.eligibilityRestricted).toBe(false);
  });

  it("104개 결과에서 상위 3개와 추가 7개를 안정적으로 제공한다", () => {
    const result = recommend({ goal: "공무원", interest: "전체", duration: "long", practicalPossible: false, eligibilityRestrictedAllowed: true });
    expect(result).toHaveLength(104);
    expect(result.slice(0, 3)).toHaveLength(3);
    expect(result.slice(3, 10)).toHaveLength(7);
    expect(result.every((item) => item.ruleVersion && item.cautions.length > 0)).toBe(true);
  });
});

describe("캘린더 공유", () => {
  it("공식 링크를 포함한 ICS를 만든다", () => {
    const exam = getExam("history-advanced");
    const event = exam?.events[0];
    if (!exam || !event) throw new Error("캘린더 테스트용 공식 일정이 없습니다.");
    const ics = createIcs(exam, event);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain(event.officialSourceUrl);
  });

  it("여러 시험 일정을 한 파일로 만들고 같은 일정을 중복하지 않는다", () => {
    const history = getExam("history-advanced");
    const engineer = getExam("information-engineer");
    const historyEvent = history?.events[0];
    const engineerEvent = engineer?.events[0];
    if (!history || !engineer || !historyEvent || !engineerEvent) throw new Error("묶음 캘린더 테스트 일정이 없습니다.");
    const ics = createCalendarIcs([
      { exam: engineer, event: engineerEvent },
      { exam: history, event: historyEvent },
      { exam: history, event: historyEvent },
    ]);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("X-WR-CALNAME:자격증봄 관심 시험");
    expect(ics.indexOf(historyEvent.startAt.slice(0, 4))).toBeGreaterThanOrEqual(0);
  });

  it("날짜 범위를 끝 날짜 다음 날까지의 종일 일정으로 만든다", () => {
    const exam = getExam("logistics-manager");
    const event = exam?.events.find((item) => item.id.endsWith("vacancy"));
    if (!exam || !event) throw new Error("날짜 전용 테스트 일정이 없습니다.");
    expect(createIcs(exam, event)).toContain("DTSTART;VALUE=DATE:20260716");
    expect(createIcs(exam, event)).toContain("DTEND;VALUE=DATE:20260718");
    expect(createGoogleCalendarUrl(exam, event)).toContain("dates=20260716%2F20260718");
  });

  it("긴 한글 일정과 URL을 UTF-8 75바이트 이하로 접어 캘린더 호환성을 지킨다", () => {
    const exam = getExam("history-advanced");
    const event = exam?.events[0];
    if (!exam || !event) throw new Error("캘린더 테스트용 공식 일정이 없습니다.");
    const longExam = {
      ...exam,
      name: `${exam.name} 아주 긴 한글 일정 이름과 안내 문구가 이어지는 시험`,
    };
    const ics = createCalendarIcs([{ exam: longExam, event }], "자격증봄 관심 시험과 매우 긴 캘린더 이름");
    const physicalLines = ics.split("\r\n");
    expect(physicalLines.some((line) => line.startsWith(" "))).toBe(true);
    expect(physicalLines.every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
  });

  it("설명 줄바꿈의 CR과 LF를 같은 ICS 이스케이프로 정규화한다", () => {
    const exam = getExam("history-advanced");
    const event = exam?.events[0];
    if (!exam || !event) throw new Error("캘린더 테스트용 공식 일정이 없습니다.");
    const customExam = { ...exam, name: "가\r\n나\r다\n라" };
    const ics = createIcs(customExam, event);
    expect(ics).not.toContain("\r\r");
    expect(ics).toContain("가\\n나\\n다\\n라");
  });
});

describe("공식 보조 도구", () => {
  it("Q-Net 제한 종목과 실기 종목에 필요한 공식 도구만 제공한다", () => {
    const restricted = getExam("industrial-safety-engineer");
    if (!restricted) throw new Error("Q-Net 테스트 시험이 없습니다.");
    const actions = getOfficialExamActions(restricted);
    expect(actions.some((action) => action.id === "eligibility")).toBe(true);
    expect(actions.some((action) => action.id === "practical-items")).toBe(restricted.practical);
    expect(actions.every((action) => action.url.startsWith("https://www.q-net.or.kr/"))).toBe(true);
    expect(actions.some((action) => action.label.includes("정답"))).toBe(false);
  });

  it("Q-Net이 아닌 시험에는 Q-Net 도구를 섞지 않는다", () => {
    const exam = getExam("history-advanced");
    if (!exam) throw new Error("비 Q-Net 테스트 시험이 없습니다.");
    expect(getOfficialExamActions(exam)).toEqual([]);
  });
});

describe("같은 날 시험 일정", () => {
  it("서로 다른 관심 시험의 미래 시험일이 같을 때만 검토 목록을 만든다", () => {
    const source = getExam("history-advanced");
    const sourceEvent = source?.events[0];
    if (!source || !sourceEvent) throw new Error("일정 테스트 시험이 없습니다.");
    const event = {
      ...sourceEvent,
      type: "exam" as const,
      startAt: "2026-09-20T09:00:00+09:00",
      endAt: "2026-09-20T12:00:00+09:00",
    };
    const first = { ...source, id: "first", name: "첫 시험", events: [{ ...event, id: "first-event", examId: "first" }] };
    const second = { ...source, id: "second", name: "둘째 시험", events: [{ ...event, id: "second-event", examId: "second" }] };
    const third = { ...source, id: "third", name: "다른 날 시험", events: [{ ...event, id: "third-event", examId: "third", startAt: "2026-09-21T09:00:00+09:00" }] };

    const groups = getSameDayExamGroups([first, second, third], new Date("2026-08-08T00:00:00+09:00"));
    expect(groups).toHaveLength(1);
    expect(groups[0]?.date).toBe("2026-09-20");
    expect(new Set(groups[0]?.entries.map((entry) => entry.exam.id))).toEqual(new Set(["first", "second"]));
  });
});
