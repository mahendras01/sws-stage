import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { listNomineeEditRequests, updateNomineeEditRequestStatus } from "@/lib/db";

export async function GET() {
  const { error, session } = await requireAdmin();

  if (error) {
    return error;
  }

  const { data, error: dbError } = await listNomineeEditRequests();
  if (dbError) {
    return NextResponse.json({ success: false, message: "Unable to load nominee change requests." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    requests: data ?? [],
    admin: {
      userId: session.user.id,
      role: session.user.role,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const { error, session } = await requireAdmin();

  if (error) {
    return error;
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }

  const requestId = String(body.requestId ?? "").trim();
  const action = String(body.action ?? "").trim().toLowerCase();
  const adminNote = String(body.adminNote ?? "").trim();

  if (!requestId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ success: false, message: "A valid requestId and action are required." }, { status: 400 });
  }

  const { data, error: dbError } = await updateNomineeEditRequestStatus(
    requestId,
    action === "approve" ? "approved" : "rejected",
    session.user.id,
    adminNote,
  );

  if (dbError || !data) {
    return NextResponse.json({ success: false, message: "Unable to update nominee change request." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: action === "approve" ? "Nominee edit request approved." : "Nominee edit request rejected.",
    request: data,
  });
}
