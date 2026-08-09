// 사용자가 고른 관심 시험을 기기에 저장하되 저장소 오류를 앱 밖으로 전파하지 않는다.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { migratePreparationIds } from "@certbom/core";

const SELECTED_EXAM_KEY = "certbom.mobile.selectedExamId.v1";
const FAVORITE_EXAM_IDS_KEY = "certbom.mobile.favoriteExamIds.v1";
const REMINDER_EXAM_IDS_KEY = "certbom.mobile.reminderExamIds.v1";
const REMINDER_PREFERENCES_KEY = "certbom.mobile.reminderPreferences.v1";
const PREPARATION_CHECKED_IDS_KEY = "certbom.mobile.preparationCheckedIds.v1";

export type StoredReminderPreference = {
  examId: string;
  daysBefore: 1 | 3 | 7;
};

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

export async function loadReminderPreferences(): Promise<StoredReminderPreference[]> {
  try {
    const value = await AsyncStorage.getItem(REMINDER_PREFERENCES_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const examId = "examId" in item ? item.examId : undefined;
      const daysBefore = "daysBefore" in item ? item.daysBefore : undefined;
      if (typeof examId !== "string" || ![1, 3, 7].includes(Number(daysBefore))) return [];
      return [{ examId, daysBefore: Number(daysBefore) as 1 | 3 | 7 }];
    });
  } catch {
    return [];
  }
}

export async function saveReminderPreferences(preferences: StoredReminderPreference[]) {
  try {
    const normalized = [...new Map(preferences.map((preference) => [
      preference.examId,
      { examId: preference.examId, daysBefore: preference.daysBefore },
    ])).values()];
    await AsyncStorage.setItem(REMINDER_PREFERENCES_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

export async function loadPreparationCheckedIds(): Promise<string[]> {
  try {
    const value = await AsyncStorage.getItem(PREPARATION_CHECKED_IDS_KEY);
    if (!value) return [];
    return migratePreparationIds(normalizeIds(JSON.parse(value)));
  } catch {
    return [];
  }
}

export async function savePreparationCheckedIds(ids: string[]) {
  try {
    await AsyncStorage.setItem(PREPARATION_CHECKED_IDS_KEY, JSON.stringify(migratePreparationIds(normalizeIds(ids))));
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
