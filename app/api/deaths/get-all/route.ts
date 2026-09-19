import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAllDeaths } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const status = request.nextUrl.searchParams.get("status") as "active" | "closed" | null;

    const { data, error } = await getAllDeaths(status ?? undefined);

    if (error) {
      console.error("Failed to fetch deaths:", error);
      return NextResponse.json({ success: true, deaths: [] });
    }

    return NextResponse.json({ success: true, deaths: data ?? [] });
  } catch (error) {
    console.error("Deaths route error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
