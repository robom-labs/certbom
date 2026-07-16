// 자격증봄 공식 소스를 검증하고 Q-Net 후보 스냅샷을 안전하게 수집한다.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  QNET_ENDPOINT,
  detectSourceAnomalies,
  getTargetYears,
  parseQnetPage,
  runFourHundredDaySimulation,
  stableFingerprint,
} from "./source-operations-core.mjs";

const root = resolve(import.meta.dirname, "..");
const registryPath = resolve(root, "ops/source-registry/sources.json");
const lastKnownGoodPath = resolve(root, "ops/source-registry/last-known-good/qnet-schedule.json");

function option(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function safeKey(value) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function validateRegistry(registry) {
  const errors = [];
  if (registry.schemaVersion !== 3) errors.push("source registry schemaVersion은 3이어야 합니다.");
  if (!registry.automation?.qnetSchedule?.endpoint?.startsWith("https://")) errors.push("Q-Net HTTPS endpoint가 없습니다.");
  if (registry.automation?.qnetSchedule?.secretName !== "QNET_SERVICE_KEY") errors.push("Q-Net secret 이름이 정본과 다릅니다.");
  if (!Array.isArray(registry.sources) || registry.sources.length < 8) errors.push("공식 source 8개 이상이 필요합니다.");
  for (const source of registry.sources ?? []) {
    for (const field of ["sourceId", "owner", "officialUrl", "dataMode", "parserVersion", "lastVerifiedAt", "staleAfterHours", "fallback"]) {
      if (source[field] == null || source[field] === "") errors.push(`${source.sourceId ?? "unknown"}: ${field}가 없습니다.`);
    }
    if (!String(source.officialUrl ?? "").startsWith("https://")) errors.push(`${source.sourceId}: officialUrl은 HTTPS여야 합니다.`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return registry;
}

function retryDelay(response, attempt) {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1_000, 30_000);
  return Math.min(1_000 * 2 ** attempt, 8_000);
}

function deterministicError(message) {
  const error = new Error(message);
  error.deterministic = true;
  return error;
}

export async function fetchJsonWithRetry(url, attempts = 3, fetchImpl = fetch) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });
      if (response.ok) {
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch {
          // 비JSON 응답은 재시도해도 같으므로 즉시 중단한다.
          throw deterministicError(`Q-Net이 JSON이 아닌 응답을 반환했습니다: ${text.slice(0, 120)}`);
        }
      }
      if (response.status !== 429 && response.status < 500) {
        // 429를 제외한 4xx는 결정적 실패이므로 즉시 중단한다.
        throw deterministicError(`Q-Net HTTP ${response.status}`);
      }
      lastError = new Error(`Q-Net HTTP ${response.status}`);
      if (attempt < attempts - 1) await new Promise((resolveDelay) => setTimeout(resolveDelay, retryDelay(response, attempt)));
    } catch (error) {
      if (error?.deterministic) throw error;
      // 네트워크 오류·타임아웃·5xx·429만 transient로 보고 재시도한다.
      lastError = error;
      if (attempt < attempts - 1) await new Promise((resolveDelay) => setTimeout(resolveDelay, Math.min(1_000 * 2 ** attempt, 8_000)));
    }
  }
  throw lastError;
}

async function fetchQnetYear(serviceKey, year, qualgbCd, policy) {
  const records = [];
  const numOfRows = Number(policy.numOfRows ?? 100);
  const maxPages = Number(policy.maxPages ?? 20);
  let expectedTotal = null;
  for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
    const url = new URL(policy.endpoint || QNET_ENDPOINT);
    url.searchParams.set("serviceKey", safeKey(serviceKey));
    url.searchParams.set("numOfRows", String(numOfRows));
    url.searchParams.set("pageNo", String(pageNo));
    url.searchParams.set("dataFormat", "json");
    url.searchParams.set("implYy", String(year));
    url.searchParams.set("qualgbCd", qualgbCd);
    const parsed = parseQnetPage(await fetchJsonWithRetry(url, Number(policy.retryPolicy?.maxAttempts ?? 3)), {
      pageNo,
      numOfRows,
      qualgbCd,
    });
    expectedTotal = parsed.totalCount;
    records.push(...parsed.records);
    if (records.length >= parsed.totalCount || parsed.records.length === 0) break;
  }
  if (expectedTotal != null && records.length !== expectedTotal) {
    throw new Error(`${year} ${qualgbCd}: totalCount ${expectedTotal}건과 수집 ${records.length}건이 다릅니다.`);
  }
  return records;
}

async function emitReport(report) {
  const outputPath = option("output");
  if (outputPath) await writeJson(resolve(process.cwd(), outputPath), report);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [
      `## 자격증봄 source operation`,
      ``,
      `- 상태: ${report.status}`,
      `- 대상 연도: ${(report.targetYears ?? []).join(", ") || "없음"}`,
      `- 수집 건수: ${report.recordCount ?? 0}`,
      `- fingerprint: ${report.fingerprint ?? "없음"}`,
      `- 이상 징후: ${(report.anomalies ?? []).length}`,
    ];
    await writeFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`, { flag: "a" });
  }
  console.log(JSON.stringify(report, null, 2));
}

async function verify() {
  const registry = validateRegistry(await readJson(registryPath));
  const lkg = await readJson(lastKnownGoodPath);
  if (lkg) {
    const fingerprint = stableFingerprint(lkg.records);
    if (fingerprint !== lkg.fingerprint) throw new Error("Q-Net last-known-good fingerprint가 일치하지 않습니다.");
  }
  console.log(`source registry ${registry.schemaVersion} · ${registry.sources.length} sources · last-known-good ${lkg ? lkg.records.length : 0}`);
}

async function simulate() {
  const from = option("from", "2026-07-16T00:00:00+09:00");
  const result = runFourHundredDaySimulation(new Date(from));
  if (!result.years.includes(2027)) throw new Error("400일 검사에서 2027년이 포함되지 않았습니다.");
  console.log(JSON.stringify(result, null, 2));
}

async function sync() {
  const registry = validateRegistry(await readJson(registryPath));
  const policy = registry.automation.qnetSchedule;
  const now = option("now") ? new Date(option("now")) : new Date();
  const targetYears = getTargetYears(now);
  const serviceKey = process.env[policy.secretName] ?? "";
  if (!serviceKey) {
    await emitReport({
      status: "BLOCKED_EXTERNAL",
      reason: `${policy.secretName}가 등록되지 않아 공식 API를 호출하지 않았습니다.`,
      targetYears,
      recordCount: 0,
      anomalies: [],
    });
    return;
  }

  const records = [];
  for (const year of targetYears) {
    for (const qualgbCd of policy.qualificationCodes) {
      records.push(...await fetchQnetYear(serviceKey, year, qualgbCd, policy));
    }
  }
  records.sort((left, right) => left.stableId.localeCompare(right.stableId));
  const previous = await readJson(lastKnownGoodPath);
  const anomalies = detectSourceAnomalies(previous?.records ?? null, records, policy.anomalyPolicy);
  const fingerprint = stableFingerprint(records);
  const status = anomalies.length ? "REVIEW_REQUIRED" : "PASS";
  const report = {
    status,
    fetchedAt: now.toISOString(),
    sourceId: policy.sourceId,
    targetYears,
    recordCount: records.length,
    fingerprint,
    previousFingerprint: previous?.fingerprint ?? null,
    changed: previous?.fingerprint !== fingerprint,
    anomalies,
  };

  if (hasFlag("publish") && status === "PASS" && report.changed) {
    await writeJson(lastKnownGoodPath, {
      schemaVersion: 1,
      sourceId: policy.sourceId,
      fetchedAt: report.fetchedAt,
      targetYears,
      fingerprint,
      records,
    });
  }
  await emitReport(report);
  if (hasFlag("strict") && status !== "PASS") process.exitCode = 2;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  const command = process.argv[2] ?? "verify";
  if (command === "verify") await verify();
  else if (command === "simulate") await simulate();
  else if (command === "sync") await sync();
  else throw new Error(`지원하지 않는 source operation입니다: ${command}`);
}
