import { readFile, writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import type { Library, LibraryChunk, LibraryIndex } from "./types";

const USER_LIBRARIES_DIR = join(process.cwd(), "lib", "data", "user-libraries");
const INDEX_FILE = join(USER_LIBRARIES_DIR, "index.json");

export interface LibrariesIndexFile {
  libraries: Library[];
}

async function ensureDir() {
  await mkdir(USER_LIBRARIES_DIR, { recursive: true });
}

async function readIndex(): Promise<LibrariesIndexFile> {
  await ensureDir();
  try {
    const raw = await readFile(INDEX_FILE, "utf-8");
    const data = JSON.parse(raw) as LibrariesIndexFile;
    return Array.isArray(data.libraries) ? data : { libraries: [] };
  } catch {
    return { libraries: [] };
  }
}

async function writeIndex(index: LibrariesIndexFile) {
  await ensureDir();
  await writeFile(INDEX_FILE, JSON.stringify(index, null, 0), "utf-8");
}

export async function listLibrariesWithCount(): Promise<(Library & { chunksCount: number })[]> {
  const index = await readIndex();
  const result: (Library & { chunksCount: number })[] = [];
  for (const lib of index.libraries) {
    const chunks = await getLibraryChunks(lib.id);
    result.push({ ...lib, chunksCount: chunks.length });
  }
  return result;
}

export async function listLibraries(): Promise<Library[]> {
  const index = await readIndex();
  return index.libraries;
}

function generateLibraryId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `lib-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createLibrary(name: string): Promise<Library> {
  const id = generateLibraryId();
  const lib: Library = { id, name, createdAt: new Date().toISOString() };
  const index = await readIndex();
  index.libraries.push(lib);
  await writeIndex(index);
  await writeFile(libraryPath(id), JSON.stringify({ chunks: [] }), "utf-8");
  return lib;
}

export async function deleteLibrary(id: string): Promise<boolean> {
  const index = await readIndex();
  const idx = index.libraries.findIndex((l) => l.id === id);
  if (idx === -1) return false;
  index.libraries.splice(idx, 1);
  await writeIndex(index);
  try {
    await unlink(libraryPath(id));
  } catch {
    // file may not exist
  }
  return true;
}

function libraryPath(id: string): string {
  return join(USER_LIBRARIES_DIR, `${id}.json`);
}

export async function getLibraryChunks(id: string): Promise<LibraryChunk[]> {
  try {
    const raw = await readFile(libraryPath(id), "utf-8");
    const data = JSON.parse(raw) as LibraryIndex;
    return Array.isArray(data.chunks) ? data.chunks : [];
  } catch {
    return [];
  }
}

export async function appendLibraryChunks(
  id: string,
  newChunks: LibraryChunk[],
): Promise<number> {
  const index = await readIndex();
  if (!index.libraries.some((l) => l.id === id)) return 0;
  const existing = await getLibraryChunks(id);
  const chunks = [...existing, ...newChunks];
  await writeFile(
    libraryPath(id),
    JSON.stringify({ chunks }, null, 0),
    "utf-8",
  );
  return newChunks.length;
}

/** Simple chunking: split by double newline or by sentence end (.[]!?) then space/newline. Max segments per run. */
export function chunkText(text: string, maxChunks = 50): { text: string }[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const segments: string[] = [];
  const byParagraph = normalized.split(/\n\n+/);
  for (const p of byParagraph) {
    const sentences = p.split(/(?<=[。.!?！?])\s+/).filter(Boolean);
    for (const s of sentences) {
      const t = s.trim();
      if (t.length >= 2) segments.push(t);
    }
    if (segments.length >= maxChunks) break;
  }
  if (segments.length === 0 && normalized.length >= 2) segments.push(normalized.slice(0, 500));
  return segments.slice(0, maxChunks).map((text) => ({ text }));
}
