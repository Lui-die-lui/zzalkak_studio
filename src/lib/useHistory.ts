import { useCallback, useRef, useState } from "react";

const MAX_HISTORY = 100;
/** 같은 coalesceKey로 이 시간 안에 연속 변경되면 하나의 실행 취소 단위로 묶는다. */
const COALESCE_WINDOW_MS = 700;

export interface ApplyOptions {
  /** 슬라이더 드래그처럼 연속되는 변경을 하나로 묶기 위한 키 */
  coalesceKey?: string;
}

export function useHistory<T>(initial: T) {
  const [present, setPresentState] = useState<T>(initial);
  const presentRef = useRef<T>(initial);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const lastKeyRef = useRef<string | null>(null);
  const lastTimeRef = useRef(0);
  const [, force] = useState(0);
  const bump = () => force((n) => n + 1);

  const setPresent = (next: T) => {
    presentRef.current = next;
    setPresentState(next);
  };

  const apply = useCallback((updater: T | ((prev: T) => T), options?: ApplyOptions) => {
    const prev = presentRef.current;
    const next = typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
    if (Object.is(next, prev)) return;

    const now = Date.now();
    const key = options?.coalesceKey ?? null;
    const coalesce = key !== null && key === lastKeyRef.current && now - lastTimeRef.current < COALESCE_WINDOW_MS;

    if (!coalesce) {
      pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), prev];
      futureRef.current = [];
    }
    lastKeyRef.current = key;
    lastTimeRef.current = now;
    setPresent(next);
  }, []);

  /** 실행 취소 기록을 남기지 않고 현재 상태를 교체한다 (초기 로드 등) */
  const reset = useCallback((next: T) => {
    pastRef.current = [];
    futureRef.current = [];
    lastKeyRef.current = null;
    setPresent(next);
    bump();
  }, []);

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    pastRef.current = past.slice(0, -1);
    futureRef.current = [presentRef.current, ...futureRef.current];
    lastKeyRef.current = null;
    setPresent(prev);
  }, []);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (future.length === 0) return;
    const next = future[0];
    futureRef.current = future.slice(1);
    pastRef.current = [...pastRef.current, presentRef.current];
    lastKeyRef.current = null;
    setPresent(next);
  }, []);

  return {
    present,
    apply,
    reset,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
