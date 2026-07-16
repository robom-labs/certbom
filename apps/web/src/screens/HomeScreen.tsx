// 홈에서 현재 접수·공식 일정·시험 찾기 행동을 첫 화면에 모아 보여준다.
import {
  CATALOG_UPDATED_AT,
  catalogStats,
  exams,
  getHomeSummaryExams,
  getNextEvent,
  getUpcomingEventGroups,
  type HomeSummaryFilter,
} from "@certbom/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { ExamCard } from "../components/ExamCard";
import { examStatusLabel, formatEventDate } from "../format";

type Props = {
  selectedFilter: HomeSummaryFilter;
  favorites: string[];
  onFilterChange: (filter: HomeSummaryFilter) => void;
  onFind: () => void;
  onRecommend: () => void;
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string) => void;
};

const featuredIds = ["history-advanced", "information-engineer", "computer-specialist-1"];

const summaryLabels: Record<HomeSummaryFilter, { label: string; title: string; empty: string }> = {
  all: { label: "전체 시험", title: "찾을 수 있는 전체 시험", empty: "등록된 시험이 없어요." },
  open: { label: "현재 접수", title: "지금 접수할 수 있는 시험", empty: "현재 접수 중인 시험이 없어요." },
  upcoming: { label: "곧 시험", title: "14일 안에 시험이 있는 종목", empty: "14일 안에 예정된 시험이 없어요." },
};

function verifiedMonth() {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    timeZone: "Asia/Seoul",
  }).format(new Date(CATALOG_UPDATED_AT));
}

export function HomeScreen({ selectedFilter, favorites, onFilterChange, onFind, onRecommend, onOpen, onToggleFavorite }: Props) {
  const [expandedGroup, setExpandedGroup] = useState<string>();
  const resultsRef = useRef<HTMLElement>(null);
  const mounted = useRef(false);
  const upcoming = getUpcomingEventGroups().slice(0, 4);
  const featured = featuredIds.flatMap((id) => exams.filter((exam) => exam.id === id));
  const summaryExams = useMemo(() => getHomeSummaryExams(selectedFilter), [selectedFilter]);
  const summaryCounts = useMemo(() => ({
    all: catalogStats.examCount,
    open: getHomeSummaryExams("open").length,
    upcoming: getHomeSummaryExams("upcoming").length,
  }), []);
  const visibleSummaryExams = summaryExams.slice(0, 8);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const target = resultsRef.current;
    if (!target) return;
    target.dataset.activeFilter = selectedFilter;
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }, [selectedFilter]);

  return (
    <main className="screen home-screen">
      <AppHeader />
      <section className="hero" aria-labelledby="hero-title">
        <p className="hero__kicker">공식 일정 기준 · {verifiedMonth()} 확인</p>
        <h2 id="hero-title">지금 접수할 시험부터<br /><mark>바로 찾아보세요.</mark></h2>
        <fieldset className="hero__stats">
          <legend className="sr-only">홈 시험 목록 필터</legend>
          {(["all", "open", "upcoming"] as const).map((filter) => (
            <button
              type="button"
              key={filter}
              aria-pressed={selectedFilter === filter}
              aria-controls="home-summary-results"
              onClick={() => onFilterChange(filter)}
            >
              <span>{summaryLabels[filter].label}</span>
              <strong>{summaryCounts[filter]}개</strong>
            </button>
          ))}
        </fieldset>
        <button className="primary-button" type="button" onClick={onFind}>{catalogStats.examCount}개 시험 검색하기</button>
        <button className="text-button" type="button" onClick={onRecommend}>질문 5개로 추천받기</button>
      </section>

      <section
        className="home-summary-results"
        id="home-summary-results"
        ref={resultsRef}
        tabIndex={-1}
        aria-labelledby="home-summary-title"
      >
        <div className="section-head">
          <div><p>{summaryLabels[selectedFilter].label} 선택됨</p><h2 id="home-summary-title">{summaryLabels[selectedFilter].title}</h2></div>
          <span>{summaryExams.length}건</span>
        </div>
        {visibleSummaryExams.length ? (
          <div className="summary-exam-list">
            {visibleSummaryExams.map((exam) => {
              const nextEvent = getNextEvent(exam);
              return (
                <button type="button" key={exam.id} onClick={() => onOpen(exam.id)}>
                  <span><strong>{exam.name}</strong><small>{exam.sourceName}</small></span>
                  <span><em>{examStatusLabel(exam)}</em><small>{nextEvent ? formatEventDate(nextEvent) : "공식 원문에서 일정 확인"}</small></span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="inline-empty home-summary-empty">
            <strong>{summaryLabels[selectedFilter].empty}</strong>
            <p>공식 일정이 추가되면 이 목록에 자동으로 반영돼요.</p>
            <button className="ghost-button" type="button" onClick={() => onFilterChange("all")}>전체 시험 보기</button>
          </div>
        )}
        {visibleSummaryExams.length < summaryExams.length && (
          <button className="load-more-button" type="button" onClick={onFind}>시험 찾기에서 {summaryExams.length}개 모두 보기</button>
        )}
      </section>

      <section className="section-block" aria-labelledby="upcoming-title">
        <div className="section-head">
          <div><p>접수 중인 일정 우선</p><h2 id="upcoming-title">곧 해야 할 일</h2></div>
          <span>{upcoming.length}건</span>
        </div>
        <div className="action-list">
          {upcoming.map(({ exam, event, exams: groupedExams }) => {
            const groupId = event.groupKey ?? event.id;
            const expanded = expandedGroup === groupId;
            const grouped = groupedExams.length > 1;
            return (
              <div className="action-group" key={groupId}>
                <button
                  type="button"
                  aria-expanded={grouped ? expanded : undefined}
                  aria-controls={grouped ? `group-${groupId}` : undefined}
                  onClick={() => grouped ? setExpandedGroup(expanded ? undefined : groupId) : onOpen(exam.id)}
                >
                  <time dateTime={event.startAt}>{formatEventDate(event)}</time>
                  <strong>{event.title}</strong>
                  <span>{exam.shortName ?? exam.name}{grouped ? ` 외 ${groupedExams.length - 1}개 시험 · 눌러서 목록 보기` : ""}</span>
                </button>
                {grouped && expanded && (
                  <fieldset className="grouped-exams" id={`group-${groupId}`}>
                    <legend className="sr-only">{event.title} 포함 시험 {groupedExams.length}개</legend>
                    {groupedExams.map((groupedExam) => (
                      <button type="button" key={groupedExam.id} onClick={() => onOpen(groupedExam.id)}>
                        <strong>{groupedExam.name}</strong>
                        <span>{event.type === "application-open" ? "접수" : event.type === "exam" ? "시험" : "일정"} · {groupedExam.sourceName}</span>
                      </button>
                    ))}
                  </fieldset>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="section-block featured-section" aria-labelledby="featured-title">
        <div className="section-head"><div><p>빠르게 둘러보기</p><h2 id="featured-title">많이 찾는 시험</h2></div></div>
        {featured.map((exam) => (
          <ExamCard key={exam.id} exam={exam} favorite={favorites.includes(exam.id)} onOpen={onOpen} onToggleFavorite={onToggleFavorite} compact />
        ))}
      </section>

      <aside className="disclaimer">자격증봄은 공식 시험기관이 아닌 로봄의 일정 편의 서비스입니다. 접수와 응시자격은 시행기관의 최신 공고를 확인하세요.</aside>
    </main>
  );
}
