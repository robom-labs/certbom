# 자격증봄 보안 감사 예외

`pnpm audit:prod`는 production 의존성의 high·critical 취약점을 기본적으로 차단합니다.

예외는 `audit-exceptions.json`에 등록된 정확한 권고 URL, 패키지, 설치 버전, 빌드 전용 범위와 만료일이 모두 일치할 때만 허용합니다. 만료되거나 설치 버전·권고가 달라지면 CI가 다시 실패합니다.

현재 `image-size` 예외는 Expo Metro의 빌드 도구 경로에만 해당합니다. 자격증봄 앱은 런타임에서 사용자가 제공한 이미지, ICNS, JXL, HEIF 파일을 분석하지 않습니다. 공식 수정 버전이 나오면 예외를 제거하고 의존성을 갱신합니다.
