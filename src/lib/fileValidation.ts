import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "./constants";

export interface FileValidationResult {
  ok: boolean;
  reason?: string;
}

const EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

/**
 * PNG/JPEG 여부를 MIME 타입으로 우선 검사하고, MIME 타입이 비어있는
 * 환경(일부 브라우저/OS 조합)을 대비해 확장자를 보조 근거로만 사용한다.
 * 확장자만 다르고 MIME이 이미지가 아니면 무조건 거부한다.
 */
export function validateImageFile(file: File): FileValidationResult {
  const sizeMB = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      reason: `파일이 너무 큽니다 (최대 ${sizeMB}MB). PNG 또는 JPEG 형식의 더 작은 파일을 사용해 주세요.`,
    };
  }

  const mime = file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const extImpliesImage = ext in EXT_TO_MIME;

  if (ALLOWED_MIME_TYPES.includes(mime as (typeof ALLOWED_MIME_TYPES)[number])) {
    return { ok: true };
  }

  // MIME 타입이 브라우저에서 비어있게 오는 경우에만 확장자로 보완 판단한다.
  if (mime === "" && extImpliesImage) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: `지원하지 않는 파일 형식입니다 (${mime || ext || "알 수 없음"}). PNG와 JPEG 형식의 이미지만 지원합니다.`,
  };
}
