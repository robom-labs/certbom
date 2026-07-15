<!-- 자격증봄을 검증하고 Vercel에 배포·롤백하는 명령을 정리한다. -->
# 배포

## 릴리스 게이트

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

## Vercel

Vercel 프로젝트의 Root Directory는 저장소 루트, Install Command는 `pnpm install --frozen-lockfile`, Build Command는 `pnpm build`, Output Directory는 `apps/web/dist`다. `vercel.json`에 같은 값이 고정돼 있다.

```bash
pnpm dlx vercel --prod
```

배포 후 `/`, `/manifest.webmanifest`, `/sw.js`, `/robots.txt`를 확인하고 모바일에서 검색, 추천, 관심 저장, ICS 다운로드를 점검한다.

## 롤백

GitHub에서는 문제 커밋을 `git revert <sha>`로 되돌린다. 긴급 시 Vercel에서 직전 정상 Production 배포를 Promote한 뒤 원인을 수정한다.
