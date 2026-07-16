// 브라우저 설치 프롬프트와 iOS 홈 화면 추가 안내를 하나의 PWA 상태로 제공한다.
import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type PwaInstallAvailability = "installed" | "prompt" | "ios-fallback" | "browser-help";
export type PwaInstallOutcome = "accepted" | "dismissed" | "installed" | "unavailable" | "failed";

export type PwaInstallController = {
  availability: PwaInstallAvailability;
  requestInstall: () => Promise<PwaInstallOutcome>;
};

function isStandalone(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches === true || navigatorWithStandalone.standalone === true;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function usePwaInstall(): PwaInstallController {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setPromptEvent(null);
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const requestInstall = useCallback(async (): Promise<PwaInstallOutcome> => {
    if (installed) return "installed";
    if (!promptEvent) return "unavailable";

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setPromptEvent(null);
      if (choice.outcome === "accepted") setInstalled(true);
      return choice.outcome;
    } catch {
      setPromptEvent(null);
      return "failed";
    }
  }, [installed, promptEvent]);

  const availability: PwaInstallAvailability = installed
    ? "installed"
    : promptEvent
      ? "prompt"
      : isIos()
        ? "ios-fallback"
        : "browser-help";

  return { availability, requestInstall };
}
