// 자격증봄 네이티브 식별자와 스토어·딥링크 준비 계약을 정적으로 검증한다.
import { readFile } from "node:fs/promises";

const appConfig = JSON.parse(await readFile(new URL("../app.json", import.meta.url), "utf8"));
const packageInfo = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const rootPackageInfo = JSON.parse(await readFile(new URL("../../../package.json", import.meta.url), "utf8"));
const easConfig = JSON.parse(await readFile(new URL("../eas.json", import.meta.url), "utf8"));
const expo = appConfig.expo;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(expo.version === packageInfo.version, "Expo와 모바일 package 버전이 일치해야 합니다.");
assert(packageInfo.version === rootPackageInfo.version, "루트와 모바일 package 버전이 일치해야 합니다.");
assert(expo.orientation === "default", "휴대폰·태블릿 회전을 모두 지원해야 합니다.");
assert(expo.ios.supportsTablet === true, "iPad 지원이 켜져 있어야 합니다.");
assert(Number(expo.android.versionCode) >= 2, "Android versionCode는 2 이상이어야 합니다.");
assert(Number(expo.ios.buildNumber) >= 2, "iOS buildNumber는 2 이상이어야 합니다.");
assert(packageInfo.dependencies.expo.startsWith("~57.0."), "Expo SDK 57이 필요합니다.");
assert(packageInfo.dependencies["expo-build-properties"]?.startsWith("~57.0."), "expo-build-properties는 Expo SDK 57 호환 버전이어야 합니다.");
assert(!packageInfo.dependencies["react-native-webview"], "WebView 의존성은 허용하지 않습니다.");
assert(expo.scheme === "certbom", "scheme은 certbom이어야 합니다.");
assert(expo.platforms.length === 2 && expo.platforms.includes("ios") && expo.platforms.includes("android"), "Android와 iOS만 대상으로 해야 합니다.");
assert(typeof expo.description === "string" && expo.description.length >= 20, "스토어 설명이 필요합니다.");
assert(expo.android.package === "kr.robom.certbom", "Android 앱 ID가 일치하지 않습니다.");
assert(expo.ios.bundleIdentifier === "kr.robom.certbom", "iOS bundle ID가 일치하지 않습니다.");
assert(expo.icon === "./assets/icon.png", "스토어용 앱 아이콘 경로가 필요합니다.");
assert(expo.owner === "robom-labs", "EAS owner는 robom-labs여야 합니다.");
assert(!(expo.android.permissions ?? []).includes("com.google.android.gms.permission.AD_ID"), "AD_ID 권한을 선언하면 안 됩니다.");
assert(!expo.ios.associatedDomains?.includes("applinks:robom.kr"), "실제 Apple Team ID 검증 전에는 Universal Link 도메인을 선언하면 안 됩니다.");
assert(!expo.android.intentFilters.some((filter) => filter.autoVerify === true), "실제 Play 앱 서명 검증 전에는 Android App Link autoVerify를 선언하면 안 됩니다.");
const buildProperties = expo.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-build-properties");
assert(buildProperties?.[1]?.android?.compileSdkVersion >= 36, "Android compileSdkVersion은 36 이상이어야 합니다.");
assert(buildProperties?.[1]?.android?.targetSdkVersion === 36, "Android targetSdkVersion은 36이어야 합니다.");
for (const profile of ["development", "preview", "production"]) {
  assert(easConfig.build[profile], `EAS ${profile} 프로필이 필요합니다.`);
}
assert(easConfig.build.production.android?.buildType === "app-bundle", "production Android는 AAB여야 합니다.");
assert(!easConfig.submit, "스토어 자동 제출 설정을 두면 안 됩니다.");
assert(!/\d+개 시험/.test(expo.description), "스토어 설명에 변동 가능한 시험 수를 하드코딩하면 안 됩니다.");

console.log("CertBom mobile config validation passed.");
