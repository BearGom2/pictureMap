export type ImageItem = {
  id: string;
  url: string;
  createdAt: number;
};

export type RegionProperties = {
  adm_nm: string;
  adm_cd: string;
  sgg: string;
  sido: string;
};

export type RegionFeature = GeoJSON.Feature<
  GeoJSON.MultiPolygon,
  RegionProperties
>;

export type Galleries = Record<string, ImageItem[]>;

export type Viewport = { zoom: number; center: [number, number] };

export type OverlayEntry = {
  id: string;
  feats: RegionFeature[];
  imgs: ImageItem[];
};
