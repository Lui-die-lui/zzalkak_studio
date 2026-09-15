export type Ratio = "1:1" | "4:5" | "9:16";

export type TextBlockKey = "title" | "subtitle" | "body";

export const TEXT_BLOCK_KEYS: TextBlockKey[] = ["title", "subtitle", "body"];

export const TEXT_BLOCK_LABELS: Record<TextBlockKey, string> = {
  title: "제목",
  subtitle: "소제목",
  body: "본문",
};

export type TextAlign = "left" | "center" | "right";

export type BackgroundType = "image" | "color";

/** 카드 배경: 사진(cover 배치) 또는 단색 중 하나 */
export interface BackgroundSettings {
  type: BackgroundType;
  /** 단색 배경일 때 실제로 채우는 색상. 이미지 모드에서도 값 자체는 보존해 전환이 쉽다. */
  color: string;
}

export interface OutputSize {
  width: number;
  height: number;
}

/** 제목/소제목/본문 각각이 갖는 독립적인 문구·글꼴·크기·색상 */
export interface TextBlockSettings {
  text: string;
  /** src/lib/fonts.ts의 FONT_OPTIONS 중 하나의 id */
  fontId: string;
  /** 출력 기준 캔버스(너비 1080px 고정) 기준 폰트 크기(px) */
  fontSize: number;
  color: string;
  align: TextAlign;
  /** 줄 간격 배수 (1.0 ~ 2.0) */
  lineHeight: number;
}

/** 캔버스 위에 올려진 스티커 한 장 (위치·크기는 출력 크기 대비 비율값) */
export interface StickerInstance {
  id: string;
  /** src/lib/stickers.ts의 STICKER_CATALOG 중 하나의 id */
  stickerId: string;
  /** 0~100, 캔버스 너비 기준 스티커 중심 X */
  xPercent: number;
  /** 0~100, 캔버스 높이 기준 스티커 중심 Y */
  yPercent: number;
  /** 캔버스 너비 대비 스티커 너비(%) — 높이는 원본 비율로 계산 */
  widthPercent: number;
  /** 회전 각도(도) */
  rotation: number;
  flipX: boolean;
}

/** 편집 중인 카드 한 장의 상태값 (이미지 원본은 포함하지 않음) */
export interface CardSettings {
  background: BackgroundSettings;
  title: TextBlockSettings;
  subtitle: TextBlockSettings;
  body: TextBlockSettings;
  /** 0~100, 세 문구 묶음 전체 중심의 X 비율 좌표 */
  xPercent: number;
  /** 0~100, 세 문구 묶음 전체 중심의 Y 비율 좌표 */
  yPercent: number;
  ratio: Ratio;
  /** 배열 순서 = 레이어 순서 (뒤에 있을수록 위에 그려짐) */
  stickers: StickerInstance[];
}

/** localStorage에 저장되는 템플릿 (이미지 데이터는 저장하지 않음) */
export interface Template extends CardSettings {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export const TEMPLATE_SCHEMA_VERSION = 4;

export interface TemplateExportFile {
  version: number;
  exportedAt: string;
  templates: Template[];
}

/** 편집기에서 현재 선택된 대상 */
export type Selection =
  | { kind: "none" }
  | { kind: "background" }
  | { kind: "text"; key: TextBlockKey }
  | { kind: "sticker"; id: string };
