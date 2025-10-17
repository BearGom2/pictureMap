// src/config/map.ts
export const MAP_LEVEL_THRESHOLDS = {
  DONG_ZOOM_MIN: 12,
  SGG_ZOOM_MIN: 8,
};

export const PMTILES_URL_FILE = "admin.pmtiles"; // public/ 아래 파일명
export const PMTILES_LAYERS = {
  dong: "dong",
  sgg: "sgg",
  sido: "sido",
} as const;
