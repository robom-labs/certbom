// 자격증봄 React 앱과 PWA 업데이트 흐름을 시작한다.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import "./generated/robom-family/tokens.css";
import "./styles.css";

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
