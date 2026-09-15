import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  Copy,
  FlipHorizontal,
  Replace,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect } from "react";
import type { EditorApi } from "../editor/useEditor";
import { FONT_SIZE_MAX, FONT_SIZE_MIN, LINE_HEIGHT_MAX, LINE_HEIGHT_MIN, STICKER_MAX_WIDTH_PERCENT, STICKER_MIN_WIDTH_PERCENT } from "../lib/constants";
import { buildFontStack, FONT_OPTIONS } from "../lib/fonts";
import { getStickerAsset, stickerSrc } from "../lib/stickers";
import { TEXT_BLOCK_KEYS, TEXT_BLOCK_LABELS, type StickerInstance, type TextAlign, type TextBlockKey } from "../lib/types";

interface PropertiesPanelProps {
  editor: EditorApi;
}

export function PropertiesPanel({ editor }: PropertiesPanelProps) {
  const { selection } = editor;

  // 도구 검색 등에서 요청한 입력으로 포커스 이동
  useEffect(() => {
    const id = editor.consumeFocusRequest();
    if (!id) return;
    const el = document.getElementById(id) as HTMLElement | null;
    if (el) {
      el.focus();
      if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
        try {
          el.select();
        } catch {
          // range/color 등 select를 지원하지 않는 입력은 무시
        }
      }
    }
  });

  let title = "속성";
  let body: React.ReactNode;

  if (selection.kind === "text") {
    title = `${TEXT_BLOCK_LABELS[selection.key]} 속성`;
    body = <TextProperties editor={editor} blockKey={selection.key} />;
  } else if (selection.kind === "sticker") {
    const sticker = editor.settings.stickers.find((s) => s.id === selection.id);
    title = "스티커 속성";
    body = sticker ? <StickerProperties editor={editor} sticker={sticker} /> : <NoSelection editor={editor} />;
  } else if (selection.kind === "background") {
    title = "배경 속성";
    body = <BackgroundProperties editor={editor} />;
  } else {
    body = <NoSelection editor={editor} />;
  }

  return (
    <div className="props">
      <div className="props__head">
        <h2 className="props__title">{title}</h2>
        {selection.kind !== "none" && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => editor.select({ kind: "none" })}>
            선택 해제
          </button>
        )}
      </div>
      <div className="props__body">{body}</div>
    </div>
  );
}

// ---------- 텍스트 ----------

const ALIGN_OPTIONS: { value: TextAlign; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { value: "left", label: "왼쪽 정렬", icon: AlignLeft },
  { value: "center", label: "가운데 정렬", icon: AlignCenter },
  { value: "right", label: "오른쪽 정렬", icon: AlignRight },
];

function TextProperties({ editor, blockKey }: { editor: EditorApi; blockKey: TextBlockKey }) {
  const block = editor.settings[blockKey];
  const { settings } = editor;
  const patch = (partial: Partial<typeof block>, key?: string) =>
    editor.patchBlock(blockKey, partial, key ? { coalesceKey: `${blockKey}.${key}` } : undefined);

  return (
    <>
      <div className="field">
        <label htmlFor={`${blockKey}-text`} className="field__label">문구 내용</label>
        <textarea
          id={`${blockKey}-text`}
          rows={3}
          value={block.text}
          onChange={(e) => patch({ text: e.target.value }, "text")}
          placeholder={`${TEXT_BLOCK_LABELS[blockKey]}을 입력하세요. 비워두면 표시되지 않습니다.`}
          style={{ fontFamily: buildFontStack(block.fontId) }}
        />
      </div>

      <div className="field">
        <label htmlFor={`${blockKey}-font`} className="field__label">글꼴</label>
        <select
          id={`${blockKey}-font`}
          value={block.fontId}
          onChange={(e) => patch({ fontId: e.target.value })}
          style={{ fontFamily: buildFontStack(block.fontId) }}
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font.id} value={font.id} style={{ fontFamily: buildFontStack(font.id) }}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field field--split">
        <div>
          <label htmlFor={`${blockKey}-size`} className="field__label">글자 크기</label>
          <div className="range-row">
            <input
              id={`${blockKey}-size`}
              type="range"
              min={FONT_SIZE_MIN}
              max={FONT_SIZE_MAX}
              value={block.fontSize}
              onChange={(e) => patch({ fontSize: Number(e.target.value) }, "fontSize")}
            />
            <input
              type="number"
              className="num"
              aria-label="글자 크기(px)"
              min={FONT_SIZE_MIN}
              max={FONT_SIZE_MAX}
              value={block.fontSize}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) patch({ fontSize: Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, v)) }, "fontSize");
              }}
            />
          </div>
        </div>
        <div>
          <label htmlFor={`${blockKey}-color`} className="field__label">글자 색상</label>
          <div className="color-row">
            <input id={`${blockKey}-color`} type="color" value={block.color} onChange={(e) => patch({ color: e.target.value }, "color")} />
            <span className="color-row__value">{block.color.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="field">
        <span className="field__label" id={`${blockKey}-align-label`}>정렬</span>
        <div className="segmented segmented--full" role="radiogroup" aria-labelledby={`${blockKey}-align-label`}>
          {ALIGN_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={block.align === opt.value}
                aria-label={opt.label}
                title={opt.label}
                className={`segmented__item${block.align === opt.value ? " is-active" : ""}`}
                onClick={() => patch({ align: opt.value })}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="field">
        <label htmlFor={`${blockKey}-lineheight`} className="field__label">줄 간격 <span className="field__value">{block.lineHeight.toFixed(2)}</span></label>
        <input
          id={`${blockKey}-lineheight`}
          type="range"
          min={LINE_HEIGHT_MIN}
          max={LINE_HEIGHT_MAX}
          step={0.05}
          value={block.lineHeight}
          onChange={(e) => patch({ lineHeight: Number(e.target.value) }, "lineHeight")}
        />
      </div>

      <hr className="divider" />

      <p className="field-hint">위치는 제목·소제목·본문 묶음 전체에 적용됩니다. 캔버스에서 문구를 직접 드래그해도 됩니다.</p>
      <div className="field field--split">
        <div>
          <label htmlFor="text-x" className="field__label">X 위치 <span className="field__value">{settings.xPercent}%</span></label>
          <input
            id="text-x"
            type="range"
            min={0}
            max={100}
            value={settings.xPercent}
            onChange={(e) => editor.setTextPosition(Number(e.target.value), settings.yPercent, { coalesceKey: "text.x" })}
          />
        </div>
        <div>
          <label htmlFor="text-y" className="field__label">Y 위치 <span className="field__value">{settings.yPercent}%</span></label>
          <input
            id="text-y"
            type="range"
            min={0}
            max={100}
            value={settings.yPercent}
            onChange={(e) => editor.setTextPosition(settings.xPercent, Number(e.target.value), { coalesceKey: "text.y" })}
          />
        </div>
      </div>

      <hr className="divider" />

      <button type="button" className="btn btn--danger-ghost btn--block" onClick={() => editor.clearTextBlock(blockKey)} disabled={block.text === ""}>
        <Trash2 size={15} /> {TEXT_BLOCK_LABELS[blockKey]} 텍스트 삭제 <kbd className="kbd">Del</kbd>
      </button>
    </>
  );
}

// ---------- 스티커 ----------

function StickerProperties({ editor, sticker }: { editor: EditorApi; sticker: StickerInstance }) {
  const asset = getStickerAsset(sticker.stickerId);
  const update = (partial: Partial<StickerInstance>, key?: string) =>
    editor.updateSticker(sticker.id, partial, key ? { coalesceKey: `sticker.${sticker.id}.${key}` } : undefined);
  const index = editor.settings.stickers.findIndex((s) => s.id === sticker.id);
  const total = editor.settings.stickers.length;

  return (
    <>
      <div className="sticker-head">
        {asset && <img className="sticker-head__thumb" src={stickerSrc(asset)} alt="" />}
        <div>
          <div className="sticker-head__name">{asset?.name ?? "스티커"}</div>
          <div className="sticker-head__meta">{asset?.category} · 레이어 {index + 1} / {total}</div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="sticker-size" className="field__label">크기 <span className="field__value">{sticker.widthPercent.toFixed(0)}%</span></label>
        <input
          id="sticker-size"
          type="range"
          min={STICKER_MIN_WIDTH_PERCENT}
          max={STICKER_MAX_WIDTH_PERCENT}
          value={sticker.widthPercent}
          onChange={(e) => update({ widthPercent: Number(e.target.value) }, "width")}
        />
      </div>

      <div className="field">
        <label htmlFor="sticker-rotation" className="field__label">회전 <span className="field__value">{sticker.rotation}°</span></label>
        <div className="range-row">
          <input
            id="sticker-rotation"
            type="range"
            min={0}
            max={359}
            value={sticker.rotation}
            onChange={(e) => update({ rotation: Number(e.target.value) }, "rotation")}
          />
          <input
            type="number"
            className="num"
            aria-label="회전 각도"
            min={0}
            max={359}
            value={sticker.rotation}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) update({ rotation: ((Math.round(v) % 360) + 360) % 360 }, "rotation");
            }}
          />
        </div>
      </div>

      <div className="field field--split">
        <div>
          <label htmlFor="sticker-x" className="field__label">X 위치 <span className="field__value">{sticker.xPercent.toFixed(0)}%</span></label>
          <input id="sticker-x" type="range" min={0} max={100} value={sticker.xPercent} onChange={(e) => update({ xPercent: Number(e.target.value) }, "x")} />
        </div>
        <div>
          <label htmlFor="sticker-y" className="field__label">Y 위치 <span className="field__value">{sticker.yPercent.toFixed(0)}%</span></label>
          <input id="sticker-y" type="range" min={0} max={100} value={sticker.yPercent} onChange={(e) => update({ yPercent: Number(e.target.value) }, "y")} />
        </div>
      </div>

      <div className="row-actions">
        <button type="button" className={`btn btn--secondary${sticker.flipX ? " is-active" : ""}`} aria-pressed={sticker.flipX} onClick={() => update({ flipX: !sticker.flipX })}>
          <FlipHorizontal size={15} /> 좌우 반전
        </button>
        <button type="button" className="btn btn--secondary" onClick={() => editor.duplicateSticker(sticker.id)}>
          <Copy size={15} /> 복제
        </button>
      </div>

      <hr className="divider" />

      <span className="field__label">레이어 순서</span>
      <div className="row-actions row-actions--4">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => editor.moveStickerLayer(sticker.id, "back")} disabled={index === 0} title="맨 뒤로">
          <ArrowDownToLine size={14} /> 맨 뒤
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => editor.moveStickerLayer(sticker.id, "down")} disabled={index === 0} title="뒤로">
          <ChevronDown size={14} /> 뒤로
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => editor.moveStickerLayer(sticker.id, "up")} disabled={index === total - 1} title="앞으로">
          <ChevronUp size={14} /> 앞으로
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => editor.moveStickerLayer(sticker.id, "front")} disabled={index === total - 1} title="맨 앞으로">
          <ArrowUpToLine size={14} /> 맨 앞
        </button>
      </div>
      <p className="field-hint">스티커는 배경 이미지 위, 문구 아래에 그려집니다.</p>

      <hr className="divider" />

      <button type="button" className="btn btn--danger-ghost btn--block" onClick={() => editor.removeSticker(sticker.id)}>
        <Trash2 size={15} /> 스티커 삭제 <kbd className="kbd">Del</kbd>
      </button>
    </>
  );
}

// ---------- 배경 (이미지 또는 단색) ----------

function BackgroundProperties({ editor }: { editor: EditorApi }) {
  const { image, settings } = editor;
  const type = settings.background.type;

  return (
    <>
      <div className="segmented segmented--full" role="radiogroup" aria-label="배경 종류">
        <button
          type="button"
          role="radio"
          aria-checked={type === "image"}
          className={`segmented__item${type === "image" ? " is-active" : ""}`}
          onClick={() => editor.setBackground({ type: "image" })}
        >
          이미지
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={type === "color"}
          className={`segmented__item${type === "color" ? " is-active" : ""}`}
          onClick={() => editor.setBackground({ type: "color" })}
        >
          단색
        </button>
      </div>

      {type === "color" ? (
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="background-color" className="field__label">배경 색상</label>
          <div className="color-row">
            <input
              id="background-color"
              type="color"
              value={settings.background.color}
              onChange={(e) => editor.setBackground({ color: e.target.value }, { coalesceKey: "background.color" })}
            />
            <span className="color-row__value">{settings.background.color.toUpperCase()}</span>
          </div>
          <p className="field-hint">사진 없이 단색 배경으로 카드를 만듭니다. 문구·스티커는 그대로 사용할 수 있습니다.</p>
        </div>
      ) : image ? (
        <>
          <div className="kv" style={{ marginTop: 14 }}>
            <div className="kv__row"><span className="kv__key">파일명</span><span className="kv__val" title={image.fileName}>{image.fileName}</span></div>
            <div className="kv__row"><span className="kv__key">원본 크기</span><span className="kv__val">{image.naturalWidth} × {image.naturalHeight}px</span></div>
            <div className="kv__row"><span className="kv__key">출력 크기</span><span className="kv__val">{editor.outputSize.width} × {editor.outputSize.height}px</span></div>
          </div>
          <p className="field-hint">채우기 방식: 선택한 화면비를 가득 채우도록(cover) 비율을 유지한 채 확대·중앙 배치되며, 넘치는 부분은 잘립니다. 다운로드 파일에는 원본의 위치 정보(EXIF/GPS)가 포함되지 않습니다.</p>
          <hr className="divider" />
          <div className="row-actions">
            <button type="button" className="btn btn--secondary" onClick={editor.requestImageFile}>
              <Replace size={15} /> 이미지 교체
            </button>
            <button type="button" className="btn btn--danger-ghost" onClick={editor.removeImage}>
              <Trash2 size={15} /> 이미지 제거
            </button>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 14 }}>
          <p className="field-hint">아직 이미지가 없습니다. 사진을 불러오거나 단색 배경으로 바꿔보세요.</p>
          <button type="button" className="btn btn--secondary btn--block" style={{ marginTop: 8 }} onClick={editor.requestImageFile}>
            <Upload size={15} /> 이미지 업로드
          </button>
        </div>
      )}
    </>
  );
}

// ---------- 선택 없음 ----------

function NoSelection({ editor }: { editor: EditorApi }) {
  const { settings, outputSize, image } = editor;
  const textCount = TEXT_BLOCK_KEYS.filter((k) => settings[k].text !== "").length;
  const hasBackground = settings.background.type === "color" || Boolean(image);
  const backgroundLabel =
    settings.background.type === "color" ? `단색 (${settings.background.color.toUpperCase()})` : image ? image.fileName : "없음";
  return (
    <>
      <ol className="guide-steps">
        <li className={hasBackground ? "is-done" : "is-current"}>
          왼쪽 <strong>이미지</strong> 도구에서 사진을 불러오거나 단색 배경을 선택하세요.
        </li>
        <li className={hasBackground && textCount > 0 ? "is-done" : hasBackground ? "is-current" : ""}>
          캔버스의 문구를 클릭하거나 <strong>텍스트</strong> 도구에서 항목을 골라 내용과 글꼴을 바꾸세요.
        </li>
        <li>필요하면 <strong>스티커</strong>를 얹고 화면비를 고른 뒤 <strong>PNG 다운로드</strong>를 누르세요.</li>
      </ol>
      <hr className="divider" />
      <div className="kv">
        <div className="kv__row"><span className="kv__key">화면비</span><span className="kv__val">{settings.ratio}</span></div>
        <div className="kv__row"><span className="kv__key">출력 해상도</span><span className="kv__val">{outputSize.width} × {outputSize.height}px</span></div>
        <div className="kv__row"><span className="kv__key">문구 블록</span><span className="kv__val">{textCount} / 3 사용 중</span></div>
        <div className="kv__row"><span className="kv__key">스티커</span><span className="kv__val">{settings.stickers.length}개</span></div>
        <div className="kv__row"><span className="kv__key">배경</span><span className="kv__val">{backgroundLabel}</span></div>
      </div>
    </>
  );
}
