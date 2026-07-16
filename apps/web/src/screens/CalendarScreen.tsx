// 공식 시험 이벤트를 월간 달력과 날짜별 행동 목록으로 보여준다.
import { exams, type Exam, type ExamEvent, type ExamEventType } from "@certbom/core";
import { useMemo, useRef } from "react";
import { AppHeader } from "../components/AppHeader";
import { formatEventDate } from "../format";

export type CalendarScope = "all" | "saved";
export type CalendarEventFilter = "all" | "application" | "exam" | "result" | "change";

export type CalendarState = {
  month: string;
  date: string;
  scope: CalendarScope;
  eventFilter: CalendarEventFilter;
};

type CalendarEntry = {
  id: string;
  date: string;
  exam: Exam;
  event: ExamEvent;
  category: Exclude<CalendarEventFilter, "all">;
  label: string;
  phase: "start" | "end";
};

type CalendarAgendaGroup = {
  id: string;
  entries: CalendarEntry[];
};

const filterLabels: Record<CalendarEventFilter, string> = {
  all: "전체",
  application: "접수",
  exam: "시험·수험표",
  result: "발표",
  change: "변경·취소",
};

function kstDateKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function currentKstDateKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(now);
}

export function currentKstMonth(now = new Date()) {
  return currentKstDateKey(now).slice(0, 7);
}

function eventCategory(type: ExamEventType): Exclude<CalendarEventFilter, "all"> {
  if (type === "application-open" || type === "application-close") return "application";
  if (type === "result") return "result";
  if (type === "changed" || type === "cancelled") return "change";
  return "exam";
}

function endLabel(event: ExamEvent) {
  if (event.type === "application-open" || event.type === "application-close") return `${event.title} 마감`;
  if (event.type === "exam") return `${event.title} 마지막 날`;
  return `${event.title} 종료`;
}

function calendarEntries(sourceExams: Exam[]) {
  return sourceExams.flatMap((exam) => exam.events.flatMap((event) => {
    const startDate = kstDateKey(event.startAt);
    const endDate = event.endAt ? kstDateKey(event.endAt) : startDate;
    const category = eventCategory(event.type);
    const entries: CalendarEntry[] = [{
      id: `${event.id}:start`,
      date: startDate,
      exam,
      event,
      category,
      label: event.title,
      phase: "start",
    }];
    if (endDate !== startDate) {
      entries.push({
        id: `${event.id}:end`,
        date: endDate,
        exam,
        event,
        category,
        label: endLabel(event),
        phase: "end",
      });
    }
    return entries;
  }));
}

function groupAgendaEntries(entries: CalendarEntry[]) {
  const groups = new Map<string, CalendarAgendaGroup>();
  for (const entry of entries) {
    const groupKey = entry.event.groupKey ?? entry.event.id;
    const id = `${entry.date}:${entry.phase}:${groupKey}`;
    const group = groups.get(id);
    if (group) group.entries.push(entry);
    else groups.set(id, { id, entries: [entry] });
  }
  return [...groups.values()];
}

function monthCells(month: string) {
  const [yearPart, monthPart] = month.split("-").map(Number);
  const year = yearPart ?? 1970;
  const monthNumber = monthPart ?? 1;
  const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const previousDays = new Date(Date.UTC(year, monthNumber - 1, 0)).getUTCDate();
  return Array.from({ length: 42 }, (_, index) => {
    const relativeDay = index - firstWeekday + 1;
    let cellYear = year;
    let cellMonth = monthNumber;
    let day = relativeDay;
    let inMonth = true;
    if (relativeDay < 1) {
      cellMonth -= 1;
      if (cellMonth === 0) {
        cellYear -= 1;
        cellMonth = 12;
      }
      day = previousDays + relativeDay;
      inMonth = false;
    } else if (relativeDay > daysInMonth) {
      cellMonth += 1;
      if (cellMonth === 13) {
        cellYear += 1;
        cellMonth = 1;
      }
      day = relativeDay - daysInMonth;
      inMonth = false;
    }
    const date = `${cellYear}-${String(cellMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { date, day, inMonth, weekday: index % 7 };
  });
}

function moveMonth(month: string, delta: number) {
  const [yearPart, monthPart] = month.split("-").map(Number);
  const year = yearPart ?? 1970;
  const monthNumber = monthPart ?? 1;
  const moved = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${moved.getUTCFullYear()}-${String(moved.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const [yearPart, monthPart] = month.split("-").map(Number);
  const year = yearPart ?? 1970;
  const monthNumber = monthPart ?? 1;
  return `${year}년 ${monthNumber}월`;
}

function dateLabel(date: string) {
  const [yearPart, monthPart, dayPart] = date.split("-").map(Number);
  const year = yearPart ?? 1970;
  const month = monthPart ?? 1;
  const day = dayPart ?? 1;
  const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
  return `${month}월 ${day}일 ${weekday}`;
}

export function CalendarScreen({
  favoriteIds,
  state,
  onStateChange,
  onFind,
  onOpen,
}: {
  favoriteIds: string[];
  state: CalendarState;
  onStateChange: (state: CalendarState) => void;
  onFind: () => void;
  onOpen: (id: string) => void;
}) {
  const agendaRef = useRef<HTMLElement>(null);
  const sourceExams = useMemo(
    () => state.scope === "saved" ? exams.filter((exam) => favoriteIds.includes(exam.id)) : exams,
    [favoriteIds, state.scope],
  );
  const entries = useMemo(() => calendarEntries(sourceExams), [sourceExams]);
  const filteredEntries = state.eventFilter === "all"
    ? entries
    : entries.filter((entry) => entry.category === state.eventFilter);
  const entriesByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEntry[]>();
    for (const entry of filteredEntries) {
      const group = grouped.get(entry.date) ?? [];
      group.push(entry);
      grouped.set(entry.date, group);
    }
    return grouped;
  }, [filteredEntries]);
  const selectedEntries = entriesByDate.get(state.date) ?? [];
  const selectedGroups = groupAgendaEntries(selectedEntries);
  const today = currentKstDateKey();
  const cells = monthCells(state.month);

  const update = (patch: Partial<CalendarState>, focusAgenda = false) => {
    onStateChange({ ...state, ...patch });
    if (focusAgenda) {
      window.requestAnimationFrame(() => {
        agendaRef.current?.focus({ preventScroll: true });
        agendaRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
      });
    }
  };

  const changeMonth = (delta: number) => {
    const month = moveMonth(state.month, delta);
    update({ month, date: `${month}-01` });
  };

  const goToday = () => update({ month: today.slice(0, 7), date: today }, true);

  return (
    <main className="screen calendar-screen">
      <AppHeader compact />
      <div className="page-title calendar-page-title">
        <p>접수부터 발표까지</p>
        <h2>시험 달력</h2>
        <span>{sourceExams.length}개 시험</span>
      </div>

      <div className="calendar-layout">
        <section className="exam-calendar" aria-labelledby="calendar-month-title">
          <div className="calendar-toolbar">
            <button type="button" aria-label="이전 달" onClick={() => changeMonth(-1)}>‹</button>
            <h3 id="calendar-month-title">{monthLabel(state.month)}</h3>
            <button type="button" aria-label="다음 달" onClick={() => changeMonth(1)}>›</button>
          </div>
          <div className="calendar-quick-actions">
            <button type="button" onClick={goToday}>오늘</button>
            <button
              type="button"
              aria-pressed={state.scope === "all"}
              onClick={() => update({ scope: "all" })}
            >
              전체 시험
            </button>
            <button
              type="button"
              aria-pressed={state.scope === "saved"}
              onClick={() => update({ scope: "saved" })}
            >
              관심 시험
            </button>
          </div>
          <fieldset className="calendar-filters">
            <legend className="sr-only">시험 일정 종류</legend>
            {(Object.keys(filterLabels) as CalendarEventFilter[]).map((filter) => (
              <button
                type="button"
                key={filter}
                aria-pressed={state.eventFilter === filter}
                onClick={() => update({ eventFilter: filter })}
              >
                {filterLabels[filter]}
              </button>
            ))}
          </fieldset>
          <div className="calendar-weekdays" aria-hidden="true">
            {["일", "월", "화", "수", "목", "금", "토"].map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>
          <fieldset className="calendar-grid">
            <legend className="sr-only">{monthLabel(state.month)} 시험 일정</legend>
            {cells.map((cell) => {
              const dayEntries = entriesByDate.get(cell.date) ?? [];
              return (
                <button
                  type="button"
                  key={cell.date}
                  className={`${cell.inMonth ? "" : "is-outside "}${cell.date === today ? "is-today " : ""}${cell.date === state.date ? "is-selected" : ""}`}
                  aria-label={`${dateLabel(cell.date)}${dayEntries.length ? `, 일정 ${dayEntries.length}건` : ", 일정 없음"}`}
                  aria-pressed={cell.date === state.date}
                  onClick={() => update({ date: cell.date, month: cell.date.slice(0, 7) }, true)}
                >
                  <span>{cell.day}</span>
                  <span className="calendar-markers" aria-hidden="true">
                    {dayEntries.slice(0, 3).map((entry) => <i key={entry.id} className={`marker-${entry.category}`} />)}
                  </span>
                  {dayEntries.length > 0 && <small>{dayEntries.length}</small>}
                </button>
              );
            })}
          </fieldset>
          <fieldset className="calendar-legend">
            <legend className="sr-only">달력 표시 설명</legend>
            <span><i className="marker-application" />접수</span>
            <span><i className="marker-exam" />시험·수험표</span>
            <span><i className="marker-result" />발표</span>
            <span><i className="marker-change" />변경·취소</span>
          </fieldset>
        </section>

        <section
          className="calendar-agenda"
          ref={agendaRef}
          tabIndex={-1}
          aria-labelledby="calendar-agenda-title"
        >
          <div className="section-head">
            <div><p>{state.scope === "saved" ? "관심 시험 일정" : "공식 일정"}</p><h2 id="calendar-agenda-title">{dateLabel(state.date)}</h2></div>
            <span>{selectedGroups.length}건</span>
          </div>
          {state.scope === "saved" && favoriteIds.length === 0 ? (
            <div className="inline-empty calendar-empty">
              <strong>아직 관심 시험이 없어요.</strong>
              <p>시험을 저장하면 접수·시험·발표 일정을 이 달력에서 따로 볼 수 있어요.</p>
              <button className="ghost-button" type="button" onClick={onFind}>시험 찾기</button>
            </div>
          ) : selectedGroups.length ? (
            <div className="calendar-agenda-list">
              {selectedGroups.map((group) => {
                const first = group.entries[0];
                if (!first) return null;
                if (group.entries.length === 1) {
                  return (
                    <button type="button" key={group.id} onClick={() => onOpen(first.exam.id)}>
                      <span className={`calendar-event-badge badge-${first.category}`}>{filterLabels[first.category]}</span>
                      <span><strong>{first.exam.name}</strong><small>{first.label}</small></span>
                      <time dateTime={first.event.startAt}>{formatEventDate(first.event)}</time>
                    </button>
                  );
                }
                return (
                  <details className="calendar-agenda-group" key={group.id}>
                    <summary>
                      <span className={`calendar-event-badge badge-${first.category}`}>{filterLabels[first.category]}</span>
                      <span><strong>{first.label}</strong><small>{group.entries.length}개 시험 · 눌러서 목록 보기</small></span>
                      <time dateTime={first.event.startAt}>{formatEventDate(first.event)}</time>
                    </summary>
                    <div>
                      {group.entries.map((entry) => (
                        <button type="button" key={entry.id} onClick={() => onOpen(entry.exam.id)}>
                          <strong>{entry.exam.name}</strong>
                          <small>{entry.exam.sourceName}</small>
                        </button>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          ) : (
            <div className="inline-empty calendar-empty">
              <strong>이 날짜에는 선택한 종류의 일정이 없어요.</strong>
              <p>다른 날짜를 누르거나 전체 일정 필터로 바꿔 보세요.</p>
              <button className="ghost-button" type="button" onClick={() => update({ eventFilter: "all" })}>전체 일정 보기</button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
