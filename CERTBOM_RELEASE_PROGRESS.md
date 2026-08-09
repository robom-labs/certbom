<!-- 자격증봄 프로덕션 출시의 검증 증거와 재개 지점을 기록하는 진행 원장이다. -->
# 자격증봄 프로덕션 출시 진행 원장

마지막 갱신은 2026-08-09 18:00 KST다.

## 절대 완료 조건

- [ ] Google 프로덕션 심사 승인.
- [ ] `kr.robom.certbom`의 일반 사용자용 Google Play Store 페이지 공개.
- [ ] 대한민국 일반 사용자에게 설치 버튼이 표시되는지 확인.
- [ ] 가능하면 Play Store를 통한 신규 설치와 최초 실행·핵심 흐름·재실행 확인.
- [ ] 실제 공개 소스 SHA에 production Git tag 생성.
- [ ] 공개 SHA·tag·AAB를 로컬 및 외장하드 최종 백업으로 확정.

위 항목이 모두 증명되기 전에는 공개출시 완료로 처리하지 않는다.

## 현재 상태

- Play Console 앱은 `자격증봄`, package는 `kr.robom.certbom`이다.
- 프로덕션 릴리스 `0.8.4 정식 출시`를 2026-08-09에 Google 검토로 전송했다.
- 제출 버전은 versionName `0.8.4`, versionCode `14`다.
- 공개 지역 변경은 대한민국 1개 국가 추가다.
- Play Console 실측 상태는 `검토 중인 변경사항`이다.
- Google의 빠른 자동검사는 정상 종료됐다.
- 현재 실측 문구는 `변경사항을 검토 중입니다. 앱을 검토하는 과정에서 추가 문제가 발견될 수도 있습니다.`이며 Google 본심사에 진입했다.
- 관리형 게시가 사용 중지되어 있다. 승인 후 추가 게시 단계가 있는지 다시 확인하고 실제 Store 공개를 검증한다.

## 확정 소스와 Git

- 저장소는 `robom-labs/certbom`이다.
- 기준 branch는 `main`이다.
- 작업 branch는 `r02/certbom-production-20260809`다.
- 제출 AAB의 소스 SHA는 `5564dda1869dde7cd8f64e183cd2a1a061fb3b4b`다.
- 진행 원장을 추가한 현재 `origin/main`과 작업 branch SHA는 `e181a43da5f1600d0dfdf50049d7e5bf22df3f16`다. 앱 소스 차이는 없고 문서만 추가됐다.
- 최신 GitHub CI와 Family contract가 모두 성공했다.
- 실제 공개 전이므로 production tag는 아직 생성하지 않았다.

## 최종 AAB

- 로컬 경로는 `/Users/runner706/Documents/Codex/2026-07-11/02/releases/certbom/0.8.4-v14/certbom-0.8.4-v14.aab`다.
- SHA-256은 `90d142ed7ce4f8df3c46289b597c3f06c20b6d131ba512b8fe634beeb06388bf`다.
- 크기는 49,047,889바이트다.
- Play Console이 `14 (0.8.4)`, minSdk 24, targetSdk 36으로 정상 해석했다.
- 기존 EAS 원격 업로드 키를 사용했고 package와 Play App Signing 체계는 변경하지 않았다.
- Bundletool 검증과 16KB 페이지 정렬 검증을 통과했다.

## 출시 직전 수정

- Android versionCode를 14로 증가했다.
- 사용하지 않는 `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` 권한을 차단했다.
- 위 권한이 다시 포함되면 설정 검증이 실패하도록 검사를 추가했다.
- package, 서명키, 로그인, 결제, 광고, 분석, 추적 기능은 변경하지 않았다.

## 검증 증거

- frozen dependency install 통과.
- ESLint 89개 파일 통과.
- 전체 테스트 75개 통과.
- 웹 production build 통과.
- 모바일 config·typecheck·Android/iOS export 통과.
- Expo Doctor 20/20 통과.
- 로컬 production Gradle AAB 빌드 593개 작업 통과.
- Bundletool package·버전·SDK·권한·debuggable·서명·16KB 정렬 검사 통과.
- Play Console 업로드 및 번들 처리 통과.
- Play 사전검사 경고 1개는 R8/ProGuard 사용 시 가독화 파일을 권장하는 비차단 안내다.
- Play Console 정책 센터에서 자격증봄의 발견된 문제 없음 상태를 확인했다.
- App content와 Data safety 선언을 실제 코드 동작과 대조했다.

## 백업

- 외장 후보 백업은 `/Volumes/One Touch/Robom-Bom-Projects-2026-08-02/02-production-candidates/certbom/0.8.4-v14/`다.
- 위 폴더에 AAB와 전체 Git history bundle이 있으며 해시와 bundle 무결성을 확인했다.
- 아직 심사 중이므로 후보 백업이다. 실제 공개 후 공개 SHA와 Store 상태를 기록하고 최종 production 백업으로 확정한다.

## 자동 재개 절차

1. Play Console 게시 개요에서 현재 상태를 직접 확인한다.
2. 빠른 검사 또는 본심사 중이면 삭제·중복 제출 없이 계속 모니터링한다.
3. 반려 또는 변경 요청이면 정확한 정책 사유를 읽고 코드·AAB·스토어 등록정보·App content 중 원인을 분류한다.
4. 코드 또는 AAB 수정이 필요하면 기존 package와 서명키를 유지하고 versionCode를 15 이상으로 올린다.
5. 관련 검사와 전체 출시 검증을 다시 통과한 새 AAB만 업로드해 재제출한다.
6. 승인되면 게시 상태와 일반 사용자용 Store 페이지를 확인한다.
7. 실제 설치 버튼과 공개 버전을 확인한 뒤 production tag와 최종 백업을 확정한다.
8. 모든 완료 조건을 충족한 뒤에만 자동 모니터와 Goal을 완료 처리한다.

## 현재 사용자 조치

- 없음.
- OTP, 2단계 인증, CAPTCHA, 본인확인 또는 새 법적 동의가 실제로 표시될 때만 사용자에게 요청한다.
