// 홈에서 현재 접수·공식 일정·시험 찾기 행동을 첫 화면에 모아 보여준다.
import { catalogStats, exams, getUpcomingEventGroups, isApplicationOpen } from "@certbom/core";
import { AppHeader } from "../components/AppHeader";
import { ExamCard } from "../components/ExamCard";
import { formatEventDate } from "../format";

type Props = {
  favorites: string[];
  onFind: () => void;
  onRecommend: () => void;
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string) => void;
};

const featuredIds = ["history-advanced", "information-engineer", "computer-specialist-1"];

export function HomeScreen({ favorites, onFind, onRecommend, onOpen, onToggleFavorite }: Props) {
  const upcoming = getUpcomingEventGroups().slice(0, 4);
  const featured = featuredIds.flatMap((id) => exams.filter((exam) => exam.id === id));
  const openCount = exams.filter((exam) => isApplicationOpen(exam)).length;

  return (
    <main className="screen home-screen">
      <AppHeader />
      <section className="hero" aria-labelledby="hero-title">
        <p className="hero__kicker">공식 일정 기준 · 2026년 7월 확인</p>
        <h2 id="hero-title">지금 접수할 시험부터<br /><mark>바로 찾아보세요.</mark></h2>
        <dl className="hero__stats">
          <div><dt>찾을 수 있는 시험</dt><dd>{catalogStats.examCount}개</dd></div>
          <div><dt>확정 일정 보유</dt><dd>{catalogStats.scheduledExamCount}개</dd></div>
          <div><dt>현재 접수</dt><dd>{openCount}개</dd></div>
        </dl>
        <button className="primary-button" type="button" onClick={onFind}>{catalogStats.examCount}개 시험 검색하기</button>
        <button className="text-button" type="button" onClick={onRecommend}>질문 5개로 추천받기</button>
      </section>

      <section className="section-block" aria-labelledby="upcoming-title">
        <div className="section-head">
          <div><p>접수 중인 일정 우선</p><h2 id="upcoming-title">곧 해야 할 일</h2></div>
          <span>{upcoming.length}건</span>
        </div>
        <div className="action-list">
          {upcoming.map(({ exam, event, exams: groupedExams }) => (
            <button type="button" key={event.groupKey ?? event.id} onClick={() => onOpen(exam.id)}>
              <time dateTime={event.startAt}>{formatEventDate(event)}</time>
              <strong>{event.title}</strong>
              <span>{exam.shortName ?? exam.name}{groupedExams.length > 1 ? ` 외 ${groupedExams.length - 1}개 시험` : ""}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section-block" aria-labelledby="featured-title">
        <div className="section-head"><div><p>빠르게 둘러보기</p><h2 id="featured-title">많이 찾는 시험</h2></div></div>
        {featured.map((exam) => (
          <ExamCard key={exam.id} exam={exam} favorite={favorites.includes(exam.id)} onOpen={onOpen} onToggleFavorite={onToggleFavorite} compact />
        ))}
      </section>

      <aside className="disclaimer">자격증봄은 공식 시험기관이 아닌 로봄의 일정 편의 서비스입니다. 접수와 응시자격은 시행기관의 최신 공고를 확인하세요.</aside>
    </main>
  );
}
