<!-- 자격증봄 첫 Production 배포와 검증·롤백 기준을 기록한다. -->
# 2026-07-16 Production 배포

- 운영 주소. https://certbom.vercel.app
- Vercel 프로젝트. `runnerpyrri-2650s-projects/certbom`
- 배포 ID. `dpl_FhJ5TTNdhF9HY9Y9xfcfGSYnuP5k`
- 기준 main SHA. `558d703`
- 버전과 캐시. `0.4.0`, `v4`
- 상태. `READY`

## 배포 후 확인

- 홈, manifest, service worker, robots, sitemap이 모두 HTTP 200을 반환했다.
- 모바일 390×844에서 홈과 설정이 렌더링되고 build `558d703`이 표시됐다.
- 브라우저 콘솔과 페이지 오류가 없었다.
- 서비스워커가 `activated` 상태가 된 뒤 오프라인 재로딩이 성공했다.
- GitHub Actions에서 Chromium과 WebKit을 사용한 E2E 15개가 통과했다.

## 롤백

첫 앱 배포이므로 이전 Production 앱 버전은 없다. 회귀가 발견되면 원인 커밋을 `git revert`로 되돌려 main에 병합하고, Vercel Git 연동이 생성한 새 Production 배포를 스모크 테스트한다. 긴급 비공개가 필요할 때만 Vercel 프로젝트 보호 설정을 사용한다.

## 0.5.0 공식 시험 카탈로그 확장

- 운영 주소. https://certbom.vercel.app
- Vercel 배포 ID. `dpl_6Un5E9Yv23eSgqgxbokGED5Veic7`
- 기준 main SHA. `9e54585`
- 버전과 캐시. `0.5.0`, `v6`
- 상태. `READY`
- 카탈로그. 공식 출처 8곳, 시험 97개, 확정 일정 보유 시험 70개.

### 배포 후 확인

- 홈, manifest, service worker, robots, sitemap이 모두 HTTP 200을 반환했다.
- 320×568 운영 화면에서 97개 시험, 현재 접수 우선, 약칭 검색, 12개씩 더 보기, 58px 검색창과 가로 넘침 없음을 확인했다.
- 설정 화면에서 버전 0.5.0과 build `9e54585`를 확인했다.
- 서비스워커 등록과 오프라인 홈 재로딩이 성공했고 브라우저 콘솔·페이지 오류가 없었다.
- GitHub CI와 로컬 타입체크·린트·단위 테스트 19개·E2E 21개·Production 빌드가 통과했다.
- 로봄 허브 `f97eb0a`에 0.5.0 상태와 97개·70개·8개 지표를 동기화하고 robom.kr·GitHub Pages·Sites 운영본을 확인했다.
