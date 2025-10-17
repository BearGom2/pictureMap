import { Protocol, PMTiles } from "pmtiles";
import maplibregl from "maplibre-gl";

export function registerPmtilesSources(
  map: maplibregl.Map,
  polyFile: string,
  labelFile: string
): void {
  const protocol = new Protocol();
  try {
    maplibregl.addProtocol("pmtiles", protocol.tile);
  } catch {
    /* already added */
  }

  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "/");
  const polyHttp = new URL(polyFile, window.location.origin + base).toString();
  const lblHttp = new URL(labelFile, window.location.origin + base).toString();

  protocol.add(new PMTiles(polyHttp));
  protocol.add(new PMTiles(lblHttp));

  map.addSource("adm", { type: "vector", url: `pmtiles://${polyHttp}` });
  map.addSource("adm_lbl", { type: "vector", url: `pmtiles://${lblHttp}` });
}
