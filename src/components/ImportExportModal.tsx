import { Download, FileJson, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { EditorApi } from "../editor/useEditor";
import {
  exportTemplatesFile,
  mergeImportedTemplates,
  validateImportData,
} from "../lib/templates";
import { Message } from "./Message";
import { Modal } from "./Modal";

interface ImportExportModalProps {
  editor: EditorApi;
}

export function ImportExportModal({ editor }: ImportExportModalProps) {
  const [message, setMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [importDone, setImportDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { templates } = editor;

  const close = () => {
    editor.setIoModalOpen(false);
    setMessage(null);
    setSelectedFileName(null);
    setImportDone(false);
  };

  const handleExport = () => {
    setImportDone(false);
    if (templates.length === 0) {
      setMessage({
        kind: "error",
        text: "내보낼 템플릿이 없습니다. 먼저 템플릿을 저장해 주세요.",
      });
      return;
    }
    const data = exportTemplatesFile(templates);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const pad = (n: number) => String(n).padStart(2, "0");
    const d = new Date();
    a.href = url;
    a.download = `zzalkak_templates_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setImportDone(false);
    setMessage({
      kind: "success",
      text: `템플릿 ${templates.length}개를 JSON 파일로 내보냈습니다.`,
    });
    editor.showToast("success", `템플릿 ${templates.length}개를 내보냈습니다.`);
  };

  const handleImportFile = async (file: File) => {
    setMessage(null);
    setImportDone(false);
    let text: string;
    try {
      text = await file.text();
    } catch {
      setMessage({ kind: "error", text: "파일을 읽을 수 없습니다." });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setMessage({
        kind: "error",
        text: "JSON 문법이 올바르지 않아 가져오기를 중단했습니다. 기존 템플릿과 현재 작업은 그대로 유지됩니다.",
      });
      return;
    }

    const validation = validateImportData(parsed);
    if (!validation.ok) {
      setMessage({
        kind: "error",
        text: `${validation.error} 가져오기를 중단했으며 기존 템플릿과 현재 작업은 그대로 유지됩니다.`,
      });
      return;
    }

    // 검증을 모두 통과한 뒤에만 localStorage/상태에 반영한다 (트랜잭션 방식).
    const beforeCount = templates.length;
    const { merged, imported, renamed } = mergeImportedTemplates(
      templates,
      validation.templates,
    );
    editor.replaceAllTemplates(merged);
    const summary = `${imported}개 템플릿을 가져왔습니다 (기존 ${beforeCount}개 → 총 ${merged.length}개).${
      renamed > 0 ? ` ID가 겹친 ${renamed}개는 새 이름으로 추가되었습니다.` : ""
    }`;
    setMessage({ kind: "success", text: summary });
    setImportDone(true);
    editor.showToast("success", `${imported}개 템플릿을 가져왔습니다.`);
  };

  return (
    <Modal
      open={editor.ioModalOpen}
      title="템플릿 가져오기 / 내보내기"
      onClose={close}
    >
      <section className="io-section">
        <h3 className="io-section__title">
          <Download size={16} /> JSON 내보내기
        </h3>
        <p className="io-section__desc">
          저장된 템플릿 전체({templates.length}개)를 JSON 파일 하나로
          내려받습니다. 이미지 파일은 포함되지 않습니다.
        </p>
        <div className="file-picker">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleExport}
            disabled={templates.length === 0}
          >
            <Download size={15} /> 템플릿 전체 JSON 내보내기
          </button>
          <span className="file-picker__name">
            템플릿 저장 후 내보내기 가능
          </span>
        </div>
      </section>

      <hr className="divider" />

      <section className="io-section">
        <h3 className="io-section__title">
          <Upload size={16} /> JSON 가져오기
        </h3>
        <p className="io-section__desc">
          내보낸 JSON 파일을 다시 불러옵니다. 파일 전체를 먼저 검증한 뒤에만
          반영하므로, 문법이 깨졌거나 필수 항목이 빠진 파일은 아무것도 바꾸지
          않고 거부됩니다. 같은 ID의 템플릿이 이미 있으면 기존 것을 덮어쓰지
          않고 새 항목으로 추가됩니다.
        </p>
        <label htmlFor="template-import-input" className="field__label">
          JSON 파일 선택
        </label>
        <div className="file-picker">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileJson size={15} /> 파일 선택
          </button>
          <span className="file-picker__name">
            {selectedFileName ?? "선택된 파일 없음"}
          </span>
          <input
            ref={fileInputRef}
            id="template-import-input"
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSelectedFileName(file.name);
                void handleImportFile(file);
              }
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
        </div>
      </section>

      {message && <Message kind={message.kind}>{message.text}</Message>}
      {importDone && (
        <button
          type="button"
          className="btn btn--primary btn--block"
          style={{ marginTop: 12 }}
          onClick={close}
        >
          확인하고 닫기
        </button>
      )}
    </Modal>
  );
}
