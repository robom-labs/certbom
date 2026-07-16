// 검색·상태 필터·추천 설문으로 많은 시험을 모바일에서 빠르게 좁힌다.

import { catalogStats, type Exam, exams, getNextEvent, isApplicationOpen, type RecommendationProfile, recommend } from "@certbom/core";
import { useEffect, useMemo, useState } from "react";
import { trackFamilyEvent } from "../analytics";
import { AppHeader } from "../components/AppHeader";
import { ExamCard } from "../components/ExamCard";
import { FamilyIcon } from "../components/FamilyIcon";

const recommendationInterests = ["전체", "사무", "IT", "안전", "공무원", "복지", "데이터", "회계"];
const PAGE_SIZE = 12;

const filters: Array<{ id: string; label: string; matches: (exam: Exam, now: Date) => boolean }> = [
  { id: "all", label: "전체", matches: () => true },
  { id: "open", label: "지금 접수", matches: (exam, now) => isApplicationOpen(exam, now) },
  { id: "scheduled", label: "일정 있음", matches: (exam, now) => Boolean(getNextEvent(exam, now)) },
  { id: "it", label: "IT·데이터", matches: (exam) => /IT|데이터|AI|코딩/.test(exam.category) },
  { id: "office", label: "사무·경영", matches: (exam) => /사무|경영|회계|세무/.test(exam.category) },
  { id: "technical", label: "안전·기술", matches: (exam) => /안전|기술|전기|건설|기계|환경|에너지|소방/.test(exam.category) },
  { id: "public", label: "공공·상담", matches: (exam) => /공공|공무원|복지|상담|교육/.test(exam.category) },
  { id: "service", label: "관광·서비스", matches: (exam) => /관광|서비스|생활|뷰티|식품/.test(exam.category) },
];

const initialProfile: RecommendationProfile = {
  goal: "취업",
  interest: "전체",
  duration: "short",
  practicalPossible: true,
  eligibilityRestrictedAllowed: false,
};

type Props = {
  favorites: string[];
  startRecommend?: boolean;
  initialQuery?: string;
  initialFilter?: string;
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onStateChange?: (query: string, filterId: string) => void;
};

function sanitizeFilterId(value: string) {
  return filters.some((item) => item.id === value) ? value : "all";
}

function priority(exam: Exam, now: Date) {
  if (isApplicationOpen(exam, now)) return 0;
  const event = getNextEvent(exam, now);
  if (event?.type === "application-open") return 1;
  if (event) return 2;
  if (exam.scheduleType === "rolling") return 3;
  return 4;
}

export function FindScreen({ favorites, startRecommend = false, initialQuery = "", initialFilter = "all", onOpen, onToggleFavorite, onStateChange }: Props) {
  const [mode, setMode] = useState<"direct" | "recommend">(startRecommend ? "recommend" : "direct");
  const [query, setQuery] = useState(initialQuery);
  const [filterId, setFilterId] = useState(() => sanitizeFilterId(initialFilter));
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [profile, setProfile] = useState(initialProfile);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    // 뒤로 가기·해시 변경으로 URL이 바뀌면 검색어·필터 상태를 URL과 다시 맞춘다.
    setQuery(initialQuery);
    setFilterId(sanitizeFilterId(initialFilter));
  }, [initialQuery, initialFilter]);

  const filtered = useMemo(() => {
    const now = new Date();
    const filter = filters.find((item) => item.id === filterId);
    const keyword = query.trim().toLocaleLowerCase("ko");
    return exams
      .filter((exam) => {
        const text = [exam.name, exam.shortName, ...exam.aliases, exam.organizer, exam.category, exam.sourceName].filter(Boolean).join(" ").toLocaleLowerCase("ko");
        return text.includes(keyword) && (filter?.matches(exam, now) ?? true);
      })
      .sort((a, b) => priority(a, now) - priority(b, now) || a.name.localeCompare(b.name, "ko"));
  }, [filterId, query]);

  const results = useMemo(() => recommend(profile), [profile]);
  const visible = filtered.slice(0, visibleCount);

  const updateQuery = (value: string) => {
    setQuery(value);
    setVisibleCount(PAGE_SIZE);
    onStateChange?.(value, filterId);
  };

  const updateFilter = (value: string) => {
    setFilterId(value);
    setVisibleCount(PAGE_SIZE);
    onStateChange?.(query, value);
  };

  return (
    <main className="screen find-screen">
      <AppHeader compact />
      <div className="segmented" role="tablist" aria-label="시험 찾기 방식">
        <button type="button" role="tab" aria-selected={mode === "direct"} onClick={() => setMode("direct")}>직접 찾기</button>
        <button type="button" role="tab" aria-selected={mode === "recommend"} onClick={() => setMode("recommend")}>나에게 맞는 시험</button>
      </div>

      {mode === "direct" ? (
        <>
          <section className="catalog-summary" aria-label="시험 데이터 현황">
            <div><strong>{catalogStats.examCount}</strong><span>전체 시험</span></div>
            <div><strong>{catalogStats.scheduledExamCount}</strong><span>일정 확인</span></div>
            <div><strong>{catalogStats.sourceCount}</strong><span>공식 출처</span></div>
          </section>
          <label className="search-box">
            <span className="sr-only">시험 검색</span>
            <FamilyIcon name="search" />
            <input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="시험명·별칭·기관·분야 검색" />
          </label>
          <fieldset className="filter-chips">
            <legend className="sr-only">시험 상태와 분야 필터</legend>
            {filters.map((item) => <button type="button" className={filterId === item.id ? "is-active" : ""} onClick={() => updateFilter(item.id)} key={item.id}>{item.label}</button>)}
          </fieldset>
          <p className="result-count" aria-live="polite">조건에 맞는 시험 {filtered.length}개 · 접수 중과 가까운 일정 순</p>
          {visible.map((exam) => <ExamCard key={exam.id} exam={exam} favorite={favorites.includes(exam.id)} onOpen={onOpen} onToggleFavorite={onToggleFavorite} />)}
          {filtered.length === 0 && <section className="inline-empty search-empty"><strong>검색 결과가 없어요.</strong><p>약칭이나 기관명으로 다시 검색해 보세요.</p></section>}
          {visible.length < filtered.length && <button className="load-more-button" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>시험 {Math.min(PAGE_SIZE, filtered.length - visible.length)}개 더 보기</button>}
        </>
      ) : (
        <section className="recommendation" aria-labelledby="recommend-title">
          <p className="eyebrow">5개 질문 · 약 1분</p>
          <h2 id="recommend-title">지금 상황에 맞춰 좁혀볼게요.</h2>
          <Question label="가장 큰 목표는 무엇인가요?" value={profile.goal} options={["취업", "이직", "재취업", "공무원", "경력활용", "자기계발"]} onChange={(goal) => setProfile({ ...profile, goal })} />
          <Question label="관심 분야를 골라주세요." value={profile.interest} options={recommendationInterests} onChange={(value) => setProfile({ ...profile, interest: value })} />
          <Question label="준비 가능한 기간은 어느 정도인가요?" value={profile.duration} options={["short", "medium", "long"]} labels={{ short: "3개월 안", medium: "3~6개월", long: "6개월 이상" }} onChange={(duration) => setProfile({ ...profile, duration: duration as RecommendationProfile["duration"] })} />
          <BinaryQuestion label="실기 시험도 준비할 수 있나요?" value={profile.practicalPossible} onChange={(practicalPossible) => setProfile({ ...profile, practicalPossible })} />
          <BinaryQuestion label="경력·학력 같은 응시자격도 확인할까요?" value={profile.eligibilityRestrictedAllowed} onChange={(eligibilityRestrictedAllowed) => setProfile({ ...profile, eligibilityRestrictedAllowed })} />
          <button className="primary-button" type="button" onClick={() => { trackFamilyEvent("recommendation_completed", "recommendation"); setShowResults(true); }}>추천 결과 보기</button>

          {showResults && (
            <div className="recommend-results" aria-live="polite">
              <div className="section-head"><div><p>추천 규칙 {results[0]?.ruleVersion}</p><h2>먼저 볼 시험 3개</h2></div></div>
              {results.slice(0, 3).map((item, index) => (
                <article className="recommend-card" key={item.exam.id}>
                  <span>{index + 1}순위</span>
                  <h3>{item.exam.name}</h3>
                  <ul>{item.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                  <p>{item.cautions[0]}</p>
                  <button type="button" onClick={() => onOpen(item.exam.id)}>일정과 준비물 보기</button>
                </article>
              ))}
              <details className="more-results">
                <summary>추가 후보 7개 보기</summary>
                {results.slice(3, 10).map((item) => <button key={item.exam.id} type="button" onClick={() => onOpen(item.exam.id)}><strong>{item.exam.name}</strong><span>{item.reasons[0] ?? item.exam.category}</span></button>)}
              </details>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function Question({ label, value, options, labels = {}, onChange }: { label: string; value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return <fieldset className="question"><legend>{label}</legend><div>{options.map((option) => <button type="button" aria-pressed={value === option} onClick={() => onChange(option)} key={option}>{labels[option] ?? option}</button>)}</div></fieldset>;
}

function BinaryQuestion({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <fieldset className="question"><legend>{label}</legend><div><button type="button" aria-pressed={value} onClick={() => onChange(true)}>네, 가능해요</button><button type="button" aria-pressed={!value} onClick={() => onChange(false)}>아니요, 피하고 싶어요</button></div></fieldset>;
}
