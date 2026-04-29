// ─── Data model for a single base station record ─────────────────────────────

export interface BaseStation {
  id: string;                 // Evidencioni broj (composite unique key)
  operator: string;           // Nosilac prava (operator)
  frequencyBand: string;      // Radiofrekvencijski opseg (MHz)
  technology: string;         // Primenjena tehnologija (2G/3G/4G/5G)
  zipCode: string;            // Zip code
  locationName: string;       // Naziv mesta
  address: string;            // Address
  longitude: number;          // Geographic longitude
  latitude: number;           // Geographic Latitude
}

// ─── Sync / cache metadata ────────────────────────────────────────────────────

export interface OperatorChange {
  name: string;
  newSites: number;
  new5G700: number;
  new5G3500: number;
  new4G2600: number;
  new4G700: number;
  updated4GSites: number;
  totalSectors: number;
}

export interface SyncMeta {
  lastCheckedAt: string;
  lastChangedAt: string;
  totalRecords: number;
  inserted: number;      // total new sectors
  deleted: number;
  fileHash: string;
  operatorChanges: OperatorChange[];
  globalStats?: {
    newSites: number;
    new5G700: number;
    new5G3500: number;
    new4G2600: number;
    new4G700: number;
    updated4GSites: number;
  };
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface StationsResponse {
  data: BaseStation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StatsResponse {
  totalStations: number;
  totalSites: number;
  operators: { name: string; count: number }[];
  technologies: { name: string; count: number }[];
  frequencyBands: { name: string; count: number }[];
  topCities: { name: string; count: number }[];
  lastSyncAt: string | null;
  lastCheckedAt: string | null;
  newSinceLast: number;
  operatorChanges: OperatorChange[];
  globalStats?: SyncMeta['globalStats'];
}

export interface MapSite {
  id: string;                 // e.g. "lat_lng"
  lat: number;
  lng: number;
  operators: string[];
  technologies: string[];
  totalSectors: number;
  locationName: string;
}

export interface MapPointsResponse {
  points: MapSite[];
  total: number;
}

// ─── Filter / sort options ────────────────────────────────────────────────────

export interface StationFilters {
  search?: string;
  operator?: string;
  technology?: string;
  frequencyBand?: string;
  city?: string;
  lat?: number;
  lng?: number;
  page?: number;
  pageSize?: number;
  sortBy?: keyof BaseStation;
  sortDir?: 'asc' | 'desc';
}
