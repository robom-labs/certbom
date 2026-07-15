// 계정 준비 상태·접근성·데이터 출처·앱 정보를 한곳에 제공한다.

import { CATALOG_DATA_VERSION, CATALOG_UPDATED_AT, catalogStats } from "@certbom/core";
import { useEffect, useState } from "react";
import { AppHeader } from "../components/AppHeader";

declare const __BUILD_SHA__: string;

export function SettingsScreen({ favoriteCount, onClear }: { favoriteCount: number; onClear: () => void }) {
  const [scale, setScale] = useState(() => localStorage.getItem("certbom-font-scale") ?? "100");
  const [online, setOnline] = useState(navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", `${Number(scale) / 100}`);
    localStorage.setItem("certbom-font-scale", scale);
  }, [scale]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onUpdate = () => setUpdateReady(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("certbom-update-ready", onUpdate);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("certbom-update-ready", onUpdate);
    };
  }, []);

  return (
    <main className="screen settings-screen">
      <AppHeader compact />
      <div className="page-title"><p>내게 편하게</p><h2>설정</h2></div>

      <section className="settings-card"><h3>로그인과 동기화</h3><p>카카오·구글·애플 연결 전에도 모든 시험을 둘러볼 수 있어요.</p><div className="provider-grid"><button type="button" onClick={() => alert("카카오 OAuth 키 연결 후 제공됩니다.")}>카카오</button><button type="button" onClick={() => alert("구글 OAuth 키 연결 후 제공됩니다.")}>구글</button><button type="button" onClick={() => alert("애플 Service ID 연결 후 제공됩니다.")}>Apple</button></div><small>현재 관심 시험은 이 기기에 안전하게 저장됩니다.</small></section>

      <section className="settings-card"><h3>글자 크기</h3><p>선택 즉시 화면 전체에 적용돼요.</p><div className="font-options">{["100", "115", "130"].map((value) => <button type="button" aria-pressed={scale === value} onClick={() => setScale(value)} key={value}>{value === "100" ? "기본" : value === "115" ? "크게" : "아주 크게"}</button>)}</div></section>

      <section className="settings-card"><h3>데이터와 알림</h3><dl><div><dt>시험 데이터</dt><dd>{catalogStats.examCount}개 시험 · 일정 {catalogStats.scheduledExamCount}개</dd></div><div><dt>공식 출처</dt><dd>{catalogStats.sourceCount}개 출처</dd></div><div><dt>마지막 확인</dt><dd>{new Date(CATALOG_UPDATED_AT).toLocaleDateString("ko-KR")}</dd></div><div><dt>네트워크</dt><dd>{online ? "온라인" : "오프라인 · 저장 정보 표시"}</dd></div><div><dt>기기 저장</dt><dd>관심 시험 {favoriteCount}개</dd></div></dl><button className="ghost-button" type="button" onClick={onClear}>기기 저장 데이터 지우기</button></section>

      <section className="settings-card"><h3>개인정보와 지원</h3><a href="https://robom.kr/privacy" target="_blank" rel="noreferrer">개인정보 처리방침 <span>↗</span></a><a href="https://robom.kr/support" target="_blank" rel="noreferrer">문의와 지원 <span>↗</span></a><a href="https://robom.kr" target="_blank" rel="noreferrer">다른 로봄 앱 <span>↗</span></a></section>

      <div className="app-meta"><img src="/icons/icon.svg" alt="" /><div><strong>자격증봄 0.5.0</strong><small>build {__BUILD_SHA__.slice(0, 7)} · data {CATALOG_DATA_VERSION} · cache v6</small></div><span>{updateReady ? "업데이트 준비됨" : "최신"}</span></div>
    </main>
  );
}
