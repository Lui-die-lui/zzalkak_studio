import type { EditorApi } from "../../editor/useEditor";
import { OUTPUT_SIZES, RATIO_DESCRIPTIONS, RATIOS } from "../../lib/constants";

export function RatioPanel({ editor }: { editor: EditorApi }) {
  return (
    <div className="panel-body">
      <p className="panel-desc">출력 크기를 고릅니다. 이미지는 선택한 비율을 가득 채우도록 잘리고, 문구·스티커 위치는 비율 좌표로 유지됩니다.</p>
      <div className="ratio-list" role="radiogroup" aria-label="화면비">
        {RATIOS.map((ratio) => {
          const size = OUTPUT_SIZES[ratio];
          const active = editor.settings.ratio === ratio;
          return (
            <button
              key={ratio}
              type="button"
              role="radio"
              aria-checked={active}
              className={`ratio-card${active ? " is-active" : ""}`}
              onClick={() => editor.setRatio(ratio)}
            >
              <span className="ratio-card__thumb" style={{ aspectRatio: `${size.width} / ${size.height}` }} aria-hidden="true" />
              <span className="ratio-card__text">
                <span className="ratio-card__name">{ratio}</span>
                <span className="ratio-card__desc">{RATIO_DESCRIPTIONS[ratio]}</span>
                <span className="ratio-card__size">{size.width} × {size.height}px</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
