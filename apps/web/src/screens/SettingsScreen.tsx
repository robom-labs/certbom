// 패밀리 앱·게스트 상태·설치·접근성·개인정보·앱 메타를 한곳에서 관리한다.
import {
  CATALOG_DATA_VERSION,
  CATALOG_REVIEWED_AT,
  SOURCE_CONNECTION_STATUS,
  SOURCE_FRESHNESS_STATUS,
  catalogStats,
} from "@certbom/core";
import { useEffect, useRef, useState } from "react";
import { getAnalyticsAdapterKind, getAnalyticsConsent, isAnalyticsEnabled, setAnalyticsConsent } from "../analytics";
import { AppHeader } from "../components/AppHeader";
import { FamilyIcon } from "../components/FamilyIcon";
import { downloadTextFile } from "../download";
import { FONT_SCALE_KEY, applyFontScale, fontScales, readFontScale } from "../font-scale";
import appMeta from "../generated/robom-family/app-meta.json";
import { createDeviceBackup, MAX_BACKUP_BYTES, parseDeviceBackup, type DeviceBackup } from "../local-backup";
import { writeStoredValue } from "../storage";

type Props = {
  favoriteIds: string[];
  checkedIds: string[];
  updateReady: boolean;
  onApplyUpdate?: () => void;
  onClear: () => void;
  onRestoreData: (backup: Pick<DeviceBackup, "favoriteIds" | "checkedIds">) => Promise<void>;
};

export function SettingsScreen({ favoriteIds, checkedIds, updateReady, onApplyUpdate, onClear, onRestoreData }: Props) {
  const [scale, setScale] = useState(readFontScale);
  const [online, setOnline] = useState(navigator.onLine);
  const [analyticsConsent, setAnalyticsConsentState] = useState(getAnalyticsConsent);
  const [storageMessage, setStorageMessage] = useState("");
  const [clearConfirming, setClearConfirming] = useState(false);
  const backupInput = useRef<HTMLInputElement>(null);
  const analyticsEnabled = isAnalyticsEnabled();

  useEffect(() => {
    applyFontScale(scale);
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

  const exportBackup = () => {
    const backup = createDeviceBackup(favoriteIds, checkedIds);
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
    downloadTextFile(
      JSON.stringify(backup, null, 2),
      `certbom-device-backup-${date}.json`,
      "application/json;charset=utf-8",
    );
    setStorageMessage(`관심 시험 ${backup.favoriteIds.length}개와 준비 체크 ${backup.checkedIds.length}개를 백업했어요.`);
  };

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("백업 파일이 너무 큽니다.");
      const backup = parseDeviceBackup(await file.text());
      await onRestoreData(backup);
      setStorageMessage(`백업에서 관심 시험 ${backup.favoriteIds.length}개와 준비 체크 ${backup.checkedIds.length}개를 합쳤어요.`);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : "백업 파일을 불러오지 못했어요.");
    } finally {
      if (backupInput.current) backupInput.current.value = "";
    }
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

      <section className="settings-card" aria-labelledby="settings-storage">
        <h3 id="settings-storage">저장 방식</h3>
        <p>관심 시험과 준비물 체크는 이 기기에만 저장돼요. 로그인이나 계정 동기화는 아직 제공하지 않습니다.</p>
        <span className="status-chip status-chip--neutral">로그인 없이 사용 · 외부 전송 없음</span>
      </section>

      <section className="settings-card" aria-labelledby="settings-backup">
        <h3 id="settings-backup">기기 데이터 백업</h3>
        <p>휴대폰 교체나 브라우저 초기화 전에 관심 시험과 준비 체크를 파일로 보관하세요. 불러오기는 현재 데이터에 안전하게 합쳐집니다.</p>
        <div className="settings-data-actions">
          <button type="button" onClick={exportBackup}>백업 파일 저장</button>
          <button type="button" onClick={() => backupInput.current?.click()}>백업 불러오기</button>
          <input
            ref={backupInput}
            className="settings-file-input"
            type="file"
            accept="application/json,.json"
            aria-label="자격증봄 백업 파일 선택"
            onChange={(event) => void importBackup(event.currentTarget.files?.[0])}
          />
        </div>
        <small>백업 파일은 이 기기에서 직접 만들고 읽으며 외부 서버로 전송하지 않습니다.</small>
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

      <section className="settings-card" aria-labelledby="settings-update">
        <h3 id="settings-update"><FamilyIcon name="install" /> 업데이트</h3>
        <p>자격증봄은 접속할 때마다 최신 앱 셸로 유지돼요. 저장한 관심 시험과 준비물 체크는 그대로 남아요.</p>
        <div className="update-row">
          <span><strong>{updateReady ? "새 버전 준비됨" : "최신 앱 셸 사용 중"}</strong><small>저장한 관심 시험과 준비물 체크는 유지돼요.</small></span>
          {updateReady && onApplyUpdate && <button type="button" onClick={onApplyUpdate}>업데이트</button>}
        </div>
      </section>

      <section className="settings-card" aria-labelledby="settings-data">
        <h3 id="settings-data">데이터 출처와 확인 상태</h3>
        <dl>
          <div><dt>시험 데이터</dt><dd>{catalogStats.examCount}개 · 일정 {catalogStats.scheduledExamCount}개</dd></div>
          <div><dt>공식 출처</dt><dd>{catalogStats.sourceCount}개</dd></div>
          <div><dt>일정 검토본</dt><dd>{new Date(CATALOG_REVIEWED_AT).toLocaleDateString("ko-KR")}</dd></div>
          <div><dt>공식 페이지 점검</dt><dd>{SOURCE_CONNECTION_STATUS.healthyCount}/{SOURCE_CONNECTION_STATUS.totalCount}곳 응답 · {new Date(SOURCE_CONNECTION_STATUS.checkedAt).toLocaleDateString("ko-KR")}</dd></div>
          <div><dt>일정 내용 상태</dt><dd>{SOURCE_FRESHNESS_STATUS.staleCount > 0 ? `검토 주기 경과 ${SOURCE_FRESHNESS_STATUS.staleCount}곳` : "모든 출처 검토 주기 안"}</dd></div>
          <div><dt>네트워크</dt><dd>{online ? "온라인" : "오프라인 · 저장 정보 표시"}</dd></div>
          <div><dt>기기 저장</dt><dd>관심 시험 {favoriteIds.length}개 · 준비 체크 {checkedIds.length}개</dd></div>
        </dl>
        {SOURCE_CONNECTION_STATUS.failedSourceIds.length > 0 && <p className="source-connection-note">자동 점검에서 응답하지 않은 {SOURCE_CONNECTION_STATUS.failedSourceIds.length}곳은 다음 점검 때 다시 시도합니다. 앱은 마지막 공식 검토 스냅샷을 유지합니다.</p>}
        {SOURCE_FRESHNESS_STATUS.staleCount > 0 && <p className="source-freshness-note">공식 페이지 연결은 정상이어도 일정 내용 검토는 별개예요. {SOURCE_FRESHNESS_STATUS.staleCount}개 출처는 검토 주기가 지나 마지막 검토본을 표시하므로, 신청 전 공식 원문을 확인하세요.</p>}
        {!clearConfirming ? (
          <button className="ghost-button" type="button" onClick={() => setClearConfirming(true)}>기기 저장 데이터 지우기</button>
        ) : (
          <div className="settings-clear-confirm" role="alertdialog" aria-labelledby="settings-clear-title" aria-describedby="settings-clear-description">
            <strong id="settings-clear-title">저장 데이터를 정말 지울까요?</strong>
            <p id="settings-clear-description">관심 시험 {favoriteIds.length}개와 준비 체크 {checkedIds.length}개가 이 기기에서 삭제돼요.</p>
            <div><button type="button" onClick={() => setClearConfirming(false)}>취소</button><button type="button" onClick={() => { onClear(); setClearConfirming(false); setStorageMessage("기기 저장 데이터를 지웠어요."); }}>정말 지우기</button></div>
          </div>
        )}
      </section>

      <section className="settings-card" aria-labelledby="settings-family">
        <h3 id="settings-family"><FamilyIcon name="family" /> 로봄 패밀리 앱</h3>
        <p>같은 로봄 패밀리 서비스를 각 웹 주소에서 열 수 있어요.</p>
        <ul className="family-app-list">
          {appMeta.familyApps.filter((app) => app.id !== "certbom").map((app) => (
            <li key={app.id} data-family-app={app.id}>
              <a href={app.webUrl} target="_blank" rel="noreferrer">
                <span><strong>{app.name}</strong><small>웹에서 열기</small></span>
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
