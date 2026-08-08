// 모바일 앱의 오프라인 카탈로그·딥링크·알림 시각 핵심 계약을 검증한다.
import { catalogStats, exams } from "@certbom/core";
import { describe, expect, it } from "vitest";
import { parseExamDeepLink } from "./deep-link";
import { formatPreparationPreview } from "./preparation-preview";
import { createReminderPlan } from "./reminder";

describe("오프라인 카탈로그", () => {
  it("104개 시험과 공식 HTTPS 출처를 번들한다", () => {
    expect(catalogStats.examCount).toBe(104);
    expect(exams).toHaveLength(104);
    expect(exams.every((exam) => exam.officialUrl.startsWith("https://"))).toBe(true);
  });

  it("준비물 객체를 사람이 읽는 라벨만으로 요약한다", () => {
    const exam = exams.find((candidate) => candidate.preparation.length >= 3);
    if (!exam) throw new Error("준비물 테스트 시험이 없습니다.");
    const preview = formatPreparationPreview(exam.preparation);
    expect(preview).not.toContain("[object Object]");
    expect(preview).toBe(exam.preparation.slice(0, 3).map((item) => item.label).join(" · "));
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
      { startAt: "2026-08-10T10:00:00+09:00", title: "필기시험", timePrecision: "exact" },
      now,
    );

    expect(plan?.date.toISOString()).toBe("2026-08-09T01:00:00.000Z");
  });

  it("날짜 전용 일정은 전날 KST 오전 9시에 안내한다", () => {
    const now = new Date("2026-08-01T00:00:00+09:00");
    const plan = createReminderPlan(
      { startAt: "2026-08-10T00:00:00+09:00", title: "필기시험", timePrecision: "date-only" },
      now,
    );

    expect(plan?.date.toISOString()).toBe("2026-08-09T00:00:00.000Z");
  });

  it("일정이 없거나 이미 지난 일정에는 임의 알림을 만들지 않는다", () => {
    const now = new Date("2026-08-01T00:00:00+09:00");
    expect(createReminderPlan(undefined, now)).toBeUndefined();
    expect(createReminderPlan(
      { startAt: "2026-07-31T10:00:00+09:00", title: "지난 시험", timePrecision: "exact" },
      now,
    )).toBeUndefined();
  });

  it("하루 전 시각이 지난 가까운 일정에는 사용자가 요청하지 않은 임의 알림을 만들지 않는다", () => {
    const now = new Date("2026-08-01T00:00:00+09:00");
    const plan = createReminderPlan(
      { startAt: "2026-08-01T12:00:00+09:00", title: "가까운 시험", timePrecision: "exact" },
      now,
    );
    expect(plan).toBeUndefined();
  });
});
