import type { Map as MapLibreMap } from "maplibre-gl";
import { MAP_LEVEL_THRESHOLDS, PMTILES_LAYERS } from "../config/map";

export function addBoundaryLayers(map: MapLibreMap): void {
  map.addLayer({
    id: "sido-fill",
    type: "fill",
    source: "adm",
    "source-layer": PMTILES_LAYERS.sido,
    maxzoom: MAP_LEVEL_THRESHOLDS.SGG_ZOOM_MIN,
    paint: { "fill-color": "#00B5D6", "fill-opacity": 0.12 },
  });
  map.addLayer({
    id: "sido-line",
    type: "line",
    source: "adm",
    "source-layer": PMTILES_LAYERS.sido,
    maxzoom: MAP_LEVEL_THRESHOLDS.SGG_ZOOM_MIN,
    paint: { "line-color": "#111827", "line-width": 1.2 },
  });

  map.addLayer({
    id: "sgg-fill",
    type: "fill",
    source: "adm",
    "source-layer": PMTILES_LAYERS.sgg,
    minzoom: MAP_LEVEL_THRESHOLDS.SGG_ZOOM_MIN,
    maxzoom: MAP_LEVEL_THRESHOLDS.DONG_ZOOM_MIN,
    paint: { "fill-color": "#00B5D6", "fill-opacity": 0.12 },
  });
  map.addLayer({
    id: "sgg-line",
    type: "line",
    source: "adm",
    "source-layer": PMTILES_LAYERS.sgg,
    minzoom: MAP_LEVEL_THRESHOLDS.SGG_ZOOM_MIN,
    maxzoom: MAP_LEVEL_THRESHOLDS.DONG_ZOOM_MIN,
    paint: { "line-color": "#2563eb", "line-width": 0.8 },
  });

  map.addLayer({
    id: "dong-fill",
    type: "fill",
    source: "adm",
    "source-layer": PMTILES_LAYERS.dong,
    minzoom: MAP_LEVEL_THRESHOLDS.DONG_ZOOM_MIN,
    paint: { "fill-color": "#00B5D6", "fill-opacity": 0.12 },
  });
  map.addLayer({
    id: "dong-line",
    type: "line",
    source: "adm",
    "source-layer": PMTILES_LAYERS.dong,
    minzoom: MAP_LEVEL_THRESHOLDS.DONG_ZOOM_MIN,
    paint: {
      "line-color": "#000",
      "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.8, 14, 1.2],
    },
  });

  // 지도 로딩 후 추가: 가장 위에 하이라이트용 fill 레이어를 만든다.
  map.addLayer({
    id: "dong-hover",
    type: "fill",
    source: "adm",
    "source-layer": PMTILES_LAYERS.dong,
    minzoom: MAP_LEVEL_THRESHOLDS.DONG_ZOOM_MIN,
    paint: { "fill-color": "#2563eb", "fill-opacity": 0.4 },
    filter: ["==", "adm_cd", ""], // 초기에는 아무 것도 선택하지 않음
  });
  // 마우스 이동 이벤트 등록
  map.on("mousemove", "dong-fill", (e) => {
    const f = e.features?.[0] as maplibregl.MapGeoJSONFeature;
    if (f) {
      const admCd = f.properties?.adm_cd;
      // hover 레이어의 필터를 현재 adm_cd로 변경
      map.setFilter("dong-hover", ["==", "adm_cd", admCd]);
    }
  });
  map.on("mouseleave", "dong-fill", () => {
    // 마우스가 떠나면 필터 제거
    map.setFilter("dong-hover", ["==", "adm_cd", ""]);
  });

  map.addLayer({
    id: "sgg-hover",
    type: "fill",
    source: "adm",
    "source-layer": PMTILES_LAYERS.sgg,
    minzoom: MAP_LEVEL_THRESHOLDS.SGG_ZOOM_MIN,
    maxzoom: MAP_LEVEL_THRESHOLDS.DONG_ZOOM_MIN,
    paint: { "fill-color": "#2563eb", "fill-opacity": 0.4 },
    filter: ["==", "sgg", ""], // 초기에는 아무 것도 선택하지 않음
  });
  map.on("mousemove", "sgg-fill", (e) => {
    const f = e.features?.[0] as maplibregl.MapGeoJSONFeature;
    if (f) {
      const admCd = f.properties?.sgg;
      // hover 레이어의 필터를 현재 sgg로 변경
      map.setFilter("sgg-hover", ["==", "sgg", admCd]);
    }
  });
  map.on("mouseleave", "sgg-fill", () => {
    // 마우스가 떠나면 필터 제거
    map.setFilter("sgg-hover", ["==", "sgg", ""]);
  });

  map.addLayer({
    id: "sido-hover",
    type: "fill",
    source: "adm",
    "source-layer": PMTILES_LAYERS.sido,
    maxzoom: MAP_LEVEL_THRESHOLDS.SGG_ZOOM_MIN,
    paint: { "fill-color": "#2563eb", "fill-opacity": 0.4 },
    filter: ["==", "sido", ""], // 초기에는 아무 것도 선택하지 않음
  });
  map.on("mousemove", "sido-fill", (e) => {
    const f = e.features?.[0] as maplibregl.MapGeoJSONFeature;
    if (f) {
      const admCd = f.properties?.sido;
      // hover 레이어의 필터를 현재 sido로 변경
      map.setFilter("sido-hover", ["==", "sido", admCd]);
    }
  });
  map.on("mouseleave", "sido-fill", () => {
    // 마우스가 떠나면 필터 제거
    map.setFilter("sido-hover", ["==", "sido", ""]);
  });
}
