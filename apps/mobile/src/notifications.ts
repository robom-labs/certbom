// 사용자 요청 뒤 권한을 확인하고 관심 시험의 중요 공식 일정 알림을 예약한다.
import type { Exam } from "@certbom/core";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  createExamReminderPlans,
  type ReminderDaysBefore,
  type ReminderPlan,
  type ReminderScope,
} from "./reminder";

const REMINDER_CHANNEL_ID = "certbom-reminders-v2";
const REMINDER_CHANNEL_VERSION = 2;

export type ReminderScheduleResult =
  | {
      ok: true;
      notificationIds: string[];
      plans: ReminderPlan[];
    }
  | {
      ok: false;
      reason: "denied" | "no-schedule" | "error";
      message: string;
    };

export type ScheduledExamReminder = {
  channelVersion: number;
  daysBefore: ReminderDaysBefore;
  examId: string;
  dedupeKey: string;
  notificationId: string;
  scope: ReminderScope;
  attemptKey?: string;
};

export function configureNotificationPresentation() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function cancelCertbomRemindersForExam(examId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const certbom = scheduled.filter((notification) => {
    const dedupeKey = notification.content.data?.dedupeKey;
    return typeof dedupeKey === "string" && dedupeKey.startsWith(`certbom:${examId}:`);
  });
  await Promise.all(certbom.map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)));
  return certbom.length;
}

export async function getScheduledCertbomReminders(): Promise<ScheduledExamReminder[]> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.flatMap((notification) => {
    const examId = notification.content.data?.examId;
    const dedupeKey = notification.content.data?.dedupeKey;
    if (typeof examId !== "string" || typeof dedupeKey !== "string" || !dedupeKey.startsWith("certbom:")) {
      return [];
    }
    const rawDaysBefore = notification.content.data?.daysBefore;
    const daysBefore = [1, 3, 7].includes(Number(rawDaysBefore))
      ? Number(rawDaysBefore) as ReminderDaysBefore
      : 1;
    const scope = notification.content.data?.scope === "critical" ? "critical" : "next";
    const channelVersion = Number(notification.content.data?.channelVersion ?? 1);
    const attemptKey = notification.content.data?.attemptKey;
    return [{ channelVersion, examId, daysBefore, dedupeKey, notificationId: notification.identifier, scope, ...(typeof attemptKey === "string" ? { attemptKey } : {}) }];
  });
}

async function ensureReminderChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: "관심 시험 알림",
    description: "사용자가 직접 저장한 시험의 공식 접수·시험·발표 일정을 알려줍니다.",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

function reminderDedupeKey(examId: string, plan: ReminderPlan, scope: ReminderScope, attemptKey?: string) {
  // 기존 전체 일정 알림의 식별자는 유지해 업데이트만으로 예약을 취소하지 않는다.
  const attemptSegment = attemptKey ? `${attemptKey}:` : "";
  return `certbom:${examId}:${attemptSegment}${plan.eventId ?? "official"}:${plan.daysBefore}d:${scope}:${plan.date.toISOString()}`;
}

async function schedulePlan(exam: Exam, plan: ReminderPlan, scope: ReminderScope, attemptKey?: string) {
  const trigger: Notifications.DateTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: plan.date,
    ...(Platform.OS === "android" ? { channelId: REMINDER_CHANNEL_ID } : {}),
  };
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `${exam.name} 일정이 다가와요`,
      body: `${plan.eventTitle} ${plan.daysBefore}일 전입니다. 공식 공고를 다시 확인해 주세요.`,
      data: {
        examId: exam.id,
        officialUrl: exam.officialUrl,
        daysBefore: plan.daysBefore,
        channelVersion: REMINDER_CHANNEL_VERSION,
        scope,
        ...(attemptKey ? { attemptKey } : {}),
        dedupeKey: reminderDedupeKey(exam.id, plan, scope, attemptKey),
      },
      sound: "default",
    },
    trigger,
  });
}

export async function scheduleExamReminder(
  exam: Exam,
  daysBefore: ReminderDaysBefore = 1,
  scope: ReminderScope = "next",
  attemptKey?: string,
): Promise<ReminderScheduleResult> {
  try {
    const plans = createExamReminderPlans(exam, daysBefore, scope, new Date(), attemptKey);
    if (!plans.length) {
      return {
        ok: false,
        reason: "no-schedule",
        message: "정확히 예약할 수 있는 미래 일정이 없어요. 임의 시각 알림 대신 공식 시험 페이지를 확인해 주세요.",
      };
    }

    await ensureReminderChannel();

    const currentPermission = await Notifications.getPermissionsAsync();
    const permission =
      currentPermission.status === "granted"
        ? currentPermission
        : await Notifications.requestPermissionsAsync();

    if (permission.status !== "granted") {
      return {
        ok: false,
        reason: "denied",
        message: "알림 권한이 없어 예약하지 않았습니다. 시험 탐색과 공식 링크는 계속 사용할 수 있어요.",
      };
    }

    await cancelCertbomRemindersForExam(exam.id);
    const notificationIds = await Promise.all(plans.map((plan) => schedulePlan(exam, plan, scope, attemptKey)));

    return { ok: true, notificationIds, plans };
  } catch {
    return {
      ok: false,
      reason: "error",
      message: "이 기기에서는 알림을 예약하지 못했습니다. 시험 탐색과 공식 링크는 계속 사용할 수 있어요.",
    };
  }
}

// 앱 시작 때 과거·삭제된 일정 알림을 치우고 일정 변경된 관심 시험만 다시 예약합니다.
export async function reconcileCertbomReminders(
  exams: readonly Exam[],
  preferences?: readonly { examId: string; daysBefore: ReminderDaysBefore; scope: ReminderScope; attemptKey?: string }[],
): Promise<ScheduledExamReminder[]> {
  const scheduled = await getScheduledCertbomReminders();
  const byId = new Map(exams.map((exam) => [exam.id, exam]));
  const requested = preferences ?? scheduled.map((reminder) => ({
    examId: reminder.examId,
    daysBefore: reminder.daysBefore,
    scope: reminder.scope,
    ...(reminder.attemptKey ? { attemptKey: reminder.attemptKey } : {}),
  }));
  const intended = new Map(requested.map((preference) => [preference.examId, preference]));
  const keep = new Set<string>();

  await Promise.all(scheduled.map(async (reminder) => {
    const exam = byId.get(reminder.examId);
    const preference = intended.get(reminder.examId);
    const expected = exam && preference
      ? new Set(createExamReminderPlans(exam, preference.daysBefore, preference.scope, new Date(), preference.attemptKey).map((plan) => reminderDedupeKey(exam.id, plan, preference.scope, preference.attemptKey)))
      : new Set<string>();
    if (reminder.channelVersion !== REMINDER_CHANNEL_VERSION || !expected.has(reminder.dedupeKey) || keep.has(reminder.dedupeKey)) {
      await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      return;
    }
    keep.add(reminder.dedupeKey);
  }));

  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") return getScheduledCertbomReminders();
  await ensureReminderChannel();
  for (const [examId, preference] of intended) {
    const exam = byId.get(examId);
    if (!exam) continue;
    const plans = createExamReminderPlans(exam, preference.daysBefore, preference.scope, new Date(), preference.attemptKey);
    for (const plan of plans) {
      const key = reminderDedupeKey(exam.id, plan, preference.scope, preference.attemptKey);
      if (keep.has(key)) continue;
      await schedulePlan(exam, plan, preference.scope, preference.attemptKey);
      keep.add(key);
    }
  }

  return getScheduledCertbomReminders();
}
