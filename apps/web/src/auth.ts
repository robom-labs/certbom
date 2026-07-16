// 공급자 연결 전에도 핵심 기능을 보장하는 게스트 우선 인증 상태 계약이다.
import authConfig from "./generated/robom-family/auth-config.json";

export type AuthProviderId = "kakao" | "google" | "apple";

export type AuthProviderState = {
  id: AuthProviderId;
  label: string;
  availability: "not-configured" | "unsupported";
};

export type GuestAuthState = {
  mode: "guest";
  authenticated: false;
  provider: null;
  sync: "device-only";
  contractGuestFirst: boolean;
  namespace: string;
};

export interface AuthStateAdapter {
  getState: () => GuestAuthState;
  getProviders: () => readonly AuthProviderState[];
  describeProvider: (providerId: AuthProviderId) => string;
}

function providerAvailability(providerId: AuthProviderId): AuthProviderState["availability"] {
  return authConfig.providers[providerId] === "unconfigured" ? "not-configured" : "unsupported";
}

const providers = [
  { id: "kakao", label: "카카오", availability: providerAvailability("kakao") },
  { id: "google", label: "구글", availability: providerAvailability("google") },
  { id: "apple", label: "Apple", availability: providerAvailability("apple") },
] as const satisfies readonly AuthProviderState[];

const guestState: GuestAuthState = {
  mode: "guest",
  authenticated: false,
  provider: null,
  sync: "device-only",
  contractGuestFirst: authConfig.guestFirst,
  namespace: authConfig.namespace,
};

export const guestFirstAuthAdapter: AuthStateAdapter = {
  getState: () => guestState,
  getProviders: () => providers,
  describeProvider: (providerId) => {
    const provider = providers.find((item) => item.id === providerId);
    return `${provider?.label ?? "선택한 공급자"} 로그인은 아직 연결되지 않았어요. 게스트 이용과 이 기기 저장은 계속됩니다.`;
  },
};
