import { useCallback, useEffect, useRef, useState } from "react";

export interface LoadedImage {
  element: HTMLImageElement;
  naturalWidth: number;
  naturalHeight: number;
  fileName: string;
}

/**
 * 선택한 이미지 파일을 브라우저 안에서만(Object URL) 로드한다.
 * 서버로 전송하지 않는다.
 */
export function useImageFromFile() {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const load = useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        objectUrlRef.current = url;
        setImage({
          element: img,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          fileName: file.name,
        });
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("이미지를 불러오는 중 문제가 발생했습니다. 파일이 손상되었을 수 있습니다."));
      };
      img.src = url;
    });
  }, []);

  const clear = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setImage(null);
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  return { image, load, clear };
}
