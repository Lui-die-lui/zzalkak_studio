import {
  BLOCK_GAP_RATIO,
  FONT_SIZE_MIN,
  TEXT_MAX_HEIGHT_RATIO,
  TEXT_MAX_WIDTH_RATIO,
} from "./constants";
import { buildFontStack } from "./fonts";
import { getStickerAsset } from "./stickers";
import { TEXT_BLOCK_KEYS } from "./types";
import type { CardSettings, OutputSize, StickerInstance, TextAlign, TextBlockKey } from "./types";

/**
 * 이미지를 지정한 캔버스 크기에 "cover" 방식으로 배치했을 때의
 * 대상(그리기) 사각형을 계산한다. 미리보기와 다운로드가 항상 이 함수만
 * 사용하도록 해서 두 결과가 어긋나지 않게 한다.
 */
export function computeCoverRect(
  imageWidth: number,
  imageHeight: number,
  canvas: OutputSize,
): { dx: number; dy: number; dWidth: number; dHeight: number } {
  const scale = Math.max(canvas.width / imageWidth, canvas.height / imageHeight);
  const dWidth = imageWidth * scale;
  const dHeight = imageHeight * scale;
  const dx = (canvas.width - dWidth) / 2;
  const dy = (canvas.height - dHeight) / 2;
  return { dx, dy, dWidth, dHeight };
}

/**
 * 문자열을 코드포인트 단위 배열로 쪼갠다. (이모지 등 서로게이트 쌍이
 * 중간에 잘려 깨지는 것을 방지하기 위해 String.split이 아닌 Array.from 사용)
 */
function toCodePoints(text: string): string[] {
  return Array.from(text);
}

/**
 * 사용자가 입력한 줄바꿈(\n)은 그대로 유지하면서, 각 줄이 maxWidth를
 * 넘으면 자동으로 줄바꿈한다. 공백이 있으면 단어 단위로, 공백이 없는
 * 긴 한글 문장 등은 글자 단위로 줄바꿈한다.
 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (text === "") return [""];

  const userLines = text.split("\n");
  const result: string[] = [];

  for (const userLine of userLines) {
    if (userLine === "") {
      result.push("");
      continue;
    }

    if (ctx.measureText(userLine).width <= maxWidth) {
      result.push(userLine);
      continue;
    }

    // 공백 기준 단어가 존재하면 단어 단위로 먼저 시도한다.
    const words = userLine.split(/(\s+)/).filter((w) => w !== "");
    let current = "";

    const flushCurrent = () => {
      if (current !== "") {
        result.push(current);
        current = "";
      }
    };

    for (const word of words) {
      const candidate = current + word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
        continue;
      }

      // 단어 자체가 maxWidth보다 넓은 경우 (공백 없는 긴 한글 등):
      // 글자(코드포인트) 단위로 강제 줄바꿈한다.
      if (ctx.measureText(word).width > maxWidth) {
        flushCurrent();
        let chunk = "";
        for (const ch of toCodePoints(word)) {
          const chunkCandidate = chunk + ch;
          if (ctx.measureText(chunkCandidate).width > maxWidth && chunk !== "") {
            result.push(chunk);
            chunk = ch;
          } else {
            chunk = chunkCandidate;
          }
        }
        current = chunk;
      } else {
        flushCurrent();
        current = word;
      }
    }
    flushCurrent();
  }

  return result.length > 0 ? result : [""];
}

export interface BlockLayout {
  key: TextBlockKey;
  lines: string[];
  fontSize: number;
  lineHeight: number;
  color: string;
  fontStack: string;
  align: TextAlign;
  /** 이 블록 첫 줄의 세로 중심 좌표(캔버스 기준 절대 px) */
  top: number;
  height: number;
  /** 블록의 실제 글자 영역 (정렬을 반영한 좌표) */
  left: number;
  width: number;
}

export interface StickerLayout {
  id: string;
  stickerId: string;
  cx: number;
  cy: number;
  width: number;
  height: number;
  rotation: number;
  flipX: boolean;
}

export interface DrawResult {
  /** 문구가 있는(빈 문자열이 아닌) 블록만, 제목→소제목→본문 순서로 포함 */
  blocks: BlockLayout[];
  centerX: number;
  groupTop: number;
  groupHeight: number;
  groupLeft: number;
  groupWidth: number;
  /** 배열 순서 = 레이어 순서 */
  stickers: StickerLayout[];
}

/** 스티커 한 장의 캔버스 상 배치를 계산한다 (미리보기 히트 테스트와 다운로드가 공유) */
export function computeStickerLayout(sticker: StickerInstance, canvas: OutputSize): StickerLayout | null {
  const asset = getStickerAsset(sticker.stickerId);
  if (!asset) return null;
  const width = (sticker.widthPercent / 100) * canvas.width;
  const height = width * (asset.height / asset.width);
  return {
    id: sticker.id,
    stickerId: sticker.stickerId,
    cx: (sticker.xPercent / 100) * canvas.width,
    cy: (sticker.yPercent / 100) * canvas.height,
    width,
    height,
    rotation: sticker.rotation,
    flipX: sticker.flipX,
  };
}

/** 선택한 가장자리의 색이 안쪽으로 갈수록 투명해지는 오버레이를 그린다. */
function drawGradientOverlay(ctx: CanvasRenderingContext2D, settings: CardSettings, canvas: OutputSize): void {
  const overlay = settings.gradientOverlay;
  if (!overlay.enabled || overlay.opacity <= 0) return;

  const normalizedColor = overlay.color.length === 4
    ? `#${overlay.color[1]}${overlay.color[1]}${overlay.color[2]}${overlay.color[2]}${overlay.color[3]}${overlay.color[3]}`
    : overlay.color;
  const red = Number.parseInt(normalizedColor.slice(1, 3), 16);
  const green = Number.parseInt(normalizedColor.slice(3, 5), 16);
  const blue = Number.parseInt(normalizedColor.slice(5, 7), 16);

  const fadeRatio = 0.68;
  let gradient: CanvasGradient;
  if (overlay.direction === "top") {
    gradient = ctx.createLinearGradient(0, 0, 0, canvas.height * fadeRatio);
  } else if (overlay.direction === "bottom") {
    gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height * (1 - fadeRatio));
  } else if (overlay.direction === "left") {
    gradient = ctx.createLinearGradient(0, 0, canvas.width * fadeRatio, 0);
  } else {
    gradient = ctx.createLinearGradient(canvas.width, 0, canvas.width * (1 - fadeRatio), 0);
  }

  gradient.addColorStop(0, overlay.color);
  gradient.addColorStop(0.16, overlay.color);
  gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);

  ctx.save();
  ctx.globalAlpha = overlay.opacity;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

/**
 * 미리보기(canvas)와 다운로드(canvas)가 공통으로 사용하는 유일한 렌더링
 * 함수. 그리는 순서: 배경(사진 cover 배치 또는 단색 채우기) → 스티커(배열
 * 순서) → 문구 블록. 문구는 제목/소제목/본문 중 내용이 있는 블록만 비율
 * 좌표(xPercent/yPercent)를 중심으로 세로로 쌓아 그린다.
 *
 * 배경은 사진 없이도 만들 수 있다: settings.background.type이 "color"이면
 * image 인자를 무시하고 단색으로 채우므로, 사진을 불러오지 않은 상태에서도
 * 문구·스티커만으로 카드를 완성할 수 있다.
 */
export function drawCard(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource | null,
  imageNaturalWidth: number,
  imageNaturalHeight: number,
  settings: CardSettings,
  canvas: OutputSize,
  stickerImages: Map<string, HTMLImageElement>,
  options?: { hiddenTextKey?: TextBlockKey | null },
): DrawResult {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (settings.background.type === "color" || !image) {
    // 이미지가 아직 없는데 "이미지" 모드인 경우(과도기적 상태)를 대비해
    // 중성 회색으로 대체하고, 실제 단색 배경 모드에서는 지정한 색을 채운다.
    ctx.fillStyle = settings.background.type === "color" ? settings.background.color : "#e5e7eb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    const { dx, dy, dWidth, dHeight } = computeCoverRect(imageNaturalWidth, imageNaturalHeight, canvas);
    ctx.drawImage(image, dx, dy, dWidth, dHeight);
  }
  ctx.restore();

  // 필터는 바탕 그림 위, 스티커와 텍스트 아래에 놓인다.
  drawGradientOverlay(ctx, settings, canvas);

  // ---------- 스티커 ----------
  const stickerLayouts: StickerLayout[] = [];
  for (const sticker of settings.stickers) {
    const layout = computeStickerLayout(sticker, canvas);
    if (!layout) continue;
    stickerLayouts.push(layout);
    const img = stickerImages.get(sticker.stickerId);
    if (!img) continue;
    ctx.save();
    ctx.translate(layout.cx, layout.cy);
    ctx.rotate((layout.rotation * Math.PI) / 180);
    if (layout.flipX) ctx.scale(-1, 1);
    ctx.drawImage(img, -layout.width / 2, -layout.height / 2, layout.width, layout.height);
    ctx.restore();
  }

  // ---------- 문구 ----------
  const maxWidth = canvas.width * TEXT_MAX_WIDTH_RATIO;
  const maxHeight = canvas.height * TEXT_MAX_HEIGHT_RATIO;
  const centerX = (settings.xPercent / 100) * canvas.width;
  const centerY = (settings.yPercent / 100) * canvas.height;

  const activeKeys = TEXT_BLOCK_KEYS.filter((key) => settings[key].text !== "");

  ctx.save();
  ctx.textBaseline = "middle";

  // 블록 전체 높이가 캔버스를 넘어서면(줄이 많거나 글자가 크면) 잘리지
  // 않도록 전체 글자 크기를 같은 비율로 줄여가며 다시 배치한다.
  let scale = 1;
  let layouts: BlockLayout[] = [];
  let groupHeight = 0;

  for (let attempt = 0; attempt < 60; attempt++) {
    layouts = [];
    groupHeight = 0;

    for (const key of activeKeys) {
      const block = settings[key];
      const fontSize = Math.max(FONT_SIZE_MIN, Math.round(block.fontSize * scale));
      const fontStack = buildFontStack(block.fontId);
      ctx.font = `bold ${fontSize}px ${fontStack}`;

      const lines = wrapText(ctx, block.text, maxWidth);
      const lineHeight = fontSize * block.lineHeight;
      const height = lines.length * lineHeight;
      const width = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);

      layouts.push({
        key,
        lines,
        fontSize,
        lineHeight,
        color: block.color,
        fontStack,
        align: block.align,
        top: 0,
        height,
        left: 0,
        width,
      });
      groupHeight += height;
    }

    for (let i = 0; i < layouts.length - 1; i++) {
      groupHeight += layouts[i].fontSize * BLOCK_GAP_RATIO;
    }

    if (groupHeight <= maxHeight || scale <= FONT_SIZE_MIN / 400) break;
    scale -= 0.05;
  }

  const groupTop = centerY - groupHeight / 2;
  let cursorY = groupTop;
  for (let i = 0; i < layouts.length; i++) {
    const layout = layouts[i];
    layout.top = cursorY + layout.lineHeight / 2;
    layout.left =
      layout.align === "left"
        ? centerX - maxWidth / 2
        : layout.align === "right"
          ? centerX + maxWidth / 2 - layout.width
          : centerX - layout.width / 2;
    cursorY += layout.height;
    if (i < layouts.length - 1) cursorY += layout.fontSize * BLOCK_GAP_RATIO;
  }

  for (const layout of layouts) {
    if (layout.key === options?.hiddenTextKey) continue;
    ctx.font = `bold ${layout.fontSize}px ${layout.fontStack}`;
    ctx.fillStyle = layout.color;
    ctx.textAlign = layout.align;
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = Math.max(2, layout.fontSize * 0.06);
    ctx.shadowOffsetY = Math.max(1, layout.fontSize * 0.03);

    const anchorX =
      layout.align === "left" ? centerX - maxWidth / 2 : layout.align === "right" ? centerX + maxWidth / 2 : centerX;
    layout.lines.forEach((line, i) => {
      ctx.fillText(line, anchorX, layout.top + i * layout.lineHeight);
    });
  }
  ctx.restore();

  const groupLeft = layouts.length > 0 ? Math.min(...layouts.map((l) => l.left)) : centerX;
  const groupRight = layouts.length > 0 ? Math.max(...layouts.map((l) => l.left + l.width)) : centerX;

  return {
    blocks: layouts,
    centerX,
    groupTop,
    groupHeight,
    groupLeft,
    groupWidth: groupRight - groupLeft,
    stickers: stickerLayouts,
  };
}

/** 캔버스를 PNG Blob으로 변환한다. (원본 EXIF/GPS 메타데이터는 다시 그리는 과정에서 사라진다) */
export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG로 변환하지 못했습니다."));
    }, "image/png");
  });
}
