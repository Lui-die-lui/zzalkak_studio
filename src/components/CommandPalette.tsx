import { CornerDownLeft, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildCommands, filterCommands } from "../editor/commands";
import type { EditorApi } from "../editor/useEditor";

interface CommandPaletteProps {
  editor: EditorApi;
}

export function CommandPalette({ editor }: CommandPaletteProps) {
  const open = editor.paletteOpen;
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const commands = useMemo(() => buildCommands(editor), [editor]);
  const results = useMemo(() => filterCommands(commands, query), [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, results]);

  if (!open) return null;

  const close = () => editor.setPaletteOpen(false);

  const runAt = (index: number) => {
    const cmd = results[index];
    if (!cmd || cmd.disabled) return;
    close();
    cmd.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(activeIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  return (
    <div className="modal-backdrop modal-backdrop--top" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="도구 또는 기능 검색" onKeyDown={onKeyDown}>
        <label className="palette__search">
          <Search size={17} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="도구, 기능 또는 명령 검색"
            aria-label="도구, 기능 또는 명령 검색"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={results[activeIndex] ? `palette-item-${results[activeIndex].id}` : undefined}
            autoComplete="off"
            autoFocus
          />
          <kbd className="kbd">Esc</kbd>
        </label>
        <ul ref={listRef} id="palette-results" className="palette__list" role="listbox">
          {results.length === 0 && <li className="palette__empty">"{query}"에 맞는 기능이 없습니다.</li>}
          {results.map((cmd, index) => (
            <li
              key={cmd.id}
              id={`palette-item-${cmd.id}`}
              data-index={index}
              role="option"
              aria-selected={index === activeIndex}
              aria-disabled={cmd.disabled || undefined}
              className={`palette__item${index === activeIndex ? " is-active" : ""}${cmd.disabled ? " is-disabled" : ""}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAt(index)}
            >
              <span className="palette__group">{cmd.group}</span>
              <span className="palette__text">
                <span className="palette__title">{cmd.title}</span>
                <span className="palette__desc">{cmd.description}</span>
              </span>
              {index === activeIndex && !cmd.disabled && <CornerDownLeft size={14} className="palette__enter" aria-hidden="true" />}
            </li>
          ))}
        </ul>
        <div className="palette__foot">
          <span><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> 이동</span>
          <span><kbd className="kbd">Enter</kbd> 실행</span>
          <span><kbd className="kbd">Esc</kbd> 닫기</span>
        </div>
      </div>
    </div>
  );
}
