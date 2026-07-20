// 자격증봄 React 앱과 PWA 업데이트 흐름을 시작한다.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { applyFontScale, readFontScale } from "./font-scale";
import "./generated/robom-family/tokens.css";
import "./styles.css";

// 설정에서 고른 글자 크기를 첫 화면부터 적용해 재실행 때도 접근성 설정이 유지되게 한다.
applyFontScale(readFontScale());

const updateServiceWorker = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent("certbom-update-ready", {
      detail: { apply: () => void updateServiceWorker(true) },
    }));
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("자격증봄 앱을 표시할 영역을 찾지 못했습니다.");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
