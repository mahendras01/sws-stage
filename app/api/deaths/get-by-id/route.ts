import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDeathById, getContributionsByDeathId } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const deathId = request.nextUrl.searchParams.get("deathId");

    if (!deathId) {
      return NextResponse.json(
        { success: false, message: "deathId is required" },
        { status: 400 },
      );
    }

    const { data: death, error: deathError } = await getDeathById(deathId);

    if (deathError || !death) {
      return NextResponse.json(
        { success: false, message: "Death record not found" },
        { status: 404 },
      );
    }

    const { data: contributions, error: contribError } = await getContributionsByDeathId(deathId);

    if (contribError) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch contributions" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      death,
      contributions: contributions ?? [],
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
