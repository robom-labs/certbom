# 자격증봄 CertBom

어떤 시험을 준비할지 찾고, 접수부터 시험 당일까지 놓치지 않게 돕는 로봄 패밀리 PWA입니다.

## 지금 제공하는 기능

- 공식 출처가 확인된 시험 탐색과 신뢰 상태 표시.
- 5개 질문으로 상위 3개와 추가 7개를 제안하는 설명 가능한 추천.
- 접수·수험표·시험·발표 agenda와 시험별 공식 준비물 체크.
- 관심 시험 로컬 저장, 링크 공유, ICS와 Google Calendar 내보내기.
- 설치 가능한 PWA, 오프라인 앱 셸, 모바일 하단 메뉴와 큰 터치 영역.
- Q-Net 어댑터 계약, Supabase RLS 마이그레이션, 출처 건강 상태 레지스트리.

자격증봄은 공식 시험기관이 아닌 로봄의 일정 편의 서비스입니다. 접수와 응시자격은 시행기관의 최신 공고를 확인하세요.

## 실행

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

환경 변수와 외부 콘솔 설정은 [운영 준비 문서](ops/runbooks/production-setup.md)를 확인하세요.
