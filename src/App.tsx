import { Settings2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import { CommandPalette } from "./components/CommandPalette";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ImportExportModal } from "./components/ImportExportModal";
import { ImagePanel } from "./components/panels/ImagePanel";
import { RatioPanel } from "./components/panels/RatioPanel";
import { StickerPanel } from "./components/panels/StickerPanel";
import { TemplatePanel } from "./components/panels/TemplatePanel";
import { TextPanel } from "./components/panels/TextPanel";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { Stage } from "./components/Stage";
import { ToastViewport } from "./components/Toast";
import { ToolSidebar, TOOLS } from "./components/ToolSidebar";
import { Topbar } from "./components/Topbar";
import { useEditor, type ToolId } from "./editor/useEditor";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

const PANEL_TITLES: Record<Exclude<ToolId, "io">, string> = {
  image: "이미지",
  text: "텍스트",
  sticker: "스티커",
  ratio: "화면비",
  template: "템플릿",
};

export default function App() {
  const editor = useEditor();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isMac = useMemo(() => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform), []);

  // ---------- 전역 단축키 ----------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        editor.setPaletteOpen(!editor.paletteOpen);
        return;
      }
      if (editor.paletteOpen || editor.ioModalOpen) return;
      const editable = isEditableTarget(e.target);

      if (mod && !editable && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      if (mod && !editable && e.key.toLowerCase() === "y") {
        e.preventDefault();
        editor.redo();
        return;
      }
      if (editable) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (editor.selection.kind === "sticker") {
          e.preventDefault();
          editor.removeSticker(editor.selection.id);
          return;
        }
        if (editor.selection.kind === "text") {
          e.preventDefault();
          editor.clearTextBlock(editor.selection.key);
          return;
        }
      }
      if (mod && e.key.toLowerCase() === "d" && editor.selection.kind === "sticker") {
        e.preventDefault();
        editor.duplicateSticker(editor.selection.id);
        return;
      }
      if (e.key === "Escape") {
        if (editor.selection.kind !== "none") editor.select({ kind: "none" });
        else if (editor.activeTool) editor.openTool(null);
        return;
      }
      if (e.key.startsWith("Arrow") && editor.selection.kind !== "none" && editor.selection.kind !== "background") {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        if (editor.selection.kind === "text") {
          editor.setTextPosition(editor.settings.xPercent + dx, editor.settings.yPercent + dy, { coalesceKey: "nudge-text" });
        } else {
          const s = editor.settings.stickers.find((st) => st.id === (editor.selection as { id: string }).id);
          if (s) editor.updateSticker(s.id, { xPercent: s.xPercent + dx, yPercent: s.yPercent + dy }, { coalesceKey: `nudge-${s.id}` });
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editor, isMac]);

  const activePanelTool = editor.activeTool && editor.activeTool !== "io" ? editor.activeTool : null;
  const panelTitle = activePanelTool ? PANEL_TITLES[activePanelTool] : "";
  const panelDescription = activePanelTool ? TOOLS.find((t) => t.id === activePanelTool)?.description : "";

  const renderPanel = () => {
    switch (activePanelTool) {
      case "image":
        return <ImagePanel editor={editor} />;
      case "text":
        return <TextPanel editor={editor} />;
      case "sticker":
        return <StickerPanel editor={editor} />;
      case "ratio":
        return <RatioPanel editor={editor} />;
      case "template":
        return <TemplatePanel editor={editor} />;
      default:
        return null;
    }
  };

  // 모바일에서는 도구 시트와 속성 시트 중 하나만 보여 캔버스 공간을 확보한다.
  const showPropsSheet = isMobile && editor.propsSheetOpen && !activePanelTool;

  return (
    <ErrorBoundary>
      <div className={`app-shell${isMobile ? " app-shell--mobile" : ""}${editor.propsPanelOpen ? "" : " app-shell--props-collapsed"}`}>
        <Topbar editor={editor} isMac={isMac} />

        <div className="workspace">
          <ToolSidebar editor={editor} />

          {activePanelTool && (
            <aside className={`tool-panel${isMobile ? " sheet" : ""}`} aria-label={`${panelTitle} 도구 패널`}>
              <div className="tool-panel__head">
                <div>
                  <h2 className="tool-panel__title">{panelTitle}</h2>
                  <p className="tool-panel__desc">{panelDescription}</p>
                </div>
                <button type="button" className="icon-btn" onClick={() => editor.openTool(null)} aria-label="도구 패널 닫기">
                  <X size={18} />
                </button>
              </div>
              <div className="tool-panel__scroll">{renderPanel()}</div>
            </aside>
          )}

          <main className="stage-area" aria-label="작업 캔버스">
            <Stage editor={editor} />
          </main>

          {!isMobile && editor.propsPanelOpen && (
            <aside className="props-panel" aria-label="속성 패널">
              <PropertiesPanel editor={editor} />
            </aside>
          )}

          {showPropsSheet && (
            <aside className="props-panel sheet" aria-label="속성 패널">
              <div className="sheet__handle-row">
                <button type="button" className="icon-btn" onClick={() => editor.setPropsSheetOpen(false)} aria-label="속성 닫기">
                  <X size={18} />
                </button>
              </div>
              <PropertiesPanel editor={editor} />
            </aside>
          )}
        </div>

        {isMobile && (
          <nav className="bottom-bar" aria-label="도구">
            {TOOLS.filter((t) => t.id !== "io").map((tool) => {
              const Icon = tool.icon;
              const active = editor.activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  className={`bottom-bar__item${active ? " is-active" : ""}`}
                  onClick={() => {
                    editor.setPropsSheetOpen(false);
                    editor.toggleTool(tool.id);
                  }}
                  aria-pressed={active}
                >
                  <Icon size={20} strokeWidth={1.75} />
                  <span>{tool.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              className={`bottom-bar__item${editor.propsSheetOpen ? " is-active" : ""}`}
              onClick={() => {
                editor.openTool(null);
                editor.setPropsSheetOpen(!editor.propsSheetOpen);
              }}
              aria-pressed={editor.propsSheetOpen}
            >
              <Settings2 size={20} strokeWidth={1.75} />
              <span>속성</span>
            </button>
          </nav>
        )}

        {/* 명령 팔레트/모달/토스트 */}
        <CommandPalette editor={editor} />
        <ImportExportModal editor={editor} />
        <ToastViewport toasts={editor.toasts} onDismiss={editor.dismissToast} />

        {/* 이미지 선택용 숨김 입력 (도구 패널·빈 상태·명령 팔레트가 공유) */}
        <input
          ref={editor.imageInputRef}
          id="image-file-input"
          type="file"
          accept="image/png,image/jpeg"
          className="visually-hidden"
          aria-label="PNG 또는 JPEG 이미지 선택"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void editor.acceptImageFile(file);
            e.target.value = "";
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
