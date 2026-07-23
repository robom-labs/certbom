// 사용자가 고른 관심 시험을 기기에 저장하되 저장소 오류를 앱 밖으로 전파하지 않는다.
import AsyncStorage from "@react-native-async-storage/async-storage";

const SELECTED_EXAM_KEY = "certbom.mobile.selectedExamId.v1";
const FAVORITE_EXAM_IDS_KEY = "certbom.mobile.favoriteExamIds.v1";

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
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? [...new Set(parsed.filter((id): id is string => typeof id === "string"))] : [];
  } catch {
    return [];
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
