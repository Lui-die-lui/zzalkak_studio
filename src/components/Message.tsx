interface MessageProps {
  kind: "error" | "success" | "info";
  children: React.ReactNode;
}

const PREFIX: Record<MessageProps["kind"], string> = {
  error: "[오류]",
  success: "[완료]",
  info: "[안내]",
};

/** 색상만으로 구분하지 않도록 항상 문장 접두어를 함께 표시한다. */
export function Message({ kind, children }: MessageProps) {
  return (
    <p className={`message message--${kind}`} role={kind === "error" ? "alert" : "status"}>
      <strong>{PREFIX[kind]}</strong> {children}
    </p>
  );
}
