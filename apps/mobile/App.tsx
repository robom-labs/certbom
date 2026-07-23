// 오프라인 시험 탐색과 관심 시험 알림·공식 링크 흐름을 제공한다(시험 수는 카탈로그에서 동적 계산).
import { catalogStats, exams, getExam, getNextEvent, type Exam } from "@certbom/core";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { parseExamDeepLink } from "./src/deep-link";
import { configureNotificationPresentation, scheduleExamReminder } from "./src/notifications";
import { loadFavoriteExamIds, loadSelectedExamId, saveFavoriteExamIds, saveSelectedExamId } from "./src/storage";

const SUPPORT_URL = process.env.EXPO_PUBLIC_SUPPORT_URL ?? "https://robom.kr/support";
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? "https://robom.kr/privacy/certbom";

function normalize(value: string) {
  return value.toLocaleLowerCase("ko-KR").replaceAll(" ", "");
}

function formatEventDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "공식 일정 확인 필요";
  // date-only 이벤트 startAt은 자정 KST(+09:00)라 timeZone을 지정하지 않으면
  // KST보다 서쪽 기기(UTC·미주 등)에서 시험일이 하루 전날로 표시된다.
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Seoul" });
}

function formatReminderDate(value: Date) {
  return value.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function MobileApp() {
  const [query, setQuery] = useState("");
  const [selectedExam, setSelectedExam] = useState<Exam>();
  const [favoriteExamIds, setFavoriteExamIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("관심 시험을 한 건 고르면 기기에 저장할 수 있어요.");
  const [isScheduling, setIsScheduling] = useState(false);
  const selectionMade = useRef(false);

  const selectExam = useCallback((exam: Exam, message: string) => {
    selectionMade.current = true;
    setSelectedExam(exam);
    setNotice(message);
    Keyboard.dismiss();

    void saveSelectedExamId(exam.id).then((saved) => {
      if (!saved) {
        setNotice("관심 시험은 현재 실행 중 유지되지만 기기 저장에는 실패했습니다.");
      }
    });
  }, []);

  const selectExamById = useCallback(
    (examId: string, source: "link" | "notification") => {
      const exam = getExam(examId);
      if (!exam) {
        setNotice("이 링크의 시험을 오프라인 카탈로그에서 찾지 못했습니다.");
        return;
      }

      selectExam(
        exam,
        source === "notification"
          ? `${exam.name} 알림에서 관심 시험을 열었습니다.`
          : `${exam.name} 딥링크를 열었습니다.`,
      );
    },
    [selectExam],
  );

  useEffect(() => {
    configureNotificationPresentation();
    let mounted = true;
    void loadSelectedExamId().then((examId) => {
      if (!mounted || selectionMade.current || !examId) return;
      const exam = getExam(examId);
      if (exam) {
        setSelectedExam(exam);
        setNotice(`${exam.name}을 기기에서 불러왔습니다.`);
      }
    });
    void loadFavoriteExamIds().then((examIds) => {
      if (!mounted) return;
      setFavoriteExamIds(examIds.filter((examId) => Boolean(getExam(examId))));
    });

    return () => {
      mounted = false;
    };
  }, []);

  const toggleFavorite = useCallback((exam: Exam) => {
    setFavoriteExamIds((current) => {
      const next = current.includes(exam.id)
        ? current.filter((examId) => examId !== exam.id)
        : [...current, exam.id];
      void saveFavoriteExamIds(next).then((saved) => {
        setNotice(saved
          ? current.includes(exam.id) ? `${exam.name} 관심 시험을 해제했어요.` : `${exam.name}을 관심 시험에 저장했어요.`
          : "관심 시험은 현재 화면에 유지되지만 기기 저장에는 실패했습니다.");
      });
      return next;
    });
  }, []);

  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      const examId = parseExamDeepLink(url);
      if (examId) selectExamById(examId, "link");
    };

    const subscription = Linking.addEventListener("url", handleUrl);
    void Linking.getInitialURL()
      .then((url) => {
        if (url) handleUrl({ url });
      })
      .catch(() => undefined);

    return () => subscription.remove();
  }, [selectExamById]);

  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const examId = response.notification.request.content.data?.examId;
      if (typeof examId === "string") selectExamById(examId, "notification");
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        handleResponse(response);
        return Notifications.clearLastNotificationResponseAsync();
      })
      .catch(() => undefined);

    return () => subscription.remove();
  }, [selectExamById]);

  const filteredExams = useMemo(() => {
    const keyword = normalize(query);
    if (!keyword) return exams;

    return exams.filter((exam) =>
      normalize(
        [exam.name, exam.shortName, exam.organizer, exam.category, ...exam.aliases]
          .filter(Boolean)
          .join(" "),
      ).includes(keyword),
    );
  }, [query]);

  const nextEvent = selectedExam ? getNextEvent(selectedExam) : undefined;
  const selectedIsFavorite = selectedExam ? favoriteExamIds.includes(selectedExam.id) : false;

  const openExternalUrl = useCallback(async (url: string, label: string) => {
    try {
      await Linking.openURL(url);
      setNotice(`${label}을 기기 브라우저에서 열었습니다.`);
    } catch {
      setNotice(`${label}을 열지 못했습니다. 네트워크 상태나 브라우저 설정을 확인해 주세요.`);
    }
  }, []);

  const scheduleReminder = useCallback(async () => {
    if (!selectedExam || isScheduling) return;

    setIsScheduling(true);
    const result = await scheduleExamReminder(selectedExam);
    setIsScheduling(false);

    if (!result.ok) {
      setNotice(result.message);
      return;
    }

    setNotice(
      `${result.plan.eventTitle} 알림을 ${formatReminderDate(result.plan.date)}에 예약했습니다.`,
    );
  }, [isScheduling, selectedExam]);

  const header = (
    <View>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>ROBOM FAMILY</Text>
        <Text style={styles.wordmark}>자격증봄</Text>
        <Text style={styles.subtitle}>{catalogStats.examCount}개 시험을 오프라인에서 찾고, 관심 시험별로 알림을 받을 수 있어요.</Text>
      </View>

      <View style={styles.selectedCard}>
        <Text style={styles.sectionLabel}>내 관심 시험</Text>
        {selectedExam ? (
          <>
            <Text style={styles.selectedName}>{selectedExam.name}</Text>
            <Text style={styles.meta}>
              {selectedExam.organizer} · {selectedExam.category}
            </Text>
            <Text style={styles.eventText}>
              {nextEvent
                ? `${nextEvent.title} · ${formatEventDate(nextEvent.startAt)}`
                : "확정 일정은 공식 시험 페이지에서 확인해 주세요."}
            </Text>
            <Text style={styles.detailHint}>준비물 {selectedExam.preparation.length}개 · 관심 시험 {favoriteExamIds.length}개</Text>
            {selectedExam.preparation.length > 0 ? (
              <Text style={styles.preparationHint}>
                준비물 {selectedExam.preparation.slice(0, 3).join(' · ')}
              </Text>
            ) : null}
            <View style={styles.actionGroup}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: selectedIsFavorite }}
                onPress={() => toggleFavorite(selectedExam)}
                style={({ pressed }) => [styles.favoriteButton, selectedIsFavorite && styles.favoriteButtonActive, pressed && styles.pressed]}
              >
                <Text style={[styles.favoriteButtonText, selectedIsFavorite && styles.favoriteButtonTextActive]}>
                  {selectedIsFavorite ? "관심 시험에서 빼기" : "관심 시험에 저장"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${selectedExam.name} 로컬 알림 예약`}
                disabled={isScheduling}
                onPress={scheduleReminder}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                  isScheduling && styles.disabled,
                ]}
              >
                {isScheduling ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>로컬 알림 예약</Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="link"
                onPress={() => void openExternalUrl(selectedExam.officialUrl, "공식 시험 페이지")}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryButtonText}>공식 시험 페이지 열기 ↗</Text>
              </Pressable>
              {selectedExam.applicationUrl && selectedExam.applicationUrl !== selectedExam.officialUrl ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={() =>
                    void openExternalUrl(selectedExam.applicationUrl ?? selectedExam.officialUrl, "공식 접수처")
                  }
                  style={({ pressed }) => [styles.tertiaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.tertiaryButtonText}>공식 접수처 열기 ↗</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : (
          <Text style={styles.emptySelection}>아래 목록에서 시험 한 건을 선택해 주세요.</Text>
        )}
        <Text accessibilityLiveRegion="polite" style={styles.notice}>
          {notice}
        </Text>
      </View>

      <View style={styles.searchBlock}>
        <Text style={styles.sectionTitle}>시험 찾기</Text>
        <Text style={styles.countText}>
          오프라인 카탈로그 {catalogStats.examCount}개 · 검색 결과 {filteredExams.length}개
        </Text>
        <TextInput
          accessibilityLabel="시험 검색"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          onChangeText={setQuery}
          placeholder="시험명, 약칭, 기관 또는 분야 검색"
          placeholderTextColor="#728078"
          returnKeyType="search"
          style={styles.searchInput}
          value={query}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={filteredExams}
        extraData={selectedExam?.id}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(exam) => exam.id}
        ListEmptyComponent={<Text style={styles.noResults}>검색 결과가 없습니다.</Text>}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              자격증봄은 정부·시행기관을 대표하지 않는 독립 정보 도구입니다. 일정과 응시자격은 시행기관의 최신 공고를 기준으로 확인하세요.
            </Text>
            <View style={styles.footerLinks}>
              <Pressable
                accessibilityRole="link"
                onPress={() => void openExternalUrl(SUPPORT_URL, "지원 페이지")}
                style={styles.footerLinkButton}
              >
                <Text style={styles.footerLink}>지원</Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                onPress={() => void openExternalUrl(PRIVACY_URL, "개인정보 처리방침")}
                style={styles.footerLinkButton}
              >
                <Text style={styles.footerLink}>개인정보</Text>
              </Pressable>
            </View>
          </View>
        }
        ListHeaderComponent={header}
        renderItem={({ item }) => {
          const isSelected = selectedExam?.id === item.id;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => selectExam(item, `${item.name}을 관심 시험으로 저장했습니다.`)}
              style={({ pressed }) => [
                styles.examRow,
                isSelected && styles.examRowSelected,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.examCopy}>
                <Text style={styles.examName}>{item.name}</Text>
                <Text numberOfLines={1} style={styles.examMeta}>
                  {item.organizer} · {item.category}
                </Text>
              </View>
              <Text style={[styles.selectLabel, isSelected && styles.selectLabelSelected]}>
                {isSelected ? "선택됨" : "선택"}
              </Text>
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <MobileApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f8f5",
  },
  listContent: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  hero: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  eyebrow: {
    color: "#18794e",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  wordmark: {
    marginTop: 5,
    color: "#10271c",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1.4,
  },
  subtitle: {
    marginTop: 8,
    color: "#526259",
    fontSize: 16,
    lineHeight: 24,
  },
  selectedCard: {
    padding: 18,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    borderRadius: 20,
    backgroundColor: "#ffffff",
  },
  sectionLabel: {
    color: "#18794e",
    fontSize: 13,
    fontWeight: "800",
  },
  selectedName: {
    marginTop: 8,
    color: "#10271c",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  meta: {
    marginTop: 5,
    color: "#5b6a61",
    fontSize: 14,
  },
  eventText: {
    marginTop: 12,
    color: "#2c4436",
    fontSize: 15,
    lineHeight: 22,
  },
  detailHint: {
    marginTop: 8,
    color: "#365b45",
    fontSize: 13,
    fontWeight: "700",
  },
  preparationHint: {
    marginTop: 6,
    color: "#526259",
    fontSize: 13,
    lineHeight: 19,
  },
  actionGroup: {
    marginTop: 16,
    gap: 9,
  },
  favoriteButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#18794e",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
  },
  favoriteButtonActive: {
    backgroundColor: "#e7f4eb",
  },
  favoriteButtonText: {
    color: "#14633f",
    fontSize: 15,
    fontWeight: "800",
  },
  favoriteButtonTextActive: {
    color: "#0f5132",
  },
  primaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#18794e",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#18794e",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: "#14633f",
    fontSize: 16,
    fontWeight: "800",
  },
  tertiaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  tertiaryButtonText: {
    color: "#365b45",
    fontSize: 15,
    fontWeight: "700",
  },
  emptySelection: {
    marginTop: 8,
    color: "#526259",
    fontSize: 16,
    lineHeight: 24,
  },
  notice: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: "#edf5f0",
    color: "#365b45",
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchBlock: {
    paddingTop: 28,
    paddingBottom: 12,
  },
  sectionTitle: {
    color: "#10271c",
    fontSize: 22,
    fontWeight: "800",
  },
  countText: {
    marginTop: 5,
    color: "#637168",
    fontSize: 13,
  },
  searchInput: {
    minHeight: 52,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#bdcec3",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    color: "#10271c",
    fontSize: 16,
    paddingHorizontal: 15,
  },
  examRow: {
    minHeight: 70,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#d7e1da",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  examRowSelected: {
    borderColor: "#18794e",
    backgroundColor: "#edf7f1",
  },
  examCopy: {
    flex: 1,
  },
  examName: {
    color: "#172d21",
    fontSize: 16,
    fontWeight: "700",
  },
  examMeta: {
    marginTop: 5,
    color: "#66736b",
    fontSize: 13,
  },
  selectLabel: {
    minWidth: 44,
    color: "#5e6b63",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  selectLabelSelected: {
    color: "#18794e",
  },
  noResults: {
    paddingVertical: 30,
    color: "#637168",
    fontSize: 15,
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 20,
  },
  footerText: {
    color: "#637168",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  footerLinks: {
    marginTop: 10,
    flexDirection: "row",
    gap: 6,
  },
  footerLinkButton: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  footerLink: {
    color: "#365b45",
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.55,
  },
});
