// 보안 예외가 다른 권고·버전·만료 뒤의 취약점을 숨기지 않는지 검사한다.
import assert from "node:assert/strict";
import test from "node:test";
import { classifySecurityAdvisories, validateAuditExceptionPolicy } from "./audit-policy.mjs";

const exception = {
  id: "GHSA-example",
  package: "image-size",
  advisoryUrl: "https://github.com/advisories/GHSA-example",
  allowedVersions: ["2.0.2"],
  dependencyScope: "build-only",
  rationale: "빌드 도구에서만 사용하며 런타임 사용자 입력을 처리하지 않음",
  reviewedAt: "2026-08-08",
  expiresAt: "2026-09-30",
};
const advisory = {
  name: "image-size",
  severity: "high",
  url: exception.advisoryUrl,
};

test("정확한 권고와 설치 버전만 만료 전까지 허용한다", () => {
  const result = classifySecurityAdvisories(
    [advisory],
    new Map([["image-size", new Set(["2.0.2"])]]),
    { schemaVersion: 1, exceptions: [exception] },
    new Date("2026-08-09T00:00:00Z"),
  );
  assert.equal(result.accepted.length, 1);
  assert.equal(result.blocking.length, 0);
});

test("다른 버전·권고·만료된 예외는 차단한다", () => {
  const policy = { schemaVersion: 1, exceptions: [exception] };
  const wrongVersion = classifySecurityAdvisories(
    [advisory],
    new Map([["image-size", new Set(["2.0.3"])]]),
    policy,
    new Date("2026-08-09T00:00:00Z"),
  );
  assert.equal(wrongVersion.blocking.length, 1);

  const wrongAdvisory = classifySecurityAdvisories(
    [{ ...advisory, url: "https://github.com/advisories/GHSA-other" }],
    new Map([["image-size", new Set(["2.0.2"])]]),
    policy,
    new Date("2026-08-09T00:00:00Z"),
  );
  assert.equal(wrongAdvisory.blocking.length, 1);

  const expired = classifySecurityAdvisories(
    [advisory],
    new Map([["image-size", new Set(["2.0.2"])]]),
    policy,
    new Date("2026-10-01T00:00:00Z"),
  );
  assert.equal(expired.blocking.length, 1);
});

test("런타임 범위 예외는 정책 검증 단계에서 거부한다", () => {
  assert.throws(
    () => validateAuditExceptionPolicy({
      schemaVersion: 1,
      exceptions: [{ ...exception, dependencyScope: "runtime" }],
    }),
    /build-only/,
  );
});
