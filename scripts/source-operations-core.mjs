// 자격증봄 공식 데이터 동기화의 날짜·응답·이상 징후·heartbeat 판정을 제공한다.
import { createHash } from "node:crypto";

export const QNET_ENDPOINT = "https://apis.data.go.kr/B490007/qualExamSchd/getQualExamSchdList";
export const QNET_DATE_FIELDS = [
  "docRegStartDt",
  "docRegEndDt",
  "docExamStartDt",
  "docExamEndDt",
  "docPassDt",
  "pracRegStartDt",
  "pracRegEndDt",
  "pracExamStartDt",
  "pracExamEndDt",
  "pracPassDt",
];

function text(value) {
  return value == null ? "" : String(value).trim();
}

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function kstDateParts(now) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
  };
}

export function getTargetYears(now = new Date()) {
  const { year } = kstDateParts(now);
  return [year, year + 1];
}

export function isCompactDate(value) {
  if (value === "") return true;
  if (!/^\d{8}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

export function compactDateToIso(value) {
  if (!value) return "";
  if (!isCompactDate(value)) throw new Error(`잘못된 Q-Net 날짜 형식입니다: ${value}`);
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export function normalizeQnetRecord(record, context = {}) {
  const normalized = {
    implYy: text(record.implYy),
    implSeq: text(record.implSeq),
    qualgbCd: text(record.qualgbCd || context.qualgbCd),
    qualgbNm: text(record.qualgbNm),
    description: text(record.description),
    docRegStartDt: text(record.docRegStartDt),
    docRegEndDt: text(record.docRegEndDt),
    docExamStartDt: text(record.docExamStartDt),
    docExamEndDt: text(record.docExamEndDt),
    docPassDt: text(record.docPassDt),
    pracRegStartDt: text(record.pracRegStartDt),
    pracRegEndDt: text(record.pracRegEndDt),
    pracExamStartDt: text(record.pracExamStartDt),
    pracExamEndDt: text(record.pracExamEndDt),
    pracPassDt: text(record.pracPassDt),
  };

  if (!/^\d{4}$/.test(normalized.implYy)) throw new Error(`시행연도가 잘못됐습니다: ${normalized.implYy}`);
  if (!normalized.implSeq) throw new Error("시행회차가 없습니다.");
  if (!["T", "C", "W", "S"].includes(normalized.qualgbCd)) {
    throw new Error(`자격구분코드가 잘못됐습니다: ${normalized.qualgbCd}`);
  }
  if (!normalized.description) throw new Error("시험 일정 설명이 없습니다.");
  for (const field of QNET_DATE_FIELDS) {
    if (!isCompactDate(normalized[field])) throw new Error(`${field} 날짜가 잘못됐습니다: ${normalized[field]}`);
  }

  const jmCd = text(context.jmCd) || "all";
  return {
    stableId: `qnet:${normalized.qualgbCd}:${jmCd}:${normalized.implYy}:${normalized.implSeq}`,
    jmCd,
    ...normalized,
  };
}

export function parseQnetPage(payload, context = {}) {
  const response = payload?.response ?? payload;
  const header = response?.header ?? {};
  const resultCode = text(header.resultCode);
  if (resultCode !== "00") {
    throw new Error(`Q-Net API 오류 ${resultCode || "UNKNOWN"}: ${text(header.resultMsg) || "메시지 없음"}`);
  }
  const body = response?.body ?? {};
  const rawItems = body?.items?.item;
  const items = rawItems == null ? [] : Array.isArray(rawItems) ? rawItems : [rawItems];
  return {
    pageNo: numeric(body.pageNo, numeric(context.pageNo, 1)),
    numOfRows: numeric(body.numOfRows, numeric(context.numOfRows, items.length)),
    totalCount: numeric(body.totalCount, items.length),
    records: items.map((item) => normalizeQnetRecord(item, context)),
  };
}

function compareCompactDate(left, right) {
  if (!left || !right) return 0;
  return left.localeCompare(right);
}

function dateDistanceDays(left, right) {
  if (!left || !right) return 0;
  const leftDate = Date.parse(`${compactDateToIso(left)}T00:00:00Z`);
  const rightDate = Date.parse(`${compactDateToIso(right)}T00:00:00Z`);
  return Math.round((rightDate - leftDate) / 86_400_000);
}

function invalidRanges(record) {
  const pairs = [
    ["docRegStartDt", "docRegEndDt"],
    ["docExamStartDt", "docExamEndDt"],
    ["pracRegStartDt", "pracRegEndDt"],
    ["pracExamStartDt", "pracExamEndDt"],
  ];
  return pairs
    .filter(([start, end]) => compareCompactDate(record[start], record[end]) > 0)
    .map(([start, end]) => `${record.stableId}: ${start}가 ${end}보다 늦습니다.`);
}

export function stableFingerprint(value) {
  const sorted = JSON.stringify(value, (_key, entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
    return Object.fromEntries(Object.entries(entry).sort(([left], [right]) => left.localeCompare(right)));
  });
  return createHash("sha256").update(sorted).digest("hex");
}

export function detectSourceAnomalies(previousRecords, nextRecords, policy = {}) {
  const maxRemovalRatio = Number(policy.maxRemovalRatio ?? 0.25);
  const maxBackwardShiftDays = Number(policy.maxBackwardShiftDays ?? 31);
  const anomalies = [];
  const nextById = new Map();

  if (nextRecords.length === 0) anomalies.push("API 응답이 0건이므로 공개할 수 없습니다.");
  for (const record of nextRecords) {
    if (nextById.has(record.stableId)) anomalies.push(`안정 ID가 중복됩니다: ${record.stableId}`);
    nextById.set(record.stableId, record);
    anomalies.push(...invalidRanges(record));
  }

  if (!previousRecords) {
    anomalies.push("첫 API 스냅샷은 기존 정본과 사람이 한 번 대조해야 합니다.");
    return anomalies;
  }

  const previousById = new Map(previousRecords.map((record) => [record.stableId, record]));
  const removed = [...previousById.keys()].filter((id) => !nextById.has(id));
  const removalRatio = previousRecords.length ? removed.length / previousRecords.length : 0;
  if (removalRatio > maxRemovalRatio) {
    anomalies.push(`이전 ${previousRecords.length}건 중 ${removed.length}건이 사라져 허용 삭제율 ${Math.round(maxRemovalRatio * 100)}%를 넘었습니다.`);
  }

  for (const [id, previous] of previousById) {
    const next = nextById.get(id);
    if (!next) continue;
    for (const field of QNET_DATE_FIELDS) {
      const shift = dateDistanceDays(previous[field], next[field]);
      if (shift < -maxBackwardShiftDays) {
        anomalies.push(`${id}: ${field}가 ${Math.abs(shift)}일 과거로 이동했습니다.`);
      }
    }
  }
  return anomalies;
}

export function evaluateHeartbeat(lastSuccessAt, now = new Date(), policy = {}) {
  const staleAfterHours = Number(policy.staleAfterHours ?? 36);
  const criticalAfterHours = Number(policy.criticalAfterHours ?? 72);
  const last = Date.parse(lastSuccessAt);
  if (!Number.isFinite(last)) return { status: "missing", ageHours: null };
  const ageHours = (now.getTime() - last) / 3_600_000;
  if (ageHours >= criticalAfterHours) return { status: "critical", ageHours };
  if (ageHours >= staleAfterHours) return { status: "stale", ageHours };
  return { status: "healthy", ageHours };
}

export function runFourHundredDaySimulation(start = new Date("2026-07-16T00:00:00+09:00")) {
  const seenYears = new Set();
  let leapDayCount = 0;
  let yearTransitionCount = 0;
  let previousYear = null;
  for (let offset = 0; offset < 400; offset += 1) {
    const now = new Date(start.getTime() + offset * 86_400_000);
    const [currentYear, nextYear] = getTargetYears(now);
    if (nextYear !== currentYear + 1) throw new Error("다음 연도 대상 계산이 끊겼습니다.");
    if (new Set([currentYear, nextYear]).size !== 2) throw new Error("동기화 대상 연도가 중복됐습니다.");
    seenYears.add(currentYear);
    const parts = kstDateParts(now);
    if (parts.month === 2 && parts.day === 29) leapDayCount += 1;
    if (previousYear != null && previousYear !== parts.year) yearTransitionCount += 1;
    previousYear = parts.year;
  }
  return {
    checkedDays: 400,
    years: [...seenYears].sort(),
    leapDayCount,
    yearTransitionCount,
  };
}
