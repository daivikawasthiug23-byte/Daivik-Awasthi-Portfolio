export type Chunk = { id: string; title: string; href: string; text: string };
export type IndexedChunk = Chunk & { embedding: number[] };
export type Source = { title: string; href: string };
