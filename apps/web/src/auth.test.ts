// 게스트 인증 adapter가 미연결 공급자를 로그인으로 가장하지 않는지 검증한다.
import { describe, expect, it } from "vitest";
import { guestFirstAuthAdapter } from "./auth";

describe("게스트 우선 인증", () => {
  it("공급자 연결 전에는 기기 저장 게스트 상태를 명시한다", () => {
    expect(guestFirstAuthAdapter.getState()).toEqual({
      mode: "guest",
      authenticated: false,
      provider: null,
      sync: "device-only",
      contractGuestFirst: true,
      namespace: "certbom",
    });
    expect(guestFirstAuthAdapter.getProviders()).toHaveLength(3);
    expect(guestFirstAuthAdapter.getProviders().every((provider) => provider.availability === "not-configured")).toBe(true);
  });
});
