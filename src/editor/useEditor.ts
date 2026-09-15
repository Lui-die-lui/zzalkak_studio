import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_CARD_SETTINGS,
  OUTPUT_SIZES,
  POSITION_MAX_PERCENT,
  POSITION_MIN_PERCENT,
  STICKER_DEFAULT_WIDTH_PERCENT,
  STICKER_MAX_WIDTH_PERCENT,
  STICKER_MIN_WIDTH_PERCENT,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
} from "../lib/constants";
import { validateImageFile } from "../lib/fileValidation";
import { canvasToPngBlob } from "../lib/render";
import { getStickerAsset } from "../lib/stickers";
import {
  createTemplate,
  deleteTemplate,
  loadDraft,
  loadTemplates,
  makeId,
  saveDraft,
  saveTemplates,
  templateToSettings,
  updateTemplate,
} from "../lib/templates";
import type {
  BackgroundSettings,
  CardSettings,
  Ratio,
  Selection,
  StickerInstance,
  Template,
  TextBlockKey,
  TextBlockSettings,
} from "../lib/types";
import { useHistory, type ApplyOptions } from "../lib/useHistory";
import { useImageFromFile } from "../lib/useImageFromFile";

export type ToolId = "image" | "text" | "ratio" | "sticker" | "template" | "io";

export type SaveStatus = "saved" | "saving" | "unsaved";

export interface Toast {
  id: number;
  kind: "success" | "error" | "info";
  text: string;
}

export interface PreviewHandle {
  getCanvas: () => HTMLCanvasElement | null;
  ensureFreshPaint: () => Promise<void>;
}

export type LayerMove = "up" | "down" | "front" | "back";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeForFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9가-힣_-]+/g, "_").slice(0, 40);
}

function formatDateForFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useEditor() {
  // ---------- 이미지 ----------
  const { image, load, clear } = useImageFromFile();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // ---------- 편집 상태 (실행 취소/다시 실행 포함) ----------
  const history = useHistory<CardSettings>(DEFAULT_CARD_SETTINGS);
  const settings = history.present;
  const apply = history.apply;

  // ---------- UI 상태 ----------
  // 첫 화면에서 이미지 편집 도구(중앙 캔버스의 업로드 영역)와 문구 편집 도구가
  // 클릭 없이 동시에 보이도록, 기본 도구는 텍스트로 열고 본문 블록을 미리 선택해
  // 둔다(T03-C03: 두 편집 도구가 첫 화면에 보여야 함).
  const [selection, setSelection] = useState<Selection>({ kind: "text", key: "body" });
  const [activeTool, setActiveTool] = useState<ToolId | null>("text");
  const [zoom, setZoomState] = useState(1);
  const [ioModalOpen, setIoModalOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [propsSheetOpen, setPropsSheetOpen] = useState(false);
  const [propsPanelOpen, setPropsPanelOpen] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const previewRef = useRef<PreviewHandle | null>(null);
  const focusRequestRef = useRef<string | null>(null);

  // ---------- 템플릿 ----------
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // 초기 로드: 템플릿 목록 + 마지막 작업 초안
  useEffect(() => {
    setTemplates(loadTemplates());
    const draft = loadDraft();
    if (draft) history.reset(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 초안 자동 저장 (저장 상태 표시)
  const firstRunRef = useRef(true);
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      try {
        saveDraft(settings);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("unsaved");
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [settings]);

  // ---------- 토스트 ----------
  const showToast = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, kind, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, kind === "error" ? 5000 : 2800);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ---------- 이미지 동작 ----------
  const acceptImageFile = useCallback(
    async (file: File) => {
      const result = validateImageFile(file);
      if (!result.ok) {
        // 기존 이미지/문구/스티커/템플릿 상태는 절대 건드리지 않는다.
        const reason = result.reason ?? "지원하지 않는 파일입니다. PNG와 JPEG만 지원합니다.";
        setUploadError(reason);
        showToast("error", reason);
        return false;
      }
      try {
        await load(file);
        setUploadError(null);
        // 단색 배경 모드였더라도 사진을 올렸다면 자연스럽게 이미지 배경으로 전환한다.
        apply((prev) => (prev.background.type === "image" ? prev : { ...prev, background: { ...prev.background, type: "image" } }));
        setSelection({ kind: "background" });
        setActiveTool("text");
        showToast("success", `이미지를 불러왔습니다: ${file.name}`);
        return true;
      } catch (err) {
        const reason = err instanceof Error ? err.message : "이미지를 불러오지 못했습니다.";
        setUploadError(reason);
        showToast("error", reason);
        return false;
      }
    },
    [apply, load, showToast],
  );

  const requestImageFile = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const removeImage = useCallback(() => {
    clear();
    setSelection({ kind: "none" });
    setActiveTool("image");
    showToast("info", "이미지를 제거했습니다. 문구와 스티커는 그대로 유지됩니다.");
  }, [clear, showToast]);

  // ---------- 설정 변경 ----------
  const patch = useCallback(
    (partial: Partial<CardSettings>, options?: ApplyOptions) => {
      apply((prev) => ({ ...prev, ...partial }), options);
    },
    [apply],
  );

  const patchBlock = useCallback(
    (key: TextBlockKey, partial: Partial<TextBlockSettings>, options?: ApplyOptions) => {
      apply((prev) => ({ ...prev, [key]: { ...prev[key], ...partial } }), options);
    },
    [apply],
  );

  const clearTextBlock = useCallback(
    (key: TextBlockKey) => {
      patchBlock(key, { text: "" });
      showToast("info", "문구를 지웠습니다. 실행 취소로 되돌릴 수 있습니다.");
    },
    [patchBlock, showToast],
  );

  const setRatio = useCallback(
    (ratio: Ratio) => {
      patch({ ratio });
    },
    [patch],
  );

  /** 배경을 사진/단색 사이에서 바꾸거나 단색 색상을 바꾼다. 사진 없이도 카드를 만들 수 있게 한다. */
  const setBackground = useCallback(
    (partial: Partial<BackgroundSettings>, options?: ApplyOptions) => {
      apply((prev) => ({ ...prev, background: { ...prev.background, ...partial } }), options);
    },
    [apply],
  );

  const setTextPosition = useCallback(
    (xPercent: number, yPercent: number, options?: ApplyOptions) => {
      patch(
        {
          xPercent: clamp(Math.round(xPercent), POSITION_MIN_PERCENT, POSITION_MAX_PERCENT),
          yPercent: clamp(Math.round(yPercent), POSITION_MIN_PERCENT, POSITION_MAX_PERCENT),
        },
        options,
      );
    },
    [patch],
  );

  // ---------- 스티커 ----------
  const addSticker = useCallback(
    (stickerId: string) => {
      const asset = getStickerAsset(stickerId);
      if (!asset) return;
      const instance: StickerInstance = {
        id: makeId(),
        stickerId,
        xPercent: 50,
        yPercent: 50,
        widthPercent: STICKER_DEFAULT_WIDTH_PERCENT,
        rotation: 0,
        flipX: false,
      };
      apply((prev) => ({ ...prev, stickers: [...prev.stickers, instance] }));
      setSelection({ kind: "sticker", id: instance.id });
      showToast("success", `"${asset.name}" 스티커를 추가했습니다.`);
    },
    [apply, showToast],
  );

  const updateSticker = useCallback(
    (id: string, partial: Partial<StickerInstance>, options?: ApplyOptions) => {
      apply(
        (prev) => ({
          ...prev,
          stickers: prev.stickers.map((s) => {
            if (s.id !== id) return s;
            const next = { ...s, ...partial };
            next.xPercent = clamp(next.xPercent, 0, 100);
            next.yPercent = clamp(next.yPercent, 0, 100);
            next.widthPercent = clamp(next.widthPercent, STICKER_MIN_WIDTH_PERCENT, STICKER_MAX_WIDTH_PERCENT);
            return next;
          }),
        }),
        options,
      );
    },
    [apply],
  );

  const removeSticker = useCallback(
    (id: string) => {
      apply((prev) => ({ ...prev, stickers: prev.stickers.filter((s) => s.id !== id) }));
      setSelection((sel) => (sel.kind === "sticker" && sel.id === id ? { kind: "none" } : sel));
      showToast("info", "스티커를 삭제했습니다. 실행 취소로 되돌릴 수 있습니다.");
    },
    [apply, showToast],
  );

  const duplicateSticker = useCallback(
    (id: string) => {
      const source = settings.stickers.find((s) => s.id === id);
      if (!source) return;
      const copy: StickerInstance = {
        ...source,
        id: makeId(),
        xPercent: clamp(source.xPercent + 4, 0, 100),
        yPercent: clamp(source.yPercent + 4, 0, 100),
      };
      apply((prev) => {
        const index = prev.stickers.findIndex((s) => s.id === id);
        const next = [...prev.stickers];
        next.splice(index + 1, 0, copy);
        return { ...prev, stickers: next };
      });
      setSelection({ kind: "sticker", id: copy.id });
    },
    [apply, settings.stickers],
  );

  const moveStickerLayer = useCallback(
    (id: string, move: LayerMove) => {
      apply((prev) => {
        const index = prev.stickers.findIndex((s) => s.id === id);
        if (index < 0) return prev;
        const next = [...prev.stickers];
        const [item] = next.splice(index, 1);
        let target = index;
        if (move === "up") target = Math.min(next.length, index + 1);
        if (move === "down") target = Math.max(0, index - 1);
        if (move === "front") target = next.length;
        if (move === "back") target = 0;
        next.splice(target, 0, item);
        return { ...prev, stickers: next };
      });
    },
    [apply],
  );

  // ---------- 템플릿 ----------
  const persistTemplates = useCallback((next: Template[]) => {
    setTemplates(next);
    saveTemplates(next);
  }, []);

  const saveAsTemplate = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        showToast("error", "템플릿 이름을 입력해 주세요.");
        return false;
      }
      const tpl = createTemplate(trimmed, settings);
      persistTemplates([...templates, tpl]);
      setSelectedTemplateId(tpl.id);
      showToast("success", `"${trimmed}" 템플릿을 저장했습니다.`);
      return true;
    },
    [persistTemplates, settings, showToast, templates],
  );

  const loadTemplate = useCallback(
    (id: string) => {
      const tpl = templates.find((t) => t.id === id);
      if (!tpl) return;
      apply(templateToSettings(tpl));
      setSelectedTemplateId(id);
      setSelection({ kind: "none" });
      showToast("success", `"${tpl.name}" 템플릿을 불러왔습니다.${image ? "" : " 이미지는 다시 선택해 주세요."}`);
    },
    [apply, image, showToast, templates],
  );

  const updateTemplateWithCurrent = useCallback(
    (id: string) => {
      persistTemplates(updateTemplate(templates, id, settings));
      showToast("success", "템플릿을 현재 설정으로 업데이트했습니다.");
    },
    [persistTemplates, settings, showToast, templates],
  );

  const renameTemplate = useCallback(
    (id: string, name: string) => {
      persistTemplates(updateTemplate(templates, id, { name }));
    },
    [persistTemplates, templates],
  );

  const removeTemplate = useCallback(
    (id: string) => {
      persistTemplates(deleteTemplate(templates, id));
      if (selectedTemplateId === id) setSelectedTemplateId(null);
      showToast("info", "템플릿을 삭제했습니다.");
    },
    [persistTemplates, selectedTemplateId, showToast, templates],
  );

  const replaceAllTemplates = useCallback(
    (next: Template[]) => {
      persistTemplates(next);
    },
    [persistTemplates],
  );

  // ---------- 확대/축소 ----------
  const setZoom = useCallback((value: number) => {
    setZoomState(clamp(Math.round(value * 100) / 100, ZOOM_MIN, ZOOM_MAX));
  }, []);
  const zoomIn = useCallback(() => setZoom(zoom + ZOOM_STEP), [setZoom, zoom]);
  const zoomOut = useCallback(() => setZoom(zoom - ZOOM_STEP), [setZoom, zoom]);
  const zoomFit = useCallback(() => setZoom(1), [setZoom]);

  // 사진이 없어도 단색 배경이면 카드를 만들고 내려받을 수 있다.
  const canDownload = settings.background.type === "color" || Boolean(image);

  // ---------- 다운로드 ----------
  const download = useCallback(async () => {
    const handle = previewRef.current;
    const canvas = handle?.getCanvas();
    if (!canDownload || !handle || !canvas) {
      showToast("error", "다운로드할 카드가 없습니다. 이미지를 불러오거나 단색 배경을 선택하세요.");
      return;
    }
    try {
      // 캡처 직전 미리보기와 완전히 같은 내용으로 한 번 더 그려 픽셀 일치를 보장한다.
      await handle.ensureFreshPaint();
      const blob = await canvasToPngBlob(canvas);
      const ratioLabel = settings.ratio.replace(":", "x");
      const selected = templates.find((t) => t.id === selectedTemplateId);
      const namePart = selected ? sanitizeForFilename(selected.name) : "card";
      triggerDownload(blob, `zzalkak_${namePart}_${ratioLabel}_${formatDateForFilename(new Date())}.png`);
      showToast("success", "PNG 파일을 내려받았습니다.");
    } catch {
      showToast("error", "이미지를 내려받는 중 문제가 발생했습니다. 다시 시도해 주세요.");
    }
  }, [canDownload, selectedTemplateId, settings.ratio, showToast, templates]);

  // ---------- 선택/도구 ----------
  const openTool = useCallback((tool: ToolId | null) => {
    setActiveTool(tool);
  }, []);

  const toggleTool = useCallback((tool: ToolId) => {
    setActiveTool((current) => (current === tool ? null : tool));
  }, []);

  const select = useCallback((next: Selection) => {
    setSelection(next);
    if (next.kind !== "none") setPropsSheetOpen(true);
  }, []);

  /** 속성 패널의 특정 입력에 포커스를 요청한다 (도구 검색에서 사용) */
  const requestFocus = useCallback((inputId: string) => {
    focusRequestRef.current = inputId;
    setPropsPanelOpen(true);
    setPropsSheetOpen(true);
  }, []);

  const consumeFocusRequest = useCallback(() => {
    const id = focusRequestRef.current;
    focusRequestRef.current = null;
    return id;
  }, []);

  // 선택된 스티커가 사라지면 선택 해제
  useEffect(() => {
    if (selection.kind === "sticker" && !settings.stickers.some((s) => s.id === selection.id)) {
      setSelection({ kind: "none" });
    }
  }, [selection, settings.stickers]);

  const outputSize = OUTPUT_SIZES[settings.ratio];
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  return {
    // 이미지
    image,
    uploadError,
    imageInputRef,
    acceptImageFile,
    requestImageFile,
    removeImage,
    // 설정
    settings,
    outputSize,
    patch,
    patchBlock,
    clearTextBlock,
    setRatio,
    setBackground,
    setTextPosition,
    canDownload,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    // 스티커
    addSticker,
    updateSticker,
    removeSticker,
    duplicateSticker,
    moveStickerLayer,
    // 템플릿
    templates,
    selectedTemplateId,
    selectedTemplate,
    saveAsTemplate,
    loadTemplate,
    updateTemplateWithCurrent,
    renameTemplate,
    removeTemplate,
    replaceAllTemplates,
    // UI
    selection,
    select,
    activeTool,
    openTool,
    toggleTool,
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    zoomFit,
    ioModalOpen,
    setIoModalOpen,
    paletteOpen,
    setPaletteOpen,
    propsSheetOpen,
    setPropsSheetOpen,
    propsPanelOpen,
    setPropsPanelOpen,
    requestFocus,
    consumeFocusRequest,
    saveStatus,
    toasts,
    showToast,
    dismissToast,
    previewRef,
    download,
  };
}

export type EditorApi = ReturnType<typeof useEditor>;
