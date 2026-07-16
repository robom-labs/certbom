// 자격증봄 모바일·데스크톱 핵심 흐름의 브라우저 검증 환경을 정의한다.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: { command: "pnpm preview --port 4703 --strictPort", port: 4703, reuseExistingServer: false },
  use: { baseURL: "http://127.0.0.1:4703", trace: "retain-on-failure" },
  projects: [
    { name: "mobile", use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
    { name: "webkit-mobile", use: { ...devices["iPhone 13"], browserName: "webkit", viewport: { width: 390, height: 844 } } },
    { name: "small-mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 568 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
});
