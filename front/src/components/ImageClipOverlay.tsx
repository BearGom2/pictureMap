import { useEffect, useMemo, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { RegionFeature, ImageItem } from "../types";
import { projectMergedPath, projectMultiPolygonToPath } from "../utils/geo";

type Props = {
  map: MapLibreMap;
  features: RegionFeature[]; // 단일 or 집계
  images: ImageItem[];
  maskId: string;
  intervalMs?: number; // 전환 간격(효과 없음, 즉시 변경)
  viewportKey: string; // 줌/센터가 바뀔 때마다 달라지는 키
};

export default function ImageClipOverlay({
  map,
  features,
  images,
  maskId,
  intervalMs = 2500,
  viewportKey,
}: Props) {
  const [idx, setIdx] = useState(0);

  // 이미지가 2장 이상일 때만 회전 타이머
  useEffect(() => {
    if (images.length <= 1) return;
    const t = window.setInterval(() => {
      setIdx((v) => (v + 1) % images.length);
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [images.length, intervalMs]);

  // ⚠️ 리스트 길이가 바뀌면 idx를 안전한 범위로 클램프
  useEffect(() => {
    if (images.length === 0) {
      setIdx(0);
    } else {
      setIdx((v) => v % images.length);
    }
  }, [images.length]);

  // ⚠️ 다른 영역(마스크)이면 첫 장부터 시작
  useEffect(() => {
    setIdx(0);
  }, [maskId]);

  const geom = useMemo(() => {
    if (features.length === 0)
      return { d: "", left: 0, top: 0, width: 0, height: 0 };
    if (features.length === 1)
      return projectMultiPolygonToPath(map, features[0]);
    return projectMergedPath(map, features);
    // viewportKey는 의도적으로 dependency에 포함됩니다(지도 이동/줌 반영)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, features, viewportKey]);

  // 안전한 현재 이미지 선택
  const current =
    images.length > 0 ? images[Math.min(idx, images.length - 1)] : undefined;

  if (!current || geom.width < 2 || geom.height < 2 || !geom.d) return null;

  // 컨테이너 기준 absolute + 가장자리 bleed로 틈 메우기
  const BLEED = 2;
  const left = geom.left - BLEED / 2;
  const top = geom.top - BLEED / 2;
  const width = geom.width + BLEED;
  const height = geom.height + BLEED;
  const pathTranslate = `translate(${BLEED / 2}, ${BLEED / 2})`;

  return (
    <div
      className="pointer-events-none absolute z-[100]"
      style={{ left, top, width, height }}
    >
      <svg width={width} height={height} className="absolute inset-0">
        <defs>
          <clipPath id={maskId} clipPathUnits="userSpaceOnUse">
            <path
              d={geom.d}
              transform={pathTranslate}
              fill="white"
              fillRule="evenodd"
            />
          </clipPath>
        </defs>
        <image
          href={current.url}
          x={0}
          y={0}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${maskId})`}
        />
      </svg>
    </div>
  );
}
