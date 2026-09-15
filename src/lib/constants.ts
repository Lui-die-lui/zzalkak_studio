import { DEFAULT_FONT_ID } from "./fonts";
import type { CardSettings, GradientOverlaySettings, OutputSize, Ratio, TextBlockSettings } from "./types";

/** 화면비별 출력 크기(px). 코드 전역에서 이 값만 참조한다. */
export const OUTPUT_SIZES: Record<Ratio, OutputSize> = {
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "9:16": { width: 1080, height: 1920 },
};

export const RATIOS: Ratio[] = ["1:1", "4:5", "9:16"];

export const RATIO_DESCRIPTIONS: Record<Ratio, string> = {
  "1:1": "정사각형 · 피드/프로필",
  "4:5": "세로 피드 · 인스타그램 게시물",
  "9:16": "세로형 스토리 · 릴스/쇼츠",
};

/** 한글을 안정적으로 표시하기 위한 시스템 폰트 스택 (이모지 폴백 포함) */
export const FONT_FAMILY_STACK =
  "'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR','NanumGothic','Segoe UI Emoji','Apple Color Emoji',sans-serif";

/** 줄 간격 배수 기본값 */
export const DEFAULT_LINE_HEIGHT = 1.35;
export const LINE_HEIGHT_MIN = 1;
export const LINE_HEIGHT_MAX = 2;

function block(text: string, fontSize: number): TextBlockSettings {
  return { text, fontId: DEFAULT_FONT_ID, fontSize, color: "#ffffff", align: "center", lineHeight: DEFAULT_LINE_HEIGHT };
}

/** 사용자가 단색 배경으로 처음 전환할 때 기본으로 채워주는 색상 */
export const DEFAULT_BACKGROUND_COLOR = "#3b5bfd";

export const DEFAULT_GRADIENT_OVERLAY: GradientOverlaySettings = {
  enabled: false,
  direction: "top",
  color: "#ffffff",
  opacity: 0.78,
};

export const DEFAULT_CARD_SETTINGS: CardSettings = {
  background: { type: "image", color: DEFAULT_BACKGROUND_COLOR },
  gradientOverlay: DEFAULT_GRADIENT_OVERLAY,
  title: block("", 92),
  subtitle: block("", 52),
  body: block("여기에 문구를 입력하세요", 44),
  xPercent: 50,
  yPercent: 82,
  ratio: "1:1",
  stickers: [],
};

/** 제목/소제목/본문 사이에 두는 간격: 바로 앞 블록의 글자 크기 대비 비율 */
export const BLOCK_GAP_RATIO = 0.45;

export const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg"] as const;

/** 업로드 허용 최대 용량 (바이트) */
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export const FONT_SIZE_MIN = 16;
export const FONT_SIZE_MAX = 220;

/** 텍스트 줄바꿈 최대 폭: 캔버스 너비 대비 비율 */
export const TEXT_MAX_WIDTH_RATIO = 0.86;

/**
 * 문구 전체 블록이 차지할 수 있는 최대 높이: 캔버스 높이 대비 비율.
 * 줄 수가 많거나 글자 크기가 커서 이 높이를 넘으면 자동으로 글자
 * 크기를 줄여 캔버스 밖으로 잘리지 않게 한다.
 */
export const TEXT_MAX_HEIGHT_RATIO = 0.92;

/** 드래그 시 텍스트 중심이 캔버스를 완전히 벗어나지 않도록 하는 여유(%) */
export const POSITION_MIN_PERCENT = 4;
export const POSITION_MAX_PERCENT = 96;

/** 스티커 기본/최소/최대 너비 (캔버스 너비 대비 %) */
export const STICKER_DEFAULT_WIDTH_PERCENT = 28;
export const STICKER_MIN_WIDTH_PERCENT = 4;
export const STICKER_MAX_WIDTH_PERCENT = 150;

export const LOCAL_STORAGE_KEY = "zzalkak-studio.templates.v1";
export const DRAFT_STORAGE_KEY = "zzalkak-studio.draft.v1";

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.25;
