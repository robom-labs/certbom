// 자격증봄 PWA 빌드·오프라인·테스트 설정을 정의한다.
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/icon.svg", "icons/apple-touch-icon.png", "og.png", "robots.txt"],
      manifest: {
        name: "자격증봄 CertBom",
        short_name: "자격증봄",
        description: "시험 찾기부터 접수·시험일·준비물까지 놓치지 않게",
        theme_color: "#2457ef",
        background_color: "#fffaf0",
        display: "standalone",
        start_url: "/",
        scope: "/",
        lang: "ko-KR",
        categories: ["education", "productivity"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(www\.)?(historyexam\.go\.kr|q-net\.or\.kr|license\.korcham\.net)\//,
            handler: "NetworkOnly",
          },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
  define: {
    __BUILD_SHA__: JSON.stringify(process.env.VITE_BUILD_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local"),
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});
