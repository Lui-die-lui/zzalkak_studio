# Vercel 배포

이 프로젝트는 Vercel에서 Vite 애플리케이션으로 바로 배포할 수 있습니다.

## Vercel 대시보드에서 배포

1. 이 저장소를 GitHub, GitLab 또는 Bitbucket에 푸시합니다.
2. Vercel에서 **Add New > Project**를 선택하고 저장소를 가져옵니다.
3. 별도 설정을 바꾸지 않고 **Deploy**를 선택합니다.

저장소의 `vercel.json`에 다음 값이 지정되어 있습니다.

- 런타임: Node.js 22
- 설치 명령: `npm ci`
- 빌드 명령: `npm run build`
- 결과 디렉터리: `dist`

환경 변수나 서버 API는 필요하지 않습니다. 편집 데이터는 브라우저의 로컬 저장소에 저장되므로 도메인 또는 브라우저가 달라지면 자동으로 공유되지 않습니다.

## CLI로 배포

Vercel CLI를 사용하는 경우 프로젝트 루트에서 다음 명령을 실행합니다.

```bash
npx vercel
npx vercel --prod
```

첫 번째 명령은 미리보기 배포, 두 번째 명령은 프로덕션 배포를 만듭니다.
