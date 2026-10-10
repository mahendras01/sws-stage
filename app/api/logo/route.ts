import { NextResponse } from "next/server";
import { getLogoFile } from "@/lib/site-logo";

export const dynamic = "force-dynamic";

/** Public: serves the active website logo (404 if none has been uploaded). */
export async function GET(request: Request) {
  const { file, error } = await getLogoFile();

  if (error) {
    return NextResponse.json({ success: false, message: "Failed to load logo" }, { status: 500 });
  }
  if (!file) {
    return new NextResponse(null, { status: 404 });
  }

  const etag = `"logo-${file.version}"`;
  // Callers pass ?v=<version>, so a given URL always maps to one immutable image.
  const hasVersion = new URL(request.url).searchParams.has("v");
  const headers: Record<string, string> = {
    ETag: etag,
    "Content-Type": file.mimeType,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": hasVersion ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate",
  };

  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers });
  }

  return new NextResponse(new Uint8Array(file.buffer), { status: 200, headers });
}
