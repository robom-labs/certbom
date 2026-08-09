// 모바일 앱의 오프라인 카탈로그·딥링크·알림 시각 핵심 계약을 검증한다.
import { catalogStats, exams, type Exam } from "@certbom/core";
import { describe, expect, it } from "vitest";
import { parseExamDeepLink } from "./deep-link";
import { journeyNextAction, journeyStageLabel } from "./journey";
import { formatPreparationPreview } from "./preparation-preview";
import { createExamReminderPlans, createReminderPlan } from "./reminder";

const reminderExam: Exam = {
  id: "test-exam",
  slug: "test-exam",
  name: "테스트 시험",
  aliases: [],
  organizer: "테스트 기관",
  category: "테스트",
  sourceId: "test",
  sourceName: "공식 테스트",
  goals: [],
  description: "알림 계약 검증용 시험",
  officialUrl: "https://example.com",
  scheduleType: "round",
  trustLevel: "official-notice",
  lastVerifiedAt: "2026-08-01",
  timePrecision: "date-only",
  practical: false,
  eligibilityRestricted: false,
  duration: "short",
  caution: "",
  preparation: [],
  preparationVersion: "test-v1",
  events: [
    { id: "open", examId: "test-exam", type: "application-open", title: "접수 시작", startAt: "2026-08-10T00:00:00+09:00", timePrecision: "date-only", officialSourceUrl: "https://example.com", confirmed: true },
    { id: "close", examId: "test-exam", type: "application-close", title: "접수 마감", startAt: "2026-08-12T00:00:00+09:00", timePrecision: "date-only", officialSourceUrl: "https://example.com", confirmed: true },
    { id: "ticket", examId: "test-exam", type: "ticket", title: "수험표", startAt: "2026-08-18T00:00:00+09:00", timePrecision: "date-only", officialSourceUrl: "https://example.com", confirmed: true },
    { id: "exam", examId: "test-exam", type: "exam", title: "필기시험", startAt: "2026-08-20T00:00:00+09:00", timePrecision: "date-only", officialSourceUrl: "https://example.com", confirmed: true },
    { id: "result", examId: "test-exam", type: "result", title: "합격자 발표", startAt: "2026-08-25T00:00:00+09:00", timePrecision: "date-only", officialSourceUrl: "https://example.com", confirmed: true },
  ],
};

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

  it("사용자가 고른 3일·7일 전 시각을 그대로 계산한다", () => {
    const now = new Date("2026-08-01T00:00:00+09:00");
    const event = { startAt: "2026-08-10T00:00:00+09:00", title: "필기시험", timePrecision: "date-only" } as const;
    expect(createReminderPlan(event, now, 3)?.date.toISOString()).toBe("2026-08-07T00:00:00.000Z");
    expect(createReminderPlan(event, now, 7)?.date.toISOString()).toBe("2026-08-03T00:00:00.000Z");
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

  it("다음 일정과 중요 일정 전체를 사용자가 선택한 범위대로 구분한다", () => {
    const now = new Date("2026-08-01T00:00:00+09:00");
    expect(createExamReminderPlans(reminderExam, 1, "next", now).map((plan) => plan.eventId)).toEqual(["open"]);
    expect(createExamReminderPlans(reminderExam, 1, "critical", now).map((plan) => plan.eventId)).toEqual(["open", "close", "exam", "result"]);
  });
});

describe("내 시험 준비 여정", () => {
  it("단계와 남은 준비를 다음 행동으로 바꾼다", () => {
    expect(journeyStageLabel("applied")).toBe("접수 완료");
    expect(journeyNextAction(reminderExam, "applied", 2, [])).toBe("필수 준비물 2개 확인");
    expect(journeyNextAction(reminderExam, "applied", 0, [{ id: "book", label: "교재", completed: false }])).toBe("내 준비 할 일 1개 마무리");
    expect(journeyNextAction(reminderExam, "took", 0, [])).toBe("합격자 발표 일정 확인");
    expect(journeyNextAction(reminderExam, "result", 0, [])).toBe("결과 확인을 마쳤어요");
  });
});
