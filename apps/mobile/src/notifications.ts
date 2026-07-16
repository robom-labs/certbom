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
      plan: ReturnType<typeof createReminderPlan>;
    }
  | {
      ok: false;
      reason: "denied" | "error";
      message: string;
    };

export function configureNotificationPresentation() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function scheduleExamReminder(exam: Exam): Promise<ReminderScheduleResult> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: "관심 시험 알림",
        importance: Notifications.AndroidImportance.DEFAULT,
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

    const nextEvent = getNextEvent(exam);
    const plan = createReminderPlan(nextEvent);
    const trigger: Notifications.DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: plan.date,
      ...(Platform.OS === "android" ? { channelId: REMINDER_CHANNEL_ID } : {}),
    };
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${exam.name} 확인할 시간이에요`,
        body: plan.isFallback
          ? `${plan.eventTitle}과 공식 공고를 다시 확인해 주세요.`
          : `${plan.eventTitle} 하루 전입니다. 공식 공고를 확인해 주세요.`,
        data: {
          examId: exam.id,
          officialUrl: exam.officialUrl,
        },
        sound: false,
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
