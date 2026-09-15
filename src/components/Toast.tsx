import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import type { Toast } from "../editor/useEditor";

interface ToastViewportProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

const PREFIX = {
  success: "완료",
  error: "오류",
  info: "안내",
} as const;

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-viewport" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div key={t.id} className={`toast toast--${t.kind}`} role={t.kind === "error" ? "alert" : "status"}>
            <Icon size={17} aria-hidden="true" />
            <span className="toast__text">
              <strong>{PREFIX[t.kind]}</strong> {t.text}
            </span>
            <button type="button" className="toast__close" onClick={() => onDismiss(t.id)} aria-label="알림 닫기">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
