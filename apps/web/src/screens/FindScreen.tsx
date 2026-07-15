// 검색·분야 필터와 추천 설문을 한 화면에서 제공한다.
import { useMemo, useState } from "react";
import { exams, recommend, type RecommendationProfile } from "@certbom/core";
import { AppHeader } from "../components/AppHeader";
import { ExamCard } from "../components/ExamCard";

const interests = ["전체", "사무", "IT", "안전", "공무원", "복지"];
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
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string) => void;
};

export function FindScreen({ favorites, startRecommend = false, onOpen, onToggleFavorite }: Props) {
  const [mode, setMode] = useState<"direct" | "recommend">(startRecommend ? "recommend" : "direct");
  const [query, setQuery] = useState("");
  const [interest, setInterest] = useState("전체");
  const [profile, setProfile] = useState(initialProfile);
  const [showResults, setShowResults] = useState(false);

  const filtered = useMemo(() => exams.filter((exam) => {
    const text = `${exam.name} ${exam.shortName ?? ""} ${exam.organizer} ${exam.category}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (interest === "전체" || exam.category.includes(interest));
  }), [interest, query]);

  const results = useMemo(() => recommend(profile), [profile]);

  return (
    <main className="screen find-screen">
      <AppHeader compact />
      <div className="segmented" role="tablist" aria-label="시험 찾기 방식">
        <button type="button" role="tab" aria-selected={mode === "direct"} onClick={() => setMode("direct")}>직접 찾기</button>
        <button type="button" role="tab" aria-selected={mode === "recommend"} onClick={() => setMode("recommend")}>나에게 맞는 시험</button>
      </div>

      {mode === "direct" ? (
        <>
          <label className="search-box">
            <span className="sr-only">시험 검색</span>
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="시험명·기관·분야 검색" />
          </label>
          <fieldset className="filter-chips">
            <legend className="sr-only">분야 필터</legend>
            {interests.map((item) => <button type="button" className={interest === item ? "is-active" : ""} onClick={() => setInterest(item)} key={item}>{item}</button>)}
          </fieldset>
          <p className="result-count" aria-live="polite">확인 가능한 시험 {filtered.length}개</p>
          {filtered.map((exam) => <ExamCard key={exam.id} exam={exam} favorite={favorites.includes(exam.id)} onOpen={onOpen} onToggleFavorite={onToggleFavorite} />)}
        </>
      ) : (
        <section className="recommendation" aria-labelledby="recommend-title">
          <p className="eyebrow">5개 질문 · 약 1분</p>
          <h2 id="recommend-title">지금 상황에 맞춰 좁혀볼게요.</h2>
          <Question label="가장 큰 목표는 무엇인가요?" value={profile.goal} options={["취업", "이직", "재취업", "공무원", "경력활용", "자기계발"]} onChange={(goal) => setProfile({ ...profile, goal })} />
          <Question label="관심 분야를 골라주세요." value={profile.interest} options={interests} onChange={(value) => setProfile({ ...profile, interest: value })} />
          <Question label="준비 가능한 기간은 어느 정도인가요?" value={profile.duration} options={["short", "medium", "long"]} labels={{ short: "3개월 안", medium: "3~6개월", long: "6개월 이상" }} onChange={(duration) => setProfile({ ...profile, duration: duration as RecommendationProfile["duration"] })} />
          <BinaryQuestion label="실기 시험도 준비할 수 있나요?" value={profile.practicalPossible} onChange={(practicalPossible) => setProfile({ ...profile, practicalPossible })} />
          <BinaryQuestion label="경력·학력 같은 응시자격도 확인할까요?" value={profile.eligibilityRestrictedAllowed} onChange={(eligibilityRestrictedAllowed) => setProfile({ ...profile, eligibilityRestrictedAllowed })} />
          <button className="primary-button" type="button" onClick={() => setShowResults(true)}>추천 결과 보기</button>

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
