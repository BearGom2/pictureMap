import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, {
  Map as MapLibreMap,
  type MapGeoJSONFeature,
} from "maplibre-gl";

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

export default function MapView() {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const [galleries, setGalleries] = useState<Galleries>({});
  const [viewport, setViewport] = useState<Viewport>({
    zoom: 11,
    center: [127.0, 37.57],
  });

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
      style: baseStyle(), // glyphs는 constants에서 주입
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

      // 클릭 → 동 코드에 이미지 추가
      map.on("click", "dong-fill", (e) => {
        const f = (e.features?.[0] ?? null) as MapGeoJSONFeature | null;
        if (!f) return;
        const props = f.properties as Record<string, unknown> | null;
        const admCd = props?.adm_cd !== undefined ? String(props.adm_cd) : "";
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
        map.remove();
      } finally {
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const map = mapRef.current;
  const overlays = useMemo(
    () => (map ? computeOverlays(map, galleries, viewport) : []),
    [map, galleries, viewport]
  );

  const viewportKey = `${viewport.zoom.toFixed(2)}:${viewport.center[0].toFixed(
    4
  )}:${viewport.center[1].toFixed(4)}`;

  return (
    <div className="relative h-screen w-screen">
      <div ref={mapDivRef} className="absolute inset-0" />
      {map &&
        overlays.map(({ id, feats, imgs }) => (
          <ImageClipOverlay
            key={id}
            map={map}
            features={feats}
            images={imgs}
            maskId={`mask-${id}`}
            viewportKey={viewportKey}
          />
        ))}
    </div>
  );
}
