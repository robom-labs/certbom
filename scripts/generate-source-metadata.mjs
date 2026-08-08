// 공식 출처 장부와 연결 점검 결과를 앱에서 안전하게 표시할 정적 메타로 변환한다.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const registryPath = new URL("../ops/source-registry/sources.json", import.meta.url);
const hashesPath = new URL("../ops/source-registry/source-hashes.json", import.meta.url);
const outputPath = new URL("../packages/core/src/source-metadata.generated.ts", import.meta.url);

const [registry, hashes] = await Promise.all([
  readFile(registryPath, "utf8").then(JSON.parse),
  readFile(hashesPath, "utf8").then(JSON.parse),
]);

const reviewedAt = Object.fromEntries(
  registry.sources.map((source) => [source.sourceId, source.lastVerifiedAt]),
);
const failedSourceIds = hashes.sources.filter((source) => !source.ok).map((source) => source.sourceId).sort();
const healthyCount = hashes.sources.length - failedSourceIds.length;
const checkedAt = new Date(hashes.generatedAt);
const freshnessSources = registry.sources.map((source) => {
  const lastReviewedAt = new Date(source.lastVerifiedAt);
  const ageHours = Math.max(0, Math.floor((checkedAt.getTime() - lastReviewedAt.getTime()) / 3_600_000));
  const staleAfterHours = Number(source.staleAfterHours ?? source.freshnessSloHours ?? 72);
  return {
    sourceId: source.sourceId,
    lastReviewedAt: source.lastVerifiedAt,
    ageHours,
    staleAfterHours,
    staleAt: new Date(lastReviewedAt.getTime() + staleAfterHours * 3_600_000).toISOString(),
    state: ageHours > staleAfterHours ? "stale" : "fresh",
  };
});
const staleSourceIds = freshnessSources
  .filter((source) => source.state === "stale")
  .map((source) => source.sourceId)
  .sort();

const output = `// 공식 출처 장부에서 자동 생성한 데이터 확인 시각과 연결 상태를 제공한다.\n` +
  `// 이 파일은 scripts/generate-source-metadata.mjs로 생성하므로 직접 수정하지 않는다.\n` +
  `export const CATALOG_DATA_VERSION = ${JSON.stringify(registry.dataVersion)};\n` +
  `export const CATALOG_REVIEWED_AT = ${JSON.stringify(registry.lastReviewedAt)};\n\n` +
  `export const SOURCE_REVIEWED_AT = ${JSON.stringify(reviewedAt, null, 2)} as const;\n\n` +
  `export const SOURCE_CONNECTION_STATUS = ${JSON.stringify({
    checkedAt: hashes.generatedAt,
    healthyCount,
    totalCount: hashes.sources.length,
    failedSourceIds,
  }, null, 2)} as const;\n\n` +
  `export const SOURCE_FRESHNESS_STATUS = ${JSON.stringify({
    checkedAt: hashes.generatedAt,
    freshCount: freshnessSources.length - staleSourceIds.length,
    staleCount: staleSourceIds.length,
    totalCount: freshnessSources.length,
    staleSourceIds,
    sources: freshnessSources,
  }, null, 2)} as const;\n`;

if (process.argv.includes("--check")) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== output) {
    console.error(`Generated source metadata is stale. Run "pnpm source:meta" from ${root}.`);
    process.exit(1);
  }
} else {
  await writeFile(outputPath, output);
  console.log(`Updated ${fileURLToPath(outputPath)}`);
}
