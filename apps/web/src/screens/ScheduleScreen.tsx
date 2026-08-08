// 관심 시험에서 다가오는 행동을 날짜별 agenda로 보여준다.
import { exams, getNextEvent } from "@certbom/core";
import { AppHeader } from "../components/AppHeader";
import { formatEventDate, nextAction } from "../format";

type Props = {
  favoriteIds: string[];
  checkedIds: string[];
  onFind: () => void;
  onRecommend: () => void;
  onOpen: (id: string) => void;
};

export function ScheduleScreen({ favoriteIds, checkedIds, onFind, onRecommend, onOpen }: Props) {
  const favoriteExams = exams
    .filter((exam) => favoriteIds.includes(exam.id))
    .sort((left, right) => {
      const leftAt = getNextEvent(left)?.startAt;
      const rightAt = getNextEvent(right)?.startAt;
      if (!leftAt && !rightAt) return left.name.localeCompare(right.name, "ko");
      if (!leftAt) return 1;
      if (!rightAt) return -1;
      return new Date(leftAt).getTime() - new Date(rightAt).getTime();
    });
  const totalPreparation = favoriteExams.reduce((sum, exam) => sum + exam.preparation.length, 0);
  const checkedPreparation = favoriteExams.reduce(
    (sum, exam) => sum + exam.preparation.filter((item) => checkedIds.includes(item.id)).length,
    0,
  );
  const nextExam = favoriteExams.find((exam) => getNextEvent(exam));

  return (
    <main className="screen schedule-screen">
      <AppHeader compact />
      <div className="page-title"><p>관심 시험 중심</p><h2>내 다음 일정</h2><span>{favoriteExams.length}개 시험</span></div>
      {favoriteExams.length === 0 ? (
        <section className="schedule-empty">
          <p>첫 일정을 만들어 볼까요?</p>
          <h3>시험 하나만 저장하면 접수·시험·발표 순서로 정리해 드려요.</h3>
          <div><button className="primary-button" type="button" onClick={onFind}>시험 찾기</button><button className="ghost-button" type="button" onClick={onRecommend}>시험 추천받기</button></div>
        </section>
      ) : (
        <>
          <section className="schedule-overview" aria-label="내 일정 요약">
            <div><span>저장한 시험</span><strong>{favoriteExams.length}개</strong></div>
            <div><span>가장 가까운 일정</span><strong>{nextExam ? nextAction(nextExam).label : "공고 확인"}</strong></div>
            <div><span>준비 체크</span><strong>{checkedPreparation}/{totalPreparation}</strong></div>
            <progress max={Math.max(totalPreparation, 1)} value={checkedPreparation}>{checkedPreparation}개 완료</progress>
          </section>
          <section className="schedule-agenda" aria-label="저장한 시험 일정">
            {favoriteExams.map((exam) => {
              const action = nextAction(exam);
              const checkedCount = exam.preparation.filter((item) => checkedIds.includes(item.id)).length;
              return (
                <article className="agenda-card" key={exam.id}>
                  <div className="agenda-card__head"><span>{exam.shortName ?? exam.name}</span><small>{exam.sourceName}</small></div>
                  <div className="agenda-card__action"><h3>{action.label}</h3><p>{action.detail}</p></div>
                  {action.event && <time dateTime={action.event.startAt}>{formatEventDate(action.event)}</time>}
                  <div className="agenda-card__progress"><span>준비 {checkedCount}/{exam.preparation.length}</span><progress max={Math.max(exam.preparation.length, 1)} value={checkedCount}>{checkedCount}개 완료</progress></div>
                  <small className="agenda-card__verified">공식 자료 검토 {new Date(exam.lastVerifiedAt).toLocaleDateString("ko-KR")}</small>
                  <button type="button" onClick={() => onOpen(exam.id)}>일정과 준비물 보기</button>
                </article>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}
