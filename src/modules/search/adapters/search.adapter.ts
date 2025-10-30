export interface SearchResult {
  id: string;
  title: string;
  address: string;
  description?: string;
  amenities: string[];
  ratingAvg?: number;
  ratingCount?: number;
  minNightlyPrice?: number | null;
  distanceKm?: number;
  _geo?: { lat: number; lng: number };
}

export interface SearchQuery {
  q?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  sort?: 'relevance' | 'price' | 'rating' | 'distance';
  limit?: number;
  offset?: number;
}

export interface SearchResponse {
  data: SearchResult[];
  paging: {
    estimatedTotal: number;
  };
}

export interface SuggestQuery {
  q: string;
  field: 'title' | 'address';
}

export interface SuggestResult {
  text: string;
  score?: number;
}

export abstract class SearchAdapter {
  abstract search(q: SearchQuery): Promise<SearchResponse>;
  abstract suggest(
    q: string,
    field: 'title' | 'address',
  ): Promise<SuggestResult[]>;
  abstract ensureIndex(): Promise<void>;
  abstract upsertPropertyDocs(docs: any[]): Promise<void>;
  abstract deleteProperty(propertyId: string): Promise<void>;
}
