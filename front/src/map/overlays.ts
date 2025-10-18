import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";
import { PMTILES_LAYERS } from "../config/map";
import {
  levelByZoom,
  toRegionFeature,
  polygonToMultiPolygon,
} from "../utils/geo";
import type { Geometry } from "geojson";
import type {
  Galleries,
  ImageItem,
  RegionFeature,
  RegionProperties,
  Viewport,
  OverlayEntry,
} from "../types";

// 상위 경계(시도/시군구) → RegionFeature
function makeRegionFeatureFromBoundary(
  f: MapGeoJSONFeature,
  level: "sgg" | "sido",
  id: string
): RegionFeature | null {
  if (!f.geometry) return null;
  const mp = polygonToMultiPolygon(f.geometry as Geometry);
  const p = f.properties as Record<string, unknown> | null;

  let props: RegionProperties;
  if (level === "sgg") {
    const sgg = String(p?.sgg ?? id);
    const sido = String(p?.sido ?? "");
    props = { adm_nm: "", adm_cd: `sgg:${sgg}`, sgg, sido };
  } else {
    const sido = String(p?.sido ?? id);
    props = { adm_nm: "", adm_cd: `sido:${sido}`, sgg: "", sido };
  }
  return { type: "Feature", properties: props, geometry: mp };
}

export function computeOverlays(
  map: MapLibreMap,
  galleries: Galleries,
  viewport: Viewport
): OverlayEntry[] {
  if (!map.getSource("adm")) return [];

  const level = levelByZoom(viewport.zoom);
  const getRenderedFeatures = (layerId: string): MapGeoJSONFeature[] => {
    if (!map.getLayer(layerId)) return [];
    try {
      return map.queryRenderedFeatures({
        layers: [layerId],
      }) as MapGeoJSONFeature[];
    } catch {
      return [];
    }
  };
  let loadedDongFeatures: MapGeoJSONFeature[] = [];
  try {
    loadedDongFeatures = map.querySourceFeatures("adm", {
      sourceLayer: PMTILES_LAYERS.dong,
    }) as MapGeoJSONFeature[];
  } catch {
    loadedDongFeatures = [];
  }

  const out: OverlayEntry[] = [];

  if (level === "dong") {
    const rendered = getRenderedFeatures("dong-fill");
    if (!rendered.length) return out;
    const byAdm = new Map<string, RegionFeature[]>();
    for (const f of rendered) {
      const rf = toRegionFeature(f);
      if (!rf) continue;
      const admCd = String(rf.properties.adm_cd);
      if (!byAdm.has(admCd)) byAdm.set(admCd, []);
      byAdm.get(admCd)!.push(rf);
    }
    for (const [admCd, feats] of byAdm.entries()) {
      const imgs = galleries[admCd] ?? [];
      if (imgs.length) out.push({ id: admCd, feats, imgs });
    }
    return out;
  }

  if (level === "sgg") {
    const sggRendered = getRenderedFeatures("sgg-fill");
    if (!sggRendered.length) return out;
    const bySgg = new Map<string, RegionFeature[]>();
    for (const f of sggRendered) {
      const p = f.properties as Record<string, unknown> | null;
      const sgg = String(p?.sgg ?? "");
      if (!sgg) continue;
      const rf = makeRegionFeatureFromBoundary(f, "sgg", sgg);
      if (!rf) continue;
      if (!bySgg.has(sgg)) bySgg.set(sgg, []);
      bySgg.get(sgg)!.push(rf);
    }
    for (const [sgg, feats] of bySgg.entries()) {
      const imgs: ImageItem[] = [];
      for (const df of loadedDongFeatures) {
        const p = df.properties as Record<string, unknown> | null;
        const dfSgg = p?.sgg !== undefined ? String(p.sgg) : "";
        const dfAdm = p?.adm_cd !== undefined ? String(p.adm_cd) : "";
        if (!dfSgg || !dfAdm) continue;
        if (dfSgg !== sgg) continue;
        const list = galleries[dfAdm];
        if (list?.length) imgs.push(...list);
      }
      if (imgs.length) out.push({ id: `sgg-${sgg}`, feats, imgs });
    }
    return out;
  }

  const sidoRendered = getRenderedFeatures("sido-fill");
  if (!sidoRendered.length) return out;
  const bySido = new Map<string, RegionFeature[]>();
  for (const f of sidoRendered) {
    const p = f.properties as Record<string, unknown> | null;
    const sido = String(p?.sido ?? "");
    if (!sido) continue;
    const rf = makeRegionFeatureFromBoundary(f, "sido", sido);
    if (!rf) continue;
    if (!bySido.has(sido)) bySido.set(sido, []);
    bySido.get(sido)!.push(rf);
  }
  for (const [sido, feats] of bySido.entries()) {
    const imgs: ImageItem[] = [];
    for (const df of loadedDongFeatures) {
      const p = df.properties as Record<string, unknown> | null;
      const dfSido = p?.sido !== undefined ? String(p.sido) : "";
      const dfAdm = p?.adm_cd !== undefined ? String(p.adm_cd) : "";
      if (!dfSido || !dfAdm) continue;
      if (dfSido !== sido) continue;
      const list = galleries[dfAdm];
      if (list?.length) imgs.push(...list);
    }
    if (imgs.length) out.push({ id: `sido-${sido}`, feats, imgs });
  }
  return out;
}
