// 시험 카탈로그·일정·추천 규칙의 핵심 불변조건을 검증한다.
import { describe, expect, it } from "vitest";
import { createGoogleCalendarUrl, createIcs, exams, getUpcomingEvents, recommend } from "./index";

describe("시험 카탈로그", () => {
  it("추천 3+7에 필요한 10개 시험을 제공한다", () => {
    expect(exams).toHaveLength(10);
  });

  it("상시시험에는 고정 이벤트를 만들지 않는다", () => {
    expect(exams.filter((exam) => exam.scheduleType === "rolling").every((exam) => exam.events.length === 0)).toBe(true);
  });

  it("화면에 노출되는 이벤트는 공식 링크와 확인 상태를 가진다", () => {
    for (const exam of exams) {
      for (const event of exam.events) {
        expect(event.confirmed).toBe(true);
        expect(event.officialSourceUrl.startsWith("https://")).toBe(true);
      }
    }
  });

  it("현재 이후 일정을 시간순으로 정렬한다", () => {
    const events = getUpcomingEvents(new Date("2026-07-16T00:00:00+09:00"));
    expect(events[0]?.event.id).toBe("history-79-cancel-seat");
    expect(events.at(-1)?.event.id).toBe("history-79-result");
  });

  it("진행 중인 접수는 마감 전까지 다가오는 일정에 남긴다", () => {
    const events = getUpcomingEvents(new Date("2026-07-22T12:00:00+09:00"));
    expect(events[0]?.event.id).toBe("history-79-cancel-seat");
  });

  it("날짜만 확정된 발표는 해당 날짜가 끝날 때까지 유지한다", () => {
    const events = getUpcomingEvents(new Date("2026-08-21T20:00:00+09:00"));
    expect(events[0]?.event.id).toBe("history-79-result");
  });
});

describe("추천", () => {
  it("응시자격 제한을 원치 않으면 제한 없는 시험을 우선한다", () => {
    const result = recommend({ goal: "취업", interest: "전체", duration: "short", practicalPossible: true, eligibilityRestrictedAllowed: false });
    expect(result[0]?.exam.eligibilityRestricted).toBe(false);
  });

  it("모든 결과에 설명과 규칙 버전을 남긴다", () => {
    const result = recommend({ goal: "공무원", interest: "전체", duration: "long", practicalPossible: false, eligibilityRestrictedAllowed: true });
    expect(result).toHaveLength(10);
    expect(result.every((item) => item.ruleVersion && item.cautions.length > 0)).toBe(true);
  });
});

describe("캘린더 공유", () => {
  it("공식 링크를 포함한 ICS를 만든다", () => {
    const exam = exams[0];
    const event = exam?.events[0];
    if (!exam || !event) throw new Error("캘린더 테스트용 공식 일정이 없습니다.");
    const ics = createIcs(exam, event);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain(event.officialSourceUrl);
  });

  it("시각 미상 발표일은 임의 시각이 아닌 종일 일정으로 만든다", () => {
    const exam = exams[0];
    const event = exam?.events.find((item) => item.timePrecision === "date-only");
    if (!exam || !event) throw new Error("날짜 전용 테스트 일정이 없습니다.");
    expect(createIcs(exam, event)).toContain("DTSTART;VALUE=DATE:20260821");
    expect(createIcs(exam, event)).toContain("DTEND;VALUE=DATE:20260822");
    expect(createGoogleCalendarUrl(exam, event)).toContain("dates=20260821%2F20260822");
  });
});
