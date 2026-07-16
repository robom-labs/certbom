// 모바일 앱의 오프라인 카탈로그·딥링크·알림 시각 핵심 계약을 검증한다.
import { catalogStats, exams } from "@certbom/core";
import { describe, expect, it } from "vitest";
import { parseExamDeepLink } from "./deep-link";
import { FALLBACK_REMINDER_DELAY_MS, createReminderPlan } from "./reminder";

describe("오프라인 카탈로그", () => {
  it("97개 시험과 공식 HTTPS 출처를 번들한다", () => {
    expect(catalogStats.examCount).toBe(97);
    expect(exams).toHaveLength(97);
    expect(exams.every((exam) => exam.officialUrl.startsWith("https://"))).toBe(true);
  });
});

describe("앱 딥링크", () => {
  it("certbom 시험 경로만 해석한다", () => {
    expect(parseExamDeepLink("certbom://exam/history-advanced")).toBe("history-advanced");
    expect(parseExamDeepLink("https://example.com/exam/history-advanced")).toBeUndefined();
    expect(parseExamDeepLink("certbom://settings")).toBeUndefined();
  });
});

describe("로컬 알림 시각", () => {
  it("여유가 있으면 일정 하루 전에 예약한다", () => {
    const now = new Date("2026-08-01T00:00:00+09:00");
    const plan = createReminderPlan(
      { startAt: "2026-08-10T10:00:00+09:00", title: "필기시험" },
      now,
    );

    expect(plan.date.toISOString()).toBe("2026-08-09T01:00:00.000Z");
    expect(plan.isFallback).toBe(false);
  });

  it("진행 중이거나 일정이 없으면 1분 뒤 확인 알림을 만든다", () => {
    const now = new Date("2026-08-01T00:00:00+09:00");
    const plan = createReminderPlan(undefined, now);

    expect(plan.date.getTime()).toBe(now.getTime() + FALLBACK_REMINDER_DELAY_MS);
    expect(plan.isFallback).toBe(true);
  });
});
