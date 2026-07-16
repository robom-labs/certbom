// 자격증봄 데이터 운영의 경계·이상 감지·400일 시간 이동을 회귀 검사한다.
import assert from "node:assert/strict";
import test from "node:test";
import {
  detectSourceAnomalies,
  evaluateHeartbeat,
  getTargetYears,
  normalizeQnetRecord,
  parseQnetPage,
  runFourHundredDaySimulation,
  stableFingerprint,
} from "./source-operations-core.mjs";
import { fetchJsonWithRetry } from "./source-operations.mjs";

const fixture = {
  implYy: "2026",
  implSeq: "1",
  qualgbCd: "T",
  qualgbNm: "국가기술자격",
  description: "국가기술자격 기사 제1회",
  docRegStartDt: "20260107",
  docRegEndDt: "20260110",
  docExamStartDt: "20260201",
  docExamEndDt: "20260208",
  docPassDt: "20260313",
  pracRegStartDt: "20260316",
  pracRegEndDt: "20260317",
  pracExamStartDt: "20260401",
  pracExamEndDt: "20260430",
  pracPassDt: "20260515",
};

test("KST 현재 연도와 다음 연도를 자동 대상으로 삼는다", () => {
  assert.deepEqual(getTargetYears(new Date("2026-12-31T15:30:00Z")), [2027, 2028]);
});

test("Q-Net 단건·배열 응답과 totalCount를 정규화한다", () => {
  const parsed = parseQnetPage({
    response: {
      header: { resultCode: "00", resultMsg: "NORMAL SERVICE" },
      body: { pageNo: 1, numOfRows: 100, totalCount: 1, items: { item: fixture } },
    },
  }, { qualgbCd: "T" });
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.records[0].stableId, "qnet:T:all:2026:1");
});

test("잘못된 날짜와 역전된 기간을 공개 후보에서 차단한다", () => {
  assert.throws(() => normalizeQnetRecord({ ...fixture, docPassDt: "2026-03-13" }));
  const record = normalizeQnetRecord({ ...fixture, docRegStartDt: "20260111", docRegEndDt: "20260110" });
  assert.match(detectSourceAnomalies([record], [record]).join("\n"), /보다 늦습니다/);
});

test("0건·대량 삭제·과거 이동·첫 스냅샷을 검토함으로 보낸다", () => {
  const first = normalizeQnetRecord(fixture);
  const second = normalizeQnetRecord({ ...fixture, implSeq: "2", docRegStartDt: "20260207", docRegEndDt: "20260210" });
  assert.match(detectSourceAnomalies(null, [first]).join("\n"), /첫 API 스냅샷/);
  assert.match(detectSourceAnomalies([first], []).join("\n"), /0건/);
  assert.match(detectSourceAnomalies([first, second], [first], { maxRemovalRatio: 0.25 }).join("\n"), /허용 삭제율/);
  const moved = { ...first, docExamStartDt: "20251201" };
  assert.match(detectSourceAnomalies([first], [moved], { maxBackwardShiftDays: 31 }).join("\n"), /과거로 이동/);
});

test("fingerprint는 객체 키 순서와 무관하다", () => {
  assert.equal(stableFingerprint({ a: 1, b: 2 }), stableFingerprint({ b: 2, a: 1 }));
});

test("heartbeat는 36시간과 72시간 경계를 구분한다", () => {
  const now = new Date("2026-07-16T12:00:00Z");
  assert.equal(evaluateHeartbeat("2026-07-15T12:00:00Z", now).status, "healthy");
  assert.equal(evaluateHeartbeat("2026-07-14T23:00:00Z", now).status, "stale");
  assert.equal(evaluateHeartbeat("2026-07-13T11:00:00Z", now).status, "critical");
});

test("결정적 실패(4xx·비JSON)는 재시도 없이 1회 호출로 즉시 중단한다", async () => {
  let notFoundCalls = 0;
  await assert.rejects(
    () => fetchJsonWithRetry("https://example.invalid/qnet", 3, async () => {
      notFoundCalls += 1;
      return new Response("not found", { status: 404 });
    }),
    /Q-Net HTTP 404/,
  );
  assert.equal(notFoundCalls, 1);

  let nonJsonCalls = 0;
  await assert.rejects(
    () => fetchJsonWithRetry("https://example.invalid/qnet", 3, async () => {
      nonJsonCalls += 1;
      return new Response("<html>maintenance</html>", { status: 200 });
    }),
    /JSON이 아닌 응답/,
  );
  assert.equal(nonJsonCalls, 1);
});

test("400일 시간 이동에 연도 전환과 다음 연도 대상이 끊기지 않는다", () => {
  const result = runFourHundredDaySimulation();
  assert.equal(result.checkedDays, 400);
  assert.ok(result.years.includes(2026));
  assert.ok(result.years.includes(2027));
  assert.equal(result.yearTransitionCount, 1);
});
