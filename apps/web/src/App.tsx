// 자격증봄의 화면 이동과 기기 저장 상태를 통합한다.
import { useEffect, useState } from "react";
import { getExam, type HomeSummaryFilter, migratePreparationIds } from "@certbom/core";
import { trackFamilyEvent } from "./analytics";
import { BottomNav, type Tab } from "./components/BottomNav";
import { usePwaInstall } from "./pwa-install";
import { DetailScreen } from "./screens/DetailScreen";
import { FindScreen } from "./screens/FindScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { ScheduleScreen } from "./screens/ScheduleScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { useStoredIds } from "./storage";

type Route =
  | { kind: "tab"; tab: Tab; recommend?: boolean; homeFilter?: HomeSummaryFilter }
  | { kind: "exam"; examId: string; from: Tab; homeFilter?: HomeSummaryFilter };

const tabs: Tab[] = ["home", "find", "schedule", "settings"];
const homeFilters: HomeSummaryFilter[] = ["all", "open", "upcoming"];

function parseTab(value: string | null): Tab {
  return tabs.includes(value as Tab) ? value as Tab : "find";
}

function parseHomeFilter(value: string | null): HomeSummaryFilter {
  return homeFilters.includes(value as HomeSummaryFilter) ? value as HomeSummaryFilter : "open";
}

function homeHash(filter: HomeSummaryFilter) {
  return `home?filter=${filter}`;
}

function readRoute(): Route {
  const value = window.location.hash.replace(/^#\/?/, "");
  const [path = "", query = ""] = value.split("?");
  const params = new URLSearchParams(query);
  if (path.startsWith("exam/")) {
    return {
      kind: "exam",
      examId: path.slice(5),
      from: parseTab(params.get("from")),
      homeFilter: parseHomeFilter(params.get("filter")),
    };
  }
  if (path === "recommend") return { kind: "tab", tab: "find", recommend: true };
  if (path === "home") return { kind: "tab", tab: "home", homeFilter: parseHomeFilter(params.get("filter")) };
  if (tabs.includes(path as Tab)) return { kind: "tab", tab: path as Tab };
  return { kind: "tab", tab: "home", homeFilter: "open" };
}

export function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [applyUpdate, setApplyUpdate] = useState<null | (() => void)>(null);
  const favorites = useStoredIds("certbom-favorites-v1");
  const checked = useStoredIds("certbom-preparation-v2", {
    migrateFromKey: "certbom-preparation-v1",
    migrate: migratePreparationIds,
  });
  const pwaInstall = usePwaInstall();
  const activeTab = route.kind === "tab" ? route.tab : route.from;

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${homeHash("open")}`);
      setRoute(readRoute());
    }
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

  const navigateTab = (tab: Tab, recommend = false, filter: HomeSummaryFilter = "open") => {
    if (recommend) trackFamilyEvent("recommendation_started", "home");
    window.location.hash = recommend ? "recommend" : tab === "home" ? homeHash(filter) : tab;
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const openExam = (examId: string) => {
    const from = route.kind === "tab" ? route.tab : route.from;
    const filter = route.kind === "tab" && route.tab === "home" ? route.homeFilter ?? "open" : route.homeFilter ?? "open";
    const originHash = from === "home" ? homeHash(filter) : from;
    try {
      window.sessionStorage.setItem(`certbom-scroll:${originHash}`, String(window.scrollY));
    } catch {
      // 세션 저장이 막혀도 화면 이동은 계속한다.
    }
    const params = new URLSearchParams({ from });
    if (from === "home") params.set("filter", filter);
    trackFamilyEvent("exam_opened", `${from}-catalog`);
    window.location.hash = `exam/${examId}?${params.toString()}`;
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const returnToOrigin = (examRoute: Extract<Route, { kind: "exam" }>) => {
    const target = examRoute.from === "home" ? homeHash(examRoute.homeFilter ?? "open") : examRoute.from;
    window.location.hash = target;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        let top = 0;
        try {
          top = Number(window.sessionStorage.getItem(`certbom-scroll:${target}`) ?? "0");
        } catch {
          top = 0;
        }
        window.scrollTo({ top: Number.isFinite(top) ? top : 0, behavior: "auto" });
      });
    });
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
      return <DetailScreen exam={exam} favorite={favorites.ids.includes(exam.id)} checkedIds={checked.ids} storageError={checked.saveFailed} onBack={() => returnToOrigin(route)} onToggleFavorite={toggleFavorite} onToggleChecked={checked.toggle} />;
    }
    if (route.tab === "find") return <FindScreen favorites={favorites.ids} startRecommend={route.recommend} onOpen={openExam} onToggleFavorite={toggleFavorite} />;
    if (route.tab === "schedule") return <ScheduleScreen favoriteIds={favorites.ids} onFind={() => navigateTab("find")} onOpen={openExam} />;
    if (route.tab === "settings") return <SettingsScreen favoriteCount={favorites.ids.length} install={pwaInstall} updateReady={Boolean(applyUpdate)} onApplyUpdate={applyUpdate ?? undefined} onClear={() => { favorites.clear(); checked.clear(); }} />;
    return <HomeScreen selectedFilter={route.homeFilter ?? "open"} favorites={favorites.ids} onFilterChange={(filter) => navigateTab("home", false, filter)} onFind={() => navigateTab("find")} onRecommend={() => navigateTab("find", true)} onOpen={openExam} onToggleFavorite={toggleFavorite} />;
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
