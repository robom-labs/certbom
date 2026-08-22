<!-- 자격증봄 프로덕션 출시의 검증 증거와 재개 지점을 기록하는 진행 원장이다. -->
# 자격증봄 프로덕션 출시 진행 원장

마지막 갱신은 2026-08-22 19:52 KST다.

## 절대 완료 조건

- [x] Google 프로덕션 심사 승인.
- [x] `kr.robom.certbom`의 일반 사용자용 Google Play Store 페이지 공개.
- [x] 대한민국 일반 사용자에게 설치 버튼이 표시되는지 확인.
- [x] Play Store에서 연결된 `Samsung SM-S937N`을 선택해 신규 설치 요청 전송. 이 Mac에는 ADB가 없어 기기 내 최초 실행·핵심 흐름·재실행은 독립 확인하지 못했다.
- [x] 실제 공개 소스 SHA에 production Git tag 생성.
- [x] 공개 SHA·tag·AAB를 로컬 및 외장하드 최종 백업으로 확정.

위 항목이 모두 증명되기 전에는 공개출시 완료로 처리하지 않는다.

## 현재 상태

- Play Console 앱은 `자격증봄`, package는 `kr.robom.certbom`이다.
- 현재 일반 사용자에게 공개된 릴리스는 versionName `0.9.0`, versionCode `16`이며 2026-08-11 23:45 KST에 100% 프로덕션 배포를 확인했다.
- 다음 프로덕션 후보는 versionName `0.9.0`, versionCode `17`이며 2026-08-22에 Google Play 검토로 전송했다. 콘솔의 현재 상태는 `검토 중인 변경사항`이며, 일반 사용자 공개 전에는 versionCode `17` 공개 완료로 처리하지 않는다.
- Q-Net 국가기술자격 2026년 3회만 공식 원문을 재대조해, 관심 시험에서 필기·실기 회차를 선택하면 홈·달력·다음 일정·새 알림이 해당 일정만 보도록 하는 다음 후보 소스를 준비했다. 이 변경은 코드 `17` 제출 AAB에 포함되지 않았고, 코드 `17` 일반 사용자 공개 확인 뒤 versionCode `18` 이상으로 별도 빌드·검증·제출한다.
- 기존 사용자가 회차를 선택하지 않은 경우 기존 전체 일정·예약 알림 식별자를 그대로 유지한다. 회차를 바꿔도 기존 알림은 자동 취소하지 않으며, 사용자가 알림 설정을 다시 저장할 때만 선택한 일정으로 새 예약한다.
- 제출 AAB는 `/Users/runner706/Documents/Codex/2026-07-11/02/work/release-archives/certbom-0.9.0-v17-review-pending/certbom-0.9.0-v17.aab`에 보관했고 SHA-256은 `11e213493db18f3da52ac6341524b0826280e231b30cadc2dce41d5756307bf9`다. Bundletool 검증, package `kr.robom.certbom`, versionCode `17`, target SDK `36`, 그리고 기존 versionCode `16` AAB와 같은 서명 인증서 SHA-256을 확인했다.
- 제출 소스 SHA는 `c65359cf172f29a9ba42e10951652c47e1a4df9f`이며, 이 SHA의 GitHub CI와 Family contract가 모두 성공했다.
- Google Play Console은 코드 `17 (0.9.0)`, 모든 대상 국가, 전체 출시, 한국어 출시 노트 `안정성과 보안을 개선했습니다.`를 검토 화면에서 표시했다.
- 공개 AAB는 `/Users/runner706/Documents/Codex/2026-07-11/02/work/release-archives/certbom-0.9.0-v16-pending/certbom-0.9.0-v16.aab`이고 SHA-256은 `c1133062254ca70bab7f1119912aed67f8a704aa510ecb3d5e2df8e986de02d4`이다.
- 공개 제품 소스 SHA는 `8cebe2ba9414717b2162329efcae2565e5aff7fd`다. 이 커밋의 `apps/mobile/app.json`은 package `kr.robom.certbom`, version `0.9.0`, Android versionCode `16`을 선언한다.
- 다음 Google Play 업데이트는 versionCode `17` 이상으로 새 AAB를 만들어야 한다. 공개 versionCode `16` AAB는 재사용하지 않는다.
- 공개 모니터 자동화는 다음 버전 제출이 명시적으로 시작될 때까지 중지한다. 수동 실행 경로만 유지한다.
- 아래 `0.8.4` 기록은 이전 공개 이력으로 보존하며, 현재 공개 상태를 뜻하지 않는다.
- 프로덕션 릴리스 `0.8.4 정식 출시`를 2026-08-09에 Google 검토로 전송했다.
- 제출 버전은 versionName `0.8.4`, versionCode `14`다.
- 공개 지역 변경은 대한민국 1개 국가 추가다.
- Google의 빠른 자동검사와 프로덕션 본심사가 승인됐다.
- Play Console 알림에서 `앱 업데이트가 게시되었습니다`를 확인했고 최근 게시일은 2026년 8월 9일이다.
- 관리형 게시가 사용 중지된 상태에서 승인 직후 자동 게시됐다.
- 일반 사용자용 Store 페이지 `https://play.google.com/store/apps/details?id=kr.robom.certbom`이 공개됐고 `설치` 버튼과 `내 기기에서 사용할 수 있는 앱입니다` 문구를 확인했다.
- Store 페이지의 업데이트 날짜는 2026년 8월 9일이며 공개 릴리스 노트와 Data safety 항목도 정상 노출된다.

## 확정 소스와 Git

- 저장소는 `robom-labs/certbom`이다.
- 기준 branch는 `main`이다.
- 작업 branch는 `r02/certbom-production-20260809`다.
- 제출 AAB의 소스 SHA는 `5564dda1869dde7cd8f64e183cd2a1a061fb3b4b`다.
- 진행 원장 최초 추가 커밋은 `e181a43da5f1600d0dfdf50049d7e5bf22df3f16`다. 이후 진행 상태 기록 커밋은 앱 소스를 바꾸지 않으며, 현재 `origin/main`은 `git rev-parse origin/main`으로 확인한다.
- 최신 GitHub CI와 Family contract가 모두 성공했다.
- production tag `certbom-v0.8.4-production`을 실제 제출 소스 SHA `5564dda1869dde7cd8f64e183cd2a1a061fb3b4b`에 생성해 GitHub에 push했다.

## 0.8.4 공개 이력의 AAB

- 로컬 경로는 `/Users/runner706/Documents/Codex/2026-07-11/02/releases/certbom/0.8.4-v14/certbom-0.8.4-v14.aab`다.
- SHA-256은 `90d142ed7ce4f8df3c46289b597c3f06c20b6d131ba512b8fe634beeb06388bf`다.
- 크기는 49,047,889바이트다.
- Play Console이 `14 (0.8.4)`, minSdk 24, targetSdk 36으로 정상 해석했다.
- 기존 EAS 원격 업로드 키를 사용했고 package와 Play App Signing 체계는 변경하지 않았다.
- Bundletool 검증과 16KB 페이지 정렬 검증을 통과했다.

## 0.8.4 출시 직전 수정

- Android versionCode를 14로 증가했다.
- 사용하지 않는 `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` 권한을 차단했다.
- 위 권한이 다시 포함되면 설정 검증이 실패하도록 검사를 추가했다.
- package, 서명키, 로그인, 결제, 광고, 분석, 추적 기능은 변경하지 않았다.

## 0.8.4 공개 검증 증거

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
- Play Console의 프로덕션 게시 완료 알림을 확인했다.
- 일반 사용자용 Google Play Store 페이지, 앱 이름, 개발자, 설치 버튼, 업데이트 날짜, 스크린샷, 설명, Data safety, 콘텐츠 등급, 지원 영역을 확인했다.
- 연결된 `Samsung SM-S937N`에 Play Store 설치 요청을 전송했다. 기기 자체 실행 검증은 이 Mac에 ADB가 없어 별도 증거를 확보하지 못했다.

## 0.8.4 공개 이력 백업

- 외장 최종 백업은 `/Volumes/One Touch/Robom-Bom-Projects-2026-08-02/02-production/certbom/0.8.4-v14/`다.
- 위 폴더에 AAB, 전체 Git history bundle, 공개 메타데이터와 해시를 보관하고 무결성을 확인한다.
- 로컬 최종 AAB는 `/Users/runner706/Documents/Codex/2026-07-11/02/releases/certbom/0.8.4-v14/certbom-0.8.4-v14.aab`다.

## 공개 결과

- 공개 상태는 Google Play Production 게시 완료다.
- package는 `kr.robom.certbom`이다.
- 공개 버전은 versionName `0.9.0`, versionCode `16`, targetSdk `36`이다.
- Play Store 주소는 `https://play.google.com/store/apps/details?id=kr.robom.certbom`이다.
- 공개 제품 소스는 `8cebe2ba9414717b2162329efcae2565e5aff7fd`다.
- 출시 후 심각한 Play Console 정책 오류나 게시 차단은 확인되지 않았다.

## 현재 사용자 조치

- 없음.
- OTP, 2단계 인증, CAPTCHA, 본인확인 또는 새 법적 동의가 실제로 표시될 때만 사용자에게 요청한다.
