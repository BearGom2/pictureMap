import type { Map as MapLibreMap } from "maplibre-gl";
import { MAP_LEVEL_THRESHOLDS } from "../config/map";
import { LABEL_SOURCE_LAYERS, EPS } from "./constants";

export function addLabelLayers(map: MapLibreMap): void {
  // 시도
  map.addLayer({
    id: "sido-label",
    type: "symbol",
    source: "adm_lbl",
    "source-layer": LABEL_SOURCE_LAYERS.sido,
    maxzoom: MAP_LEVEL_THRESHOLDS.SGG_ZOOM_MIN + EPS,
    layout: {
      "text-field": ["coalesce", ["get", "sidonm"], ["get", "sido"]],
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 4, 11, 7.5, 14],
      "text-allow-overlap": false,
      "text-ignore-placement": false,
      "text-variable-anchor": ["center", "top", "bottom", "left", "right"],
      "text-radial-offset": 0.25,
      "text-padding": 2,
      "symbol-sort-key": ["-", ["coalesce", ["get", "area_m2"], 0]],
    },
    paint: {
      "text-color": "#334155",
      "text-halo-color": "#fff",
      "text-halo-width": 1.6,
    },
  });

  // 시군구
  map.addLayer({
    id: "sgg-label",
    type: "symbol",
    source: "adm_lbl",
    "source-layer": LABEL_SOURCE_LAYERS.sgg,
    minzoom: MAP_LEVEL_THRESHOLDS.SGG_ZOOM_MIN - EPS,
    maxzoom: MAP_LEVEL_THRESHOLDS.DONG_ZOOM_MIN + EPS,
    layout: {
      "text-field": ["coalesce", ["get", "sggnm"], ["get", "sgg"]],
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 8, 11, 11.5, 13],
      "text-allow-overlap": false,
      "text-ignore-placement": false,
      "text-variable-anchor": ["center", "top", "bottom", "left", "right"],
      "text-radial-offset": 0.25,
      "text-padding": 2,
      "symbol-sort-key": ["-", ["coalesce", ["get", "area_m2"], 0]],
    },
    paint: {
      "text-color": "#1f2937",
      "text-halo-color": "#fff",
      "text-halo-width": 1.4,
    },
  });

  // 동
  map.addLayer({
    id: "dong-label",
    type: "symbol",
    source: "adm_lbl",
    "source-layer": LABEL_SOURCE_LAYERS.dong,
    minzoom: MAP_LEVEL_THRESHOLDS.DONG_ZOOM_MIN - EPS,
    layout: {
      "text-field": ["coalesce", ["get", "adm_nm"], ["get", "adm_cd"]],
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 12, 11, 15, 14],
      "text-allow-overlap": false,
      "text-ignore-placement": false,
      "text-variable-anchor": ["center", "top", "bottom", "left", "right"],
      "text-radial-offset": 0.25,
      "text-padding": 1.5,
    },
    paint: {
      "text-color": "#111827",
      "text-halo-color": "#fff",
      "text-halo-width": 1.2,
    },
  });
}
