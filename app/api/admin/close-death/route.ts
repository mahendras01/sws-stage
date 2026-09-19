import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateDeathStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const { deathId, status } = body;

    if (!deathId || !status || !["active", "closed"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Valid deathId and status are required" },
        { status: 400 },
      );
    }

    const { error } = await updateDeathStatus(deathId, status);

    if (error) {
      return NextResponse.json(
        { success: false, message: "Failed to update death status" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Death record ${status === "closed" ? "closed" : "reopened"} successfully`,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
