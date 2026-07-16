// DO NOT EDIT. 자격증봄의 개인정보 최소 분석 이벤트 계약이다.
export const familyEventNames = ["recommendation_started","recommendation_completed","exam_opened","exam_saved","calendar_added","official_exam_clicked"] as const;
export type FamilyEventName = (typeof familyEventNames)[number];
export const forbiddenAnalyticsFields = ["latitude","longitude","address","email","phone","oauth_token","push_endpoint","medication","medicine","hospital","calendar_title","family_event_title","raw_query","raw_answer","api_key","access_token","refresh_token"] as const;
