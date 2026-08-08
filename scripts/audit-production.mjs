// 설치된 production 의존성을 npm Bulk Advisory API로 검사해 high 이상 취약점에서 출시를 중단한다.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { classifySecurityAdvisories, loadAuditExceptionPolicy } from "./audit-policy.mjs";

const dirIndex = process.argv.indexOf("--dir");
const targetDir = resolve(process.cwd(), dirIndex >= 0 ? process.argv[dirIndex + 1] : ".");
const usesPnpm = existsSync(resolve(targetDir, "pnpm-lock.yaml"));
const usesNpm = existsSync(resolve(targetDir, "package-lock.json"));

if (!usesPnpm && !usesNpm) {
  throw new Error(`지원하는 lockfile이 없습니다: ${targetDir}`);
}

const command = usesPnpm ? "pnpm" : "npm";
const commandArgs = usesPnpm
  ? [...(existsSync(resolve(targetDir, "pnpm-workspace.yaml")) ? ["-r"] : []), "list", "--prod", "--parseable", "--depth", "Infinity"]
  : ["ls", "--omit=dev", "--all", "--parseable"];
const listed = spawnSync(command, commandArgs, {
  cwd: targetDir,
  encoding: "utf8",
  maxBuffer: 50 * 1024 * 1024
});

if (!listed.stdout.trim()) {
  throw new Error(`의존성 목록을 읽지 못했습니다: ${listed.stderr.trim() || `exit ${listed.status}`}`);
}

const packages = new Map();
for (const packageDir of new Set(listed.stdout.split(/\r?\n/).filter(Boolean))) {
  const packageFile = resolve(packageDir, "package.json");
  if (!existsSync(packageFile)) continue;
  const metadata = JSON.parse(readFileSync(packageFile, "utf8"));
  if (typeof metadata.name !== "string" || typeof metadata.version !== "string") continue;
  if (!packages.has(metadata.name)) packages.set(metadata.name, new Set());
  packages.get(metadata.name).add(metadata.version);
}

const requestBody = Object.fromEntries(
  [...packages.entries()].map(([name, versions]) => [name, [...versions].sort()])
);
const response = await fetch("https://registry.npmjs.org/-/npm/v1/security/advisories/bulk", {
  method: "POST",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(requestBody),
  signal: AbortSignal.timeout(20_000)
});

if (!response.ok) {
  throw new Error(`npm 보안 감사 실패: ${response.status} ${response.statusText}`);
}

const advisoryMap = await response.json();
const advisories = Object.entries(advisoryMap).flatMap(([name, values]) =>
  values.map((advisory) => ({ name, ...advisory }))
);
const severityRank = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };
advisories.sort((left, right) => (severityRank[right.severity] ?? -1) - (severityRank[left.severity] ?? -1));

const policy = loadAuditExceptionPolicy(resolve(targetDir, "ops/security/audit-exceptions.json"));
const { accepted, blocking } = classifySecurityAdvisories(advisories, packages, policy);

for (const advisory of advisories) {
  const acceptedException = accepted.find((entry) => entry.advisory.url === advisory.url);
  const suffix = acceptedException
    ? ` · accepted-build-only ${acceptedException.exception.id} until ${acceptedException.exception.expiresAt}`
    : "";
  console.log(`[${advisory.severity}] ${advisory.name}: ${advisory.title} · ${advisory.url}${suffix}`);
}

console.log(
  `production audit: ${packages.size} packages · ${advisories.length} advisories · ` +
  `accepted-build-only ${accepted.length} · blocking high/critical ${blocking.length}`,
);

if (blocking.length > 0) process.exitCode = 1;
