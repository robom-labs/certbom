// 자격증봄 네이티브 식별자와 스토어·딥링크 준비 계약을 정적으로 검증한다.
import { readFile } from "node:fs/promises";

const appConfig = JSON.parse(await readFile(new URL("../app.json", import.meta.url), "utf8"));
const packageInfo = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const expo = appConfig.expo;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(expo.version === packageInfo.version, "Expo와 모바일 package 버전이 일치해야 합니다.");
assert(Number(expo.android.versionCode) >= 2, "Android versionCode는 2 이상이어야 합니다.");
assert(Number(expo.ios.buildNumber) >= 2, "iOS buildNumber는 2 이상이어야 합니다.");
assert(packageInfo.dependencies.expo.startsWith("~57.0."), "Expo SDK 57이 필요합니다.");
assert(!packageInfo.dependencies["react-native-webview"], "WebView 의존성은 허용하지 않습니다.");
assert(expo.scheme === "certbom", "scheme은 certbom이어야 합니다.");
assert(expo.platforms.length === 2 && expo.platforms.includes("ios") && expo.platforms.includes("android"), "Android와 iOS만 대상으로 해야 합니다.");
assert(typeof expo.description === "string" && expo.description.length >= 20, "스토어 설명이 필요합니다.");
assert(expo.android.package === "kr.robom.certbom", "Android 앱 ID가 일치하지 않습니다.");
assert(expo.ios.bundleIdentifier === "kr.robom.certbom", "iOS bundle ID가 일치하지 않습니다.");
assert(expo.icon === "./assets/icon.png", "스토어용 앱 아이콘 경로가 필요합니다.");
assert(expo.ios.associatedDomains.includes("applinks:robom.kr"), "iOS Universal Link 도메인이 필요합니다.");
assert(expo.android.intentFilters.some((filter) => filter.data?.some((data) => data.scheme === "https" && data.host === "robom.kr" && data.pathPrefix === "/get/certbom")), "Android App Link 경로가 필요합니다.");

console.log("CertBom mobile config validation passed.");
