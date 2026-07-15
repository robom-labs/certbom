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
