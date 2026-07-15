// 홈에서 다음 접수와 시험 찾기 행동을 가장 먼저 보여준다.
import { exams, getUpcomingEvents } from "@certbom/core";
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

export function HomeScreen({ favorites, onFind, onRecommend, onOpen, onToggleFavorite }: Props) {
  const upcoming = getUpcomingEvents().slice(0, 3);
  const featured = exams.filter((_, index) => index === 0 || index === 2 || index === 4);

  return (
    <main className="screen home-screen">
      <AppHeader />
      <section className="hero" aria-labelledby="hero-title">
        <p className="hero__kicker">지금 나에게 필요한 자격증부터</p>
        <h2 id="hero-title">어떤 시험을<br /><mark>준비하면 좋을까요?</mark></h2>
        <p>질문 5개에 답하면 추천 이유와 주의점까지 알려드려요.</p>
        <button className="primary-button" type="button" onClick={onRecommend}>나에게 맞는 시험 찾기</button>
        <button className="text-button" type="button" onClick={onFind}>시험 이름으로 직접 찾기</button>
      </section>

      <section className="section-block" aria-labelledby="upcoming-title">
        <div className="section-head">
          <div><p>공식 일정</p><h2 id="upcoming-title">곧 해야 할 일</h2></div>
          <span>{upcoming.length}건</span>
        </div>
        <div className="action-list">
          {upcoming.map(({ exam, event }) => (
            <button type="button" key={event.id} onClick={() => onOpen(exam.id)}>
              <time dateTime={event.startAt}>{formatEventDate(event)}</time>
              <strong>{event.title}</strong>
              <span>{exam.shortName ?? exam.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section-block" aria-labelledby="featured-title">
        <div className="section-head"><div><p>빠르게 둘러보기</p><h2 id="featured-title">많이 찾는 분야</h2></div></div>
        {featured.map((exam) => (
          <ExamCard key={exam.id} exam={exam} favorite={favorites.includes(exam.id)} onOpen={onOpen} onToggleFavorite={onToggleFavorite} compact />
        ))}
      </section>

      <aside className="disclaimer">자격증봄은 공식 시험기관이 아닌 로봄의 일정 편의 서비스입니다. 접수와 응시자격은 시행기관의 최신 공고를 확인하세요.</aside>
    </main>
  );
}
