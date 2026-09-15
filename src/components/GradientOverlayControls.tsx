import type { EditorApi } from "../editor/useEditor";
import type { GradientDirection } from "../lib/types";

const DIRECTIONS: { value: GradientDirection; label: string; arrow: string }[] = [
  { value: "top", label: "위", arrow: "↓" },
  { value: "bottom", label: "아래", arrow: "↑" },
  { value: "left", label: "왼쪽", arrow: "→" },
  { value: "right", label: "오른쪽", arrow: "←" },
];

function previewGradient(direction: GradientDirection, color: string, opacity: number): string {
  const cssDirection = {
    top: "to bottom",
    bottom: "to top",
    left: "to right",
    right: "to left",
  }[direction];
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, "0");
  return `linear-gradient(${cssDirection}, ${color}${alpha} 0%, ${color}${alpha} 16%, ${color}00 68%)`;
}

export function GradientOverlayControls({ editor, idPrefix }: { editor: EditorApi; idPrefix: string }) {
  const overlay = editor.settings.gradientOverlay;
  const opacityPercent = Math.round(overlay.opacity * 100);

  return (
    <section className="gradient-controls" aria-labelledby={`${idPrefix}-gradient-title`}>
      <div className="gradient-controls__head">
        <div>
          <strong id={`${idPrefix}-gradient-title`}>투명 그라데이션 필터</strong>
          <span>배경 위 · 스티커와 문구 아래</span>
        </div>
        <label className="switch" title={overlay.enabled ? "필터 끄기" : "필터 켜기"}>
          <input
            type="checkbox"
            role="switch"
            checked={overlay.enabled}
            onChange={(e) => editor.setGradientOverlay({ enabled: e.target.checked })}
          />
          <span className="switch__track" aria-hidden="true" />
          {/* <span className="sr-only">그라데이션 필터 사용</span> */}
        </label>
      </div>

      <div
        className="gradient-preview"
        aria-hidden="true"
        style={{ backgroundImage: `${previewGradient(overlay.direction, overlay.color, overlay.opacity)}, repeating-conic-gradient(#d9dce3 0% 25%, #ffffff 0% 50%)` }}
      />

      <div className={`gradient-controls__body${overlay.enabled ? "" : " is-disabled"}`}>
        <div className="field">
          <span className="field__label">색상이 시작되는 방향</span>
          <div className="gradient-directions" role="radiogroup" aria-label="그라데이션 방향">
            {DIRECTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={overlay.direction === item.value}
                disabled={!overlay.enabled}
                className={`gradient-direction${overlay.direction === item.value ? " is-active" : ""}`}
                onClick={() => editor.setGradientOverlay({ direction: item.value })}
              >
                <span aria-hidden="true">{item.arrow}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor={`${idPrefix}-gradient-color`} className="field__label">필터 색상</label>
          <div className="color-row">
            <input
              id={`${idPrefix}-gradient-color`}
              type="color"
              value={overlay.color}
              disabled={!overlay.enabled}
              onChange={(e) => editor.setGradientOverlay({ color: e.target.value }, { coalesceKey: "gradient.color" })}
            />
            <span className="color-row__value">{overlay.color.toUpperCase()}</span>
          </div>
        </div>

        <div className="field">
          <label htmlFor={`${idPrefix}-gradient-opacity`} className="field__label">
            필터 강도 <span className="field__value">{opacityPercent}%</span>
          </label>
          <input
            id={`${idPrefix}-gradient-opacity`}
            type="range"
            min={0}
            max={100}
            step={1}
            value={opacityPercent}
            disabled={!overlay.enabled}
            onChange={(e) => editor.setGradientOverlay({ opacity: Number(e.target.value) / 100 }, { coalesceKey: "gradient.opacity" })}
          />
        </div>
      </div>
    </section>
  );
}
