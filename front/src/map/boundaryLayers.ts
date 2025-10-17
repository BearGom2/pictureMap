import type { Map as MapLibreMap } from "maplibre-gl";
import { MAP_LEVEL_THRESHOLDS, PMTILES_LAYERS } from "../config/map";

export function addBoundaryLayers(map: MapLibreMap): void {
  map.addLayer({
    id: "sido-fill",
    type: "fill",
    source: "adm",
    "source-layer": PMTILES_LAYERS.sido,
    maxzoom: MAP_LEVEL_THRESHOLDS.SGG_ZOOM_MIN,
    paint: { "fill-opacity": 0 },
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
    paint: { "fill-opacity": 0 },
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
}
