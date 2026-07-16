// 자격증봄의 화면 이동과 기기 저장 상태를 통합한다.
import { useEffect, useState } from "react";
import { getExam } from "@certbom/core";
import { trackFamilyEvent } from "./analytics";
import { BottomNav, type Tab } from "./components/BottomNav";
import { usePwaInstall } from "./pwa-install";
import { DetailScreen } from "./screens/DetailScreen";
import { FindScreen } from "./screens/FindScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { ScheduleScreen } from "./screens/ScheduleScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { useStoredIds } from "./storage";

type Route = { kind: "tab"; tab: Tab; recommend?: boolean } | { kind: "exam"; examId: string; from: Tab };

function readRoute(): Route {
  const value = window.location.hash.replace(/^#\/?/, "");
  if (value.startsWith("exam/")) return { kind: "exam", examId: value.slice(5), from: "find" };
  if (value === "recommend") return { kind: "tab", tab: "find", recommend: true };
  if (["home", "find", "schedule", "settings"].includes(value)) return { kind: "tab", tab: value as Tab };
  return { kind: "tab", tab: "home" };
}

export function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [applyUpdate, setApplyUpdate] = useState<null | (() => void)>(null);
  const favorites = useStoredIds("certbom-favorites-v1");
  const checked = useStoredIds("certbom-preparation-v1");
  const pwaInstall = usePwaInstall();
  const activeTab = route.kind === "tab" ? route.tab : route.from;

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ apply: () => void }>).detail;
      if (detail?.apply) setApplyUpdate(() => detail.apply);
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("certbom-update-ready", onUpdate);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("certbom-update-ready", onUpdate);
    };
  }, []);

  const navigateTab = (tab: Tab, recommend = false) => {
    if (recommend) trackFamilyEvent("recommendation_started", "home");
    window.location.hash = recommend ? "recommend" : tab;
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const openExam = (examId: string) => {
    trackFamilyEvent("exam_opened", "catalog");
    window.location.hash = `exam/${examId}`;
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const toggleFavorite = (examId: string) => {
    const surface = route.kind === "exam" ? "exam-detail" : `${route.tab}-catalog`;
    if (!favorites.ids.includes(examId)) trackFamilyEvent("exam_saved", surface);
    favorites.toggle(examId);
  };

  const renderContent = () => {
    if (route.kind === "exam") {
      const exam = getExam(route.examId);
      if (!exam) return <FindScreen favorites={favorites.ids} onOpen={openExam} onToggleFavorite={toggleFavorite} />;
      return <DetailScreen exam={exam} favorite={favorites.ids.includes(exam.id)} checkedIds={checked.ids} onBack={() => navigateTab(route.from)} onToggleFavorite={toggleFavorite} onToggleChecked={checked.toggle} />;
    }
    if (route.tab === "find") return <FindScreen favorites={favorites.ids} startRecommend={route.recommend} onOpen={openExam} onToggleFavorite={toggleFavorite} />;
    if (route.tab === "schedule") return <ScheduleScreen favoriteIds={favorites.ids} onFind={() => navigateTab("find")} onOpen={openExam} />;
    if (route.tab === "settings") return <SettingsScreen favoriteCount={favorites.ids.length} install={pwaInstall} updateReady={Boolean(applyUpdate)} onApplyUpdate={applyUpdate ?? undefined} onClear={() => { favorites.clear(); checked.clear(); }} />;
    return <HomeScreen favorites={favorites.ids} onFind={() => navigateTab("find")} onRecommend={() => navigateTab("find", true)} onOpen={openExam} onToggleFavorite={toggleFavorite} />;
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <div id="main-content">{renderContent()}</div>
      {applyUpdate && (
        <aside className="update-banner" role="status">
          <span><strong>새 자격증봄이 준비됐어요.</strong><small>저장한 관심 시험은 그대로 유지돼요.</small></span>
          <button type="button" onClick={applyUpdate}>업데이트</button>
        </aside>
      )}
      {route.kind === "tab" && <BottomNav active={activeTab} onChange={navigateTab} />}
    </div>
  );
}
