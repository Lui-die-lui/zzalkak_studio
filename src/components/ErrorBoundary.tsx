import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** 예기치 못한 렌더링 오류가 전체 페이지를 깨뜨리지 않도록 격리한다. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ZZALKAK Studio 렌더링 오류:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <h2>문제가 발생했습니다</h2>
          <p>화면을 표시하는 중 오류가 발생했습니다. 새로고침 후 다시 시도해 주세요.</p>
          <button type="button" onClick={() => window.location.reload()}>
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
