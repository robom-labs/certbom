<!-- 자격증봄의 외부 키 등록, 데이터 동기화, 장애 대응 절차를 안내한다. -->
# 운영 설정 및 장애 대응

## 최초 설정

1. 공공데이터포털에서 국가자격 시험일정 조회 서비스 15074408을 신청하고 `QNET_SERVICE_KEY`를 서버 비밀값으로 등록한다.
2. Supabase 프로젝트에 `supabase/migrations`를 적용한 뒤 카카오·구글·애플 OAuth의 PKCE 콜백 URL을 등록한다.
3. Web Push VAPID 키쌍을 생성해 공개키는 `VITE_VAPID_PUBLIC_KEY`, 비밀키는 서버 비밀값으로 등록한다.
4. Vercel 프로젝트의 Production 환경 변수와 Supabase redirect allowlist에 운영 주소를 함께 등록한다.
5. `certbom.robom.kr` DNS를 Vercel에 연결하고 인증서 발급 후 canonical과 sitemap 주소를 전환한다.

비밀값은 저장소, Actions 로그, 브라우저 번들에 기록하지 않는다.

## 공식 데이터 공개 기준

- API 응답 스키마가 통과하고 일정의 시작과 종료가 뒤집히지 않아야 한다.
- 공식 코드 기반 안정 ID와 fingerprint가 생성돼야 한다.
- 0건, 대량 삭제, 날짜의 과거 이동, 준비물 전면 변경, 출처 충돌은 `review_queue`로 보낸다.
- `date-only`는 시각 마감 알림을 만들지 않고, `rolling`은 고정 D-day를 만들지 않는다.

## 장애 대응

- 소스 장애 시 마지막 검증 데이터를 유지하고 화면에 마지막 확인 시각을 보여준다.
- HTTP 429는 `Retry-After`를 따르고 즉시 재시도하지 않는다.
- Push 404와 410은 해당 기기를 폐기하고 같은 작업을 무한 재시도하지 않는다.
- 배포 장애 시 Vercel의 직전 Production 배포를 Promote하고 원인 커밋을 revert한다.

## 보존과 삭제

- 원본 소스 스냅샷 기본 보존 기간은 90일이다.
- 계정 삭제 시 프로필, 관심 시험, 추천, 준비 체크, 푸시 기기는 외래키 cascade로 삭제한다.
- 감사 로그에는 endpoint 원문, OAuth 토큰, API 키를 남기지 않는다.
