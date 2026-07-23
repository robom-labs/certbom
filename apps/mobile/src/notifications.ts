// 사용자 요청 뒤 권한을 확인하고 관심 시험의 로컬 알림을 예약한다.
import { getNextEvent, type Exam } from "@certbom/core";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { createReminderPlan } from "./reminder";

const REMINDER_CHANNEL_ID = "certbom-reminders";

export type ReminderScheduleResult =
  | {
      ok: true;
      notificationId: string;
      plan: NonNullable<ReturnType<typeof createReminderPlan>>;
    }
  | {
      ok: false;
      reason: "denied" | "no-schedule" | "error";
      message: string;
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

export async function scheduleExamReminder(exam: Exam): Promise<ReminderScheduleResult> {
  try {
    const nextEvent = getNextEvent(exam);
    const plan = createReminderPlan(nextEvent);
    if (!plan) {
      return {
        ok: false,
        reason: "no-schedule",
        message: "정확히 예약할 수 있는 미래 일정이 없어요. 임의 시각 알림 대신 공식 시험 페이지를 확인해 주세요.",
      };
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: "관심 시험 알림",
        description: "사용자가 직접 저장한 시험의 다음 공식 일정을 알려줍니다.",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      });
    }

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
    const trigger: Notifications.DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: plan.date,
      ...(Platform.OS === "android" ? { channelId: REMINDER_CHANNEL_ID } : {}),
    };
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${exam.name} 확인할 시간이에요`,
        body: plan.timePrecision === "date-only"
            ? `${plan.eventTitle} 전날입니다. 정확한 입실 시각은 공식 공고를 확인해 주세요.`
            : `${plan.eventTitle} 하루 전입니다. 공식 공고를 확인해 주세요.`,
        data: {
          examId: exam.id,
          officialUrl: exam.officialUrl,
          dedupeKey: `certbom:${exam.id}:${nextEvent?.id ?? "official"}`,
        },
        sound: "default",
      },
      trigger,
    });

    return { ok: true, notificationId, plan };
  } catch {
    return {
      ok: false,
      reason: "error",
      message: "이 기기에서는 알림을 예약하지 못했습니다. 시험 탐색과 공식 링크는 계속 사용할 수 있어요.",
    };
  }
}
