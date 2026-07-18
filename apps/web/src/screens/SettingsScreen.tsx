// 패밀리 앱·게스트 상태·설치·접근성·개인정보·앱 메타를 한곳에서 관리한다.
import { CATALOG_DATA_VERSION, CATALOG_UPDATED_AT, catalogStats } from "@certbom/core";
import { useEffect, useState } from "react";
import { getAnalyticsAdapterKind, getAnalyticsConsent, isAnalyticsEnabled, setAnalyticsConsent } from "../analytics";
import { guestFirstAuthAdapter } from "../auth";
import { AppHeader } from "../components/AppHeader";
import { FamilyIcon } from "../components/FamilyIcon";
import appMeta from "../generated/robom-family/app-meta.json";
import type { PwaInstallController, PwaInstallOutcome } from "../pwa-install";
import { readStoredValue, writeStoredValue } from "../storage";

const FONT_SCALE_KEY = "certbom-font-scale";
const fontScales = ["100", "115", "130"] as const;

type Props = {
  favoriteCount: number;
  install: PwaInstallController;
  updateReady: boolean;
  onApplyUpdate?: () => void;
  onClear: () => void;
};

function readFontScale(): (typeof fontScales)[number] {
  const stored = readStoredValue(FONT_SCALE_KEY);
  return fontScales.find((value) => value === stored) ?? "100";
}

function installOutcomeMessage(outcome: PwaInstallOutcome): string {
  if (outcome === "accepted" || outcome === "installed") return "자격증봄이 이 기기에 설치됐어요.";
  if (outcome === "dismissed") return "설치를 취소했어요. 원할 때 다시 시도할 수 있어요.";
  if (outcome === "failed") return "설치 창을 열지 못했어요. 브라우저 메뉴에서 앱 설치를 선택해 주세요.";
  return "현재 브라우저에서는 메뉴의 앱 설치 또는 홈 화면 추가를 이용해 주세요.";
}

export function SettingsScreen({ favoriteCount, install, updateReady, onApplyUpdate, onClear }: Props) {
  const [scale, setScale] = useState(readFontScale);
  const [online, setOnline] = useState(navigator.onLine);
  const [analyticsConsent, setAnalyticsConsentState] = useState(getAnalyticsConsent);
  const [storageMessage, setStorageMessage] = useState("");
  const [authMessage, setAuthMessage] = useState("공급자 계정과 연결되지 않은 게스트 상태예요.");
  const [installMessage, setInstallMessage] = useState("");
  const authState = guestFirstAuthAdapter.getState();
  const analyticsEnabled = isAnalyticsEnabled();

  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", `${Number(scale) / 100}`);
    if (!writeStoredValue(FONT_SCALE_KEY, scale)) {
      setStorageMessage("브라우저가 저장을 막아 글자 크기는 이번 사용 중에만 유지돼요.");
    }
  }, [scale]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const changeAnalyticsConsent = (consented: boolean) => {
    setAnalyticsConsentState(consented);
    const persisted = setAnalyticsConsent(consented);
    setStorageMessage(persisted ? "분석 동의 선택을 이 기기에 저장했어요." : "브라우저가 저장을 막아 분석 동의 선택은 이번 사용 중에만 유지돼요.");
  };

  const requestInstall = async () => {
    const outcome = await install.requestInstall();
    setInstallMessage(installOutcomeMessage(outcome));
  };

  return (
    <main className="screen settings-screen">
      <AppHeader compact />
      <div className="page-title"><p>내게 편하게</p><h2>설정</h2></div>

      <section className="settings-card settings-card--about" aria-labelledby="settings-about">
        <h3 id="settings-about">자격증봄</h3>
        <p>{catalogStats.examCount}개 시험의 공식 일정과 출처를 로그인 없이 찾고 기기에 저장할 수 있어요.</p>
        <span className="status-chip">게스트로 바로 사용 중</span>
      </section>

      <section className="settings-card" aria-labelledby="settings-account">
        <h3 id="settings-account">계정과 동기화</h3>
        <p>현재는 {authState.mode === "guest" ? "게스트 모드" : "계정 모드"}이며 관심 시험은 이 기기에만 저장됩니다.</p>
        <div className="provider-grid">
          {guestFirstAuthAdapter.getProviders().map((provider) => (
            <button type="button" key={provider.id} onClick={() => setAuthMessage(guestFirstAuthAdapter.describeProvider(provider.id))}>
              <strong>{provider.label}</strong>
              <small>연결 준비 상태</small>
            </button>
          ))}
        </div>
        <small className="settings-feedback" aria-live="polite">{authMessage}</small>
      </section>

      <section className="settings-card" aria-labelledby="settings-notifications">
        <h3 id="settings-notifications">알림과 권한</h3>
        <p>웹 푸시 공급자는 아직 연결되지 않았어요. 알림 권한을 요청하거나 활성화된 것처럼 표시하지 않습니다.</p>
        <span className="status-chip status-chip--neutral">알림 미연결 · 핵심 기능 정상</span>
      </section>

      <section className="settings-card" aria-labelledby="settings-accessibility">
        <h3 id="settings-accessibility">접근성과 글자 크기</h3>
        <p>선택 즉시 화면 전체에 적용돼요.</p>
        <div className="font-options">
          {fontScales.map((value) => (
            <button type="button" aria-pressed={scale === value} onClick={() => setScale(value)} key={value}>
              {value === "100" ? "기본" : value === "115" ? "크게" : "아주 크게"}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-card" aria-labelledby="settings-install">
        <h3 id="settings-install"><FamilyIcon name="install" /> 설치와 업데이트</h3>
        {install.availability === "installed" && <p>이 기기에 자격증봄이 설치되어 있어요.</p>}
        {install.availability === "prompt" && <p>브라우저 설치 창을 열어 앱처럼 빠르게 사용할 수 있어요.</p>}
        {install.availability === "ios-fallback" && <p>iPhone·iPad에서는 Safari의 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택해 주세요.</p>}
        {install.availability === "browser-help" && <p>브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택해 주세요.</p>}
        {install.availability === "prompt" && <button className="primary-button" type="button" onClick={requestInstall}>이 기기에 자격증봄 설치</button>}
        <a href={appMeta.stableInstallUrl} target="_blank" rel="noreferrer">안정 설치 안내 열기 <span>↗</span></a>
        <div className="update-row">
          <span><strong>{updateReady ? "새 버전 준비됨" : "최신 앱 셸 사용 중"}</strong><small>저장한 관심 시험과 준비물 체크는 유지돼요.</small></span>
          {updateReady && onApplyUpdate && <button type="button" onClick={onApplyUpdate}>업데이트</button>}
        </div>
        {installMessage && <small className="settings-feedback" aria-live="polite">{installMessage}</small>}
      </section>

      <section className="settings-card" aria-labelledby="settings-data">
        <h3 id="settings-data">데이터 출처와 확인 상태</h3>
        <dl>
          <div><dt>시험 데이터</dt><dd>{catalogStats.examCount}개 · 일정 {catalogStats.scheduledExamCount}개</dd></div>
          <div><dt>공식 출처</dt><dd>{catalogStats.sourceCount}개</dd></div>
          <div><dt>마지막 확인</dt><dd>{new Date(CATALOG_UPDATED_AT).toLocaleDateString("ko-KR")}</dd></div>
          <div><dt>네트워크</dt><dd>{online ? "온라인" : "오프라인 · 저장 정보 표시"}</dd></div>
          <div><dt>기기 저장</dt><dd>관심 시험 {favoriteCount}개</dd></div>
        </dl>
        <button className="ghost-button" type="button" onClick={onClear}>기기 저장 데이터 지우기</button>
      </section>

      <section className="settings-card" aria-labelledby="settings-family">
        <h3 id="settings-family"><FamilyIcon name="family" /> 로봄 패밀리 앱</h3>
        <p>다섯 앱을 각 앱의 독립 웹 주소에서 사용할 수 있어요.</p>
        <ul className="family-app-list">
          {appMeta.familyApps.filter((app) => app.id !== "certbom").map((app) => (
            <li key={app.id} data-family-app={app.id}>
              <a href={app.webUrl} target="_blank" rel="noreferrer">
                <span><strong>{app.name}</strong><small>{app.id === appMeta.id ? "현재 앱" : "웹 앱 열기"}</small></span>
                <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="settings-card" aria-labelledby="settings-support">
        <h3 id="settings-support">지원과 피드백</h3>
        <p>오류 제보나 사용 문의는 로봄 지원 창구에서 받을 수 있어요.</p>
        <a href={appMeta.supportUrl} target="_blank" rel="noreferrer">문의와 지원 <span>↗</span></a>
      </section>

      <section className="settings-card" aria-labelledby="settings-privacy">
        <h3 id="settings-privacy">개인정보와 공식 안내</h3>
        <p>분석은 기본 꺼짐이며 위치·주소·검색어 원문·OAuth 토큰을 이벤트로 받지 않습니다.</p>
        <label className="consent-row">
          <input aria-label="익명 사용성 분석 허용" type="checkbox" checked={analyticsConsent} disabled={!analyticsEnabled} onChange={(event) => changeAnalyticsConsent(event.target.checked)} />
          <span><strong>{analyticsEnabled ? "익명 사용성 분석 허용" : "익명 사용성 분석 꺼짐"}</strong><small>{analyticsEnabled ? `현재 adapter는 ${getAnalyticsAdapterKind()}입니다.` : "중앙 기능 플래그와 외부 분석 공급자가 모두 꺼져 있어요."}</small></span>
        </label>
        {storageMessage && <small className="settings-feedback" aria-live="polite">{storageMessage}</small>}
        <a href={appMeta.privacyUrl} target="_blank" rel="noreferrer">자격증봄 개인정보 처리방침 <span>↗</span></a>
        <p className="official-notice">자격증봄은 공식 시험기관이 아닙니다. 접수·응시자격·일정은 시행기관의 최신 공고가 최종 기준입니다.</p>
      </section>

      <section className="settings-card settings-card--meta" aria-labelledby="settings-meta">
        <h3 id="settings-meta"><FamilyIcon name="info" /> 앱 메타</h3>
        <dl>
          <div><dt>앱</dt><dd>{appMeta.name} {appMeta.englishName}</dd></div>
          <div><dt>버전</dt><dd>{__APP_VERSION__}</dd></div>
          <div><dt>빌드 SHA</dt><dd>{__BUILD_SHA__.slice(0, 7)}</dd></div>
          <div><dt>패밀리 규격</dt><dd>{appMeta.familySpecVersion}</dd></div>
          <div><dt>서비스워커 캐시</dt><dd>{__SERVICE_WORKER_CACHE__}</dd></div>
          <div><dt>데이터 버전</dt><dd>{CATALOG_DATA_VERSION}</dd></div>
          <div><dt>중앙 확인</dt><dd>{new Date(appMeta.lastVerifiedAt).toLocaleString("ko-KR")}</dd></div>
          <div><dt>배포 공급자</dt><dd>{appMeta.deployProvider}</dd></div>
        </dl>
        {appMeta.version !== __APP_VERSION__ && <p className="meta-drift">중앙 registry 버전 {appMeta.version}은 이 앱 저장소 밖 정본에서 다음 동기화가 필요해요.</p>}
      </section>
    </main>
  );
}
