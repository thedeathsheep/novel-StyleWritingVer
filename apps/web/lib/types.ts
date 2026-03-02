export interface InspirationItem {
  text: string;
  source: string;
}

export interface ResonateResponse {
  items: InspirationItem[];
}

export interface Library {
  id: string;
  name: string;
  createdAt: string;
}

export interface LibraryChunk {
  text: string;
  source: string;
  embedding: number[];
}

export interface LibraryIndex {
  chunks: LibraryChunk[];
}
