# ZZALKAK Studio (짤칵 스튜디오)

이미지 또는 단색 배경 위에 한글 문구와 스티커를 배치하고 PNG로 저장하며, 편집 설정을 템플릿으로 관리하는 공개 웹 도구입니다. 서버·로그인·DB 없이 모든 처리가 브라우저 안에서만 이루어집니다.

## 실행 방법

```bash
npm install
npm run dev       # 개발 서버 (http://localhost:5173)
npm run build     # 프로덕션 빌드 (dist/)
npm run preview   # 빌드 결과 미리보기
npm run lint      # 정적 분석
```

## 기술 스택

- Vite + React + TypeScript
- 서버/외부 API 없음 (이미지는 `Object URL`로 브라우저 안에서만 처리)
- 템플릿 데이터는 `localStorage`에 저장

## 화면 구성

애플리케이션형 편집기(`100dvh`, 페이지 스크롤 없음):

- **상단 앱 바** — 워드마크, 작업명·저장 상태, 실행 취소/다시 실행, 화면비, 도구 검색(`Ctrl/⌘+K`), 템플릿 관리, 가져오기/내보내기, PNG 다운로드
- **왼쪽 도구 사이드바** — 이미지(사진 또는 단색 배경) · 텍스트 · 스티커 · 화면비 · 템플릿 · 가져오기. 선택 시 옆에 세부 패널(독립 스크롤)이 열림
- **중앙 캔버스** — 드래그 앤 드롭 업로드 또는 "단색 배경으로 시작", 문구/스티커 직접 드래그, 선택 가이드·손잡이(크기/회전), 확대/축소 바
- **오른쪽 속성 패널** — 선택 대상(텍스트 / 스티커 / 배경 / 없음)의 속성만 표시
- 태블릿: 속성 패널 접기/펼치기 · 모바일: 캔버스 위 + 하단 탭 + 바텀시트

## 주요 구조

- `src/editor/useEditor.ts` — 편집기 전체 상태와 동작(이미지, 실행 취소 이력, 선택, 도구, 스티커, 템플릿, 확대/축소, 다운로드, 토스트, 초안 자동 저장).
- `src/editor/commands.ts` — 도구 검색(Command Palette)에 연결된 명령 목록.
- `src/lib/render.ts` — 미리보기와 다운로드가 공유하는 유일한 렌더링 함수(`drawCard`). 배경(사진 cover 배치 또는 단색 채우기) → 스티커(레이어 순서) → 제목/소제목/본문(정렬·줄 간격·자동 축소). 사진이 없어도 `background.type === "color"`면 그려진다.
- `src/lib/stickers.ts` — 프로젝트 내부 스티커 카탈로그(`public/stickers/`), 검색/카테고리, 이미지 로더.
- `src/lib/useHistory.ts` — 실행 취소/다시 실행(연속 변경 묶기).
- `src/lib/fonts.ts` / `src/fonts.css` — 글꼴 11종(기본 Pretendard) 정의와 `@font-face`/`@import`.
- `src/lib/fontLoader.ts` — 그리기 전 `document.fonts` 준비 대기.
- `src/lib/templates.ts` — 템플릿 CRUD, 초안 저장, JSON 가져오기 검증(파싱 → 전체 스키마 검증 → 반영)과 ID 충돌 처리, v1~v3 스키마(단일 문구 → 제목/소제목/본문 → 정렬/줄간격/스티커) 자동 이관. 현재 스키마 버전은 v4(배경 이미지/단색 추가).
- `src/lib/fileValidation.ts` — PNG/JPEG MIME 타입 검사와 파일 크기 제한.
- `src/components/` — `Topbar`, `ToolSidebar`, `panels/*`(이미지·텍스트·화면비·스티커·템플릿), `Stage`(캔버스), `PropertiesPanel`, `CommandPalette`, `ImportExportModal`, `Modal`, `Toast`.
- `public/samples/` — 자체 제작(Canvas 생성) 배경 샘플 이미지. `public/stickers/` — 스티커 PNG 16종. `public/finished/` — 완성 이미지 3개.

## 단축키

`Ctrl/⌘+K` 도구 검색 · `Ctrl/⌘+Z` 실행 취소 · `Ctrl/⌘+Shift+Z` 다시 실행 · `Delete`/`Backspace` 선택한 문구 블록 또는 스티커 삭제 · `Ctrl/⌘+D` 스티커 복제 · 방향키 선택 대상 이동(Shift: 5%) · `Esc` 선택 해제/패널 닫기 · `Ctrl+휠` 확대/축소

## 문서

- [TEST_REPORT.md](./TEST_REPORT.md) — 극단 입력 12건 및 전체 통과 기준 점검 결과.
- [ASSET_LICENSES.md](./ASSET_LICENSES.md) — 이미지 출처와 사용 허가 기록.
- [SUBMISSION.md](./SUBMISSION.md) — 제출 정보, 짧은 확인 방법, AI 사용 기록.
