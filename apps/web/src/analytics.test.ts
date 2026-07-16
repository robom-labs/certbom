// 분석 동의 기본값과 noop·실패 격리를 검증한다.
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAnalyticsConsent, isAnalyticsEnabled, setAnalyticsAdapter, setAnalyticsConsent, trackFamilyEvent } from "./analytics";

describe("개인정보 최소 분석", () => {
  afterEach(() => {
    setAnalyticsConsent(false);
    vi.restoreAllMocks();
  });

  it("동의 전에는 adapter를 호출하지 않는다", () => {
    const send = vi.fn();
    const restore = setAnalyticsAdapter({ kind: "test", send });

    expect(getAnalyticsConsent()).toBe(false);
    expect(trackFamilyEvent("exam_opened", "catalog")).toBe(false);
    expect(send).not.toHaveBeenCalled();
    restore();
  });

  it("동의 후에도 중앙 기능 플래그가 꺼져 있으면 전송하지 않는다", () => {
    const send = vi.fn();
    const restore = setAnalyticsAdapter({ kind: "test", send });
    setAnalyticsConsent(true);

    expect(isAnalyticsEnabled()).toBe(false);
    expect(trackFamilyEvent("exam_opened", "catalog")).toBe(false);
    expect(send).not.toHaveBeenCalled();
    restore();
  });

  it("adapter가 동기적으로 실패해도 앱 이벤트를 깨지 않는다", () => {
    const restore = setAnalyticsAdapter({
      kind: "broken",
      send: () => {
        throw new Error("provider unavailable");
      },
    });
    setAnalyticsConsent(true);

    expect(() => trackFamilyEvent("exam_saved", "detail")).not.toThrow();
    expect(trackFamilyEvent("exam_saved", "detail")).toBe(false);
    restore();
  });
});
