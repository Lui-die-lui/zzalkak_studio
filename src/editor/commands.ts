import type { EditorApi } from "./useEditor";
import { TEXT_BLOCK_KEYS, type TextBlockKey } from "../lib/types";

export interface Command {
  id: string;
  title: string;
  description: string;
  keywords: string;
  group: "이미지" | "텍스트" | "스티커" | "화면비" | "템플릿" | "파일" | "편집" | "보기";
  run: () => void;
  disabled?: boolean;
}

/** 선택된 문구 블록이 있으면 그것을, 없으면 내용이 있는 첫 블록 또는 본문을 고른다. */
function pickTextBlock(editor: EditorApi): TextBlockKey {
  if (editor.selection.kind === "text") return editor.selection.key;
  return TEXT_BLOCK_KEYS.find((k) => editor.settings[k].text !== "") ?? "body";
}

function focusTextField(editor: EditorApi, key: TextBlockKey, field: "text" | "font" | "size" | "color") {
  editor.openTool("text");
  editor.select({ kind: "text", key });
  editor.requestFocus(`${key}-${field}`);
}

export function buildCommands(editor: EditorApi): Command[] {
  const hasImage = Boolean(editor.image);
  const firstEmpty = TEXT_BLOCK_KEYS.find((k) => editor.settings[k].text === "") ?? null;

  return [
    {
      id: "image.upload",
      title: "이미지 업로드",
      description: "PNG 또는 JPEG 이미지를 불러옵니다.",
      keywords: "image upload 사진 불러오기 파일 열기",
      group: "이미지",
      run: () => {
        editor.openTool("image");
        editor.requestImageFile();
      },
    },
    {
      id: "image.replace",
      title: "이미지 교체",
      description: "현재 배경 이미지를 다른 파일로 바꿉니다.",
      keywords: "image replace 교체 바꾸기",
      group: "이미지",
      disabled: !hasImage,
      run: () => {
        editor.openTool("image");
        editor.requestImageFile();
      },
    },
    {
      id: "background.color",
      title: "단색 배경으로 전환",
      description: "사진 없이 단색 배경만으로 카드를 만듭니다.",
      keywords: "background color 배경 단색 색상 solid 사진없이",
      group: "이미지",
      disabled: editor.settings.background.type === "color",
      run: () => {
        editor.openTool("image");
        editor.setBackground({ type: "color" });
      },
    },
    {
      id: "background.image",
      title: "이미지 배경으로 전환",
      description: "단색 대신 사진을 배경으로 사용합니다.",
      keywords: "background image 배경 이미지 사진",
      group: "이미지",
      disabled: editor.settings.background.type === "image",
      run: () => {
        editor.openTool("image");
        editor.setBackground({ type: "image" });
      },
    },
    {
      id: "text.add",
      title: "텍스트 추가",
      description: firstEmpty ? "비어 있는 문구 항목을 열어 내용을 입력합니다." : "세 항목을 모두 사용 중입니다.",
      keywords: "text add 문구 추가 새 텍스트",
      group: "텍스트",
      disabled: !firstEmpty,
      run: () => firstEmpty && focusTextField(editor, firstEmpty, "text"),
    },
    { id: "text.title", title: "제목 편집", description: "제목 문구의 내용을 편집합니다.", keywords: "title 제목 헤드라인", group: "텍스트", run: () => focusTextField(editor, "title", "text") },
    { id: "text.subtitle", title: "소제목 편집", description: "소제목 문구의 내용을 편집합니다.", keywords: "subtitle 소제목 부제", group: "텍스트", run: () => focusTextField(editor, "subtitle", "text") },
    { id: "text.body", title: "본문 편집", description: "본문 문구의 내용을 편집합니다.", keywords: "body 본문 내용", group: "텍스트", run: () => focusTextField(editor, "body", "text") },
    {
      id: "text.size",
      title: "글자 크기 변경",
      description: "선택한 문구의 글자 크기 슬라이더로 이동합니다.",
      keywords: "font size 크기 글씨 폰트 사이즈",
      group: "텍스트",
      run: () => focusTextField(editor, pickTextBlock(editor), "size"),
    },
    {
      id: "text.color",
      title: "글자 색상 변경",
      description: "선택한 문구의 색상 선택기로 이동합니다.",
      keywords: "font color 색 색상 컬러",
      group: "텍스트",
      run: () => focusTextField(editor, pickTextBlock(editor), "color"),
    },
    {
      id: "text.font",
      title: "글꼴 변경",
      description: "선택한 문구의 글꼴 목록으로 이동합니다.",
      keywords: "font family 글꼴 폰트 서체",
      group: "텍스트",
      run: () => focusTextField(editor, pickTextBlock(editor), "font"),
    },
    {
      id: "text.position",
      title: "문구 위치 변경",
      description: "문구 묶음의 X/Y 위치 슬라이더로 이동합니다.",
      keywords: "position move 위치 이동 좌표",
      group: "텍스트",
      run: () => {
        editor.openTool("text");
        editor.select({ kind: "text", key: pickTextBlock(editor) });
        editor.requestFocus("text-x");
      },
    },
    {
      id: "sticker.add",
      title: "스티커 추가",
      description: "스티커 패널을 열어 3D 스티커를 고릅니다.",
      keywords: "sticker 스티커 이모지 장식 꾸미기",
      group: "스티커",
      run: () => editor.openTool("sticker"),
    },
    { id: "ratio.1x1", title: "1:1 화면비", description: "정사각형 비율(1080×1080)로 변경합니다.", keywords: "ratio square 정사각형 1:1 피드", group: "화면비", run: () => editor.setRatio("1:1") },
    { id: "ratio.4x5", title: "4:5 화면비", description: "세로 피드 비율(1080×1350)로 변경합니다.", keywords: "ratio 4:5 세로 인스타 게시물", group: "화면비", run: () => editor.setRatio("4:5") },
    { id: "ratio.9x16", title: "9:16 화면비", description: "세로형 스토리 비율(1080×1920)로 변경합니다.", keywords: "ratio 9:16 스토리 릴스 쇼츠 세로", group: "화면비", run: () => editor.setRatio("9:16") },
    {
      id: "template.save",
      title: "템플릿 저장",
      description: "현재 편집 상태를 새 템플릿으로 저장합니다.",
      keywords: "template save 템플릿 저장 프리셋",
      group: "템플릿",
      run: () => {
        editor.openTool("template");
        window.setTimeout(() => document.getElementById("template-name")?.focus(), 0);
      },
    },
    {
      id: "template.load",
      title: "템플릿 불러오기",
      description: "저장된 템플릿 목록을 열어 하나를 적용합니다.",
      keywords: "template load 템플릿 불러오기 적용",
      group: "템플릿",
      run: () => editor.openTool("template"),
    },
    {
      id: "template.manage",
      title: "템플릿 관리",
      description: "템플릿 이름 변경·업데이트·삭제를 관리합니다.",
      keywords: "template manage 템플릿 관리 편집 삭제",
      group: "템플릿",
      run: () => editor.openTool("template"),
    },
    {
      id: "json.import",
      title: "JSON 가져오기",
      description: "내보낸 템플릿 JSON 파일을 불러옵니다.",
      keywords: "json import 가져오기 복원 파일",
      group: "파일",
      run: () => editor.setIoModalOpen(true),
    },
    {
      id: "json.export",
      title: "JSON 내보내기",
      description: "저장된 템플릿 전체를 JSON 파일로 내려받습니다.",
      keywords: "json export 내보내기 백업",
      group: "파일",
      run: () => editor.setIoModalOpen(true),
    },
    {
      id: "file.download",
      title: "PNG 다운로드",
      description: editor.canDownload ? "현재 캔버스를 PNG 파일로 저장합니다." : "이미지를 불러오거나 단색 배경을 선택해야 합니다.",
      keywords: "download png export 다운로드 저장 내려받기",
      group: "파일",
      disabled: !editor.canDownload,
      run: () => void editor.download(),
    },
    { id: "edit.undo", title: "실행 취소", description: "마지막 변경을 되돌립니다. (Ctrl+Z)", keywords: "undo 실행취소 되돌리기", group: "편집", disabled: !editor.canUndo, run: editor.undo },
    { id: "edit.redo", title: "다시 실행", description: "되돌린 변경을 다시 적용합니다. (Ctrl+Shift+Z)", keywords: "redo 다시실행", group: "편집", disabled: !editor.canRedo, run: editor.redo },
    { id: "view.zoomIn", title: "확대", description: "캔버스를 확대합니다.", keywords: "zoom in 확대 크게", group: "보기", run: editor.zoomIn },
    { id: "view.zoomOut", title: "축소", description: "캔버스를 축소합니다.", keywords: "zoom out 축소 작게", group: "보기", run: editor.zoomOut },
    { id: "view.zoomFit", title: "화면에 맞추기", description: "캔버스 전체가 보이도록 배율을 되돌립니다.", keywords: "zoom fit 맞춤 100%", group: "보기", run: editor.zoomFit },
  ];
}

export function filterCommands(commands: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  if (q === "") return commands;
  return commands.filter((c) => `${c.title} ${c.description} ${c.keywords} ${c.group}`.toLowerCase().includes(q));
}
