import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { EditorApi } from "../../editor/useEditor";
import { searchStickers, STICKER_CATEGORIES, stickerSrc, type StickerCategory } from "../../lib/stickers";

type Filter = StickerCategory | "전체";
const FILTERS: Filter[] = ["전체", ...STICKER_CATEGORIES];

export function StickerPanel({ editor }: { editor: EditorApi }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("전체");
  const results = useMemo(() => searchStickers(query, filter), [query, filter]);
  // 사진이 없어도 단색 배경이면 스티커를 올릴 수 있다.
  const canPlaceSticker = editor.settings.background.type === "color" || Boolean(editor.image);

  return (
    <div className="panel-body panel-body--sticker">
      <p className="panel-desc">
        스티커를 누르면 캔버스 가운데에 추가됩니다. 추가한 스티커는 드래그로 옮기고, 모서리 손잡이로 크기와 회전을 조절할 수 있습니다.
        {!canPlaceSticker && " 먼저 이미지를 불러오거나 단색 배경을 선택해 주세요."}
      </p>

      <label className="search-field">
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="스티커 이름 검색 (예: 하트, 별, 웃음)"
          aria-label="스티커 검색"
        />
      </label>

      <div className="chip-row" role="radiogroup" aria-label="스티커 카테고리">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={filter === f}
            className={`chip${filter === f ? " is-active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <p className="field-hint">"{query}"에 맞는 스티커가 없습니다. 다른 이름이나 카테고리로 찾아보세요.</p>
      ) : (
        <div className="sticker-grid" role="list" aria-label="스티커 목록">
          {results.map((asset) => (
            <button
              key={asset.id}
              type="button"
              role="listitem"
              className="sticker-thumb"
              onClick={() => editor.addSticker(asset.id)}
              disabled={!canPlaceSticker}
              title={`${asset.name} · ${asset.category}`}
              aria-label={`${asset.name} 스티커 추가`}
            >
              <img src={stickerSrc(asset)} alt="" loading="lazy" decoding="async" />
              <span className="sticker-thumb__name">{asset.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
