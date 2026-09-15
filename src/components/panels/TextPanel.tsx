import { Plus } from "lucide-react";
import type { EditorApi } from "../../editor/useEditor";
import { getFontOption } from "../../lib/fonts";
import { TEXT_BLOCK_KEYS, TEXT_BLOCK_LABELS, type TextBlockKey } from "../../lib/types";

export function TextPanel({ editor }: { editor: EditorApi }) {
  const { settings, selection } = editor;
  const firstEmpty = TEXT_BLOCK_KEYS.find((key) => settings[key].text === "") ?? null;

  const focusBlock = (key: TextBlockKey) => {
    editor.select({ kind: "text", key });
    editor.requestFocus(`${key}-text`);
  };

  return (
    <div className="panel-body">
      <p className="panel-desc">제목·소제목·본문 중 필요한 것만 사용하세요. 항목을 누르면 속성 패널(모바일은 하단 "속성" 탭)에서 내용과 글꼴을 바꿀 수 있습니다.</p>

      <ul className="block-list">
        {TEXT_BLOCK_KEYS.map((key) => {
          const block = settings[key];
          const empty = block.text === "";
          const active = selection.kind === "text" && selection.key === key;
          return (
            <li key={key}>
              <button
                type="button"
                className={`block-item${active ? " is-active" : ""}${empty ? " is-empty" : ""}`}
                onClick={() => focusBlock(key)}
                aria-pressed={active}
              >
                <span className="block-item__label">{TEXT_BLOCK_LABELS[key]}</span>
                <span className="block-item__preview">{empty ? "비어 있음 · 눌러서 추가" : block.text.split("\n")[0]}</span>
                <span className="block-item__meta">{getFontOption(block.fontId).label.replace(/\s*\(.*\)$/, "")} · {block.fontSize}px</span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="btn btn--secondary btn--block"
        onClick={() => firstEmpty && focusBlock(firstEmpty)}
        disabled={!firstEmpty}
        title={firstEmpty ? `${TEXT_BLOCK_LABELS[firstEmpty]} 추가` : "세 항목을 모두 사용 중입니다"}
      >
        <Plus size={16} /> 문구 추가
      </button>
      {!firstEmpty && <p className="field-hint">제목·소제목·본문을 모두 사용 중입니다. 항목을 선택해 내용을 수정하세요.</p>}
    </div>
  );
}
