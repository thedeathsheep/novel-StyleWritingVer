import { NextResponse } from "next/server";
import { listLibrariesWithCount, createLibrary } from "@/lib/user-libraries";

export async function GET() {
  try {
    const libraries = await listLibrariesWithCount();
    return NextResponse.json({ libraries });
  } catch (e) {
    console.error("[libraries] list error", e);
    return NextResponse.json({ libraries: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = body?.name;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }
    const library = await createLibrary(name.trim());
    return NextResponse.json(library);
  } catch (e) {
    console.error("[libraries] create error", e);
    return NextResponse.json({ error: "Failed to create library" }, { status: 500 });
  }
}
