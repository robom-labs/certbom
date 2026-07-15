# AGENTS.md

## 저장소 역할

자격증봄 웹·PWA와 재사용 가능한 시험 도메인 로직의 정본입니다. 로봄 허브에는 앱 코드를 복사하지 않습니다.

## 작업 규칙

- 공식 API·공고로 확인된 정보만 확정 일정으로 노출합니다.
- `rolling`, `announcement`, `timePrecision` 의미를 약화하지 않습니다.
- 새 소스 파일 첫 줄에 역할을 설명하는 한국어 주석을 둡니다.
- 변경 전 `pnpm typecheck`, `pnpm test`, `pnpm build`와 관련 화면 검증을 실행합니다.
- 비밀키는 커밋하지 않고 `.env.example`만 유지합니다.
