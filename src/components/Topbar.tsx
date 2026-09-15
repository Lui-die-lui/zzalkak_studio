import { Download, FileJson, LayoutTemplate, PanelRight, Redo2, Search, Undo2 } from "lucide-react";
import type { EditorApi } from "../editor/useEditor";
import { RATIOS } from "../lib/constants";

interface TopbarProps {
  editor: EditorApi;
  isMac: boolean;
}

const SAVE_LABEL = {
  saved: "저장됨",
  saving: "저장 중",
  unsaved: "저장되지 않음",
} as const;

export function Topbar({ editor, isMac }: TopbarProps) {
  const workName = editor.selectedTemplate?.name ?? "제목 없는 카드";

  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="wordmark" aria-label="ZZALKAK Studio">
          <span className="wordmark__mark" aria-hidden="true">Z</span>
          <span className="wordmark__text">ZZALKAK Studio</span>
        </div>
        <div className="work-meta">
          <span className="work-meta__name" title={workName}>{workName}</span>
          <span className={`save-status save-status--${editor.saveStatus}`} role="status">
            <span className="save-status__dot" aria-hidden="true" />
            {SAVE_LABEL[editor.saveStatus]}
          </span>
        </div>
      </div>

      <div className="topbar__center">
        <div className="btn-group" role="group" aria-label="실행 취소/다시 실행">
          <button type="button" className="icon-btn" onClick={editor.undo} disabled={!editor.canUndo} aria-label="실행 취소" title={`실행 취소 (${isMac ? "⌘" : "Ctrl"}+Z)`}>
            <Undo2 size={17} />
          </button>
          <button type="button" className="icon-btn" onClick={editor.redo} disabled={!editor.canRedo} aria-label="다시 실행" title={`다시 실행 (${isMac ? "⌘⇧" : "Ctrl+Shift+"}Z)`}>
            <Redo2 size={17} />
          </button>
        </div>

        <div className="segmented" role="radiogroup" aria-label="화면비">
          {RATIOS.map((ratio) => (
            <button
              key={ratio}
              type="button"
              role="radio"
              aria-checked={editor.settings.ratio === ratio}
              className={`segmented__item${editor.settings.ratio === ratio ? " is-active" : ""}`}
              onClick={() => editor.setRatio(ratio)}
            >
              {ratio}
            </button>
          ))}
        </div>

        <button type="button" className="search-btn" onClick={() => editor.setPaletteOpen(true)} aria-label="도구 또는 기능 검색">
          <Search size={15} />
          <span className="search-btn__label">도구 또는 기능 검색</span>
          <kbd className="kbd">{isMac ? "⌘K" : "Ctrl K"}</kbd>
        </button>
      </div>

      <div className="topbar__right">
        <button
          type="button"
          className={`btn btn--ghost${editor.activeTool === "template" ? " is-active" : ""}`}
          onClick={() => editor.toggleTool("template")}
          aria-pressed={editor.activeTool === "template"}
        >
          <LayoutTemplate size={16} />
          <span className="btn__label">템플릿 관리</span>
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => editor.setIoModalOpen(true)}>
          <FileJson size={16} />
          <span className="btn__label">가져오기/내보내기</span>
        </button>
        <button
          type="button"
          className={`icon-btn topbar__props-toggle${editor.propsPanelOpen ? " is-active" : ""}`}
          onClick={() => editor.setPropsPanelOpen(!editor.propsPanelOpen)}
          aria-pressed={editor.propsPanelOpen}
          aria-label="속성 패널 열기/닫기"
          title="속성 패널"
        >
          <PanelRight size={17} />
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void editor.download()}
          disabled={!editor.canDownload}
          title={editor.canDownload ? "PNG로 다운로드" : "이미지를 불러오거나 단색 배경을 선택하세요"}
        >
          <Download size={16} />
          <span>PNG 다운로드</span>
        </button>
      </div>
    </header>
  );
}
