// 명시적 동의 뒤에도 개인정보 없이 동작하는 공급자 중립 분석 adapter다.
import appMeta from "./generated/robom-family/app-meta.json";
import { type FamilyEventName, familyEventNames } from "./generated/robom-family/analytics-events";
import featureFlags from "./generated/robom-family/feature-flags.json";
import { readStoredValue, writeStoredValue } from "./storage";

const CONSENT_KEY = "certbom-analytics-consent-v1";

export type FamilyAnalyticsPayload = {
  event_name: FamilyEventName;
  app_id: "certbom";
  app_version: string;
  platform: "ios" | "android" | "web";
  surface: string;
  session_kind: "guest";
  anonymous_id: string;
  timestamp: string;
  campaign: null;
  family_spec_version: string;
};

export interface AnalyticsAdapter {
  kind: string;
  send: (payload: FamilyAnalyticsPayload) => void | Promise<void>;
}

export const noopAnalyticsAdapter: AnalyticsAdapter = {
  kind: "noop",
  send: () => undefined,
};

let adapter: AnalyticsAdapter = noopAnalyticsAdapter;
let sessionConsent: boolean | null = null;
const anonymousId = globalThis.crypto?.randomUUID?.() ?? `session-${Date.now().toString(36)}`;

function platform(): FamilyAnalyticsPayload["platform"] {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return "ios";
  if (/android/.test(userAgent)) return "android";
  return "web";
}

export function getAnalyticsConsent(): boolean {
  return sessionConsent ?? readStoredValue(CONSENT_KEY) === "granted";
}

export function setAnalyticsConsent(consented: boolean): boolean {
  sessionConsent = consented;
  return writeStoredValue(CONSENT_KEY, consented ? "granted" : "denied");
}

export function setAnalyticsAdapter(nextAdapter: AnalyticsAdapter): () => void {
  const previous = adapter;
  adapter = nextAdapter;
  return () => {
    adapter = previous;
  };
}

export function getAnalyticsAdapterKind(): string {
  return adapter.kind;
}

export function isAnalyticsEnabled(): boolean {
  return featureFlags.analytics.enabled;
}

export function trackFamilyEvent(eventName: FamilyEventName, surface: string): boolean {
  if (!isAnalyticsEnabled() || !getAnalyticsConsent() || !familyEventNames.includes(eventName)) return false;

  const payload: FamilyAnalyticsPayload = {
    event_name: eventName,
    app_id: "certbom",
    app_version: __APP_VERSION__,
    platform: platform(),
    surface,
    session_kind: "guest",
    anonymous_id: anonymousId,
    timestamp: new Date().toISOString(),
    campaign: null,
    family_spec_version: appMeta.familySpecVersion,
  };

  try {
    Promise.resolve(adapter.send(payload)).catch(() => undefined);
  } catch {
    return false;
  }
  return true;
}
