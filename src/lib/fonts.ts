import { FONT_FAMILY_STACK } from "./constants";

export interface FontOption {
  id: string;
  /** UI에 표시할 한글 이름 */
  label: string;
  /** CSS/Canvas font-family에 실제로 사용하는 이름 (fonts.css의 선언과 일치해야 함) */
  family: string;
}

export const DEFAULT_FONT_ID = "pretendard";

/** 제목/소제목/본문에서 선택할 수 있는 글꼴 10종. 실제 @font-face/@import는 src/fonts.css에서 로드한다. */
export const FONT_OPTIONS: FontOption[] = [
  { id: "pretendard", label: "Pretendard (기본)", family: "Pretendard" },
  { id: "yeonwoo", label: "그리운연우 (손글씨)", family: "NostalgicDesertYeonwoo" },
  { id: "galmuri11", label: "갈무리 11 (도트/픽셀)", family: "Galmuri11" },
  { id: "neodgm", label: "네오둥근모 (레트로 픽셀)", family: "NeoDonggeunmo" },
  { id: "onemobile", label: "원스토어 모바일 고딕 타이틀", family: "OneStoreMobileGothicTitleFont" },
  { id: "jua", label: "Jua (임팩트 제목체)", family: "Jua" },
  { id: "dohyeon", label: "Do Hyeon (도현체)", family: "Do Hyeon" },
  { id: "nanumpen", label: "나눔손글씨 펜", family: "Nanum Pen Script" },
  { id: "poorstory", label: "Poor Story (손글씨)", family: "Poor Story" },
  { id: "gamjaflower", label: "감자꽃 (손글씨)", family: "Gamja Flower" },
  { id: "mona", label: "Mona12 (도트 텍스트)", family: "Mona12 Text KR" },
];

const FONT_OPTION_IDS = new Set(FONT_OPTIONS.map((f) => f.id));

export function isKnownFontId(id: unknown): id is string {
  return typeof id === "string" && FONT_OPTION_IDS.has(id);
}

export function getFontOption(fontId: string): FontOption {
  return FONT_OPTIONS.find((f) => f.id === fontId) ?? FONT_OPTIONS[0];
}

/** Canvas ctx.font / CSS font-family에 바로 쓸 수 있는 폴백 포함 폰트 스택 문자열 */
export function buildFontStack(fontId: string): string {
  const option = getFontOption(fontId);
  return `"${option.family}", ${FONT_FAMILY_STACK}`;
}
