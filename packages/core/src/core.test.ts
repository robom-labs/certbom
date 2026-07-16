// 확장된 시험 카탈로그·공식 일정·추천·캘린더의 핵심 불변조건을 검증한다.
import { describe, expect, it } from "vitest";
import {
  catalogStats,
  createGoogleCalendarUrl,
  createIcs,
  eventRelevantUntil,
  exams,
  getExam,
  getHomeSummaryExams,
  getUpcomingEventGroups,
  getUpcomingEvents,
  isApplicationOpen,
  isApplicationUpcoming,
  isExamUpcoming,
  migratePreparationIds,
  recommend,
} from "./index";

describe("시험 카탈로그", () => {
  it("공식 출처 8곳의 시험 97개를 제공한다", () => {
    expect(exams).toHaveLength(97);
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

  it("홈 요약 필터가 전체·현재 접수·14일 안 시험을 같은 판정 함수로 계산한다", () => {
    const now = new Date("2026-07-16T12:00:00+09:00");
    const all = getHomeSummaryExams("all", now);
    const open = getHomeSummaryExams("open", now);
    const upcoming = getHomeSummaryExams("upcoming", now);

    expect(all).toHaveLength(97);
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
    expect(migratePreparationIds(["history-ticket", "information-engineer-identity-check", "missing"])).toEqual([
      "history-advanced:history-v1:history-ticket",
      "information-engineer:general-v1:official-check",
    ]);
    expect(exams.flatMap((exam) => exam.preparation).every((item) => item.id.split(":").length >= 3)).toBe(true);
  });
});

describe("추천", () => {
  it("응시자격 제한을 원치 않으면 제한 없는 시험을 우선한다", () => {
    const result = recommend({ goal: "취업", interest: "전체", duration: "short", practicalPossible: true, eligibilityRestrictedAllowed: false });
    expect(result[0]?.exam.eligibilityRestricted).toBe(false);
  });

  it("97개 결과에서 상위 3개와 추가 7개를 안정적으로 제공한다", () => {
    const result = recommend({ goal: "공무원", interest: "전체", duration: "long", practicalPossible: false, eligibilityRestrictedAllowed: true });
    expect(result).toHaveLength(97);
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

  it("날짜 범위를 끝 날짜 다음 날까지의 종일 일정으로 만든다", () => {
    const exam = getExam("logistics-manager");
    const event = exam?.events.find((item) => item.id.endsWith("vacancy"));
    if (!exam || !event) throw new Error("날짜 전용 테스트 일정이 없습니다.");
    expect(createIcs(exam, event)).toContain("DTSTART;VALUE=DATE:20260716");
    expect(createIcs(exam, event)).toContain("DTEND;VALUE=DATE:20260718");
    expect(createGoogleCalendarUrl(exam, event)).toContain("dates=20260716%2F20260718");
  });
});
