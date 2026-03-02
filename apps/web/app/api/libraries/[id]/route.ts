import { NextResponse } from "next/server";
import { deleteLibrary } from "@/lib/user-libraries";
import { getLibraryChunks } from "@/lib/user-libraries";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const chunks = await getLibraryChunks(id);
    return NextResponse.json({ id, chunksCount: chunks.length });
  } catch (e) {
    console.error("[libraries] get error", e);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ok = await deleteLibrary(id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[libraries] delete error", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
