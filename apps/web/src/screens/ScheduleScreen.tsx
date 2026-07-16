// 관심 시험에서 다가오는 행동을 날짜별 agenda로 보여준다.
import { exams } from "@certbom/core";
import { AppHeader } from "../components/AppHeader";
import { FamilyIcon } from "../components/FamilyIcon";
import { formatEventDate, nextAction } from "../format";

export function ScheduleScreen({ favoriteIds, onFind, onOpen }: { favoriteIds: string[]; onFind: () => void; onOpen: (id: string) => void }) {
  const favoriteExams = exams.filter((exam) => favoriteIds.includes(exam.id));
  return (
    <main className="screen schedule-screen">
      <AppHeader compact />
      <div className="page-title"><p>관심 시험 중심</p><h2>내 다음 일정</h2><span>{favoriteExams.length}개 시험</span></div>
      {favoriteExams.length === 0 ? (
        <section className="empty-state"><FamilyIcon name="calendar" /><h3>아직 저장한 시험이 없어요.</h3><p>관심 시험을 저장하면 다음 접수와 시험일을 여기에 모아드려요.</p><button className="primary-button" type="button" onClick={onFind}>시험 찾으러 가기</button></section>
      ) : favoriteExams.map((exam) => {
        const action = nextAction(exam);
        return <article className="agenda-card" key={exam.id}><div><span>{exam.shortName ?? exam.name}</span><h3>{action.label}</h3><p>{action.detail}</p></div>{action.event && <time dateTime={action.event.startAt}>{formatEventDate(action.event)}</time>}<button type="button" onClick={() => onOpen(exam.id)}>상세 보기</button></article>;
      })}
    </main>
  );
}
