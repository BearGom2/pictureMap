import type { Geometry, MultiPolygon, Position } from "geojson";
import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";
import type { RegionFeature, RegionProperties } from "../types";
import { MAP_LEVEL_THRESHOLDS as T } from "../config/map";

export type Level = "sido" | "sgg" | "dong";

export function levelByZoom(z: number): Level {
  if (z >= T.DONG_ZOOM_MIN) return "dong";
  if (z >= T.SGG_ZOOM_MIN) return "sgg";
  return "sido";
}

export function groupKeyOf(props: RegionProperties, level: Level): string {
  if (level === "sido") return String(props.sido);
  if (level === "sgg") return String(props.sgg);
  return String(props.adm_cd);
}

/** Polygon 또는 MultiPolygon을 MultiPolygon으로 정규화 */
export function polygonToMultiPolygon(geom: Geometry): MultiPolygon {
  if (geom.type === "MultiPolygon") return geom;
  if (geom.type === "Polygon") {
    return { type: "MultiPolygon", coordinates: [geom.coordinates] };
  }
  throw new Error(`Unsupported geometry type: ${geom.type}`);
}

export function toRegionFeature(f: MapGeoJSONFeature): RegionFeature | null {
  if (!f.geometry) return null;

  const p = (f.properties ?? null) as Record<string, unknown> | null;
  const admNm = String(p?.adm_nm ?? "");
  const sgg = String(p?.sgg ?? "");
  const sido = String(p?.sido ?? "");

  // adm_cd 우선, 없으면 adm_cd2로 대체
  const admCdRaw =
    (p?.adm_cd as string | undefined) ?? (p?.adm_cd2 as string | undefined);
  const admCd = admCdRaw ? String(admCdRaw) : "";

  if (!admCd) return null; // 핵심 키 없으면 스킵

  const geom = polygonToMultiPolygon(f.geometry as Geometry);

  const props: RegionProperties = {
    adm_nm: admNm,
    adm_cd: admCd,
    sgg,
    sido,

    // 선택 속성은 있으면 보존
    adm_cd2: p?.adm_cd2 ? String(p.adm_cd2) : undefined,
    sggnm: p?.sggnm ? String(p.sggnm) : undefined,
    sidonm: p?.sidonm ? String(p.sidonm) : undefined,
    area_m2: typeof p?.area_m2 === "number" ? (p.area_m2 as number) : undefined,
  };

  return { type: "Feature", properties: props, geometry: geom };
}

/* ========================= 월드 래핑 보정 유틸 ========================= */

/** 현재 줌에서 픽셀 기준 월드 폭(한 복제본의 폭) */
function worldSizePx(map: MapLibreMap): number {
  // MapLibre는 기본적으로 512px 타일 기준으로 worldSize = 512 * 2^zoom
  return 512 * Math.pow(2, map.getZoom());
}

/** x를 centerX에 가장 가까운 복제본으로 이동시킨 정규화 x */
function normalizeXToCenter(
  x: number,
  centerX: number,
  worldSize: number
): number {
  const k = Math.round((x - centerX) / worldSize);
  return x - k * worldSize;
}

/** 하나의 링을 로컬 좌표 path로 변환(월드 정규화 포함) */
function pathForRingNormalized(
  map: MapLibreMap,
  ring: Position[],
  left: number,
  top: number,
  centerX: number,
  worldSize: number
): string {
  if (ring.length === 0) return "";
  const p0 = map.project([ring[0][0], ring[0][1]]);
  const x0 = normalizeXToCenter(p0.x, centerX, worldSize);
  let path = `M ${x0 - left} ${p0.y - top} `;
  for (let i = 1; i < ring.length; i++) {
    const p = map.project([ring[i][0], ring[i][1]]);
    const xi = normalizeXToCenter(p.x, centerX, worldSize);
    path += `L ${xi - left} ${p.y - top} `;
  }
  return path + "Z ";
}

/* ========================= 패스/바운딩박스 계산 ========================= */

export function projectMultiPolygonToPath(
  map: MapLibreMap,
  feature: RegionFeature
): { d: string; left: number; top: number; width: number; height: number } {
  const coords = feature.geometry.coordinates;

  const ws = worldSizePx(map);
  const centerX = map.project(map.getCenter()).x;

  // 1) 월드 정규화 후 bbox 계산
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const polygon of coords) {
    for (const ring of polygon) {
      for (const [lng, lat] of ring) {
        const p = map.project([lng, lat]);
        const x = normalizeXToCenter(p.x, centerX, ws);
        if (x < minX) minX = x;
        if (p.y < minY) minY = p.y;
        if (x > maxX) maxX = x;
        if (p.y > maxY) maxY = p.y;
      }
    }
  }

  const left = Math.floor(minX);
  const top = Math.floor(minY);
  const width = Math.ceil(maxX - minX);
  const height = Math.ceil(maxY - minY);

  if (width < 1 || height < 1) {
    return { d: "", left, top, width, height };
  }

  // 2) 동일한 정규화 기준으로 path 생성
  let d = "";
  for (const polygon of coords) {
    for (const ring of polygon) {
      if (ring.length === 0) continue;
      d += pathForRingNormalized(map, ring, left, top, centerX, ws);
    }
  }

  return { d, left, top, width, height };
}

export function projectMergedPath(
  map: MapLibreMap,
  features: RegionFeature[]
): { d: string; left: number; top: number; width: number; height: number } {
  const ws = worldSizePx(map);
  const centerX = map.project(map.getCenter()).x;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const f of features) {
    for (const polygon of f.geometry.coordinates) {
      for (const ring of polygon) {
        for (const [lng, lat] of ring) {
          const p = map.project([lng, lat]);
          const x = normalizeXToCenter(p.x, centerX, ws);
          if (x < minX) minX = x;
          if (p.y < minY) minY = p.y;
          if (x > maxX) maxX = x;
          if (p.y > maxY) maxY = p.y;
        }
      }
    }
  }

  const left = Math.floor(minX);
  const top = Math.floor(minY);
  const width = Math.ceil(maxX - minX);
  const height = Math.ceil(maxY - minY);

  if (width < 1 || height < 1) {
    return { d: "", left, top, width, height };
  }

  let d = "";
  for (const f of features) {
    for (const polygon of f.geometry.coordinates) {
      for (const ring of polygon) {
        if (ring.length === 0) continue;
        d += pathForRingNormalized(map, ring, left, top, centerX, ws);
      }
    }
  }
  return { d, left, top, width, height };
}
