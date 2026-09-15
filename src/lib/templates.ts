import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_CARD_SETTINGS,
  DEFAULT_LINE_HEIGHT,
  DRAFT_STORAGE_KEY,
  LINE_HEIGHT_MAX,
  LINE_HEIGHT_MIN,
  LOCAL_STORAGE_KEY,
  RATIOS,
  STICKER_MAX_WIDTH_PERCENT,
  STICKER_MIN_WIDTH_PERCENT,
} from "./constants";
import { DEFAULT_FONT_ID, isKnownFontId } from "./fonts";
import { isKnownStickerId } from "./stickers";
import { TEMPLATE_SCHEMA_VERSION, TEXT_BLOCK_KEYS } from "./types";
import type {
  BackgroundSettings,
  BackgroundType,
  CardSettings,
  Ratio,
  StickerInstance,
  Template,
  TemplateExportFile,
  TextAlign,
  TextBlockSettings,
} from "./types";

// ---------- 예전 스키마 호환 ----------

/**
 * v1(단일 text/fontSize/color) → v2(title/subtitle/body) → v3(align, lineHeight,
 * stickers) → v4(background) 순서로 누락된 항목을 채운다. 검증 전에만
 * 사용하며, 값의 타입 검증은 validateSingleTemplate이 담당한다.
 */
function normalizeShape(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  let obj = { ...(raw as Record<string, unknown>) };

  // v1 → v2: 최상위 text가 있고 body가 없으면 본문으로 이관
  if (typeof obj.text === "string" && obj.body === undefined) {
    const { text, fontSize, color, ...rest } = obj;
    const c = typeof color === "string" ? color : "#ffffff";
    obj = {
      ...rest,
      title: { text: "", fontId: DEFAULT_FONT_ID, fontSize: 64, color: c },
      subtitle: { text: "", fontId: DEFAULT_FONT_ID, fontSize: 64, color: c },
      body: { text, fontId: DEFAULT_FONT_ID, fontSize: typeof fontSize === "number" ? fontSize : 44, color: c },
    };
  }

  // v2 → v3: 블록별 align/lineHeight, 최상위 stickers 기본값
  for (const key of TEXT_BLOCK_KEYS) {
    const block = obj[key];
    if (typeof block === "object" && block !== null) {
      const b = { ...(block as Record<string, unknown>) };
      if (b.align === undefined) b.align = "center";
      if (b.lineHeight === undefined) b.lineHeight = DEFAULT_LINE_HEIGHT;
      obj[key] = b;
    }
  }
  if (obj.stickers === undefined) obj.stickers = [];

  // v3 → v4: 배경 설정이 없으면 "이미지 배경"(예전 동작 그대로)으로 채운다.
  if (obj.background === undefined) {
    obj.background = { type: "image", color: DEFAULT_BACKGROUND_COLOR };
  }

  return obj;
}

export function loadTemplates(): Template[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const result: Template[] = [];
    parsed.forEach((item, i) => {
      const validated = validateSingleTemplate(item, i);
      if (typeof validated !== "string") result.push(validated);
    });
    return result;
  } catch {
    return [];
  }
}

export function saveTemplates(templates: Template[]): void {
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(templates));
}

// ---------- 작업 중인 편집 상태(초안) 자동 저장 ----------

export function loadDraft(): CardSettings | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const settings = validateCardSettings(JSON.parse(raw));
    return typeof settings === "string" ? null : settings;
  } catch {
    return null;
  }
}

export function saveDraft(settings: CardSettings): void {
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(settings));
}

// ---------- 생성/수정/삭제 ----------

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // 구형 환경을 위한 대체 ID 생성 (충돌 가능성 극히 낮음)
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createTemplate(name: string, settings: CardSettings): Template {
  const now = new Date().toISOString();
  return {
    id: makeId(),
    name,
    ...settings,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateTemplate(
  templates: Template[],
  id: string,
  patch: Partial<Pick<Template, "name" | keyof CardSettings>>,
): Template[] {
  const now = new Date().toISOString();
  return templates.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now } : t));
}

export function deleteTemplate(templates: Template[], id: string): Template[] {
  return templates.filter((t) => t.id !== id);
}

export function templateToSettings(template: Template): CardSettings {
  const { id: _id, name: _name, createdAt: _c, updatedAt: _u, ...settings } = template;
  return settings;
}

export function exportTemplatesFile(templates: Template[]): TemplateExportFile {
  return {
    version: TEMPLATE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    templates,
  };
}

// ---------- JSON 가져오기 검증 ----------

export interface ImportValidationSuccess {
  ok: true;
  templates: Template[];
}

export interface ImportValidationFailure {
  ok: false;
  error: string;
}

export type ImportValidationResult = ImportValidationSuccess | ImportValidationFailure;

const REQUIRED_STRING_FIELDS: (keyof Template)[] = ["id", "name", "createdAt", "updatedAt"];

function isValidRatio(value: unknown): value is Ratio {
  return typeof value === "string" && (RATIOS as string[]).includes(value);
}

function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

function isValidAlign(value: unknown): value is TextAlign {
  return value === "left" || value === "center" || value === "right";
}

function isPercent(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function isValidBackgroundType(value: unknown): value is BackgroundType {
  return value === "image" || value === "color";
}

function validateBackground(value: unknown, where: string): string | BackgroundSettings {
  if (typeof value !== "object" || value === null) return `${where} 값이 객체가 아닙니다.`;
  const obj = value as Record<string, unknown>;
  if (!isValidBackgroundType(obj.type)) return `${where}.type 값이 "image" 또는 "color"가 아닙니다.`;
  if (!isValidHexColor(obj.color)) return `${where}.color 값이 올바른 색상 코드(#rrggbb)가 아닙니다.`;
  return { type: obj.type, color: obj.color };
}

/** 제목/소제목/본문 블록 하나의 스키마를 검증한다. */
function validateTextBlock(value: unknown, where: string): string | TextBlockSettings {
  if (typeof value !== "object" || value === null) {
    return `${where} 값이 객체가 아닙니다.`;
  }
  const obj = value as Record<string, unknown>;

  if (typeof obj.text !== "string") return `${where}.text 값이 문자열이 아닙니다.`;
  if (!isKnownFontId(obj.fontId)) return `${where}.fontId 값이 알 수 없는 글꼴입니다.`;
  if (typeof obj.fontSize !== "number" || obj.fontSize <= 0) return `${where}.fontSize 값이 0보다 큰 숫자가 아닙니다.`;
  if (!isValidHexColor(obj.color)) return `${where}.color 값이 올바른 색상 코드(#rrggbb)가 아닙니다.`;
  if (!isValidAlign(obj.align)) return `${where}.align 값이 left, center, right 중 하나가 아닙니다.`;
  if (typeof obj.lineHeight !== "number" || obj.lineHeight < LINE_HEIGHT_MIN || obj.lineHeight > LINE_HEIGHT_MAX) {
    return `${where}.lineHeight 값이 ${LINE_HEIGHT_MIN}~${LINE_HEIGHT_MAX} 사이의 숫자가 아닙니다.`;
  }

  return { text: obj.text, fontId: obj.fontId, fontSize: obj.fontSize, color: obj.color, align: obj.align, lineHeight: obj.lineHeight };
}

function validateSticker(value: unknown, where: string): string | StickerInstance {
  if (typeof value !== "object" || value === null) return `${where} 값이 객체가 아닙니다.`;
  const obj = value as Record<string, unknown>;
  if (typeof obj.id !== "string" || obj.id.length === 0) return `${where}.id 값이 없거나 문자열이 아닙니다.`;
  if (!isKnownStickerId(obj.stickerId)) return `${where}.stickerId 값이 프로젝트에 없는 스티커입니다.`;
  if (!isPercent(obj.xPercent)) return `${where}.xPercent 값이 0~100 사이의 숫자가 아닙니다.`;
  if (!isPercent(obj.yPercent)) return `${where}.yPercent 값이 0~100 사이의 숫자가 아닙니다.`;
  if (
    typeof obj.widthPercent !== "number" ||
    obj.widthPercent < STICKER_MIN_WIDTH_PERCENT ||
    obj.widthPercent > STICKER_MAX_WIDTH_PERCENT
  ) {
    return `${where}.widthPercent 값이 ${STICKER_MIN_WIDTH_PERCENT}~${STICKER_MAX_WIDTH_PERCENT} 사이의 숫자가 아닙니다.`;
  }
  if (typeof obj.rotation !== "number" || !Number.isFinite(obj.rotation)) return `${where}.rotation 값이 숫자가 아닙니다.`;
  if (typeof obj.flipX !== "boolean") return `${where}.flipX 값이 true/false가 아닙니다.`;
  return {
    id: obj.id,
    stickerId: obj.stickerId,
    xPercent: obj.xPercent,
    yPercent: obj.yPercent,
    widthPercent: obj.widthPercent,
    rotation: obj.rotation,
    flipX: obj.flipX,
  };
}

/** 카드 편집 상태(템플릿 메타데이터 제외) 부분을 검증한다. 초안 복원과 템플릿 검증이 공유. */
export function validateCardSettings(raw: unknown, prefix = ""): string | CardSettings {
  const normalized = normalizeShape(raw);
  if (typeof normalized !== "object" || normalized === null) return `${prefix}항목이 객체가 아닙니다.`;
  const obj = normalized as Record<string, unknown>;

  const background = validateBackground(obj.background, `${prefix}"background"`);
  if (typeof background === "string") return background;

  const blocks: Partial<Record<(typeof TEXT_BLOCK_KEYS)[number], TextBlockSettings>> = {};
  for (const key of TEXT_BLOCK_KEYS) {
    const result = validateTextBlock(obj[key], `${prefix}"${key}"`);
    if (typeof result === "string") return result;
    blocks[key] = result;
  }

  if (!isPercent(obj.xPercent)) return `${prefix}"xPercent" 값이 0~100 사이의 숫자가 아닙니다.`;
  if (!isPercent(obj.yPercent)) return `${prefix}"yPercent" 값이 0~100 사이의 숫자가 아닙니다.`;
  if (!isValidRatio(obj.ratio)) return `${prefix}"ratio" 값이 1:1, 4:5, 9:16 중 하나가 아닙니다.`;
  if (!Array.isArray(obj.stickers)) return `${prefix}"stickers" 값이 배열이 아닙니다.`;

  const stickers: StickerInstance[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < obj.stickers.length; i++) {
    const result = validateSticker(obj.stickers[i], `${prefix}"stickers[${i}]"`);
    if (typeof result === "string") return result;
    if (seen.has(result.id)) return `${prefix}"stickers[${i}].id" 값이 같은 항목 안에서 중복됩니다.`;
    seen.add(result.id);
    stickers.push(result);
  }

  return {
    background,
    title: blocks.title!,
    subtitle: blocks.subtitle!,
    body: blocks.body!,
    xPercent: obj.xPercent,
    yPercent: obj.yPercent,
    ratio: obj.ratio,
    stickers,
  };
}

/**
 * 템플릿 하나의 스키마를 검증한다. 문제가 있으면 어떤 필드가 왜
 * 잘못되었는지 사람이 읽을 수 있는 문장으로 돌려준다.
 */
function validateSingleTemplate(item: unknown, index: number): string | Template {
  const prefix = `${index + 1}번째 항목의 `;
  const normalized = normalizeShape(item);
  if (typeof normalized !== "object" || normalized === null) return `${index + 1}번째 항목이 객체가 아닙니다.`;
  const obj = normalized as Record<string, unknown>;

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof obj[field] !== "string" || (obj[field] as string).length === 0) {
      return `${prefix}"${field}" 값이 없거나 문자열이 아닙니다.`;
    }
  }

  const settings = validateCardSettings(obj, prefix);
  if (typeof settings === "string") return settings;

  return {
    id: obj.id as string,
    name: obj.name as string,
    ...settings,
    createdAt: obj.createdAt as string,
    updatedAt: obj.updatedAt as string,
  };
}

/**
 * 가져오기 JSON 전체를 검증한다. 하나라도 실패하면 즉시 실패를
 * 반환하고, 호출부는 이 결과를 받기 전까지 기존 템플릿 목록을
 * 절대 변경하지 않는다. (문법 오류 → JSON.parse에서 이미 걸러짐)
 */
export function validateImportData(data: unknown): ImportValidationResult {
  let rawList: unknown;

  if (Array.isArray(data)) {
    rawList = data;
  } else if (typeof data === "object" && data !== null && Array.isArray((data as Record<string, unknown>).templates)) {
    rawList = (data as Record<string, unknown>).templates;
  } else {
    return { ok: false, error: '가져올 데이터 형식이 올바르지 않습니다. 템플릿 배열 또는 { "templates": [...] } 형태여야 합니다.' };
  }

  const list = rawList as unknown[];
  if (list.length === 0) {
    return { ok: false, error: "가져올 템플릿이 비어 있습니다." };
  }

  const validated: Template[] = [];
  for (let i = 0; i < list.length; i++) {
    const result = validateSingleTemplate(list[i], i);
    if (typeof result === "string") {
      return { ok: false, error: result };
    }
    validated.push(result);
  }

  return { ok: true, templates: validated };
}

export interface MergeReport {
  imported: number;
  renamed: number;
  merged: Template[];
}

/**
 * ID 충돌 규칙: 기존 템플릿은 절대 덮어쓰지 않는다. 가져온 항목의
 * ID가 이미 존재하면 새 ID를 발급해 별도 템플릿으로 추가한다.
 */
export function mergeImportedTemplates(existing: Template[], incoming: Template[]): MergeReport {
  const existingIds = new Set(existing.map((t) => t.id));
  let renamed = 0;
  const toAdd: Template[] = [];

  for (const tpl of incoming) {
    if (existingIds.has(tpl.id)) {
      const newId = makeId();
      toAdd.push({ ...tpl, id: newId, name: `${tpl.name} (가져옴)` });
      renamed++;
    } else {
      existingIds.add(tpl.id);
      toAdd.push(tpl);
    }
  }

  return {
    imported: toAdd.length,
    renamed,
    merged: [...existing, ...toAdd],
  };
}

export { DEFAULT_CARD_SETTINGS };
