import fs from "fs/promises";
import path from "path";

import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getNomineeEditRequestById } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) {
    return error;
  }

  const requestId = request.nextUrl.searchParams.get("requestId");
  if (!requestId) {
    return NextResponse.json({ success: false, message: "Missing requestId" }, { status: 400 });
  }

  const { data: nomineeRequest, error: requestError } = await getNomineeEditRequestById(requestId);
  if (requestError || !nomineeRequest) {
    return NextResponse.json({ success: false, message: "Nominee request not found" }, { status: 404 });
  }

  if (!nomineeRequest.note_path) {
    return NextResponse.json({ success: false, message: "No attachment available" }, { status: 404 });
  }

  const absolutePath = path.resolve(process.cwd(), nomineeRequest.note_path);
  const allowedRoot = path.resolve(process.cwd(), "private", "nominee-change-requests");
  const isInsideAllowedDir = absolutePath === allowedRoot || absolutePath.startsWith(`${allowedRoot}${path.sep}`);
  if (!isInsideAllowedDir) {
    return NextResponse.json({ success: false, message: "Invalid attachment path" }, { status: 400 });
  }

  try {
    const fileBuffer = await fs.readFile(absolutePath);
    const mimeType = nomineeRequest.note_mime_type || (absolutePath.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream");

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${nomineeRequest.note_file_name || path.basename(absolutePath)}"`,
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to read attached file" }, { status: 500 });
  }
}
