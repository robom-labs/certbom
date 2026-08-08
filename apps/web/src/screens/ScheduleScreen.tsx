// 관심 시험에서 다가오는 행동과 전체 캘린더 내보내기를 제공한다.
import { createCalendarIcs, eventRelevantUntil, exams, getNextEvent } from "@certbom/core";
import { useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { downloadTextFile } from "../download";
import { formatEventDate, nextAction } from "../format";

type Props = {
  favoriteIds: string[];
  checkedIds: string[];
  onFind: () => void;
  onRecommend: () => void;
  onOpen: (id: string) => void;
};

export function ScheduleScreen({ favoriteIds, checkedIds, onFind, onRecommend, onOpen }: Props) {
  const [exportMessage, setExportMessage] = useState("");
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
  const calendarEntries = favoriteExams
    .flatMap((exam) => exam.events.map((event) => ({ exam, event })))
    .filter(({ event }) => eventRelevantUntil(event) >= Date.now())
    .sort((left, right) => new Date(left.event.startAt).getTime() - new Date(right.event.startAt).getTime());

  const exportCalendar = () => {
    if (calendarEntries.length === 0) return;
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
    downloadTextFile(
      createCalendarIcs(calendarEntries),
      `certbom-saved-schedule-${date}.ics`,
      "text/calendar;charset=utf-8",
    );
    setExportMessage(`${favoriteExams.length}개 시험의 다가오는 일정 ${calendarEntries.length}개를 저장했어요.`);
  };

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
          <section className="schedule-export" aria-labelledby="schedule-export-title">
            <div>
              <span>캘린더로 옮기기</span>
              <h3 id="schedule-export-title">관심 시험 일정 한 번에 저장</h3>
              <p>{favoriteExams.length}개 시험 · 다가오는 일정 {calendarEntries.length}개</p>
            </div>
            <button type="button" onClick={exportCalendar} disabled={calendarEntries.length === 0}>전체 일정 ICS 저장</button>
            <small>저장한 파일은 휴대폰 캘린더에서 열 수 있어요. Google 캘린더는 PC의 가져오기 메뉴에서 추가할 수 있습니다.</small>
            {exportMessage && <p className="schedule-export__feedback" role="status">{exportMessage}</p>}
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
