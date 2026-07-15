// Q-Net 공식 문서의 응답 계약과 안정 ID 생성을 고정한다.
import { describe, expect, it } from "vitest";
import { normalizeQnetItem, qnetItemSchema } from "./index";

const fixture = {
  implYy: "2026",
  implSeq: 1,
  qualgbCd: "T",
  qualgbNm: "국가기술자격",
  description: "국가기술자격 기사 제1회",
  docRegStartDt: "20260101",
  docRegEndDt: "20260104",
  docExamStartDt: "20260201",
  docExamEndDt: "20260208",
  docPassDt: "20260313",
  pracRegStartDt: "20260316",
  pracRegEndDt: "20260317",
  pracExamStartDt: "20260401",
  pracExamEndDt: "20260430",
  pracPassDt: "20260515",
};

describe("Q-Net 어댑터", () => {
  it("공식 응답 형태를 검증한다", () => {
    expect(qnetItemSchema.parse(fixture).implYy).toBe("2026");
  });

  it("배열 순서와 무관한 ID를 만든다", () => {
    expect(normalizeQnetItem(fixture, "1320").stableId).toBe("qnet:T:1320:2026:1");
  });

  it("잘못된 날짜를 거부한다", () => {
    expect(() => qnetItemSchema.parse({ ...fixture, docPassDt: "2026-03-13" })).toThrow();
  });
});
