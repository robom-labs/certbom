// 사용자가 고른 관심 시험을 기기에 저장하되 저장소 오류를 앱 밖으로 전파하지 않는다.
import AsyncStorage from "@react-native-async-storage/async-storage";

const SELECTED_EXAM_KEY = "certbom.mobile.selectedExamId.v1";
const FAVORITE_EXAM_IDS_KEY = "certbom.mobile.favoriteExamIds.v1";
const REMINDER_EXAM_IDS_KEY = "certbom.mobile.reminderExamIds.v1";

function normalizeIds(value: unknown) {
  return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))] : [];
}

export async function loadSelectedExamId() {
  try {
    return await AsyncStorage.getItem(SELECTED_EXAM_KEY);
  } catch {
    return null;
  }
}

export async function saveSelectedExamId(examId: string) {
  try {
    await AsyncStorage.setItem(SELECTED_EXAM_KEY, examId);
    return true;
  } catch {
    return false;
  }
}

export async function loadFavoriteExamIds(): Promise<string[]> {
  try {
    const value = await AsyncStorage.getItem(FAVORITE_EXAM_IDS_KEY);
    if (!value) return [];
    return normalizeIds(JSON.parse(value));
  } catch {
    return [];
  }
}

export async function loadReminderExamIds(): Promise<{ initialized: boolean; examIds: string[] }> {
  try {
    const value = await AsyncStorage.getItem(REMINDER_EXAM_IDS_KEY);
    if (value === null) return { initialized: false, examIds: [] };
    return { initialized: true, examIds: normalizeIds(JSON.parse(value)) };
  } catch {
    return { initialized: false, examIds: [] };
  }
}

export async function saveReminderExamIds(examIds: string[]) {
  try {
    await AsyncStorage.setItem(REMINDER_EXAM_IDS_KEY, JSON.stringify(normalizeIds(examIds)));
    return true;
  } catch {
    return false;
  }
}

export async function saveFavoriteExamIds(examIds: string[]) {
  try {
    await AsyncStorage.setItem(FAVORITE_EXAM_IDS_KEY, JSON.stringify([...new Set(examIds)]));
    return true;
  } catch {
    return false;
  }
}
