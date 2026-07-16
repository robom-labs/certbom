// 자격증봄 PWA 빌드·오프라인·테스트 설정을 정의한다.
import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { type ManifestOptions, VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";
import pwaManifest from "./pwa-manifest.json";

const packageMetadata = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };
const serviceWorkerCache = `certbom-${packageMetadata.version}`;
const familyContractAssetNames = ["app-meta.json", "settings-contract.json", "feature-flags.json", "auth-config.json"] as const;

function emitFamilyContractAssets(): Plugin {
  return {
    name: "certbom-family-contract-assets",
    apply: "build",
    generateBundle() {
      for (const name of familyContractAssetNames) {
        this.emitFile({
          type: "asset",
          fileName: `robom-family/${name}`,
          source: readFileSync(new URL(`./src/generated/robom-family/${name}`, import.meta.url)),
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [
    emitFamilyContractAssets(),
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/icon.svg", "icons/apple-touch-icon.png", "og.png", "robots.txt"],
      manifest: pwaManifest as Partial<ManifestOptions>,
      workbox: {
        cacheId: serviceWorkerCache,
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,json,svg,png,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(www\.)?(historyexam\.go\.kr|q-net\.or\.kr|mo\.q-net\.or\.kr|license\.korcham\.net|dataq\.or\.kr|license\.kpc\.or\.kr|at\.kicpa\.or\.kr|gongmuwon\.gosi\.kr)\//,
            handler: "NetworkOnly",
          },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(packageMetadata.version),
    __BUILD_SHA__: JSON.stringify(process.env.VITE_BUILD_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local"),
    __SERVICE_WORKER_CACHE__: JSON.stringify(serviceWorkerCache),
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});
