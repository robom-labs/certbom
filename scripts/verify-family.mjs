// 패밀리 생성물 hash와 immutable 중앙 sourceCommit을 앱 저장소 안에서 검증한다.
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const EXPECTED_SOURCE_COMMIT = "7972541b0fd259b3ed920ce57bcce863a88cc722";
const REQUIRED_RUNTIME_CONTRACTS = ["feature-flags.json", "auth-config.json"];
const [generatedDir, lockFile] = process.argv.slice(2);

if (!generatedDir || !lockFile) {
  throw new Error("사용법: verify-family.mjs <generated-dir> <lock-file>");
}

const lock = JSON.parse(await readFile(resolve(lockFile), "utf8"));
if (lock.sourceCommit !== EXPECTED_SOURCE_COMMIT) {
  throw new Error(`family sourceCommit 불일치: ${lock.sourceCommit ?? "없음"}`);
}
if (typeof lock.familySpecVersion !== "string" || !lock.familySpecVersion) {
  throw new Error("familySpecVersion이 없습니다.");
}
if (!lock.files || typeof lock.files !== "object") {
  throw new Error("family 생성물 hash 목록이 없습니다.");
}

const generatedNames = new Set(await readdir(resolve(generatedDir)));
const lockedNames = new Set(Object.keys(lock.files));
const unexpectedNames = [...generatedNames].filter((name) => !lockedNames.has(name));
if (unexpectedNames.length) throw new Error(`lock에 없는 family 생성물: ${unexpectedNames.join(", ")}`);
for (const [name, expectedHash] of Object.entries(lock.files)) {
  if (!generatedNames.has(name)) throw new Error(`family 생성물 누락: ${name}`);
  const content = await readFile(resolve(generatedDir, name));
  const actualHash = `sha256:${createHash("sha256").update(content).digest("hex")}`;
  if (actualHash !== expectedHash) throw new Error(`family 생성물 hash 불일치: ${name}`);
}

for (const name of REQUIRED_RUNTIME_CONTRACTS) {
  if (!lockedNames.has(name)) throw new Error(`필수 runtime 계약 lock 누락: ${name}`);
}

const repositoryRoot = dirname(resolve(lockFile));
const appMeta = JSON.parse(await readFile(resolve(generatedDir, "app-meta.json"), "utf8"));
const packageMetadata = JSON.parse(await readFile(resolve(repositoryRoot, "package.json"), "utf8"));
if (appMeta.id !== "certbom") throw new Error(`app-meta 앱 불일치: ${appMeta.id ?? "없음"}`);
if (appMeta.version !== packageMetadata.version) {
  throw new Error(`app-meta 버전 drift: registry=${appMeta.version ?? "없음"}, package=${packageMetadata.version ?? "없음"}`);
}

const featureFlags = JSON.parse(await readFile(resolve(generatedDir, "feature-flags.json"), "utf8"));
if (featureFlags.analytics?.enabled !== false || featureFlags.analytics?.consentRequired !== true) {
  throw new Error("feature-flags 개인정보 최소 분석 기본값이 유효하지 않습니다.");
}

const authConfig = JSON.parse(await readFile(resolve(generatedDir, "auth-config.json"), "utf8"));
if (authConfig.guestFirst !== true || authConfig.namespace !== "certbom" || authConfig.issuer !== "") {
  throw new Error("auth-config 게스트 우선 미연결 계약이 유효하지 않습니다.");
}

console.log(`family ${lock.familySpecVersion}: ${Object.keys(lock.files).length}개 생성물 검증 완료`);
console.log(`app-meta ${appMeta.id}@${appMeta.version}: registry/package drift 0`);
