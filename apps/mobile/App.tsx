// 자격증봄의 홈·시험 찾기·달력·알림·설정과 Android 뒤로가기를 네이티브 흐름으로 제공한다.
import {
  CATALOG_DATA_VERSION,
  catalogStats,
  createGoogleCalendarUrl,
  exams,
  getExam,
  getExamAttempts,
  getHomeSummaryExams,
  getNextAttemptEvent,
  getNextEvent,
  getOfficialExamActions,
  getUpcomingAttemptEvents,
  getUpcomingEvents,
  isApplicationOpen,
  type Exam,
  type ExamEvent,
  type HomeSummaryFilter,
} from "@certbom/core";
import * as IntentLauncher from "expo-intent-launcher";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  BackHandler,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getAdaptiveLayout } from "./src/adaptive-layout";
import { BomMark, NativeIcon, type NativeIconName } from "./src/brand";
import { parseExamDeepLink } from "./src/deep-link";
import { journeyNextAction, journeyStageLabel, journeyStages } from "./src/journey";
import {
  cancelCertbomRemindersForExam,
  configureNotificationPresentation,
  getScheduledCertbomReminders,
  reconcileCertbomReminders,
  scheduleExamReminder,
} from "./src/notifications";
import { createExamReminderPlans, type ReminderDaysBefore, type ReminderScope } from "./src/reminder";
import {
  loadExamJourneys,
  loadExamAttemptSelections,
  loadFavoriteExamIds,
  loadPreparationCheckedIds,
  loadReminderExamIds,
  loadReminderPreferences,
  saveExamJourneys,
  saveExamAttemptSelections,
  saveFavoriteExamIds,
  savePreparationCheckedIds,
  saveReminderExamIds,
  saveReminderPreferences,
  saveSelectedExamId,
  type ExamJourneyStage,
  type StoredExamAttemptSelection,
  type StoredExamJourney,
  type StoredReminderPreference,
} from "./src/storage";

type TabId = "home" | "find" | "calendar" | "reminders" | "settings";

const ROBOM_URL = "https://robom.kr/";
const SUPPORT_URL = process.env.EXPO_PUBLIC_SUPPORT_URL ?? "https://robom.kr/support";
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? "https://robom.kr/privacy/certbom";
const FAMILY_APPS = [
  { id: "outbom", name: "야외봄", description: "지금 나가도 되는 날씨", url: "https://robom.kr/get/outbom" },
  { id: "homebom", name: "청약봄", description: "청약 접수와 발표 일정", url: "https://robom.kr/get/homebom" },
  { id: "runningbom", name: "러닝봄", description: "달리기 대회 접수 일정", url: "https://robom.kr/get/runningbom" },
] as const;

const tabs: { id: TabId; icon: NativeIconName; label: string }[] = [
  { id: "home", icon: "home", label: "홈" },
  { id: "find", icon: "search", label: "찾기" },
  { id: "calendar", icon: "calendar", label: "달력" },
  { id: "reminders", icon: "bell", label: "내 시험" },
  { id: "settings", icon: "settings", label: "설정" },
];

const eventLabels: Record<ExamEvent["type"], string> = {
  "application-open": "접수 시작",
  "application-close": "접수 마감",
  ticket: "수험표",
  venue: "시험장",
  exam: "시험",
  result: "발표",
  changed: "변경",
  cancelled: "취소",
};

function useCertbomLayout() {
  const { fontScale, width } = useWindowDimensions();
  return useMemo(() => getAdaptiveLayout(width, fontScale), [fontScale, width]);
}

function adaptiveContentStyle(layout: ReturnType<typeof getAdaptiveLayout>, paddingBottom = 116) {
  return [
    styles.screenContent,
    {
      maxWidth: layout.contentMaxWidth,
      paddingBottom,
      paddingHorizontal: layout.horizontalPadding,
    },
  ];
}

function normalize(value: string) {
  return value.toLocaleLowerCase("ko-KR").replaceAll(" ", "");
}

function formatDate(value: string, includeYear = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "공식 일정 확인";
  return date.toLocaleDateString("ko-KR", {
    ...(includeYear ? { year: "numeric" as const } : {}),
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul",
  });
}

function formatReminderDate(value: Date) {
  return value.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });
}

function dateKey(value: string) {
  return value.slice(0, 10);
}

function currentKstDateKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(now);
}

function currentKstMonth() {
  return currentKstDateKey().slice(0, 7);
}

function daysUntil(value: string) {
  const today = currentKstDateKey();
  const target = dateKey(value);
  const day = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(`${target}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / day);
}

function dDayLabel(value: string) {
  const days = daysUntil(value);
  if (days === 0) return "D-Day";
  return days > 0 ? `D-${days}` : `D+${Math.abs(days)}`;
}

function monthLabel(month: string) {
  const [year, value] = month.split("-").map(Number);
  return `${year}년 ${value}월`;
}

function shiftMonth(month: string, amount: number) {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, value - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthCells(month: string) {
  const [year, value] = month.split("-").map(Number);
  const leading = new Date(Date.UTC(year, value - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, value, 0)).getUTCDate();
  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: days }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`),
  ];
}

function eventAccent(type: ExamEvent["type"]) {
  if (type === "application-open" || type === "application-close") return "#e76f2e";
  if (type === "exam") return "#4058d8";
  if (type === "result") return "#18794e";
  return "#7a6ca8";
}

function scheduledCountMap(items: Awaited<ReturnType<typeof getScheduledCertbomReminders>>) {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.examId] = (counts[item.examId] ?? 0) + 1;
    return counts;
  }, {});
}

function BrandHeader({ compact = false, onOpenRobom }: { compact?: boolean; onOpenRobom: () => void }) {
  const layout = useCertbomLayout();
  return (
    <Pressable
      accessibilityHint="로봄 공식 홈페이지를 브라우저에서 엽니다"
      accessibilityLabel="자격증봄 로봄 홈페이지 열기"
      accessibilityRole="link"
      onPress={onOpenRobom}
      style={({ pressed }) => [styles.brandHeader, { maxWidth: layout.contentMaxWidth, paddingHorizontal: layout.horizontalPadding }, compact && styles.brandHeaderCompact, pressed && styles.pressed]}
    >
      <View style={styles.brandIcon}><Text style={styles.brandIconText}>✓</Text></View>
      <View style={styles.brandCopy}>
        {!compact && <Text style={styles.brandEyebrow}>robom · 놓치지 않는 시험 준비</Text>}
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmarkText}>자격증</Text>
          <BomMark width={54} />
        </View>
      </View>
      <View style={styles.robomLink}><Text style={styles.robomLinkText}>로봄</Text><NativeIcon color="#4058d8" name="external" size={16} /></View>
    </Pressable>
  );
}

function SectionTitle({ count, eyebrow, title }: { count?: number; eyebrow: string; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View><Text style={styles.sectionEyebrow}>{eyebrow}</Text><Text style={styles.sectionTitle}>{title}</Text></View>
      {typeof count === "number" && <Text style={styles.sectionCount}>{count}건</Text>}
    </View>
  );
}

function ExamRow({ exam, favorite, onPress }: { exam: Exam; favorite: boolean; onPress: () => void }) {
  const next = getNextEvent(exam);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.examRow, pressed && styles.pressed]}>
      <View style={styles.examRowCopy}>
        <View style={styles.examNameRow}><Text numberOfLines={1} style={styles.examName}>{exam.name}</Text>{favorite && <Text style={styles.favoriteBadge}>관심</Text>}</View>
        <Text numberOfLines={1} style={styles.examMeta}>{exam.organizer} · {exam.category}</Text>
        <Text style={styles.examNext}>{next ? `${eventLabels[next.type]} · ${formatDate(next.startAt)}` : "공식 원문에서 일정 확인"}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function HomeScreen({ attemptSelections, checkedPreparationIds, favoriteIds, journeys, onFind, onOpen, onSelectFilter, onShowReminders }: {
  attemptSelections: StoredExamAttemptSelection[];
  checkedPreparationIds: string[];
  favoriteIds: string[];
  journeys: StoredExamJourney[];
  onFind: () => void;
  onOpen: (exam: Exam) => void;
  onSelectFilter: (filter: HomeSummaryFilter) => void;
  onShowReminders: () => void;
}) {
  const layout = useCertbomLayout();
  const openAll = useMemo(() => getHomeSummaryExams("open"), []);
  const open = openAll.slice(0, 5);
  const upcoming = useMemo(() => getUpcomingEvents().slice(0, 5), []);
  const upcomingExamCount = useMemo(() => getHomeSummaryExams("upcoming").length, []);
  const myExams = favoriteIds
    .flatMap((id) => exams.filter((exam) => exam.id === id))
    .sort((a, b) => (getNextEvent(a)?.startAt ?? "9999").localeCompare(getNextEvent(b)?.startAt ?? "9999"))
    .slice(0, 3);
  return (
    <ScrollView contentContainerStyle={adaptiveContentStyle(layout)} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <Text style={styles.heroKicker}>공식 일정 기준 · 오늘 이후 일정만 표시</Text>
        <Text style={styles.heroTitle}>접수할 시험과{`\n`}다음 일정을 <Text style={styles.heroHighlight}>한눈에.</Text></Text>
        <Text style={styles.heroDescription}>시험을 찾고 관심 목록에 저장하면 달력과 알림에서 이어서 관리할 수 있어요.</Text>
        <Pressable accessibilityRole="button" onPress={onFind} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
          <NativeIcon color="#ffffff" name="search" size={20} /><Text style={styles.primaryButtonText}>{catalogStats.examCount}개 시험 찾기</Text>
        </Pressable>
      </View>

      <View style={[styles.statGrid, layout.statColumns === 1 && adaptiveStyles.statGridStacked]}>
        {[
          { filter: "all" as const, label: "전체 시험", value: catalogStats.examCount },
          { filter: "open" as const, label: "현재 접수", value: openAll.length },
          { filter: "upcoming" as const, label: "14일 내 시험", value: upcomingExamCount },
        ].map((item) => (
          <Pressable key={item.filter} onPress={() => onSelectFilter(item.filter)} style={({ pressed }) => [styles.statCard, layout.statColumns === 1 && adaptiveStyles.statCardStacked, pressed && styles.pressed]}>
            <Text style={styles.statLabel}>{item.label}</Text><Text style={styles.statValue}>{item.value}<Text style={styles.statUnit}>개</Text></Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={onShowReminders} style={({ pressed }) => [styles.reminderSummary, pressed && styles.pressed]}>
        <View style={styles.reminderSummaryIcon}><NativeIcon color="#4058d8" name="bell" /></View>
        <View style={styles.reminderSummaryCopy}><Text style={styles.reminderSummaryTitle}>내 시험 알림 관리</Text><Text style={styles.reminderSummaryText}>관심 시험 {favoriteIds.length}개 · 알림 시점과 기기 설정 확인</Text></View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      {myExams.length > 0 && <>
        <SectionTitle count={favoriteIds.length} eyebrow="진행 상태와 다음 행동" title="내 시험 준비판" />
        {myExams.map((exam) => {
          const journey = journeys.find((item) => item.examId === exam.id) ?? { examId: exam.id, stage: "watching" as const, tasks: [] };
          const required = exam.preparation.filter((item) => item.importance === "required");
          const requiredIncomplete = required.filter((item) => !checkedPreparationIds.includes(item.id)).length;
          const completed = exam.preparation.filter((item) => checkedPreparationIds.includes(item.id)).length + journey.tasks.filter((task) => task.completed).length;
          const total = exam.preparation.length + journey.tasks.length;
          const attemptKey = attemptSelections.find((item) => item.examId === exam.id)?.attemptKey;
          const selectedEvents = getUpcomingAttemptEvents(exam, attemptKey);
          const nextEvent = getNextAttemptEvent(exam, attemptKey);
          return <Pressable key={exam.id} onPress={() => onOpen(exam)} style={({ pressed }) => [styles.journeyCard, pressed && styles.pressed]}><View style={styles.journeyCardTop}><View style={styles.journeyCardCopy}><Text numberOfLines={1} style={styles.journeyCardTitle}>{exam.name}</Text><Text style={styles.journeyCardStage}>{attemptKey ? `${journeyStageLabel(journey.stage)} · 선택 일정` : journeyStageLabel(journey.stage)}</Text></View><Text style={styles.journeyCardDday}>{nextEvent ? dDayLabel(nextEvent.startAt) : "일정 확인"}</Text></View><Text style={styles.journeyCardAction}>{journeyNextAction(exam, journey.stage, requiredIncomplete, journey.tasks, selectedEvents)}</Text><View style={styles.journeyMiniProgress}><View style={[styles.journeyMiniProgressValue, { width: `${total ? Math.round((completed / total) * 100) : 0}%` }]} /></View><Text style={styles.journeyCardMeta}>준비 {completed}/{total} · 눌러서 계속하기</Text></Pressable>;
        })}
      </>}

      <SectionTitle count={open.length} eyebrow="바로 확인" title="현재 접수 중" />
      {open.length ? open.map((exam) => <ExamRow exam={exam} favorite={favoriteIds.includes(exam.id)} key={exam.id} onPress={() => onOpen(exam)} />) : (
        <View style={styles.emptyCard}><Text style={styles.emptyTitle}>현재 접수 중인 시험이 없어요.</Text><Text style={styles.emptyText}>전체 시험과 공식 원문은 시험 찾기에서 확인할 수 있어요.</Text></View>
      )}

      <SectionTitle count={upcoming.length} eyebrow="날짜순" title="곧 해야 할 일" />
      {upcoming.map(({ exam, event }) => (
        <Pressable key={`${exam.id}-${event.id}`} onPress={() => onOpen(exam)} style={({ pressed }) => [styles.timelineRow, pressed && styles.pressed]}>
          <View style={[styles.timelineAccent, { backgroundColor: eventAccent(event.type) }]} />
          <View style={styles.timelineDate}><Text style={styles.timelineDay}>{dateKey(event.startAt).slice(8)}</Text><Text style={styles.timelineMonth}>{dateKey(event.startAt).slice(5, 7)}월</Text></View>
          <View style={styles.timelineCopy}><Text style={styles.timelineLabel}>{eventLabels[event.type]} · {dDayLabel(event.startAt)}</Text><Text numberOfLines={1} style={styles.timelineTitle}>{exam.name}</Text><Text numberOfLines={1} style={styles.timelineMeta}>{event.title}</Text></View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function FindScreen({ favoriteIds, initialFilter, onOpen }: { favoriteIds: string[]; initialFilter: HomeSummaryFilter; onOpen: (exam: Exam) => void }) {
  const layout = useCertbomLayout();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HomeSummaryFilter>(initialFilter);
  useEffect(() => setFilter(initialFilter), [initialFilter]);
  const results = useMemo(() => {
    const keyword = normalize(query);
    return getHomeSummaryExams(filter).filter((exam) => !keyword || normalize([exam.name, exam.shortName, exam.organizer, exam.category, ...exam.aliases].filter(Boolean).join(" ")).includes(keyword));
  }, [filter, query]);
  return (
    <View style={styles.flex}>
      <View style={[styles.findHeader, { maxWidth: layout.contentMaxWidth, paddingHorizontal: layout.horizontalPadding }]}>
        <Text style={styles.pageEyebrow}>공식 출처를 묶어 찾기</Text><Text style={styles.pageTitle}>시험 찾기</Text>
        <View style={styles.searchBox}><NativeIcon name="search" size={21} /><TextInput accessibilityLabel="시험 검색" autoCorrect={false} onChangeText={setQuery} placeholder="시험명, 약칭, 기관 또는 분야" placeholderTextColor="#858ca0" returnKeyType="search" style={styles.searchInput} value={query} /></View>
        <View style={styles.filterRow}>
          {(["all", "open", "upcoming"] as const).map((value) => <Pressable accessibilityState={{ selected: filter === value }} key={value} onPress={() => setFilter(value)} style={[styles.filterChip, filter === value && styles.filterChipActive]}><Text style={[styles.filterChipText, filter === value && styles.filterChipTextActive]}>{value === "all" ? "전체" : value === "open" ? "접수 중" : "곧 시험"}</Text></Pressable>)}
        </View>
        <Text style={styles.resultCount}>검색 결과 {results.length}개</Text>
      </View>
      <FlatList
        columnWrapperStyle={layout.listColumns === 2 ? adaptiveStyles.findColumn : undefined}
        contentContainerStyle={[styles.findList, { maxWidth: layout.contentMaxWidth, paddingHorizontal: layout.horizontalPadding }]}
        data={results}
        keyboardShouldPersistTaps="handled"
        key={`find-${layout.listColumns}`}
        keyExtractor={(exam) => exam.id}
        ListEmptyComponent={<View style={styles.emptyCard}><Text style={styles.emptyTitle}>조건에 맞는 시험이 없어요.</Text><Text style={styles.emptyText}>검색어를 지우거나 전체 필터로 바꿔 보세요.</Text></View>}
        numColumns={layout.listColumns}
        renderItem={({ item }) => <View style={adaptiveStyles.findGridItem}><ExamRow exam={item} favorite={favoriteIds.includes(item.id)} onPress={() => onOpen(item)} /></View>}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function CalendarScreen({ attemptSelections, favoriteIds, onOpen }: { attemptSelections: StoredExamAttemptSelection[]; favoriteIds: string[]; onOpen: (exam: Exam) => void }) {
  const layout = useCertbomLayout();
  const [month, setMonth] = useState(currentKstMonth);
  const [selectedDate, setSelectedDate] = useState(currentKstDateKey);
  const [savedOnly, setSavedOnly] = useState(false);
  const events = useMemo(() => exams.flatMap((exam) => {
    const attemptKey = attemptSelections.find((item) => item.examId === exam.id)?.attemptKey;
    return getUpcomingAttemptEvents(exam, savedOnly && favoriteIds.includes(exam.id) ? attemptKey : undefined).map((event) => ({ exam, event }));
  }).filter(({ exam }) => !savedOnly || favoriteIds.includes(exam.id)), [attemptSelections, favoriteIds, savedOnly]);
  const eventDates = useMemo(() => new Set(events.map(({ event }) => dateKey(event.startAt))), [events]);
  const selectedEvents = events.filter(({ event }) => dateKey(event.startAt) === selectedDate).sort((a, b) => a.event.startAt.localeCompare(b.event.startAt));
  const cells = monthCells(month).map((key, index) => ({ id: key ?? `leading-${month}-${index}`, key }));
  const changeMonth = (amount: number) => {
    const next = shiftMonth(month, amount);
    setMonth(next);
    setSelectedDate(`${next}-01`);
  };
  return (
    <ScrollView contentContainerStyle={adaptiveContentStyle(layout)} showsVerticalScrollIndicator={false}>
      <View style={styles.pageTitleRow}><View><Text style={styles.pageEyebrow}>공식 일정 한눈에</Text><Text style={styles.pageTitle}>시험 달력</Text></View><Pressable accessibilityRole="button" onPress={() => setSavedOnly((value) => !value)} style={[styles.scopeButton, savedOnly && styles.scopeButtonActive]}><Text style={[styles.scopeButtonText, savedOnly && styles.scopeButtonTextActive]}>{savedOnly ? "관심만" : "전체"}</Text></Pressable></View>
      <View style={styles.calendarCard}>
        <View style={styles.monthHeader}><Pressable accessibilityLabel="이전 달" onPress={() => changeMonth(-1)} style={styles.monthButton}><NativeIcon name="back" /></Pressable><Text style={styles.monthTitle}>{monthLabel(month)}</Text><Pressable accessibilityLabel="다음 달" onPress={() => changeMonth(1)} style={styles.monthButton}><View style={{ transform: [{ rotate: "180deg" }] }}><NativeIcon name="back" /></View></Pressable></View>
        <View style={styles.weekRow}>{["일", "월", "화", "수", "목", "금", "토"].map((day) => <Text key={day} style={styles.weekDay}>{day}</Text>)}</View>
        <View style={styles.calendarGrid}>{cells.map((cell) => cell.key ? <Pressable accessibilityState={{ selected: selectedDate === cell.key }} key={cell.id} onPress={() => { if (cell.key) setSelectedDate(cell.key); }} style={[styles.dayCell, selectedDate === cell.key && styles.dayCellSelected, currentKstDateKey() === cell.key && styles.dayCellToday]}><Text style={[styles.dayNumber, selectedDate === cell.key && styles.dayNumberSelected]}>{Number(cell.key.slice(8))}</Text>{eventDates.has(cell.key) && <View style={[styles.eventDot, selectedDate === cell.key && styles.eventDotSelected]} />}</Pressable> : <View key={cell.id} style={styles.dayCell} />)}</View>
      </View>
      <SectionTitle count={selectedEvents.length} eyebrow={formatDate(`${selectedDate}T00:00:00+09:00`, true)} title="이날의 일정" />
      {selectedEvents.length ? selectedEvents.map(({ exam, event }) => <Pressable key={`${exam.id}-${event.id}`} onPress={() => onOpen(exam)} style={({ pressed }) => [styles.agendaCard, pressed && styles.pressed]}><View style={[styles.agendaType, { backgroundColor: eventAccent(event.type) }]}><Text style={styles.agendaTypeText}>{eventLabels[event.type]}</Text></View><View style={styles.agendaCopy}><Text style={styles.agendaTitle}>{exam.name}</Text><Text style={styles.agendaMeta}>{event.title}</Text><Text style={styles.agendaSource}>{exam.sourceName} 공식 일정</Text></View><Text style={styles.chevron}>›</Text></Pressable>) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>이날 등록된 일정이 없어요.</Text><Text style={styles.emptyText}>날짜를 바꾸거나 전체 일정을 확인해 보세요.</Text></View>}
    </ScrollView>
  );
}

function RemindersScreen({ attemptSelections, checkedPreparationIds, favoriteIds, journeys, preferences, scheduledCounts, notificationStatus, onEdit, onOpen, onOpenNotificationSettings }: {
  attemptSelections: StoredExamAttemptSelection[];
  checkedPreparationIds: string[];
  favoriteIds: string[];
  journeys: StoredExamJourney[];
  preferences: StoredReminderPreference[];
  scheduledCounts: Record<string, number>;
  notificationStatus: Notifications.PermissionStatus | "unknown";
  onEdit: (exam: Exam) => void;
  onOpen: (exam: Exam) => void;
  onOpenNotificationSettings: () => void;
}) {
  const layout = useCertbomLayout();
  const favorites = favoriteIds.flatMap((id) => exams.filter((exam) => exam.id === id));
  return (
    <ScrollView contentContainerStyle={adaptiveContentStyle(layout)} showsVerticalScrollIndicator={false}>
      <View style={styles.pageTitleRow}><View><Text style={styles.pageEyebrow}>준비 상태와 기기 알림</Text><Text style={styles.pageTitle}>내 시험</Text></View><View style={styles.notificationStatus}><View style={[styles.statusDot, notificationStatus === "granted" ? styles.statusGood : styles.statusWarn]} /><Text style={styles.notificationStatusText}>{notificationStatus === "granted" ? "허용됨" : notificationStatus === "denied" ? "차단됨" : "확인 필요"}</Text></View></View>
      <View style={styles.infoCard}><NativeIcon color="#4058d8" name="bell" /><View style={styles.infoCopy}><Text style={styles.infoTitle}>시험별 진행과 알림을 함께 관리해요.</Text><Text style={styles.infoText}>접수·응시 상태와 준비 진행률을 남기고, 다음 일정 한 건 또는 중요 일정 전체를 1일·3일·7일 전에 받을 수 있어요.</Text></View></View>
      {notificationStatus === "denied" && <Pressable onPress={onOpenNotificationSettings} style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}><Text style={styles.outlineButtonText}>기기 알림 설정 열기</Text><NativeIcon color="#4058d8" name="external" size={18} /></Pressable>}
      <SectionTitle count={favorites.length} eyebrow="다음 행동부터 알림까지" title="관심 시험 관리" />
      {favorites.length ? favorites.map((exam) => {
        const preference = preferences.find((item) => item.examId === exam.id);
        const scheduledCount = scheduledCounts[exam.id] ?? 0;
        const journey = journeys.find((item) => item.examId === exam.id) ?? { examId: exam.id, stage: "watching" as const, tasks: [] };
        const requiredIncomplete = exam.preparation.filter((item) => item.importance === "required" && !checkedPreparationIds.includes(item.id)).length;
        const attemptKey = attemptSelections.find((item) => item.examId === exam.id)?.attemptKey;
        const selectedEvents = getUpcomingAttemptEvents(exam, attemptKey);
        const nextEvent = getNextAttemptEvent(exam, attemptKey);
        return <View key={exam.id} style={styles.reminderCard}><Pressable onPress={() => onOpen(exam)} style={styles.reminderCardCopy}><View style={styles.examNameRow}><Text style={styles.reminderExamName}>{exam.name}</Text><Text style={styles.favoriteBadge}>{attemptKey ? "선택 일정" : journeyStageLabel(journey.stage)}</Text></View><Text style={styles.reminderExamAction}>{journeyNextAction(exam, journey.stage, requiredIncomplete, journey.tasks, selectedEvents)}</Text><Text style={styles.reminderExamMeta}>{nextEvent ? formatDate(nextEvent.startAt, true) : "예약 가능한 미래 일정 없음"}</Text></Pressable><View style={[styles.reminderChip, scheduledCount > 0 && styles.reminderChipActive]}><Text style={[styles.reminderChipText, scheduledCount > 0 && styles.reminderChipTextActive]}>{scheduledCount > 0 && preference ? `${scheduledCount}개 알림` : "알림 꺼짐"}</Text></View><Pressable accessibilityLabel={`${exam.name} 알림 설정`} onPress={() => onEdit(exam)} style={styles.editButton}><Text style={styles.editButtonText}>설정</Text></Pressable></View>;
      }) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>저장한 관심 시험이 없어요.</Text><Text style={styles.emptyText}>시험 찾기에서 관심 시험을 저장하면 여기서 알림 시점을 고를 수 있어요.</Text></View>}
    </ScrollView>
  );
}

function SettingsScreen({ notificationStatus, onOpenBatterySettings, onOpenNotificationSettings, onOpenUrl }: {
  notificationStatus: Notifications.PermissionStatus | "unknown";
  onOpenBatterySettings: () => void;
  onOpenNotificationSettings: () => void;
  onOpenUrl: (url: string, label: string) => void;
}) {
  const layout = useCertbomLayout();
  return (
    <ScrollView contentContainerStyle={adaptiveContentStyle(layout)} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageEyebrow}>내 기기에 맞게</Text><Text style={styles.pageTitle}>설정</Text>
      <View style={styles.settingsCard}><Text style={styles.settingsTitle}>알림과 배터리</Text><Text style={styles.settingsText}>Android는 절전 상태에서 알림을 조금 늦출 수 있어요. 강제 예외 권한을 요구하지 않고, 사용자가 기기 설정에서 자격증봄을 직접 확인하도록 연결합니다.</Text><View style={styles.settingsActionList}><Pressable onPress={onOpenNotificationSettings} style={styles.settingsAction}><View><Text style={styles.settingsActionTitle}>앱 알림 설정</Text><Text style={styles.settingsActionMeta}>{notificationStatus === "granted" ? "현재 알림 허용됨" : "권한과 채널 상태 확인"}</Text></View><NativeIcon color="#4058d8" name="external" size={18} /></Pressable>{Platform.OS === "android" && <Pressable onPress={onOpenBatterySettings} style={styles.settingsAction}><View><Text style={styles.settingsActionTitle}>배터리 최적화 앱 목록</Text><Text style={styles.settingsActionMeta}>제조사 절전 설정에서 자격증봄 확인</Text></View><NativeIcon color="#4058d8" name="external" size={18} /></Pressable>}</View></View>
      <View style={styles.settingsCard}><Text style={styles.settingsTitle}>로봄 패밀리 앱</Text><Text style={styles.settingsText}>앱 이름을 누르면 로봄 공식 연결 주소를 브라우저에서 열어요.</Text>{FAMILY_APPS.map((app) => <Pressable accessibilityRole="link" key={app.id} onPress={() => onOpenUrl(app.url, app.name)} style={styles.familyRow}><View><Text style={styles.familyName}>{app.name}</Text><Text style={styles.familyDescription}>{app.description}</Text></View><NativeIcon color="#4058d8" name="external" size={19} /></Pressable>)}</View>
      <View style={styles.settingsCard}><Text style={styles.settingsTitle}>지원과 개인정보</Text><Pressable onPress={() => onOpenUrl(SUPPORT_URL, "지원 페이지")} style={styles.settingsAction}><Text style={styles.settingsActionTitle}>문의와 지원</Text><NativeIcon color="#4058d8" name="external" size={18} /></Pressable><Pressable onPress={() => onOpenUrl(PRIVACY_URL, "개인정보 처리방침")} style={styles.settingsAction}><Text style={styles.settingsActionTitle}>개인정보 처리방침</Text><NativeIcon color="#4058d8" name="external" size={18} /></Pressable></View>
      <View style={styles.settingsCard}><Text style={styles.settingsTitle}>앱 정보</Text><View style={styles.metaRow}><Text style={styles.metaLabel}>시험 데이터</Text><Text style={styles.metaValue}>{catalogStats.examCount}개 · 일정 {catalogStats.eventCount}개</Text></View><View style={styles.metaRow}><Text style={styles.metaLabel}>데이터 버전</Text><Text style={styles.metaValue}>{CATALOG_DATA_VERSION}</Text></View><View style={styles.metaRow}><Text style={styles.metaLabel}>저장 방식</Text><Text style={styles.metaValue}>계정 없이 기기 저장</Text></View><Text style={styles.officialNotice}>자격증봄은 공식 시험기관이 아닙니다. 접수·응시자격·일정은 시행기관의 최신 공고가 최종 기준입니다.</Text></View>
    </ScrollView>
  );
}

function DetailScreen({ attemptSelection, checkedPreparationIds, exam, favorite, journey, reminder, onAddTask, onBack, onChangeStage, onDeleteTask, onEditReminder, onOpenUrl, onSelectAttempt, onToggleFavorite, onTogglePreparation, onToggleTask }: {
  attemptSelection?: StoredExamAttemptSelection;
  checkedPreparationIds: string[];
  exam: Exam;
  favorite: boolean;
  journey: StoredExamJourney;
  reminder?: StoredReminderPreference;
  onAddTask: (label: string) => void;
  onBack: () => void;
  onChangeStage: (stage: ExamJourneyStage) => void;
  onDeleteTask: (taskId: string) => void;
  onEditReminder: () => void;
  onOpenUrl: (url: string, label: string) => void;
  onSelectAttempt: (attemptKey?: string) => void;
  onToggleFavorite: () => void;
  onTogglePreparation: (itemId: string) => void;
  onToggleTask: (taskId: string) => void;
}) {
  const layout = useCertbomLayout();
  const [taskDraft, setTaskDraft] = useState("");
  const attempts = getExamAttempts(exam).filter((attempt) => getUpcomingAttemptEvents(exam, attempt.key).length > 0);
  const selectedEvents = getUpcomingAttemptEvents(exam, attemptSelection?.attemptKey);
  const next = getNextAttemptEvent(exam, attemptSelection?.attemptKey);
  const officialActions = getOfficialExamActions(exam);
  const applicationUrl = exam.applicationUrl;
  const checkedCount = exam.preparation.filter((item) => checkedPreparationIds.includes(item.id)).length;
  const requiredIncomplete = exam.preparation.filter((item) => item.importance === "required" && !checkedPreparationIds.includes(item.id)).length;
  const personalCompleted = journey.tasks.filter((task) => task.completed).length;
  const addTask = () => {
    const label = taskDraft.trim();
    if (!label) return;
    onAddTask(label);
    setTaskDraft("");
  };
  return (
    <View style={styles.flex}>
      <View style={styles.detailHeader}><Pressable accessibilityLabel="이전 화면" onPress={onBack} style={styles.backButton}><NativeIcon name="back" /></Pressable><Text numberOfLines={1} style={styles.detailHeaderTitle}>{exam.name}</Text><View style={styles.backButton} /></View>
      <ScrollView contentContainerStyle={[styles.detailContent, { maxWidth: layout.contentMaxWidth, paddingHorizontal: layout.horizontalPadding }]} showsVerticalScrollIndicator={false}>
        <View style={styles.detailHero}><Text style={styles.detailCategory}>{exam.category} · {exam.organizer}</Text><Text style={styles.detailTitle}>{exam.name}</Text><Text style={styles.detailDescription}>{exam.description}</Text><View style={styles.detailBadgeRow}><Text style={styles.detailBadge}>{isApplicationOpen(exam) ? "현재 접수 중" : "공식 일정 확인"}</Text><Text style={styles.detailBadge}>{exam.sourceName}</Text></View></View>
        <View style={styles.nextEventCard}><Text style={styles.nextEventLabel}>{attemptSelection ? "선택한 회차의 다음 일정" : "다음 일정"} {next ? `· ${dDayLabel(next.startAt)}` : ""}</Text><Text style={styles.nextEventTitle}>{next?.title ?? "공식 원문에서 확인"}</Text><Text style={styles.nextEventDate}>{next ? formatDate(next.startAt, true) : "확정된 미래 일정이 없어요."}</Text></View>
        <View style={styles.detailActions}><Pressable onPress={onToggleFavorite} style={[styles.outlineButton, favorite && styles.outlineButtonActive]}><Text style={[styles.outlineButtonText, favorite && styles.outlineButtonTextActive]}>{favorite ? "관심 시험 저장됨" : "관심 시험에 저장"}</Text></Pressable><Pressable disabled={!next} onPress={onEditReminder} style={[styles.primaryButton, !next && styles.disabled]}><NativeIcon color="#ffffff" name="bell" size={20} /><Text style={styles.primaryButtonText}>{reminder ? `${reminder.daysBefore}일 전 알림 설정됨` : "알림 설정"}</Text></Pressable></View>
        {attempts.length > 0 && <><SectionTitle eyebrow="이번에 준비하는 대상" title="회차와 단계 선택" /><View style={styles.infoCard}><NativeIcon color="#4058d8" name="calendar" /><View style={styles.infoCopy}><Text style={styles.infoTitle}>{favorite ? "내가 준비하는 일정만 먼저 볼 수 있어요." : "관심 시험에 저장한 뒤 회차를 고를 수 있어요."}</Text><Text style={styles.infoText}>공식 데이터에 명시된 회차·단계만 표시합니다. 선택하지 않으면 기존처럼 전체 일정을 보여줘요.</Text></View></View>{favorite && <View style={styles.stageRow}>{attempts.map((attempt) => <Pressable accessibilityState={{ selected: attemptSelection?.attemptKey === attempt.key }} key={attempt.key} onPress={() => onSelectAttempt(attempt.key)} style={[styles.stageChip, attemptSelection?.attemptKey === attempt.key && styles.stageChipActive]}><Text style={[styles.stageChipText, attemptSelection?.attemptKey === attempt.key && styles.stageChipTextActive]}>{attempt.label}</Text></Pressable>)}</View>}{favorite && attemptSelection && <Pressable onPress={() => onSelectAttempt(undefined)} style={styles.outlineButton}><Text style={styles.outlineButtonText}>전체 일정 보기</Text></Pressable>}</>}
        <SectionTitle eyebrow="한 단계씩 준비하기" title="내 시험 진행" />
        <View style={styles.stageRow}>{journeyStages.map((stage) => <Pressable accessibilityState={{ selected: journey.stage === stage.id }} key={stage.id} onPress={() => onChangeStage(stage.id)} style={[styles.stageChip, journey.stage === stage.id && styles.stageChipActive]}><Text style={[styles.stageChipText, journey.stage === stage.id && styles.stageChipTextActive]}>{stage.label}</Text></Pressable>)}</View>
        <View style={styles.nextActionCard}><Text style={styles.nextActionLabel}>지금 할 일</Text><Text style={styles.nextActionTitle}>{journeyNextAction(exam, journey.stage, requiredIncomplete, journey.tasks, selectedEvents)}</Text></View>
        <SectionTitle count={selectedEvents.length} eyebrow="공식 출처 기준" title={attemptSelection ? "선택한 일정" : "주요 일정"} />
        {selectedEvents.slice().sort((a, b) => a.startAt.localeCompare(b.startAt)).map((event) => <View key={event.id} style={styles.detailEventRow}><View style={[styles.detailEventDot, { backgroundColor: eventAccent(event.type) }]} /><View style={styles.detailEventCopy}><Text style={styles.detailEventType}>{eventLabels[event.type]}</Text><Text style={styles.detailEventTitle}>{event.title}</Text><Text style={styles.detailEventDate}>{formatDate(event.startAt, true)}</Text></View></View>)}
        {next && <Pressable onPress={() => onOpenUrl(createGoogleCalendarUrl(exam, next), "Google 캘린더")} style={styles.outlineButton}><Text style={styles.outlineButtonText}>다음 일정을 Google 캘린더에 추가</Text><NativeIcon color="#4058d8" name="external" size={18} /></Pressable>}
        <SectionTitle count={exam.preparation.length} eyebrow="시험 전 확인" title="준비물과 주의사항" />
        <View accessibilityLabel={`준비물 ${exam.preparation.length}개 중 ${checkedCount}개 완료`} accessibilityRole="summary" style={styles.preparationProgress}><View style={styles.preparationProgressCopy}><Text style={styles.preparationProgressTitle}>준비 {checkedCount}/{exam.preparation.length}</Text><Text style={styles.preparationProgressMeta}>필수 미완료 {requiredIncomplete}개</Text></View><View style={styles.preparationProgressTrack}><View style={[styles.preparationProgressValue, { width: `${exam.preparation.length ? Math.round((checkedCount / exam.preparation.length) * 100) : 0}%` }]} /></View></View>
        {exam.preparation.map((item) => {
          const checked = checkedPreparationIds.includes(item.id);
          return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} key={item.id} onPress={() => onTogglePreparation(item.id)} style={({ pressed }) => [styles.preparationRow, checked && styles.preparationRowChecked, pressed && styles.pressed]}><View style={[styles.preparationCheckbox, checked && styles.preparationCheckboxChecked]}>{checked && <Text style={styles.preparationCheckText}>✓</Text>}</View><View style={styles.preparationCopy}><View style={styles.preparationTitleRow}><Text style={[styles.preparationTitle, checked && styles.preparationTitleChecked]}>{item.label}</Text><View style={[styles.preparationMark, item.importance === "required" && styles.preparationMarkRequired, item.importance === "forbidden" && styles.preparationMarkForbidden]} /></View><Text style={styles.preparationText}>{item.detail}</Text><Text style={styles.preparationSource}>{item.sourceVerified ? `${item.sourceLabel} 확인` : "일반 준비 안내 · 공식 원문 재확인"}</Text></View></Pressable>;
        })}
        <SectionTitle count={journey.tasks.length} eyebrow="교재·서류·이동 준비" title="내 준비 할 일" />
        <View style={styles.taskComposer}><TextInput accessibilityLabel="내 준비 할 일 입력" maxLength={80} onChangeText={setTaskDraft} onSubmitEditing={addTask} placeholder="예: 증명사진 준비, 시험장 가는 길 확인" placeholderTextColor="#858ca0" returnKeyType="done" style={styles.taskInput} value={taskDraft} /><Pressable accessibilityLabel="준비 할 일 추가" disabled={!taskDraft.trim()} onPress={addTask} style={[styles.taskAddButton, !taskDraft.trim() && styles.disabled]}><Text style={styles.taskAddButtonText}>추가</Text></Pressable></View>
        {journey.tasks.length > 0 ? <><Text style={styles.taskProgressText}>개인 할 일 {personalCompleted}/{journey.tasks.length} 완료</Text>{journey.tasks.map((task) => <View key={task.id} style={[styles.personalTaskRow, task.completed && styles.preparationRowChecked]}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: task.completed }} onPress={() => onToggleTask(task.id)} style={styles.personalTaskToggle}><View style={[styles.preparationCheckbox, task.completed && styles.preparationCheckboxChecked]}>{task.completed && <Text style={styles.preparationCheckText}>✓</Text>}</View><Text style={[styles.personalTaskLabel, task.completed && styles.preparationTitleChecked]}>{task.label}</Text></Pressable><Pressable accessibilityLabel={`${task.label} 삭제`} onPress={() => onDeleteTask(task.id)} style={styles.taskDeleteButton}><Text style={styles.taskDeleteText}>삭제</Text></Pressable></View>)}</> : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>개인 준비 할 일을 추가해 보세요.</Text><Text style={styles.emptyText}>공식 준비물에 없는 교재, 서류, 교통편 같은 나만의 준비를 기기에 저장할 수 있어요.</Text></View>}
        <Pressable onPress={() => onOpenUrl(exam.officialUrl, "공식 시험 페이지")} style={styles.settingsAction}><Text style={styles.settingsActionTitle}>공식 시험 페이지</Text><NativeIcon color="#4058d8" name="external" size={18} /></Pressable>
        {applicationUrl && applicationUrl !== exam.officialUrl && <Pressable onPress={() => onOpenUrl(applicationUrl, "공식 접수처")} style={styles.settingsAction}><Text style={styles.settingsActionTitle}>공식 접수처</Text><NativeIcon color="#4058d8" name="external" size={18} /></Pressable>}
        {officialActions.map((action) => <Pressable key={action.id} onPress={() => onOpenUrl(action.url, action.label)} style={styles.settingsAction}><View><Text style={styles.settingsActionTitle}>{action.label}</Text><Text style={styles.settingsActionMeta}>{action.description}</Text></View><NativeIcon color="#4058d8" name="external" size={18} /></Pressable>)}
      </ScrollView>
    </View>
  );
}

function ReminderEditor({ attemptKey, exam, existing, onCancel, onRemove, onSave, saving }: {
  attemptKey?: string;
  exam: Exam;
  existing?: StoredReminderPreference;
  onCancel: () => void;
  onRemove: () => void;
  onSave: (daysBefore: ReminderDaysBefore, scope: ReminderScope) => void;
  saving: boolean;
}) {
  const layout = useCertbomLayout();
  const [daysBefore, setDaysBefore] = useState<ReminderDaysBefore>(existing?.daysBefore ?? 1);
  const [scope, setScope] = useState<ReminderScope>(existing?.scope ?? "next");
  const firstPlan = createExamReminderPlans(exam, daysBefore, scope, new Date(), attemptKey)[0];
  const next = exam.events.find((event) => event.id === firstPlan?.eventId);
  return (
    <Modal animationType="slide" onRequestClose={onCancel} transparent visible>
      <View style={[styles.modalBackdrop, layout.modalCentered && adaptiveStyles.modalBackdropCentered]}>
        <View style={[styles.modalSheet, { maxWidth: layout.modalMaxWidth }, layout.modalCentered && adaptiveStyles.modalSheetCentered]}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.flex}><Text style={styles.pageEyebrow}>로컬 알림 설정</Text><Text style={styles.modalTitle}>{exam.name}</Text></View>
              <Pressable accessibilityLabel="알림 설정 닫기" onPress={onCancel} style={styles.closeButton}><Text style={styles.closeButtonText}>닫기</Text></Pressable>
            </View>
            <View style={styles.modalEvent}><Text style={styles.nextEventLabel}>가장 가까운 예약 가능 일정</Text><Text style={styles.nextEventTitle}>{next?.title ?? "예약 가능한 일정 없음"}</Text><Text style={styles.nextEventDate}>{next ? formatDate(next.startAt, true) : "공식 원문을 확인해 주세요."}</Text></View>
            <Text style={styles.optionTitle}>어떤 일정을 알려드릴까요?</Text>
            <View style={styles.scopeOptions}>{([{ id: "next", title: "다음 일정", hint: "가장 가까운 공식 일정 한 건" }, { id: "critical", title: "중요 일정 전체", hint: "접수 시작·마감·시험·발표" }] as const).map((option) => <Pressable accessibilityState={{ selected: scope === option.id }} key={option.id} onPress={() => setScope(option.id)} style={[styles.scopeOption, scope === option.id && styles.reminderOptionActive]}><Text style={[styles.reminderOptionValue, scope === option.id && styles.reminderOptionValueActive]}>{option.title}</Text><Text style={[styles.reminderOptionHint, scope === option.id && styles.reminderOptionHintActive]}>{option.hint}</Text></Pressable>)}</View>
            <Text style={styles.optionTitle}>언제 알려드릴까요?</Text>
            <View style={styles.reminderOptions}>{([7, 3, 1] as const).map((days) => <Pressable accessibilityState={{ selected: daysBefore === days }} key={days} onPress={() => setDaysBefore(days)} style={[styles.reminderOption, daysBefore === days && styles.reminderOptionActive]}><Text style={[styles.reminderOptionValue, daysBefore === days && styles.reminderOptionValueActive]}>{days}일 전</Text><Text style={[styles.reminderOptionHint, daysBefore === days && styles.reminderOptionHintActive]}>{days === 1 ? "가장 가까운 기본 알림" : `${days}일 전에 미리 준비`}</Text></Pressable>)}</View>
            <Text style={styles.modalNotice}>날짜만 공개된 일정은 선택한 날짜의 오전 9시를 기준으로 알립니다. Android 절전 상태에서는 운영체제가 알림을 조금 늦출 수 있어요.</Text>
            <Pressable disabled={saving || !next} onPress={() => onSave(daysBefore, scope)} style={[styles.primaryButton, (saving || !next) && styles.disabled]}>{saving ? <ActivityIndicator color="#ffffff" /> : <><NativeIcon color="#ffffff" name="bell" size={20} /><Text style={styles.primaryButtonText}>{existing ? "알림 설정 저장" : "알림 예약"}</Text></>}</Pressable>
            {existing && <Pressable disabled={saving} onPress={onRemove} style={styles.removeButton}><Text style={styles.removeButtonText}>이 시험 알림 끄기</Text></Pressable>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function BottomTabs({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  const layout = useCertbomLayout();
  const insets = useSafeAreaInsets();
  return <View style={[styles.bottomTabs, { maxWidth: layout.navigationMaxWidth, paddingBottom: Math.max(insets.bottom, 8) }]}>{tabs.map((tab) => { const selected = active === tab.id; return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={tab.id} onPress={() => onChange(tab.id)} style={styles.tabButton}><NativeIcon color={selected ? "#4058d8" : "#7a8195"} name={tab.icon} size={23} /><Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>{tab.label}</Text>{selected && <View style={styles.tabIndicator} />}</Pressable>; })}</View>;
}

function MobileApp() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [findFilter, setFindFilter] = useState<HomeSummaryFilter>("all");
  const [detailExamId, setDetailExamId] = useState<string>();
  const [editorExamId, setEditorExamId] = useState<string>();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [checkedPreparationIds, setCheckedPreparationIds] = useState<string[]>([]);
  const [journeys, setJourneys] = useState<StoredExamJourney[]>([]);
  const [attemptSelections, setAttemptSelections] = useState<StoredExamAttemptSelection[]>([]);
  const [preferences, setPreferences] = useState<StoredReminderPreference[]>([]);
  const [scheduledCounts, setScheduledCounts] = useState<Record<string, number>>({});
  const [notificationStatus, setNotificationStatus] = useState<Notifications.PermissionStatus | "unknown">("unknown");
  const [savingReminder, setSavingReminder] = useState(false);

  const refreshNotificationStatus = useCallback(async () => {
    const permission = await Notifications.getPermissionsAsync();
    setNotificationStatus(permission.status);
  }, []);

  const refreshScheduled = useCallback(async () => {
    const scheduled = await getScheduledCertbomReminders();
    setScheduledCounts(scheduledCountMap(scheduled));
  }, []);

  useEffect(() => {
    configureNotificationPresentation();
    void (async () => {
      const [storedFavorites, legacyIntent, storedPreferences, storedPreparationIds, storedJourneys, storedAttemptSelections, scheduled] = await Promise.all([
        loadFavoriteExamIds(),
        loadReminderExamIds(),
        loadReminderPreferences(),
        loadPreparationCheckedIds(),
        loadExamJourneys(),
        loadExamAttemptSelections(),
        getScheduledCertbomReminders(),
      ]);
      const validFavorites = storedFavorites.filter((id) => Boolean(getExam(id)));
      const validJourneys = storedJourneys.filter((item) => Boolean(getExam(item.examId)));
      const validAttemptSelections = storedAttemptSelections.filter((selection) => {
        const exam = getExam(selection.examId);
        return Boolean(exam && getUpcomingAttemptEvents(exam, selection.attemptKey).length > 0);
      });
      const storedById = new Map(storedPreferences.map((item) => [item.examId, item]));
      for (const item of scheduled) if (!storedById.has(item.examId)) storedById.set(item.examId, { examId: item.examId, daysBefore: item.daysBefore, scope: item.scope });
      for (const id of legacyIntent.examIds) if (!storedById.has(id)) storedById.set(id, { examId: id, daysBefore: 1, scope: "next" });
      const validPreferences = [...storedById.values()].filter((item) => Boolean(getExam(item.examId)));
      setFavoriteIds(validFavorites);
      setJourneys(validJourneys);
      setAttemptSelections(validAttemptSelections);
      setPreferences(validPreferences);
      setCheckedPreparationIds(storedPreparationIds);
      await Promise.all([
        saveFavoriteExamIds(validFavorites),
        saveExamJourneys(validJourneys),
        saveExamAttemptSelections(validAttemptSelections),
        saveReminderExamIds(validPreferences.map((item) => item.examId)),
        saveReminderPreferences(validPreferences),
        savePreparationCheckedIds(storedPreparationIds),
      ]);
      const reconciled = await reconcileCertbomReminders(exams, validPreferences);
      setScheduledCounts(scheduledCountMap(reconciled));
      await refreshNotificationStatus();
    })().catch(() => undefined);
  }, [refreshNotificationStatus]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshNotificationStatus();
        void refreshScheduled();
      }
    });
    return () => subscription.remove();
  }, [refreshNotificationStatus, refreshScheduled]);

  const openExam = useCallback((exam: Exam) => {
    setDetailExamId(exam.id);
    void saveSelectedExamId(exam.id);
  }, []);

  useEffect(() => {
    const selectFromUrl = (url: string) => {
      const examId = parseExamDeepLink(url);
      const exam = examId ? getExam(examId) : undefined;
      if (exam) openExam(exam);
    };
    const urlSubscription = Linking.addEventListener("url", ({ url }) => selectFromUrl(url));
    void Linking.getInitialURL().then((url) => { if (url) selectFromUrl(url); });
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const examId = response.notification.request.content.data?.examId;
      const exam = typeof examId === "string" ? getExam(examId) : undefined;
      if (exam) openExam(exam);
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      const examId = response?.notification.request.content.data?.examId;
      const exam = typeof examId === "string" ? getExam(examId) : undefined;
      if (exam) openExam(exam);
      if (response) return Notifications.clearLastNotificationResponseAsync();
    });
    return () => { urlSubscription.remove(); notificationSubscription.remove(); };
  }, [openExam]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (editorExamId) { setEditorExamId(undefined); return true; }
      if (detailExamId) { setDetailExamId(undefined); return true; }
      if (activeTab !== "home") { setActiveTab("home"); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [activeTab, detailExamId, editorExamId]);

  const openUrl = useCallback(async (url: string, label: string) => {
    try { await Linking.openURL(url); }
    catch { Alert.alert("링크를 열지 못했어요", `${label}을 열 브라우저가 있는지 확인해 주세요.`); }
  }, []);

  const changeTab = (tab: TabId) => {
    setDetailExamId(undefined);
    setEditorExamId(undefined);
    setActiveTab(tab);
  };

  const toggleFavorite = async (exam: Exam) => {
    const removing = favoriteIds.includes(exam.id);
    const next = removing ? favoriteIds.filter((id) => id !== exam.id) : [...favoriteIds, exam.id];
    setFavoriteIds(next);
    if (!(await saveFavoriteExamIds(next))) {
      setFavoriteIds(favoriteIds);
      Alert.alert("저장하지 못했어요", "기기 저장소를 확인한 뒤 다시 시도해 주세요.");
    }
  };

  const togglePreparation = async (itemId: string) => {
    const next = checkedPreparationIds.includes(itemId)
      ? checkedPreparationIds.filter((id) => id !== itemId)
      : [...checkedPreparationIds, itemId];
    setCheckedPreparationIds(next);
    if (!(await savePreparationCheckedIds(next))) {
      setCheckedPreparationIds(checkedPreparationIds);
      Alert.alert("체크를 저장하지 못했어요", "기기 저장소를 확인한 뒤 다시 시도해 주세요.");
    }
  };

  const saveReminder = async (exam: Exam, daysBefore: ReminderDaysBefore, scope: ReminderScope) => {
    setSavingReminder(true);
    const attemptKey = attemptSelections.find((item) => item.examId === exam.id)?.attemptKey;
    const result = await scheduleExamReminder(exam, daysBefore, scope, attemptKey);
    if (!result.ok) {
      setSavingReminder(false);
      Alert.alert("알림을 예약하지 못했어요", result.message);
      await refreshNotificationStatus();
      return;
    }
    const nextPreferences = [...preferences.filter((item) => item.examId !== exam.id), { examId: exam.id, daysBefore, scope, ...(attemptKey ? { attemptKey } : {}) }];
    const saved = await Promise.all([
      saveReminderPreferences(nextPreferences),
      saveReminderExamIds(nextPreferences.map((item) => item.examId)),
    ]);
    if (saved.some((value) => !value)) {
      await cancelCertbomRemindersForExam(exam.id);
      setSavingReminder(false);
      Alert.alert("알림 설정을 저장하지 못했어요", "예약을 안전하게 취소했습니다. 다시 시도해 주세요.");
      return;
    }
    if (!favoriteIds.includes(exam.id)) {
      const nextFavorites = [...favoriteIds, exam.id];
      setFavoriteIds(nextFavorites);
      await saveFavoriteExamIds(nextFavorites);
    }
    setPreferences(nextPreferences);
    setScheduledCounts((current) => ({ ...current, [exam.id]: result.notificationIds.length }));
    setSavingReminder(false);
    setEditorExamId(undefined);
    const firstPlan = result.plans[0];
    Alert.alert("알림을 예약했어요", scope === "critical" ? `중요 일정 ${result.plans.length}개를 각각 ${daysBefore}일 전에 알려드릴게요.` : `${firstPlan?.eventTitle ?? "다음 일정"}을 ${firstPlan ? formatReminderDate(firstPlan.date) : `${daysBefore}일 전`}에 알려드릴게요.`);
  };

  const selectAttempt = async (exam: Exam, attemptKey?: string) => {
    const next = attemptKey
      ? [...attemptSelections.filter((item) => item.examId !== exam.id), { examId: exam.id, attemptKey }]
      : attemptSelections.filter((item) => item.examId !== exam.id);
    if (!(await saveExamAttemptSelections(next))) {
      Alert.alert("선택한 일정을 저장하지 못했어요", "기기 저장소를 확인한 뒤 다시 시도해 주세요.");
      return;
    }
    setAttemptSelections(next);
    const preference = preferences.find((item) => item.examId === exam.id);
    if (preference && preference.attemptKey !== attemptKey) {
      Alert.alert("선택한 일정으로 저장했어요", "기존 알림은 그대로 유지됩니다. 선택한 일정 알림으로 바꾸려면 알림 설정을 다시 저장해 주세요.");
    }
  };

  const removeReminder = async (exam: Exam) => {
    setSavingReminder(true);
    const nextPreferences = preferences.filter((item) => item.examId !== exam.id);
    await cancelCertbomRemindersForExam(exam.id);
    await Promise.all([saveReminderPreferences(nextPreferences), saveReminderExamIds(nextPreferences.map((item) => item.examId))]);
    setPreferences(nextPreferences);
    setScheduledCounts((current) => { const next = { ...current }; delete next[exam.id]; return next; });
    setSavingReminder(false);
    setEditorExamId(undefined);
  };

  const updateJourney = async (exam: Exam, transform: (journey: StoredExamJourney) => StoredExamJourney) => {
    const previousJourneys = journeys;
    const previousFavorites = favoriteIds;
    const current = journeys.find((item) => item.examId === exam.id) ?? { examId: exam.id, stage: "watching" as const, tasks: [] };
    const updated = transform(current);
    const nextJourneys = [...journeys.filter((item) => item.examId !== exam.id), updated];
    const nextFavorites = favoriteIds.includes(exam.id) ? favoriteIds : [...favoriteIds, exam.id];
    setJourneys(nextJourneys);
    setFavoriteIds(nextFavorites);
    const saved = await Promise.all([saveExamJourneys(nextJourneys), saveFavoriteExamIds(nextFavorites)]);
    if (saved.some((value) => !value)) {
      setJourneys(previousJourneys);
      setFavoriteIds(previousFavorites);
      Alert.alert("준비 상태를 저장하지 못했어요", "기기 저장소를 확인한 뒤 다시 시도해 주세요.");
    }
  };

  const changeJourneyStage = (exam: Exam, stage: ExamJourneyStage) => updateJourney(exam, (journey) => ({ ...journey, stage }));
  const addJourneyTask = (exam: Exam, label: string) => updateJourney(exam, (journey) => ({
    ...journey,
    tasks: [...journey.tasks, { id: `${exam.id}:${Date.now()}`, label, completed: false }],
  }));
  const toggleJourneyTask = (exam: Exam, taskId: string) => updateJourney(exam, (journey) => ({
    ...journey,
    tasks: journey.tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed } : task),
  }));
  const deleteJourneyTask = (exam: Exam, taskId: string) => updateJourney(exam, (journey) => ({
    ...journey,
    tasks: journey.tasks.filter((task) => task.id !== taskId),
  }));

  const openNotificationSettings = async () => {
    try { await Linking.openSettings(); }
    catch { Alert.alert("설정을 열지 못했어요", "기기 설정에서 자격증봄의 알림을 확인해 주세요."); }
  };

  const openBatterySettings = async () => {
    try { await IntentLauncher.startActivityAsync("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS"); }
    catch { Alert.alert("배터리 설정을 열지 못했어요", "기기 설정의 배터리 최적화 앱 목록에서 자격증봄을 확인해 주세요."); }
  };

  const detailExam = detailExamId ? getExam(detailExamId) : undefined;
  const editorExam = editorExamId ? getExam(editorExamId) : undefined;
  const detailJourney = detailExam
    ? journeys.find((item) => item.examId === detailExam.id) ?? { examId: detailExam.id, stage: "watching" as const, tasks: [] }
    : undefined;
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      {detailExam && detailJourney ? <DetailScreen attemptSelection={attemptSelections.find((item) => item.examId === detailExam.id)} checkedPreparationIds={checkedPreparationIds} exam={detailExam} favorite={favoriteIds.includes(detailExam.id)} journey={detailJourney} onAddTask={(label) => void addJourneyTask(detailExam, label)} onBack={() => setDetailExamId(undefined)} onChangeStage={(stage) => void changeJourneyStage(detailExam, stage)} onDeleteTask={(taskId) => void deleteJourneyTask(detailExam, taskId)} onEditReminder={() => setEditorExamId(detailExam.id)} onOpenUrl={openUrl} onSelectAttempt={(attemptKey) => void selectAttempt(detailExam, attemptKey)} onToggleFavorite={() => void toggleFavorite(detailExam)} onTogglePreparation={(itemId) => void togglePreparation(itemId)} onToggleTask={(taskId) => void toggleJourneyTask(detailExam, taskId)} reminder={preferences.find((item) => item.examId === detailExam.id)} /> : <><BrandHeader compact={activeTab !== "home"} onOpenRobom={() => void openUrl(ROBOM_URL, "로봄 홈페이지")} /><View style={styles.content}>{activeTab === "home" && <HomeScreen attemptSelections={attemptSelections} checkedPreparationIds={checkedPreparationIds} favoriteIds={favoriteIds} journeys={journeys} onFind={() => changeTab("find")} onOpen={openExam} onSelectFilter={(filter) => { setFindFilter(filter); changeTab("find"); }} onShowReminders={() => changeTab("reminders")} />}{activeTab === "find" && <FindScreen favoriteIds={favoriteIds} initialFilter={findFilter} onOpen={openExam} />}{activeTab === "calendar" && <CalendarScreen attemptSelections={attemptSelections} favoriteIds={favoriteIds} onOpen={openExam} />}{activeTab === "reminders" && <RemindersScreen attemptSelections={attemptSelections} checkedPreparationIds={checkedPreparationIds} favoriteIds={favoriteIds} journeys={journeys} notificationStatus={notificationStatus} onEdit={(exam) => setEditorExamId(exam.id)} onOpen={openExam} onOpenNotificationSettings={() => void openNotificationSettings()} preferences={preferences} scheduledCounts={scheduledCounts} />}{activeTab === "settings" && <SettingsScreen notificationStatus={notificationStatus} onOpenBatterySettings={() => void openBatterySettings()} onOpenNotificationSettings={() => void openNotificationSettings()} onOpenUrl={openUrl} />}</View><BottomTabs active={activeTab} onChange={changeTab} /></>}
      {editorExam && <ReminderEditor attemptKey={attemptSelections.find((item) => item.examId === editorExam.id)?.attemptKey} exam={editorExam} existing={preferences.find((item) => item.examId === editorExam.id)} onCancel={() => setEditorExamId(undefined)} onRemove={() => void removeReminder(editorExam)} onSave={(days, scope) => void saveReminder(editorExam, days, scope)} saving={savingReminder} />}
    </SafeAreaView>
  );
}

export default function App() {
  return <SafeAreaProvider><StatusBar style="dark" /><MobileApp /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safeArea: { flex: 1, backgroundColor: "#f6f7fb" }, content: { flex: 1 }, pressed: { opacity: 0.72 }, disabled: { opacity: 0.45 },
  brandHeader: { minHeight: 86, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: 1, borderBottomColor: "#e6e8f1", backgroundColor: "#fffefb", paddingHorizontal: 16, paddingVertical: 10 }, brandHeaderCompact: { minHeight: 70, paddingVertical: 7 }, brandIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: "#4058d8" }, brandIconText: { color: "#ffffff", fontSize: 25, fontWeight: "900" }, brandCopy: { flex: 1 }, brandEyebrow: { color: "#7b8090", fontSize: 11, fontWeight: "700" }, wordmarkRow: { minHeight: 34, flexDirection: "row", alignItems: "center" }, wordmarkText: { color: "#1d3047", fontSize: 25, fontWeight: "900", letterSpacing: -1.3 }, robomLink: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 12, backgroundColor: "#eef0ff", paddingHorizontal: 10 }, robomLinkText: { color: "#4058d8", fontSize: 13, fontWeight: "800" },
  screenContent: { width: "100%", maxWidth: 760, alignSelf: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 116 },
  heroCard: { borderRadius: 28, backgroundColor: "#eff1ff", padding: 22, overflow: "hidden" }, heroKicker: { color: "#5264c9", fontSize: 12, fontWeight: "800" }, heroTitle: { marginTop: 12, color: "#152039", fontSize: 32, lineHeight: 40, fontWeight: "900", letterSpacing: -1.5 }, heroHighlight: { color: "#4058d8" }, heroDescription: { marginTop: 12, color: "#59627a", fontSize: 15, lineHeight: 22 }, primaryButton: { minHeight: 54, marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, backgroundColor: "#4058d8", paddingHorizontal: 18 }, primaryButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  statGrid: { marginTop: 12, flexDirection: "row", gap: 8 }, statCard: { flex: 1, minHeight: 82, justifyContent: "space-between", borderWidth: 1, borderColor: "#e1e4ef", borderRadius: 18, backgroundColor: "#ffffff", padding: 12 }, statLabel: { color: "#70778b", fontSize: 12, fontWeight: "700" }, statValue: { color: "#1d2944", fontSize: 24, fontWeight: "900" }, statUnit: { fontSize: 13, fontWeight: "700" },
  reminderSummary: { minHeight: 76, marginTop: 12, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: "#dfe2f0", borderRadius: 20, backgroundColor: "#ffffff", paddingHorizontal: 14 }, reminderSummaryIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#eef0ff" }, reminderSummaryCopy: { flex: 1 }, reminderSummaryTitle: { color: "#222d47", fontSize: 15, fontWeight: "800" }, reminderSummaryText: { marginTop: 3, color: "#747b8e", fontSize: 12, lineHeight: 17 }, chevron: { color: "#8c92a2", fontSize: 28, fontWeight: "300" },
  journeyCard: { minHeight: 126, marginBottom: 9, borderWidth: 1, borderColor: "#dfe2ef", borderRadius: 20, backgroundColor: "#ffffff", padding: 15 }, journeyCardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }, journeyCardCopy: { flex: 1 }, journeyCardTitle: { color: "#202c45", fontSize: 16, fontWeight: "900" }, journeyCardStage: { marginTop: 4, color: "#6674ca", fontSize: 11, fontWeight: "800" }, journeyCardDday: { color: "#4058d8", fontSize: 13, fontWeight: "900", borderRadius: 10, backgroundColor: "#eef0ff", paddingHorizontal: 9, paddingVertical: 6, overflow: "hidden" }, journeyCardAction: { marginTop: 10, color: "#3c4760", fontSize: 14, fontWeight: "800" }, journeyMiniProgress: { height: 6, marginTop: 11, overflow: "hidden", borderRadius: 3, backgroundColor: "#e7e9f1" }, journeyMiniProgressValue: { height: 6, borderRadius: 3, backgroundColor: "#4058d8" }, journeyCardMeta: { marginTop: 6, color: "#828899", fontSize: 10 },
  sectionTitleRow: { marginTop: 28, marginBottom: 12, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }, sectionEyebrow: { color: "#6573c7", fontSize: 12, fontWeight: "800" }, sectionTitle: { marginTop: 3, color: "#1b2741", fontSize: 22, fontWeight: "900", letterSpacing: -0.7 }, sectionCount: { color: "#7c8395", fontSize: 13, fontWeight: "700" },
  examRow: { minHeight: 90, marginBottom: 9, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#e1e4ed", borderRadius: 19, backgroundColor: "#ffffff", paddingHorizontal: 15, paddingVertical: 13 }, examRowCopy: { flex: 1 }, examNameRow: { flexDirection: "row", alignItems: "center", gap: 7 }, examName: { flexShrink: 1, color: "#1d2942", fontSize: 16, fontWeight: "800" }, favoriteBadge: { color: "#4058d8", fontSize: 10, fontWeight: "900", borderRadius: 8, backgroundColor: "#eef0ff", paddingHorizontal: 6, paddingVertical: 3, overflow: "hidden" }, examMeta: { marginTop: 4, color: "#737a8b", fontSize: 12 }, examNext: { marginTop: 7, color: "#4e5fbd", fontSize: 13, fontWeight: "700" },
  emptyCard: { borderWidth: 1, borderColor: "#e1e4ed", borderRadius: 19, backgroundColor: "#ffffff", padding: 20 }, emptyTitle: { color: "#26314a", fontSize: 16, fontWeight: "800" }, emptyText: { marginTop: 6, color: "#747b8d", fontSize: 13, lineHeight: 19 },
  timelineRow: { minHeight: 78, marginBottom: 9, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e1e4ed", borderRadius: 18, backgroundColor: "#ffffff", overflow: "hidden", paddingRight: 12 }, timelineAccent: { width: 5, alignSelf: "stretch" }, timelineDate: { width: 54, alignItems: "center" }, timelineDay: { color: "#202c45", fontSize: 21, fontWeight: "900" }, timelineMonth: { color: "#8a90a0", fontSize: 11 }, timelineCopy: { flex: 1 }, timelineLabel: { color: "#6674ca", fontSize: 11, fontWeight: "800" }, timelineTitle: { marginTop: 2, color: "#253149", fontSize: 15, fontWeight: "800" }, timelineMeta: { marginTop: 3, color: "#73798a", fontSize: 12 },
  pageTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, pageEyebrow: { color: "#6573c7", fontSize: 12, fontWeight: "800" }, pageTitle: { marginTop: 3, color: "#1b2741", fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  findHeader: { width: "100%", maxWidth: 760, alignSelf: "center", paddingHorizontal: 16, paddingTop: 16 }, searchBox: { minHeight: 54, marginTop: 15, flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderColor: "#dfe2ec", borderRadius: 17, backgroundColor: "#ffffff", paddingHorizontal: 14 }, searchInput: { flex: 1, color: "#1d2942", fontSize: 15, paddingVertical: 0 }, filterRow: { marginTop: 12, flexDirection: "row", gap: 8 }, filterChip: { minHeight: 42, justifyContent: "center", borderWidth: 1, borderColor: "#dfe2ec", borderRadius: 14, backgroundColor: "#ffffff", paddingHorizontal: 15 }, filterChipActive: { borderColor: "#4058d8", backgroundColor: "#eef0ff" }, filterChipText: { color: "#666e82", fontSize: 13, fontWeight: "800" }, filterChipTextActive: { color: "#4058d8" }, resultCount: { marginTop: 14, color: "#767d8f", fontSize: 13, fontWeight: "700" }, findList: { width: "100%", maxWidth: 760, alignSelf: "center", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 110 },
  scopeButton: { minHeight: 42, justifyContent: "center", borderWidth: 1, borderColor: "#dfe2ec", borderRadius: 14, backgroundColor: "#ffffff", paddingHorizontal: 15 }, scopeButtonActive: { borderColor: "#4058d8", backgroundColor: "#eef0ff" }, scopeButtonText: { color: "#687085", fontSize: 13, fontWeight: "800" }, scopeButtonTextActive: { color: "#4058d8" }, calendarCard: { marginTop: 17, borderWidth: 1, borderColor: "#e1e4ed", borderRadius: 24, backgroundColor: "#ffffff", padding: 13 }, monthHeader: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, monthButton: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#f4f5fa" }, monthTitle: { color: "#202c45", fontSize: 18, fontWeight: "900" }, weekRow: { marginTop: 5, flexDirection: "row" }, weekDay: { width: "14.2857%", color: "#8a90a0", fontSize: 11, fontWeight: "700", textAlign: "center" }, calendarGrid: { marginTop: 5, flexDirection: "row", flexWrap: "wrap" }, dayCell: { width: "14.2857%", minHeight: 47, alignItems: "center", justifyContent: "center", borderRadius: 13 }, dayCellSelected: { backgroundColor: "#4058d8" }, dayCellToday: { borderWidth: 1, borderColor: "#9ca8ef" }, dayNumber: { color: "#3a4358", fontSize: 14, fontWeight: "700" }, dayNumberSelected: { color: "#ffffff" }, eventDot: { width: 5, height: 5, marginTop: 3, borderRadius: 3, backgroundColor: "#4058d8" }, eventDotSelected: { backgroundColor: "#dfe3ff" }, agendaCard: { minHeight: 82, marginBottom: 9, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#e1e4ed", borderRadius: 18, backgroundColor: "#ffffff", padding: 13 }, agendaType: { minWidth: 58, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 10 }, agendaTypeText: { color: "#ffffff", fontSize: 11, fontWeight: "900" }, agendaCopy: { flex: 1 }, agendaTitle: { color: "#243049", fontSize: 15, fontWeight: "800" }, agendaMeta: { marginTop: 3, color: "#5f687d", fontSize: 13 }, agendaSource: { marginTop: 4, color: "#8a90a0", fontSize: 11 },
  notificationStatus: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, backgroundColor: "#ffffff", paddingHorizontal: 10, paddingVertical: 8 }, statusDot: { width: 8, height: 8, borderRadius: 4 }, statusGood: { backgroundColor: "#20a56b" }, statusWarn: { backgroundColor: "#e69632" }, notificationStatusText: { color: "#596176", fontSize: 12, fontWeight: "800" }, infoCard: { marginTop: 17, flexDirection: "row", alignItems: "flex-start", gap: 11, borderRadius: 19, backgroundColor: "#eef0ff", padding: 16 }, infoCopy: { flex: 1 }, infoTitle: { color: "#27345a", fontSize: 15, fontWeight: "800" }, infoText: { marginTop: 5, color: "#626b86", fontSize: 13, lineHeight: 19 }, outlineButton: { minHeight: 52, marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderColor: "#4058d8", borderRadius: 15, backgroundColor: "#ffffff", paddingHorizontal: 15 }, outlineButtonActive: { backgroundColor: "#eef0ff" }, outlineButtonText: { color: "#4058d8", fontSize: 15, fontWeight: "800" }, outlineButtonTextActive: { color: "#3045bd" }, reminderCard: { minHeight: 108, marginBottom: 9, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#e1e4ed", borderRadius: 18, backgroundColor: "#ffffff", padding: 12 }, reminderCardCopy: { flex: 1 }, reminderExamName: { flexShrink: 1, color: "#233049", fontSize: 15, fontWeight: "800" }, reminderExamAction: { marginTop: 7, color: "#4f5dba", fontSize: 12, fontWeight: "800" }, reminderExamMeta: { marginTop: 4, color: "#777e90", fontSize: 10 }, reminderChip: { borderRadius: 10, backgroundColor: "#f0f1f5", paddingHorizontal: 8, paddingVertical: 6 }, reminderChipActive: { backgroundColor: "#e8ecff" }, reminderChipText: { color: "#777e8e", fontSize: 10, fontWeight: "800" }, reminderChipTextActive: { color: "#4058d8" }, editButton: { minWidth: 48, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: "#4058d8" }, editButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
  settingsCard: { marginTop: 14, borderWidth: 1, borderColor: "#e1e4ed", borderRadius: 21, backgroundColor: "#ffffff", padding: 16 }, settingsTitle: { color: "#202c45", fontSize: 18, fontWeight: "900" }, settingsText: { marginTop: 7, color: "#6d7486", fontSize: 13, lineHeight: 20 }, settingsActionList: { marginTop: 10 }, settingsAction: { minHeight: 58, marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 15, backgroundColor: "#f7f8fc", paddingHorizontal: 13, paddingVertical: 10 }, settingsActionTitle: { color: "#2a354d", fontSize: 14, fontWeight: "800" }, settingsActionMeta: { marginTop: 3, color: "#7d8495", fontSize: 11 }, familyRow: { minHeight: 65, marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 15, backgroundColor: "#f7f8fc", paddingHorizontal: 13 }, familyName: { color: "#28344d", fontSize: 15, fontWeight: "900" }, familyDescription: { marginTop: 3, color: "#7c8394", fontSize: 11 }, metaRow: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#edf0f5" }, metaLabel: { color: "#71788a", fontSize: 12 }, metaValue: { maxWidth: "65%", color: "#2b364e", fontSize: 12, fontWeight: "700", textAlign: "right" }, officialNotice: { marginTop: 13, color: "#71788a", fontSize: 11, lineHeight: 17 },
  detailHeader: { minHeight: 62, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#e5e8f0", backgroundColor: "#fffefb", paddingHorizontal: 10 }, backButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, detailHeaderTitle: { flex: 1, color: "#263149", fontSize: 16, fontWeight: "800", textAlign: "center" }, detailContent: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 16, paddingBottom: 60 }, detailHero: { borderRadius: 24, backgroundColor: "#eef0ff", padding: 20 }, detailCategory: { color: "#5d6bc5", fontSize: 12, fontWeight: "800" }, detailTitle: { marginTop: 7, color: "#18233c", fontSize: 27, fontWeight: "900", letterSpacing: -1 }, detailDescription: { marginTop: 10, color: "#59627a", fontSize: 14, lineHeight: 21 }, detailBadgeRow: { marginTop: 13, flexDirection: "row", flexWrap: "wrap", gap: 7 }, detailBadge: { color: "#4058d8", fontSize: 11, fontWeight: "800", borderRadius: 10, backgroundColor: "#ffffff", paddingHorizontal: 8, paddingVertical: 5, overflow: "hidden" }, nextEventCard: { marginTop: 12, borderWidth: 1, borderColor: "#e1e4ed", borderRadius: 19, backgroundColor: "#ffffff", padding: 16 }, nextEventLabel: { color: "#6573c7", fontSize: 11, fontWeight: "800" }, nextEventTitle: { marginTop: 5, color: "#202c45", fontSize: 17, fontWeight: "900" }, nextEventDate: { marginTop: 5, color: "#6f7689", fontSize: 13 }, detailActions: { marginTop: 2 }, detailEventRow: { minHeight: 74, marginBottom: 8, flexDirection: "row", alignItems: "flex-start", gap: 11, borderRadius: 17, backgroundColor: "#ffffff", padding: 14 }, detailEventDot: { width: 10, height: 10, marginTop: 5, borderRadius: 5 }, detailEventCopy: { flex: 1 }, detailEventType: { color: "#6674ca", fontSize: 11, fontWeight: "800" }, detailEventTitle: { marginTop: 3, color: "#28344d", fontSize: 14, fontWeight: "800" }, detailEventDate: { marginTop: 4, color: "#7d8494", fontSize: 12 }, preparationProgress: { marginBottom: 11, borderRadius: 18, backgroundColor: "#eef0ff", padding: 14 }, preparationProgressCopy: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, preparationProgressTitle: { color: "#26345e", fontSize: 15, fontWeight: "900" }, preparationProgressMeta: { color: "#6573c7", fontSize: 12, fontWeight: "800" }, preparationProgressTrack: { height: 8, marginTop: 10, overflow: "hidden", borderRadius: 4, backgroundColor: "#d6dcfa" }, preparationProgressValue: { height: 8, borderRadius: 4, backgroundColor: "#4058d8" }, preparationRow: { minHeight: 72, marginBottom: 9, flexDirection: "row", alignItems: "flex-start", gap: 11, borderWidth: 1, borderColor: "#e1e4ed", borderRadius: 18, backgroundColor: "#ffffff", padding: 14 }, preparationRowChecked: { borderColor: "#b9c3f4", backgroundColor: "#f6f7ff" }, preparationCheckbox: { width: 26, height: 26, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#b4bac8", borderRadius: 8, backgroundColor: "#ffffff" }, preparationCheckboxChecked: { borderColor: "#4058d8", backgroundColor: "#4058d8" }, preparationCheckText: { color: "#ffffff", fontSize: 15, fontWeight: "900" }, preparationMark: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#8b93a6" }, preparationMarkRequired: { backgroundColor: "#4058d8" }, preparationMarkForbidden: { backgroundColor: "#d65c53" }, preparationCopy: { flex: 1 }, preparationTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 }, preparationTitle: { flexShrink: 1, color: "#28344d", fontSize: 14, fontWeight: "800" }, preparationTitleChecked: { color: "#69738d", textDecorationLine: "line-through" }, preparationText: { marginTop: 5, color: "#697084", fontSize: 12, lineHeight: 18 }, preparationSource: { marginTop: 7, color: "#7d87c1", fontSize: 10, fontWeight: "700" },
  stageRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, stageChip: { minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: "#dfe2ec", borderRadius: 14, backgroundColor: "#ffffff", paddingHorizontal: 13 }, stageChipActive: { borderColor: "#4058d8", backgroundColor: "#eef0ff" }, stageChipText: { color: "#747b8e", fontSize: 12, fontWeight: "800" }, stageChipTextActive: { color: "#4058d8" }, nextActionCard: { marginTop: 10, borderRadius: 18, backgroundColor: "#eef0ff", padding: 15 }, nextActionLabel: { color: "#6573c7", fontSize: 11, fontWeight: "800" }, nextActionTitle: { marginTop: 5, color: "#27345a", fontSize: 16, fontWeight: "900" }, taskComposer: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#dfe2ec", borderRadius: 17, backgroundColor: "#ffffff", padding: 7 }, taskInput: { flex: 1, minHeight: 48, color: "#27324a", fontSize: 14, paddingHorizontal: 9 }, taskAddButton: { minWidth: 58, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: "#4058d8" }, taskAddButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "900" }, taskProgressText: { marginTop: 10, marginBottom: 8, color: "#6674ca", fontSize: 12, fontWeight: "800" }, personalTaskRow: { minHeight: 62, marginBottom: 8, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e1e4ed", borderRadius: 17, backgroundColor: "#ffffff", paddingHorizontal: 12 }, personalTaskToggle: { flex: 1, minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10 }, personalTaskLabel: { flex: 1, color: "#2b364e", fontSize: 14, fontWeight: "800" }, taskDeleteButton: { minWidth: 48, minHeight: 44, alignItems: "center", justifyContent: "center" }, taskDeleteText: { color: "#ad4e47", fontSize: 12, fontWeight: "800" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(20,26,43,.36)" }, modalSheet: { maxHeight: "92%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "#f8f9fc", paddingHorizontal: 18 }, modalScroll: { paddingBottom: 26 }, modalHandle: { width: 42, height: 5, alignSelf: "center", marginTop: 9, marginBottom: 10, borderRadius: 3, backgroundColor: "#c9cdd8" }, modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, modalTitle: { marginTop: 3, color: "#1f2a43", fontSize: 23, fontWeight: "900" }, closeButton: { minWidth: 50, minHeight: 44, alignItems: "center", justifyContent: "center" }, closeButtonText: { color: "#4058d8", fontSize: 14, fontWeight: "800" }, modalEvent: { marginTop: 16, borderRadius: 18, backgroundColor: "#ffffff", padding: 15 }, optionTitle: { marginTop: 22, marginBottom: 10, color: "#27324a", fontSize: 16, fontWeight: "900" }, scopeOptions: { gap: 8 }, scopeOption: { minHeight: 62, justifyContent: "center", borderWidth: 1, borderColor: "#dfe2ec", borderRadius: 17, backgroundColor: "#ffffff", paddingHorizontal: 15 }, reminderOptions: { gap: 8 }, reminderOption: { minHeight: 64, justifyContent: "center", borderWidth: 1, borderColor: "#dfe2ec", borderRadius: 17, backgroundColor: "#ffffff", paddingHorizontal: 15 }, reminderOptionActive: { borderColor: "#4058d8", backgroundColor: "#eef0ff" }, reminderOptionValue: { color: "#303b52", fontSize: 15, fontWeight: "900" }, reminderOptionValueActive: { color: "#4058d8" }, reminderOptionHint: { marginTop: 3, color: "#858b9b", fontSize: 11 }, reminderOptionHintActive: { color: "#6876c8" }, modalNotice: { marginTop: 13, color: "#72798b", fontSize: 11, lineHeight: 17 }, removeButton: { minHeight: 50, marginTop: 8, alignItems: "center", justifyContent: "center" }, removeButtonText: { color: "#ad4e47", fontSize: 14, fontWeight: "800" },
  bottomTabs: { width: "100%", minHeight: 68, alignSelf: "center", flexDirection: "row", borderTopWidth: 1, borderTopColor: "#dfe2eb", backgroundColor: "#fffefb", paddingTop: 5 }, tabButton: { flex: 1, minHeight: 54, alignItems: "center", justifyContent: "center", gap: 2 }, tabLabel: { color: "#7a8195", fontSize: 10, fontWeight: "700" }, tabLabelActive: { color: "#4058d8", fontWeight: "900" }, tabIndicator: { position: "absolute", top: -5, width: 26, height: 3, borderRadius: 2, backgroundColor: "#4058d8" },
});

const adaptiveStyles = StyleSheet.create({
  modalBackdropCentered: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalSheetCentered: {
    width: "100%",
    borderRadius: 28,
  },
  statGridStacked: {
    flexDirection: "column",
  },
  statCardStacked: {
    flex: 0,
    minHeight: 70,
    width: "100%",
  },
  findColumn: {
    gap: 12,
  },
  findGridItem: {
    flex: 1,
    minWidth: 0,
  },
});
