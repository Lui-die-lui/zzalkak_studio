export type StickerCategory = "표정" | "강조" | "장식";

export const STICKER_CATEGORIES: StickerCategory[] = ["표정", "강조", "장식"];

export interface StickerAsset {
  id: string;
  name: string;
  category: StickerCategory;
  /** 검색용 키워드 (공백 구분, 한/영 혼합) */
  keywords: string;
  file: string;
  width: number;
  height: number;
}

/**
 * 프로젝트 내부 스티커 에셋 목록. 파일은 public/stickers/에 있으며
 * picture/icon01.png(크롬 심볼), picture/icon02.png(3D 이모지)를 요소별로 잘라 만들었다.
 * 외부 API는 사용하지 않는다.
 */
export const STICKER_CATALOG: StickerAsset[] = [
  { id: "emoji-laugh", name: "웃음", category: "표정", keywords: "laugh 웃음 웃는 smile happy 기쁨 이모지", file: "emoji-laugh.png", width: 372, height: 365 },
  { id: "emoji-heart-eyes", name: "하트 눈", category: "표정", keywords: "love heart eyes 사랑 하트눈 반함 이모지", file: "emoji-heart-eyes.png", width: 368, height: 364 },
  { id: "emoji-surprised", name: "놀람", category: "표정", keywords: "wow surprised 놀람 놀란 헉 이모지", file: "emoji-surprised.png", width: 367, height: 365 },
  { id: "emoji-cry", name: "눈물", category: "표정", keywords: "cry sad 슬픔 눈물 우는 이모지", file: "emoji-cry.png", width: 368, height: 366 },
  { id: "emoji-angry", name: "화남", category: "표정", keywords: "angry mad 화남 분노 이모지", file: "emoji-angry.png", width: 369, height: 364 },
  { id: "emoji-wink-tongue", name: "메롱 윙크", category: "표정", keywords: "wink tongue 메롱 윙크 장난 이모지", file: "emoji-wink-tongue.png", width: 370, height: 367 },
  { id: "emoji-thumbs-up", name: "엄지 척", category: "강조", keywords: "thumbs up like 좋아요 엄지 최고 추천", file: "emoji-thumbs-up.png", width: 361, height: 367 },
  { id: "emoji-question", name: "물음표", category: "강조", keywords: "question 물음표 질문 궁금 ?", file: "emoji-question.png", width: 256, height: 376 },
  { id: "chrome-lightning", name: "번개", category: "강조", keywords: "lightning bolt 번개 thunder 강조 크롬", file: "chrome-lightning.png", width: 182, height: 381 },
  { id: "chrome-flame", name: "불꽃", category: "강조", keywords: "fire flame 불 불꽃 화염 hot 크롬", file: "chrome-flame.png", width: 267, height: 458 },
  { id: "chrome-broken-heart", name: "깨진 하트", category: "강조", keywords: "heart 하트 broken 이별 크롬 메탈", file: "chrome-broken-heart.png", width: 342, height: 311 },
  { id: "chrome-star", name: "크롬 별", category: "장식", keywords: "star 별 스타 metal 메탈 크롬", file: "chrome-star.png", width: 349, height: 353 },
  { id: "chrome-sparkle", name: "반짝임", category: "장식", keywords: "sparkle 반짝 별빛 glitter drip 크롬", file: "chrome-sparkle.png", width: 294, height: 406 },
  { id: "chrome-butterfly", name: "나비", category: "장식", keywords: "butterfly 나비 y2k metal 크롬", file: "chrome-butterfly.png", width: 374, height: 381 },
  { id: "chrome-spike-ring", name: "가시 링", category: "장식", keywords: "ring spike 링 가시 원 halo 크롬", file: "chrome-spike-ring.png", width: 433, height: 363 },
  { id: "chrome-chain", name: "체인", category: "장식", keywords: "chain 체인 사슬 링크 metal 크롬", file: "chrome-chain.png", width: 272, height: 352 },
];

const CATALOG_BY_ID = new Map(STICKER_CATALOG.map((s) => [s.id, s]));

export function getStickerAsset(stickerId: string): StickerAsset | undefined {
  return CATALOG_BY_ID.get(stickerId);
}

export function isKnownStickerId(id: unknown): id is string {
  return typeof id === "string" && CATALOG_BY_ID.has(id);
}

export function stickerSrc(asset: StickerAsset): string {
  return `${import.meta.env.BASE_URL}stickers/${asset.file}`;
}

/** 이름·키워드·카테고리로 검색 + 카테고리 필터 */
export function searchStickers(query: string, category: StickerCategory | "전체"): StickerAsset[] {
  const q = query.trim().toLowerCase();
  return STICKER_CATALOG.filter((s) => {
    if (category !== "전체" && s.category !== category) return false;
    if (q === "") return true;
    return `${s.name} ${s.keywords} ${s.category}`.toLowerCase().includes(q);
  });
}

// ---------- 이미지 로더 (미리보기와 다운로드가 같은 인스턴스를 공유) ----------

const imageCache = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement>>();

export function loadStickerImage(stickerId: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(stickerId);
  if (cached) return Promise.resolve(cached);
  const inFlight = pending.get(stickerId);
  if (inFlight) return inFlight;

  const asset = getStickerAsset(stickerId);
  if (!asset) return Promise.reject(new Error(`알 수 없는 스티커: ${stickerId}`));

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      imageCache.set(stickerId, img);
      pending.delete(stickerId);
      resolve(img);
    };
    img.onerror = () => {
      pending.delete(stickerId);
      reject(new Error(`스티커 이미지를 불러오지 못했습니다: ${asset.file}`));
    };
    img.src = stickerSrc(asset);
  });
  pending.set(stickerId, promise);
  return promise;
}

/** 캔버스에 올라간 스티커들의 이미지를 모두 준비한다. 실패한 항목은 건너뛴다. */
export async function ensureStickersLoaded(stickerIds: string[]): Promise<Map<string, HTMLImageElement>> {
  const unique = Array.from(new Set(stickerIds));
  await Promise.all(unique.map((id) => loadStickerImage(id).catch(() => undefined)));
  const map = new Map<string, HTMLImageElement>();
  for (const id of unique) {
    const img = imageCache.get(id);
    if (img) map.set(id, img);
  }
  return map;
}

export function getLoadedStickerImages(): Map<string, HTMLImageElement> {
  return imageCache;
}
