import { Image as ImageIcon, PaintBucket, Replace, Trash2, Upload } from "lucide-react";
import type { EditorApi } from "../../editor/useEditor";
import { Message } from "../Message";

export function ImagePanel({ editor }: { editor: EditorApi }) {
  const { image, settings } = editor;
  const type = settings.background.type;

  return (
    <div className="panel-body">
      <p className="panel-desc">카드의 배경을 사진 또는 단색 중에서 고르세요. 사진은 서버로 전송되지 않고 브라우저 안에서만 처리됩니다.</p>

      <div className="segmented segmented--full" role="radiogroup" aria-label="배경 종류">
        <button
          type="button"
          role="radio"
          aria-checked={type === "image"}
          className={`segmented__item${type === "image" ? " is-active" : ""}`}
          onClick={() => editor.setBackground({ type: "image" })}
        >
          <ImageIcon size={14} /> 이미지
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={type === "color"}
          className={`segmented__item${type === "color" ? " is-active" : ""}`}
          onClick={() => editor.setBackground({ type: "color" })}
        >
          <PaintBucket size={14} /> 단색
        </button>
      </div>

      {type === "color" ? (
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="background-color-panel" className="field__label">배경 색상</label>
          <div className="color-row">
            <input
              id="background-color-panel"
              type="color"
              value={settings.background.color}
              onChange={(e) => editor.setBackground({ color: e.target.value }, { coalesceKey: "background.color" })}
            />
            <span className="color-row__value">{settings.background.color.toUpperCase()}</span>
          </div>
          <p className="field-hint">사진 없이 단색 배경만으로 카드를 완성할 수 있습니다. 문구·스티커·화면비는 그대로 사용됩니다.</p>
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          {image ? (
            <div className="file-card">
              <div className="file-card__name" title={image.fileName}>{image.fileName}</div>
              <div className="file-card__meta">{image.naturalWidth} × {image.naturalHeight}px · 캔버스를 가득 채움(cover)</div>
              <div className="row-actions">
                <button type="button" className="btn btn--secondary" onClick={editor.requestImageFile}>
                  <Replace size={15} /> 이미지 교체
                </button>
                <button type="button" className="btn btn--danger-ghost" onClick={editor.removeImage}>
                  <Trash2 size={15} /> 제거
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="upload-dropzone" onClick={editor.requestImageFile}>
              <Upload size={22} strokeWidth={1.75} />
              <span className="upload-dropzone__title">이미지 업로드</span>
              <span className="upload-dropzone__hint">클릭해서 파일 선택 또는 캔버스 영역에 끌어다 놓기</span>
            </button>
          )}

          <p className="field-hint">허용 형식: PNG, JPEG · 최대 15MB · 확장자만이 아니라 파일 형식(MIME)도 검사합니다.</p>
          {editor.uploadError && <Message kind="error">{editor.uploadError}</Message>}
        </div>
      )}
    </div>
  );
}
