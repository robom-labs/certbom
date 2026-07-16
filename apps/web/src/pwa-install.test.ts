// beforeinstallprompt 수락과 설치 완료 상태 전환을 검증한다.
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePwaInstall } from "./pwa-install";

describe("PWA 설치", () => {
  it("브라우저 프롬프트를 보관했다가 사용자 행동으로 실행한다", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
    });
    const { result } = renderHook(() => usePwaInstall());

    act(() => window.dispatchEvent(event));
    expect(result.current.availability).toBe("prompt");

    let outcome = "";
    await act(async () => {
      outcome = await result.current.requestInstall();
    });

    expect(prompt).toHaveBeenCalledOnce();
    expect(outcome).toBe("accepted");
    expect(result.current.availability).toBe("installed");
  });
});
