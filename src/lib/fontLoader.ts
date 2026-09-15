const readyFamilies = new Set<string>();

/**
 * 지정한 글꼴 family들이 실제로 로드될 때까지 기다린다. 미리보기와
 * 다운로드 직전 모두 이 함수를 거치게 해서, 웹폰트가 아직 준비되지
 * 않아 기본 폰트로 그려지는 것을 방지한다(미리보기/저장 파일 글꼴 불일치 방지).
 */
export async function ensureFontsLoaded(families: string[]): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;

  const targets = Array.from(new Set(families)).filter((f) => !readyFamilies.has(f));

  if (targets.length > 0) {
    try {
      await Promise.all(
        targets.flatMap((family) => [
          document.fonts.load(`400 60px "${family}"`),
          document.fonts.load(`700 60px "${family}"`),
        ]),
      );
      targets.forEach((f) => readyFamilies.add(f));
    } catch {
      // 폰트 로드에 실패해도 시스템 폴백 폰트로 계속 진행한다.
    }
  }

  try {
    await document.fonts.ready;
  } catch {
    // 일부 환경에서 Font Loading API가 불완전할 수 있으므로 무시한다.
  }
}
