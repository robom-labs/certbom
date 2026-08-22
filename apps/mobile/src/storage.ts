// 사용자가 고른 관심 시험을 기기에 저장하되 저장소 오류를 앱 밖으로 전파하지 않는다.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { migratePreparationIds } from "@certbom/core";

const SELECTED_EXAM_KEY = "certbom.mobile.selectedExamId.v1";
const FAVORITE_EXAM_IDS_KEY = "certbom.mobile.favoriteExamIds.v1";
const REMINDER_EXAM_IDS_KEY = "certbom.mobile.reminderExamIds.v1";
const REMINDER_PREFERENCES_KEY = "certbom.mobile.reminderPreferences.v1";
const PREPARATION_CHECKED_IDS_KEY = "certbom.mobile.preparationCheckedIds.v1";
const EXAM_JOURNEYS_KEY = "certbom.mobile.examJourneys.v1";
const EXAM_ATTEMPT_SELECTIONS_KEY = "certbom.mobile.examAttemptSelections.v1";

export type ExamJourneyStage = "watching" | "applied" | "took" | "result";

export type PersonalPreparationTask = {
  id: string;
  label: string;
  completed: boolean;
};

export type StoredExamJourney = {
  examId: string;
  stage: ExamJourneyStage;
  tasks: PersonalPreparationTask[];
};

export type StoredExamAttemptSelection = {
  examId: string;
  attemptKey: string;
};

export type StoredReminderPreference = {
  examId: string;
  daysBefore: 1 | 3 | 7;
  scope: "next" | "critical";
  attemptKey?: string;
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
      const rawScope = "scope" in item ? item.scope : undefined;
      const scope = rawScope === "critical" ? "critical" : "next";
      const attemptKey = "attemptKey" in item ? item.attemptKey : undefined;
      return [{
        examId,
        daysBefore: Number(daysBefore) as 1 | 3 | 7,
        scope,
        ...(typeof attemptKey === "string" && attemptKey ? { attemptKey } : {}),
      }];
    });
  } catch {
    return [];
  }
}

export async function saveReminderPreferences(preferences: StoredReminderPreference[]) {
  try {
    const normalized = [...new Map(preferences.map((preference) => [
      preference.examId,
      {
        examId: preference.examId,
        daysBefore: preference.daysBefore,
        scope: preference.scope,
        ...(preference.attemptKey ? { attemptKey: preference.attemptKey } : {}),
      },
    ])).values()];
    await AsyncStorage.setItem(REMINDER_PREFERENCES_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

export async function loadExamAttemptSelections(): Promise<StoredExamAttemptSelection[]> {
  try {
    const value = await AsyncStorage.getItem(EXAM_ATTEMPT_SELECTIONS_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const examId = "examId" in item ? item.examId : undefined;
      const attemptKey = "attemptKey" in item ? item.attemptKey : undefined;
      return typeof examId === "string" && typeof attemptKey === "string" && attemptKey
        ? [{ examId, attemptKey }]
        : [];
    });
  } catch {
    return [];
  }
}

export async function saveExamAttemptSelections(selections: StoredExamAttemptSelection[]) {
  try {
    const normalized = [...new Map(selections
      .filter((selection) => selection.examId && selection.attemptKey)
      .map((selection) => [selection.examId, { examId: selection.examId, attemptKey: selection.attemptKey }]))
      .values()];
    await AsyncStorage.setItem(EXAM_ATTEMPT_SELECTIONS_KEY, JSON.stringify(normalized));
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

export async function loadExamJourneys(): Promise<StoredExamJourney[]> {
  try {
    const value = await AsyncStorage.getItem(EXAM_JOURNEYS_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const examId = "examId" in item ? item.examId : undefined;
      const rawStage = "stage" in item ? item.stage : undefined;
      const rawTasks = "tasks" in item ? item.tasks : undefined;
      if (typeof examId !== "string") return [];
      const stage: ExamJourneyStage = ["watching", "applied", "took", "result"].includes(String(rawStage))
        ? rawStage as ExamJourneyStage
        : "watching";
      const tasks = Array.isArray(rawTasks) ? rawTasks.flatMap((task) => {
        if (!task || typeof task !== "object") return [];
        const id = "id" in task ? task.id : undefined;
        const label = "label" in task ? task.label : undefined;
        const completed = "completed" in task ? task.completed : undefined;
        if (typeof id !== "string" || typeof label !== "string" || !label.trim()) return [];
        return [{ id, label: label.trim().slice(0, 80), completed: completed === true }];
      }) : [];
      return [{ examId, stage, tasks }];
    });
  } catch {
    return [];
  }
}

export async function saveExamJourneys(journeys: StoredExamJourney[]) {
  try {
    const normalized = [...new Map(journeys.map((journey) => [
      journey.examId,
      {
        examId: journey.examId,
        stage: journey.stage,
        tasks: journey.tasks
          .filter((task) => task.id && task.label.trim())
          .map((task) => ({ id: task.id, label: task.label.trim().slice(0, 80), completed: task.completed })),
      },
    ])).values()];
    await AsyncStorage.setItem(EXAM_JOURNEYS_KEY, JSON.stringify(normalized));
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
