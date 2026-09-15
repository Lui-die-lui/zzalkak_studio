import { ImagePlus, Maximize2, Minus, PaintBucket, Plus, RotateCw } from "lucide-react";
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import type { EditorApi } from "../editor/useEditor";
import { TEXT_MAX_WIDTH_RATIO, ZOOM_MAX, ZOOM_MIN } from "../lib/constants";
import { ensureFontsLoaded } from "../lib/fontLoader";
import { getFontOption } from "../lib/fonts";
import { drawCard, type BlockLayout, type DrawResult } from "../lib/render";
import { ensureStickersLoaded, getStickerAsset } from "../lib/stickers";
import { TEXT_BLOCK_KEYS, TEXT_BLOCK_LABELS } from "../lib/types";

interface StageProps {
  editor: EditorApi;
}

const STAGE_PADDING = 40;

type DragMode =
  | { kind: "none" }
  | { kind: "move-text"; key: (typeof TEXT_BLOCK_KEYS)[number]; startX: number; startY: number; originX: number; originY: number; moved: boolean }
  | { kind: "move-sticker"; id: string; startX: number; startY: number; originX: number; originY: number }
  | { kind: "resize-sticker"; id: string; cx: number; cy: number; startDist: number; originWidth: number }
  | { kind: "rotate-sticker"; id: string; cx: number; cy: number; startAngle: number; originRotation: number };

function waitTwoFrames(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

function pointInRotatedRect(px: number, py: number, cx: number, cy: number, w: number, h: number, rotationDeg: number) {
  const rad = (-rotationDeg * Math.PI) / 180;
  const dx = px - cx;
  const dy = py - cy;
  const x = dx * Math.cos(rad) - dy * Math.sin(rad);
  const y = dx * Math.sin(rad) + dy * Math.cos(rad);
  return Math.abs(x) <= w / 2 && Math.abs(y) <= h / 2;
}

export function Stage({ editor }: StageProps) {
  const { image, settings, outputSize, selection, zoom } = editor;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layoutRef = useRef<DrawResult | null>(null);
  const [layout, setLayout] = useState<DrawResult | null>(null);
  const [fitScale, setFitScale] = useState(0.4);
  const [dragOver, setDragOver] = useState(false);
  const [inlineEdit, setInlineEdit] = useState<{ key: (typeof TEXT_BLOCK_KEYS)[number]; value: string; layout: BlockLayout; width: number } | null>(null);
  const inlineEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const dragRef = useRef<DragMode>({ kind: "none" });

  const displayScale = fitScale * zoom;
  const frameWidth = outputSize.width * displayScale;
  const frameHeight = outputSize.height * displayScale;
  // 단색 배경 모드면 사진이 없어도 캔버스를 그릴 수 있다.
  const canRender = settings.background.type === "color" || Boolean(image);

  useEffect(() => {
    if (!inlineEdit) return;
    const editorElement = inlineEditorRef.current;
    if (!editorElement) return;
    editorElement.focus();
    editorElement.select();
    editorElement.style.height = "0px";
    editorElement.style.height = `${Math.max(inlineEdit.layout.height * displayScale + 8, editorElement.scrollHeight)}px`;
  }, [inlineEdit?.key]);

  useLayoutEffect(() => {
    if (!inlineEdit || !inlineEditorRef.current) return;
    const editorElement = inlineEditorRef.current;
    editorElement.style.height = "0px";
    editorElement.style.height = `${Math.max(inlineEdit.layout.height * displayScale + 8, editorElement.scrollHeight)}px`;
  }, [displayScale, inlineEdit]);

  // ---------- 캔버스가 작업 영역에 맞도록 기본 배율 계산 ----------
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => {
      const availW = Math.max(120, viewport.clientWidth - STAGE_PADDING * 2);
      const availH = Math.max(120, viewport.clientHeight - STAGE_PADDING * 2);
      setFitScale(Math.min(availW / outputSize.width, availH / outputSize.height));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [outputSize]);

  // ---------- 그리기 (다운로드와 완전히 같은 drawCard) ----------
  const paintNow = (hiddenTextKey: (typeof TEXT_BLOCK_KEYS)[number] | null = inlineEdit?.key ?? null) => {
    const canvas = canvasRef.current;
    if (!canvas || !canRender) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (canvas.width !== outputSize.width || canvas.height !== outputSize.height) {
      canvas.width = outputSize.width;
      canvas.height = outputSize.height;
    }
    const stickerImages = new Map<string, HTMLImageElement>();
    for (const s of settings.stickers) {
      const asset = getStickerAsset(s.stickerId);
      if (!asset) continue;
      const img = loadedStickerImagesRef.current.get(s.stickerId);
      if (img) stickerImages.set(s.stickerId, img);
    }
    const result = drawCard(
      ctx,
      image ? image.element : null,
      image?.naturalWidth ?? 0,
      image?.naturalHeight ?? 0,
      settings,
      outputSize,
      stickerImages,
      { hiddenTextKey },
    );
    layoutRef.current = result;
    setLayout(result);
  };

  const loadedStickerImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const prepareAssets = async () => {
    const families = TEXT_BLOCK_KEYS.map((key) => getFontOption(settings[key].fontId).family);
    const [, stickerMap] = await Promise.all([
      ensureFontsLoaded(families),
      ensureStickersLoaded(settings.stickers.map((s) => s.stickerId)),
    ]);
    stickerMap.forEach((img, id) => loadedStickerImagesRef.current.set(id, img));
  };

  useImperativeHandle(
    editor.previewRef,
    () => ({
      getCanvas: () => canvasRef.current,
      ensureFreshPaint: async () => {
        await prepareAssets();
        paintNow(null);
        // 새 글꼴로 처음 그릴 때 드물게 발생하는 글자 외곽선 깨짐을 방지하기 위해 한 프레임 뒤 한 번 더 그린다.
        await waitTwoFrames();
        paintNow(null);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [image, settings, outputSize, inlineEdit?.key],
  );

  useEffect(() => {
    if (!canRender) {
      layoutRef.current = null;
      setLayout(null);
      return;
    }
    let cancelled = false;
    prepareAssets().then(() => {
      if (cancelled) return;
      paintNow();
      waitTwoFrames().then(() => {
        if (!cancelled) paintNow();
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRender, image, settings, outputSize, inlineEdit?.key]);

  // ---------- 좌표 변환 ----------
  const toCanvasPoint = (clientX: number, clientY: number) => {
    const frame = frameRef.current;
    if (!frame) return null;
    const rect = frame.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * outputSize.width,
      y: ((clientY - rect.top) / rect.height) * outputSize.height,
    };
  };

  const hitTest = (x: number, y: number): { kind: "sticker"; id: string } | { kind: "text"; key: (typeof TEXT_BLOCK_KEYS)[number] } | null => {
    const d = layoutRef.current;
    if (!d) return null;
    for (let i = d.stickers.length - 1; i >= 0; i--) {
      const s = d.stickers[i];
      if (pointInRotatedRect(x, y, s.cx, s.cy, s.width, s.height, s.rotation)) return { kind: "sticker", id: s.id };
    }
    const pad = 16;
    for (const b of d.blocks) {
      const top = b.top - b.lineHeight / 2;
      if (x >= b.left - pad && x <= b.left + b.width + pad && y >= top - pad && y <= top + b.height + pad) {
        return { kind: "text", key: b.key };
      }
    }
    return null;
  };

  // ---------- 포인터 상호작용 ----------
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canRender || e.button !== 0) return;
    const point = toCanvasPoint(e.clientX, e.clientY);
    if (!point) return;
    const hit = hitTest(point.x, point.y);
    if (!hit) {
      editor.select({ kind: "background" });
      return;
    }
    if (hit.kind === "sticker") {
      const sticker = settings.stickers.find((s) => s.id === hit.id);
      if (!sticker) return;
      editor.select({ kind: "sticker", id: hit.id });
      dragRef.current = {
        kind: "move-sticker",
        id: hit.id,
        startX: point.x,
        startY: point.y,
        originX: sticker.xPercent,
        originY: sticker.yPercent,
      };
    } else {
      editor.select({ kind: "text", key: hit.key });
      dragRef.current = {
        kind: "move-text",
        key: hit.key,
        startX: point.x,
        startY: point.y,
        originX: settings.xPercent,
        originY: settings.yPercent,
        moved: false,
      };
    }
    frameRef.current?.setPointerCapture(e.pointerId);
  };

  const startResize = (e: React.PointerEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const point = toCanvasPoint(e.clientX, e.clientY);
    const s = layoutRef.current?.stickers.find((st) => st.id === id);
    const sticker = settings.stickers.find((st) => st.id === id);
    if (!point || !s || !sticker) return;
    const startDist = Math.hypot(point.x - s.cx, point.y - s.cy) || 1;
    dragRef.current = { kind: "resize-sticker", id, cx: s.cx, cy: s.cy, startDist, originWidth: sticker.widthPercent };
    frameRef.current?.setPointerCapture(e.pointerId);
  };

  const startRotate = (e: React.PointerEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const point = toCanvasPoint(e.clientX, e.clientY);
    const s = layoutRef.current?.stickers.find((st) => st.id === id);
    const sticker = settings.stickers.find((st) => st.id === id);
    if (!point || !s || !sticker) return;
    const startAngle = (Math.atan2(point.y - s.cy, point.x - s.cx) * 180) / Math.PI;
    dragRef.current = { kind: "rotate-sticker", id, cx: s.cx, cy: s.cy, startAngle, originRotation: sticker.rotation };
    frameRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.kind === "none") return;
    const point = toCanvasPoint(e.clientX, e.clientY);
    if (!point) return;

    if (drag.kind === "move-text") {
      const moved = drag.moved || Math.hypot(point.x - drag.startX, point.y - drag.startY) * displayScale >= 4;
      if (!moved) return;
      if (!drag.moved) dragRef.current = { ...drag, moved: true };
      const dx = ((point.x - drag.startX) / outputSize.width) * 100;
      const dy = ((point.y - drag.startY) / outputSize.height) * 100;
      editor.setTextPosition(drag.originX + dx, drag.originY + dy, { coalesceKey: "drag-text" });
    } else if (drag.kind === "move-sticker") {
      const dx = ((point.x - drag.startX) / outputSize.width) * 100;
      const dy = ((point.y - drag.startY) / outputSize.height) * 100;
      editor.updateSticker(
        drag.id,
        { xPercent: Math.round((drag.originX + dx) * 10) / 10, yPercent: Math.round((drag.originY + dy) * 10) / 10 },
        { coalesceKey: `drag-sticker-${drag.id}` },
      );
    } else if (drag.kind === "resize-sticker") {
      const dist = Math.hypot(point.x - drag.cx, point.y - drag.cy);
      const width = Math.round(drag.originWidth * (dist / drag.startDist) * 10) / 10;
      editor.updateSticker(drag.id, { widthPercent: width }, { coalesceKey: `resize-sticker-${drag.id}` });
    } else if (drag.kind === "rotate-sticker") {
      const angle = (Math.atan2(point.y - drag.cy, point.x - drag.cx) * 180) / Math.PI;
      let rotation = Math.round(drag.originRotation + (angle - drag.startAngle));
      rotation = ((rotation % 360) + 360) % 360;
      if (e.shiftKey) rotation = Math.round(rotation / 15) * 15;
      editor.updateSticker(drag.id, { rotation }, { coalesceKey: `rotate-sticker-${drag.id}` });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = { kind: "none" };
    try {
      frameRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // 캡처되지 않은 상태에서 release 시도 시 무시
    }
    if (drag.kind === "move-text" && !drag.moved) {
      const blockLayout = layoutRef.current?.blocks.find((block) => block.key === drag.key);
      if (blockLayout) setInlineEdit({ key: drag.key, value: settings[drag.key].text, layout: blockLayout, width: blockLayout.width });
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { kind: "none" };
    try {
      frameRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // 캡처되지 않은 상태에서 release 시도 시 무시
    }
  };

  const commitInlineEdit = () => {
    if (!inlineEdit) return;
    if (inlineEdit.value !== settings[inlineEdit.key].text) {
      editor.patchBlock(inlineEdit.key, { text: inlineEdit.value });
    }
    setInlineEdit(null);
  };

  const updateInlineEdit = (value: string) => {
    if (!inlineEdit) return;
    const ctx = canvasRef.current?.getContext("2d");
    let width = inlineEdit.layout.width;
    if (ctx) {
      ctx.save();
      ctx.font = `bold ${inlineEdit.layout.fontSize}px ${inlineEdit.layout.fontStack}`;
      width = value.split("\n").reduce((max, line) => Math.max(max, ctx.measureText(line || " ").width), 0);
      ctx.restore();
    }
    setInlineEdit({ ...inlineEdit, value, width });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    editor.setZoom(zoom * (e.deltaY < 0 ? 1.1 : 0.9));
  };

  // ---------- 드래그 앤 드롭 업로드 ----------
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragOver(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void editor.acceptImageFile(file);
  };

  // ---------- 오버레이 ----------
  const selectedStickerLayout =
    selection.kind === "sticker" ? (layout?.stickers.find((s) => s.id === selection.id) ?? null) : null;
  const selectedBlockLayout = selection.kind === "text" ? (layout?.blocks.find((b) => b.key === selection.key) ?? null) : null;
  const selectedStickerAsset = selectedStickerLayout ? getStickerAsset(selectedStickerLayout.stickerId) : null;

  const zoomPercent = Math.round(displayScale * 100);
  const inlineEditorFrame = inlineEdit
    ? (() => {
        const center = (settings.xPercent / 100) * outputSize.width * displayScale;
        const maxWidth = outputSize.width * TEXT_MAX_WIDTH_RATIO * displayScale;
        const width = Math.min(maxWidth, Math.max(inlineEdit.width * displayScale + 12, 72));
        let left = center - width / 2;
        if (inlineEdit.layout.align === "left") left = center - maxWidth / 2 - 7;
        if (inlineEdit.layout.align === "right") left = center + maxWidth / 2 - width + 7;
        return {
          left,
          top: (inlineEdit.layout.top - inlineEdit.layout.lineHeight / 2) * displayScale - 2,
          width,
        };
      })()
    : null;

  return (
    <div
      ref={viewportRef}
      className={`stage${dragOver ? " stage--dragover" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onWheel={handleWheel}
    >
      {canRender ? (
        <div className="stage-scroll">
          <div
            ref={frameRef}
            className="stage-frame"
            style={{ width: frameWidth, height: frameHeight }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            <canvas
              ref={canvasRef}
              className="preview-canvas"
              width={outputSize.width}
              height={outputSize.height}
              role="img"
              aria-label={`${settings.ratio} 비율 카드 미리보기. 문구나 스티커를 드래그해 옮길 수 있습니다.`}
            />

            {/* 선택 가이드는 DOM 오버레이로만 그린다 — 캔버스 픽셀(다운로드 결과)에는 포함되지 않는다 */}
            <div className="stage-overlay">
              {selectedBlockLayout && !inlineEdit && (
                <div
                  className="guide guide--text"
                  style={{
                    left: (selectedBlockLayout.left - 10) * displayScale,
                    top: (selectedBlockLayout.top - selectedBlockLayout.lineHeight / 2 - 6) * displayScale,
                    width: (selectedBlockLayout.width + 20) * displayScale,
                    height: (selectedBlockLayout.height + 12) * displayScale,
                  }}
                >
                  <span className="guide__label">{TEXT_BLOCK_LABELS[selectedBlockLayout.key]}</span>
                </div>
              )}
              {selectedStickerLayout && (
                <div
                  className="guide guide--sticker"
                  style={{
                    left: (selectedStickerLayout.cx - selectedStickerLayout.width / 2) * displayScale,
                    top: (selectedStickerLayout.cy - selectedStickerLayout.height / 2) * displayScale,
                    width: selectedStickerLayout.width * displayScale,
                    height: selectedStickerLayout.height * displayScale,
                    transform: `rotate(${selectedStickerLayout.rotation}deg)`,
                  }}
                >
                  <span className="guide__label">{selectedStickerAsset?.name ?? "스티커"}</span>
                  <button
                    type="button"
                    className="handle handle--rotate"
                    aria-label="스티커 회전 (Shift: 15도 단위)"
                    title="드래그해서 회전"
                    onPointerDown={(e) => startRotate(e, selectedStickerLayout.id)}
                  >
                    <RotateCw size={12} />
                  </button>
                  <button
                    type="button"
                    className="handle handle--resize"
                    aria-label="스티커 크기 조절"
                    title="드래그해서 크기 조절"
                    onPointerDown={(e) => startResize(e, selectedStickerLayout.id)}
                  />
                </div>
              )}
              {inlineEdit && inlineEditorFrame && (
                <div className="inline-text-editor-frame" style={inlineEditorFrame}>
                  <span className="guide__label inline-text-editor__label">{TEXT_BLOCK_LABELS[inlineEdit.key]}</span>
                  <textarea
                    ref={inlineEditorRef}
                    className="inline-text-editor"
                    value={inlineEdit.value}
                    aria-label={`${TEXT_BLOCK_LABELS[inlineEdit.key]} 문구 바로 편집`}
                    title="바깥을 클릭하거나 Ctrl/⌘+Enter를 누르면 적용됩니다. Esc를 누르면 취소됩니다."
                    spellCheck={false}
                    wrap="soft"
                    style={{
                      height: Math.max(inlineEdit.layout.height * displayScale + 8, 34),
                      fontFamily: inlineEdit.layout.fontStack,
                      fontSize: inlineEdit.layout.fontSize * displayScale,
                      lineHeight: `${inlineEdit.layout.lineHeight * displayScale}px`,
                      color: inlineEdit.layout.color,
                      textAlign: inlineEdit.layout.align,
                    }}
                    onChange={(e) => updateInlineEdit(e.target.value)}
                    onBlur={commitInlineEdit}
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setInlineEdit(null);
                      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="stage-empty">
          <div
            className="stage-empty__box"
            style={{ aspectRatio: `${outputSize.width} / ${outputSize.height}`, maxHeight: "min(60vh, 520px)" }}
          >
            <ImagePlus size={40} strokeWidth={1.5} />
            <p className="stage-empty__title">이미지를 불러와 편집을 시작하세요</p>
            <p className="stage-empty__hint">PNG 또는 JPEG · 최대 15MB · 이 영역에 파일을 끌어다 놓아도 됩니다</p>
            <div className="stage-empty__actions">
              <button type="button" className="btn btn--primary" onClick={editor.requestImageFile}>
                파일 선택
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => editor.setBackground({ type: "color" })}>
                <PaintBucket size={15} /> 단색 배경으로 시작
              </button>
            </div>
            {editor.uploadError && <p className="stage-empty__error">{editor.uploadError}</p>}
          </div>
        </div>
      )}

      {dragOver && (
        <div className="stage-drop-hint" aria-hidden="true">
          여기에 놓으면 이미지를 불러옵니다
        </div>
      )}

      {canRender && (
        <div className="zoom-bar" role="group" aria-label="확대/축소">
          <button type="button" className="icon-btn" onClick={editor.zoomOut} disabled={zoom <= ZOOM_MIN} aria-label="축소" title="축소">
            <Minus size={16} />
          </button>
          <button type="button" className="zoom-bar__value" onClick={editor.zoomFit} title="화면에 맞추기" aria-label={`현재 확대율 ${zoomPercent}%. 클릭하면 화면에 맞춥니다`}>
            {zoomPercent}%
          </button>
          <button type="button" className="icon-btn" onClick={editor.zoomIn} disabled={zoom >= ZOOM_MAX} aria-label="확대" title="확대">
            <Plus size={16} />
          </button>
          <button type="button" className="icon-btn" onClick={editor.zoomFit} aria-label="화면에 맞추기" title="화면에 맞추기">
            <Maximize2 size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
