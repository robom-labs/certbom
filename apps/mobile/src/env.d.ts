// 자격증봄 모바일 앱에서 사용하는 공개 환경 변수 타입을 선언한다.
export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_PRIVACY_URL?: string;
      EXPO_PUBLIC_SUPPORT_URL?: string;
    }
  }
}
