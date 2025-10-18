import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import maplibregl, {
  Map as MapLibreMap,
  type MapGeoJSONFeature,
  type MapLibreEvent,
} from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";

import ImageClipOverlay from "./ImageClipOverlay";
import {
  baseStyle,
  PMTILES_LABEL_FILE,
  PMTILES_POLY_FILE,
} from "../map/constants";
import type { Galleries, ImageItem, Viewport } from "../types";
import { registerPmtilesSources } from "../map/pmtilesSource";
import { addBoundaryLayers } from "../map/boundaryLayers";
import { addLabelLayers } from "../map/labelLayers";
import { computeOverlays } from "../map/overlays";
import { MAP_LEVEL_THRESHOLDS } from "../config/map";
import { polygonToMultiPolygon } from "../utils/geo";

type BoundsTuple = [number, number, number, number];

type SidoRecord = {
  code: string;
  name: string;
  bounds: BoundsTuple;
};

type SggRecord = {
  code: string;
  name: string;
  sidoCode: string;
  bounds: BoundsTuple;
};

type DongRecord = {
  code: string;
  name: string;
  sidoCode: string;
  sggCode: string;
  bounds: BoundsTuple;
};

type RegionData = {
  sido: SidoRecord[];
  sgg: SggRecord[];
  dong: DongRecord[];
};

type RegionMaps = {
  sido: Map<string, SidoRecord>;
  sgg: Map<string, SggRecord>;
  dong: Map<string, DongRecord>;
};

const SGG_VIEW_ZOOM = MAP_LEVEL_THRESHOLDS.SGG_ZOOM_MIN + 1.2;
const SGG_DETAIL_ZOOM = Math.max(
  MAP_LEVEL_THRESHOLDS.DONG_ZOOM_MIN - 0.5,
  SGG_VIEW_ZOOM + 0.8
);
const DONG_FOCUS_ZOOM = MAP_LEVEL_THRESHOLDS.DONG_ZOOM_MIN + 1.5;

function stringProp(props: Record<string, unknown>, key: string): string {
  const raw = props[key];
  if (typeof raw === "string") return raw;
  if (typeof raw === "number") return String(raw);
  return "";
}

function boundsFromGeometry(geometry: Geometry | null): BoundsTuple | null {
  if (!geometry) return null;
  const mp = polygonToMultiPolygon(geometry);
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let hasPoint = false;

  for (const polygon of mp.coordinates) {
    for (const ring of polygon) {
      for (const coord of ring) {
        const lng = coord[0];
        const lat = coord[1];
        if (typeof lng !== "number" || typeof lat !== "number") continue;
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
        hasPoint = true;
      }
    }
  }

  if (!hasPoint) return null;
  return [minLng, minLat, maxLng, maxLat];
}

function tupleToBounds(tuple: BoundsTuple): maplibregl.LngLatBounds {
  const [minLng, minLat, maxLng, maxLat] = tuple;
  return new maplibregl.LngLatBounds([minLng, minLat], [maxLng, maxLat]);
}

export default function MapView() {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const moveEndHandlerRef = useRef<((event: MapLibreEvent) => void) | null>(
    null
  );

  const [galleries, setGalleries] = useState<Galleries>({});
  const [viewport, setViewport] = useState<Viewport>({
    zoom: 11,
    center: [127.0, 37.57],
  });
  const [regionData, setRegionData] = useState<RegionData | null>(null);
  const [selectedSido, setSelectedSido] = useState("");
  const [selectedSgg, setSelectedSgg] = useState("");
  const [selectedDong, setSelectedDong] = useState("");

  useEffect(() => {
    if (!mapDivRef.current) return;

    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch {
        /* noop */
      }
      mapRef.current = null;
    }

    const map = new maplibregl.Map({
      container: mapDivRef.current,
      style: baseStyle(),
      center: viewport.center,
      zoom: viewport.zoom,
      renderWorldCopies: false,
      dragRotate: false,
      pitchWithRotate: false,
      // @ts-expect-error - 일부 버전만
      localFontFamily:
        "Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif",
    });
    mapRef.current = map;

    const onView = () => {
      const c = map.getCenter();
      setViewport({ zoom: map.getZoom(), center: [c.lng, c.lat] });
    };
    map.on("move", onView);
    map.on("zoom", onView);

    map.on("load", () => {
      registerPmtilesSources(map, PMTILES_POLY_FILE, PMTILES_LABEL_FILE);
      addBoundaryLayers(map);
      addLabelLayers(map);

      map.on("click", "dong-fill", (e) => {
        const f = (e.features?.[0] ?? null) as MapGeoJSONFeature | null;
        if (!f) return;
        const props = (f.properties ?? null) as Record<string, unknown> | null;
        const admCd = props
          ? stringProp(props, "adm_cd") || stringProp(props, "adm_cd2")
          : "";
        if (!admCd) return;

        const inEl = document.createElement("input");
        inEl.type = "file";
        inEl.accept = "image/*";
        inEl.multiple = true;
        inEl.onchange = () => {
          const files = Array.from(inEl.files ?? []);
          if (!files.length) return;
          setGalleries((prev) => {
            const next: Galleries = { ...prev };
            const arr = next[admCd] ? [...next[admCd]] : [];
            for (const file of files) {
              const url = URL.createObjectURL(file);
              const item: ImageItem = {
                id: `${Date.now()}-${file.name}`,
                url,
                createdAt: Date.now(),
              };
              arr.push(item);
            }
            next[admCd] = arr;
            return next;
          });
        };
        inEl.click();
      });
    });

    map.on("error", (ev) => {
      // eslint-disable-next-line no-console
      console.error("Map error:", ev);
    });

    return () => {
      try {
        if (moveEndHandlerRef.current) {
          map.off("moveend", moveEndHandlerRef.current);
          moveEndHandlerRef.current = null;
        }
        map.remove();
      } finally {
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "/");
    const buildAssetUrl = (asset: string) => `${base}${asset}`;

    const fetchCollection = async (
      asset: string
    ): Promise<FeatureCollection<Geometry, Record<string, unknown>>> => {
      const response = await fetch(buildAssetUrl(asset));
      if (!response.ok) {
        throw new Error(`Failed to load ${asset}: ${response.statusText}`);
      }
      return (await response.json()) as FeatureCollection<
        Geometry,
        Record<string, unknown>
      >;
    };

    const loadRegions = async () => {
      try {
        const [sidoFC, sggFC, dongFC] = await Promise.all([
          fetchCollection("sido.geojson"),
          fetchCollection("sgg.geojson"),
          fetchCollection("dong.geojson"),
        ]);
        if (cancelled) return;

        const next: RegionData = { sido: [], sgg: [], dong: [] };

        for (const feature of sidoFC.features) {
          const props = (feature.properties ?? {}) as Record<string, unknown>;
          const code = stringProp(props, "sido");
          if (!code) continue;
          const name =
            stringProp(props, "sidonm") || stringProp(props, "sido") || code;
          const bounds = boundsFromGeometry(feature.geometry);
          if (!bounds) continue;
          next.sido.push({ code, name, bounds });
        }

        for (const feature of sggFC.features) {
          const props = (feature.properties ?? {}) as Record<string, unknown>;
          const code = stringProp(props, "sgg");
          const sidoCode = stringProp(props, "sido");
          if (!code || !sidoCode) continue;
          const name = stringProp(props, "sggnm") || code;
          const bounds = boundsFromGeometry(feature.geometry);
          if (!bounds) continue;
          next.sgg.push({ code, name, sidoCode, bounds });
        }

        for (const feature of dongFC.features) {
          const props = (feature.properties ?? {}) as Record<string, unknown>;
          const code =
            stringProp(props, "adm_cd") || stringProp(props, "adm_cd2");
          const sggCode = stringProp(props, "sgg");
          const sidoCode = stringProp(props, "sido");
          if (!code || !sggCode || !sidoCode) continue;
          const name = stringProp(props, "adm_nm") || code;
          const bounds = boundsFromGeometry(feature.geometry);
          if (!bounds) continue;
          next.dong.push({ code, name, sggCode, sidoCode, bounds });
        }

        next.sido.sort((a, b) => a.name.localeCompare(b.name));
        next.sgg.sort((a, b) => a.name.localeCompare(b.name));
        next.dong.sort((a, b) => a.name.localeCompare(b.name));

        setRegionData(next);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Region dataset load error:", error);
      }
    };

    void loadRegions();
    return () => {
      cancelled = true;
    };
  }, []);

  const regionMaps = useMemo<RegionMaps | null>(() => {
    if (!regionData) return null;
    return {
      sido: new Map(regionData.sido.map((item) => [item.code, item])),
      sgg: new Map(regionData.sgg.map((item) => [item.code, item])),
      dong: new Map(regionData.dong.map((item) => [item.code, item])),
    };
  }, [regionData]);

  useEffect(() => {
    if (!regionMaps) return;
    if (selectedSido && !regionMaps.sido.has(selectedSido)) {
      setSelectedSido("");
      setSelectedSgg("");
      setSelectedDong("");
      return;
    }
    if (selectedSgg) {
      const sggRecord = regionMaps.sgg.get(selectedSgg);
      if (!sggRecord || (selectedSido && sggRecord.sidoCode !== selectedSido)) {
        setSelectedSgg("");
        setSelectedDong("");
      }
    }
    if (selectedDong) {
      const dongRecord = regionMaps.dong.get(selectedDong);
      if (
        !dongRecord ||
        (selectedSgg && dongRecord.sggCode !== selectedSgg) ||
        (selectedSido && dongRecord.sidoCode !== selectedSido)
      ) {
        setSelectedDong("");
      }
    }
  }, [regionMaps, selectedSido, selectedSgg, selectedDong]);

  const mapInstance = mapRef.current;
  const overlays = useMemo(
    () =>
      mapInstance ? computeOverlays(mapInstance, galleries, viewport) : [],
    [mapInstance, galleries, viewport]
  );

  const regionLoaded = regionData !== null;

  const sidoOptions = useMemo(() => regionData?.sido ?? [], [regionData]);

  const sggOptions = useMemo(() => {
    if (!regionData) return [];
    if (!selectedSido) return regionData.sgg;
    return regionData.sgg.filter((item) => item.sidoCode === selectedSido);
  }, [regionData, selectedSido]);

  const dongOptions = useMemo(() => {
    if (!regionData) return [];
    if (!selectedSgg) return [];
    return regionData.dong.filter((item) => item.sggCode === selectedSgg);
  }, [regionData, selectedSgg]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !regionMaps) return;

    let targetBounds: BoundsTuple | null = null;
    let minZoom: number | null = null;

    if (selectedDong) {
      const record = regionMaps.dong.get(selectedDong);
      if (record) {
        targetBounds = record.bounds;
        minZoom = DONG_FOCUS_ZOOM;
      }
    } else if (selectedSgg) {
      const record = regionMaps.sgg.get(selectedSgg);
      if (record) {
        targetBounds = record.bounds;
        minZoom = SGG_DETAIL_ZOOM;
      }
    } else if (selectedSido) {
      const record = regionMaps.sido.get(selectedSido);
      if (record) {
        targetBounds = record.bounds;
        minZoom = SGG_VIEW_ZOOM;
      }
    }

    if (!targetBounds) return;

    if (moveEndHandlerRef.current) {
      map.off("moveend", moveEndHandlerRef.current);
      moveEndHandlerRef.current = null;
    }

    map.stop();
    const bounds = tupleToBounds(targetBounds);
    const padding = selectedDong ? 140 : selectedSgg ? 120 : 100;
    map.fitBounds(bounds, {
      padding,
      duration: 700,
      linear: false,
    });

    if (minZoom !== null) {
      const handler = () => {
        if (map.getZoom() < minZoom) {
          map.easeTo({ zoom: minZoom, duration: 320 });
        }
        if (moveEndHandlerRef.current) {
          map.off("moveend", moveEndHandlerRef.current);
          moveEndHandlerRef.current = null;
        }
      };
      moveEndHandlerRef.current = handler;
      map.on("moveend", handler);
    }
  }, [regionMaps, selectedSido, selectedSgg, selectedDong]);

  const handleSidoChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    setSelectedSido(next);
    setSelectedSgg("");
    setSelectedDong("");
  };

  const handleSggChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    setSelectedSgg(next);
    setSelectedDong("");
  };

  const handleDongChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedDong(event.target.value);
  };

  const viewportKey = `${viewport.zoom.toFixed(2)}:${viewport.center[0].toFixed(
    4
  )}:${viewport.center[1].toFixed(4)}`;

  return (
    <div className="relative h-screen w-screen">
      <div ref={mapDivRef} className="absolute inset-0" />
      <div className="absolute top-4 right-4 z-[200] bg-slate-900/80 text-white backdrop-blur-sm p-2 rounded shadow flex flex-col space-y-1 text-xs">
        <select
          className="p-1 border rounded bg-slate-900/40"
          value={selectedSido}
          onChange={handleSidoChange}
          disabled={!regionLoaded}
        >
          <option value="">전체 시도</option>
          {sidoOptions.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.name}
            </option>
          ))}
        </select>
        <select
          className="p-1 border rounded bg-slate-900/40"
          value={selectedSgg}
          onChange={handleSggChange}
          disabled={!regionLoaded || !selectedSido}
        >
          <option value="">전체 시군구</option>
          {sggOptions.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.name}
            </option>
          ))}
        </select>
        <select
          className="p-1 border rounded bg-slate-900/40"
          value={selectedDong}
          onChange={handleDongChange}
          disabled={!regionLoaded || !selectedSgg}
        >
          <option value="">전체 동</option>
          {dongOptions.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.name}
            </option>
          ))}
        </select>
      </div>
      {mapInstance &&
        overlays.map(({ id, feats, imgs }) => (
          <ImageClipOverlay
            key={id}
            map={mapInstance}
            features={feats}
            images={imgs}
            maskId={`mask-${id}`}
            viewportKey={viewportKey}
          />
        ))}
    </div>
  );
}
