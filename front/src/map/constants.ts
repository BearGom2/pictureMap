import type { StyleSpecification } from "maplibre-gl";

export const PMTILES_POLY_FILE = "admin_poly.pmtiles";
export const PMTILES_LABEL_FILE = "admin_label.pmtiles";

export const LABEL_SOURCE_LAYERS = {
  sido: "sido_label",
  sgg: "sgg_label",
  dong: "dong_label",
} as const;

// 줌 경계 빈틈( max는 미만(<), min은 이상(>=) )
export const EPS = 0.001;

// 한글 glyphs 서버 경로는 환경에 맞게 바꿔도 됩니다.
export function baseStyle(
  glyphs = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
): StyleSpecification {
  return {
    version: 8,
    glyphs,
    sources: {},
    layers: [
      {
        id: "bg",
        type: "background",
        paint: { "background-color": "#f4f7fb" },
      },
    ],
  };
}
