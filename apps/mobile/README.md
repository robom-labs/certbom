<!-- CertBom 모바일 앱의 개발, 검증, 서명 없는 제출 준비 절차를 설명한다. -->
# CertBom Mobile

`apps/mobile`은 WebView가 아닌 Expo SDK 57 React Native 앱입니다. `@certbom/core`의 97개 시험 카탈로그를 JavaScript 번들에 포함하므로 목록과 검색은 네트워크 없이 동작합니다. 공식 페이지 열기만 네트워크와 외부 브라우저가 필요합니다.

## 앱 계약

- iOS bundle identifier는 `kr.robom.certbom`입니다.
- Android application ID는 `kr.robom.certbom`입니다.
- 앱 스킴은 `certbom`이며 시험 링크 형식은 `certbom://exam/<exam-id>`입니다.
- 알림 권한은 사용자가 `로컬 알림 예약`을 누른 뒤에만 요청합니다.
- 권한 거부, 예약 실패, 로컬 저장 실패, 외부 링크 실패가 발생해도 오프라인 시험 탐색은 계속 동작합니다.
- 푸시 토큰, 원격 알림 서버, 사용자 계정은 사용하지 않습니다.

## 로컬 실행과 검증

저장소 루트에서 의존성을 설치한 뒤 앱 폴더 명령을 실행합니다.

```bash
pnpm install
pnpm --filter @certbom/mobile run config
pnpm --filter @certbom/mobile typecheck
pnpm --filter @certbom/mobile test
pnpm --filter @certbom/mobile build
pnpm --filter @certbom/mobile start
```

Expo Go에서도 로컬 알림을 확인할 수 있지만, config plugin과 실제 앱 스킴까지 확인하려면 development build를 사용합니다. 알림 전달 시각은 운영체제 절전 정책에 따라 조금 늦어질 수 있습니다.

선택 환경 변수는 `.env.example`을 참고해 `apps/mobile/.env.local`에 둡니다. `EXPO_PUBLIC_` 값은 앱 번들에 공개되므로 secret을 넣으면 안 됩니다.

## EAS 빌드와 제출 준비

이 저장소에는 `development`, `preview`, `production` 빌드 프로필만 정의되어 있습니다. EAS 프로젝트 연결, 서명 자격 증명 생성, 스토어 업로드는 저장소 관리자가 직접 수행합니다.

1. Expo 조직과 앱 식별자를 확인한 관리자가 `apps/mobile`에서 `pnpm dlx eas-cli login`과 `pnpm dlx eas-cli init`을 실행합니다.
2. 개발 기기 검증은 `pnpm dlx eas-cli build --profile development --platform android` 또는 `--platform ios`로 진행합니다.
3. 내부 검수용 빌드는 `pnpm dlx eas-cli build --profile preview --platform all`로 만듭니다.
4. 알림 권한 거부·허용, 앱 재시작 뒤 관심 시험 복원, `certbom://exam/history-advanced`, 공식 HTTPS 링크를 실제 Android와 iOS 기기에서 확인합니다.
5. 스토어 메타데이터, 개인정보 처리방침, 스크린샷, 버전과 build number/versionCode를 검토한 뒤 `production` 프로필로 빌드합니다.
6. 서명과 스토어 계정 권한을 별도 승인한 뒤에만 `pnpm dlx eas-cli submit --latest --platform android` 또는 `--platform ios`를 실행합니다.

Apple 인증서, provisioning profile, Google Play service account, App Store Connect API key 같은 자격 증명은 Git이나 `.env`에 저장하지 않습니다. 현재 구현 작업에서는 EAS 로그인, 서명, 빌드 업로드, 스토어 제출을 실행하지 않습니다.
