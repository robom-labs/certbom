// 공식 출처 장부에서 자동 생성한 데이터 확인 시각과 연결 상태를 제공한다.
// 이 파일은 scripts/generate-source-metadata.mjs로 생성하므로 직접 수정하지 않는다.
export const CATALOG_DATA_VERSION = "2026.07.24-v4";
export const CATALOG_REVIEWED_AT = "2026-07-24T14:30:00+09:00";

export const SOURCE_REVIEWED_AT = {
  "qnet-technical-plan-2026": "2026-07-24T14:30:00+09:00",
  "qnet-professional-calendar-2026": "2026-07-16T15:00:00+09:00",
  "historyexam-schedule-2026": "2026-07-24T14:30:00+09:00",
  "kdata-calendar-2026": "2026-07-24T14:30:00+09:00",
  "kpc-current-registration-2026": "2026-07-16T15:00:00+09:00",
  "at-calendar-2026": "2026-07-24T14:30:00+09:00",
  "korcham-calendar-2026": "2026-07-16T15:00:00+09:00",
  "gosi-announcement-2026": "2026-07-16T15:00:00+09:00"
} as const;

export const SOURCE_CONNECTION_STATUS = {
  "checkedAt": "2026-08-08T11:27:57.391Z",
  "healthyCount": 8,
  "totalCount": 8,
  "failedSourceIds": []
} as const;

export const SOURCE_FRESHNESS_STATUS = {
  "checkedAt": "2026-08-08T11:27:57.391Z",
  "freshCount": 0,
  "staleCount": 8,
  "totalCount": 8,
  "staleSourceIds": [
    "at-calendar-2026",
    "gosi-announcement-2026",
    "historyexam-schedule-2026",
    "kdata-calendar-2026",
    "korcham-calendar-2026",
    "kpc-current-registration-2026",
    "qnet-professional-calendar-2026",
    "qnet-technical-plan-2026"
  ],
  "sources": [
    {
      "sourceId": "qnet-technical-plan-2026",
      "lastReviewedAt": "2026-07-24T14:30:00+09:00",
      "ageHours": 365,
      "staleAfterHours": 48,
      "staleAt": "2026-07-26T05:30:00.000Z",
      "state": "stale"
    },
    {
      "sourceId": "qnet-professional-calendar-2026",
      "lastReviewedAt": "2026-07-16T15:00:00+09:00",
      "ageHours": 557,
      "staleAfterHours": 48,
      "staleAt": "2026-07-18T06:00:00.000Z",
      "state": "stale"
    },
    {
      "sourceId": "historyexam-schedule-2026",
      "lastReviewedAt": "2026-07-24T14:30:00+09:00",
      "ageHours": 365,
      "staleAfterHours": 72,
      "staleAt": "2026-07-27T05:30:00.000Z",
      "state": "stale"
    },
    {
      "sourceId": "kdata-calendar-2026",
      "lastReviewedAt": "2026-07-24T14:30:00+09:00",
      "ageHours": 365,
      "staleAfterHours": 72,
      "staleAt": "2026-07-27T05:30:00.000Z",
      "state": "stale"
    },
    {
      "sourceId": "kpc-current-registration-2026",
      "lastReviewedAt": "2026-07-16T15:00:00+09:00",
      "ageHours": 557,
      "staleAfterHours": 48,
      "staleAt": "2026-07-18T06:00:00.000Z",
      "state": "stale"
    },
    {
      "sourceId": "at-calendar-2026",
      "lastReviewedAt": "2026-07-24T14:30:00+09:00",
      "ageHours": 365,
      "staleAfterHours": 72,
      "staleAt": "2026-07-27T05:30:00.000Z",
      "state": "stale"
    },
    {
      "sourceId": "korcham-calendar-2026",
      "lastReviewedAt": "2026-07-16T15:00:00+09:00",
      "ageHours": 557,
      "staleAfterHours": 72,
      "staleAt": "2026-07-19T06:00:00.000Z",
      "state": "stale"
    },
    {
      "sourceId": "gosi-announcement-2026",
      "lastReviewedAt": "2026-07-16T15:00:00+09:00",
      "ageHours": 557,
      "staleAfterHours": 72,
      "staleAt": "2026-07-19T06:00:00.000Z",
      "state": "stale"
    }
  ]
} as const;
