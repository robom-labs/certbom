// 공식 일정 범위와 상시 시험의 다음 행동 문구를 검증한다.
import { getExam } from "@certbom/core";
import { describe, expect, it } from "vitest";
import { examStatusLabel, formatEventDate, nextAction } from "./format";

describe("시험 일정 표시", () => {
  it("날짜 범위를 시작일과 종료일로 함께 보여준다", () => {
    const event = getExam("logistics-manager")?.events[0];
    if (!event) throw new Error("범위 일정이 없습니다.");
    expect(formatEventDate(event)).toContain("7월 16일");
    expect(formatEventDate(event)).toContain("7월 17일");
  });

  it("현재 접수 중인 시험을 분명하게 표시한다", () => {
    const exam = getExam("itq");
    if (!exam) throw new Error("ITQ 시험이 없습니다.");
    expect(examStatusLabel(exam, new Date("2026-07-16T12:00:00+09:00"))).toBe("지금 접수 중");
  });

  it("상시 시험에 API 미연결 문구 대신 공식 접수 행동을 안내한다", () => {
    const exam = getExam("computer-specialist-1");
    if (!exam) throw new Error("상시 시험이 없습니다.");
    expect(nextAction(exam).label).toBe("시험장·날짜 선택");
    expect(nextAction(exam).detail).not.toContain("API");
  });
});
