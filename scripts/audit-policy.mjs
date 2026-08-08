// production 의존성 감사 예외를 정확한 권고·버전·만료일 범위에서만 허용한다.
import { readFileSync } from "node:fs";

const severityRank = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

export function loadAuditExceptionPolicy(path) {
  const policy = JSON.parse(readFileSync(path, "utf8"));
  validateAuditExceptionPolicy(policy);
  return policy;
}

export function validateAuditExceptionPolicy(policy) {
  if (policy?.schemaVersion !== 1 || !Array.isArray(policy.exceptions)) {
    throw new Error("보안 감사 예외 정책의 schemaVersion 또는 exceptions가 올바르지 않습니다.");
  }

  const ids = new Set();
  for (const entry of policy.exceptions) {
    const requiredStrings = [
      "id",
      "package",
      "advisoryUrl",
      "dependencyScope",
      "rationale",
      "reviewedAt",
      "expiresAt",
    ];
    for (const key of requiredStrings) {
      if (typeof entry[key] !== "string" || entry[key].trim() === "") {
        throw new Error(`보안 감사 예외 ${entry.id ?? "(unknown)"}의 ${key}가 비어 있습니다.`);
      }
    }
    if (entry.dependencyScope !== "build-only") {
      throw new Error(`보안 감사 예외 ${entry.id}는 build-only 범위만 허용합니다.`);
    }
    if (!Array.isArray(entry.allowedVersions) || entry.allowedVersions.length === 0) {
      throw new Error(`보안 감사 예외 ${entry.id}의 allowedVersions가 비어 있습니다.`);
    }
    if (ids.has(entry.id)) throw new Error(`중복된 보안 감사 예외 ID입니다: ${entry.id}`);
    ids.add(entry.id);
  }
}

export function classifySecurityAdvisories(advisories, packages, policy, now = new Date()) {
  validateAuditExceptionPolicy(policy);
  const accepted = [];
  const blocking = [];

  for (const advisory of advisories) {
    if ((severityRank[advisory.severity] ?? -1) < severityRank.high) continue;
    const exception = policy.exceptions.find((entry) =>
      entry.package === advisory.name && entry.advisoryUrl === advisory.url
    );
    const versions = [...(packages.get(advisory.name) ?? [])].sort();
    const expiresAt = exception ? new Date(`${exception.expiresAt}T23:59:59.999Z`) : null;
    const versionAllowed = exception && versions.length > 0 &&
      versions.every((version) => exception.allowedVersions.includes(version));
    const exceptionActive = expiresAt && Number.isFinite(expiresAt.valueOf()) && now <= expiresAt;

    if (exception && versionAllowed && exceptionActive) {
      accepted.push({ advisory, exception, versions });
    } else {
      blocking.push({ advisory, exception, versions });
    }
  }

  return { accepted, blocking };
}
