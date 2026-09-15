import { FileJson, Image as ImageIcon, LayoutTemplate, Ratio as RatioIcon, Sticker, Type } from "lucide-react";
import type { EditorApi, ToolId } from "../editor/useEditor";

export interface ToolDefinition {
  id: ToolId;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  description: string;
}

export const TOOLS: ToolDefinition[] = [
  { id: "image", label: "이미지", icon: ImageIcon, description: "배경 사진 불러오기 또는 단색 배경 선택" },
  { id: "text", label: "텍스트", icon: Type, description: "제목·소제목·본문 문구 편집" },
  { id: "sticker", label: "스티커", icon: Sticker, description: "3D 스티커 추가" },
  { id: "ratio", label: "화면비", icon: RatioIcon, description: "1:1 · 4:5 · 9:16" },
  { id: "template", label: "템플릿", icon: LayoutTemplate, description: "저장된 템플릿 관리" },
  { id: "io", label: "가져오기", icon: FileJson, description: "JSON 가져오기/내보내기" },
];

interface ToolSidebarProps {
  editor: EditorApi;
}

export function ToolSidebar({ editor }: ToolSidebarProps) {
  const handleClick = (tool: ToolId) => {
    if (tool === "io") {
      editor.setIoModalOpen(true);
      return;
    }
    editor.toggleTool(tool);
  };

  return (
    <nav className="tool-sidebar" aria-label="도구">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const active = editor.activeTool === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            className={`tool-btn${active ? " is-active" : ""}`}
            onClick={() => handleClick(tool.id)}
            aria-pressed={active}
            aria-label={`${tool.label} 도구`}
            title={`${tool.label} — ${tool.description}`}
          >
            <Icon size={20} strokeWidth={1.75} />
            <span className="tool-btn__label">{tool.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
