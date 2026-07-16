// 사용자가 고른 관심 시험을 기기에 저장하되 저장소 오류를 앱 밖으로 전파하지 않는다.
import AsyncStorage from "@react-native-async-storage/async-storage";

const SELECTED_EXAM_KEY = "certbom.mobile.selectedExamId.v1";

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
