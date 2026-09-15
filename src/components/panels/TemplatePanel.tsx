import { Check, Download, Pencil, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { EditorApi } from "../../editor/useEditor";
import type { Template } from "../../lib/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TemplatePanel({ editor }: { editor: EditorApi }) {
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const handleSave = () => {
    if (editor.saveAsTemplate(newName)) setNewName("");
  };

  const startRename = (t: Template) => {
    setRenamingId(t.id);
    setRenameValue(t.name);
  };

  const confirmRename = (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) editor.renameTemplate(id, trimmed);
    setRenamingId(null);
  };

  const handleDelete = (t: Template) => {
    const confirmed = window.confirm(`"${t.name}" 템플릿을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`);
    if (confirmed) editor.removeTemplate(t.id);
  };

  return (
    <div className="panel-body">
      <p className="panel-desc">현재 문구·글꼴·스티커·화면비를 템플릿으로 저장해 두고 다시 불러올 수 있습니다. 이미지는 저장되지 않으므로 불러온 뒤 다시 선택하세요.</p>

      <div className="field">
        <label htmlFor="template-name" className="field__label">새 템플릿 이름</label>
        <div className="inline-row">
          <input
            id="template-name"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            placeholder="예: 여름 세일 카드"
          />
          <button type="button" className="btn btn--primary" onClick={handleSave}>
            <Save size={15} /> 저장
          </button>
        </div>
      </div>

      {editor.templates.length === 0 ? (
        <p className="field-hint">아직 저장된 템플릿이 없습니다. 이름을 입력하고 저장해 보세요.</p>
      ) : (
        <ul className="template-list">
          {editor.templates.map((t) => {
            const selected = t.id === editor.selectedTemplateId;
            return (
              <li key={t.id} className={`template-item${selected ? " is-selected" : ""}`}>
                {renamingId === t.id ? (
                  <div className="inline-row">
                    <input
                      aria-label={`${t.name} 새 이름`}
                      type="text"
                      value={renameValue}
                      autoFocus
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmRename(t.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                    />
                    <button type="button" className="icon-btn" onClick={() => confirmRename(t.id)} aria-label="이름 저장" title="저장">
                      <Check size={16} />
                    </button>
                    <button type="button" className="icon-btn" onClick={() => setRenamingId(null)} aria-label="이름 변경 취소" title="취소">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="template-item__head">
                      <span className="template-item__name">{t.name}</span>
                      {selected && <span className="badge">사용 중</span>}
                    </div>
                    <div className="template-item__meta">{t.ratio} · 수정 {formatDate(t.updatedAt)}</div>
                    <div className="template-item__actions">
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => editor.loadTemplate(t.id)}>
                        <Download size={14} /> 불러오기
                      </button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => editor.updateTemplateWithCurrent(t.id)} title="현재 편집 상태로 이 템플릿을 덮어씁니다">
                        <Save size={14} /> 현재 설정으로 업데이트
                      </button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => startRename(t)}>
                        <Pencil size={14} /> 이름 변경
                      </button>
                      <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => handleDelete(t)}>
                        <Trash2 size={14} /> 삭제
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
