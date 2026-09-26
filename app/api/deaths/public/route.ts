import { NextRequest, NextResponse } from "next/server";
import { getPublicLabharthiRecords } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
    const pageSize = Number(request.nextUrl.searchParams.get("pageSize") ?? "10");

    const { data, totalCount, totalPages, error } = await getPublicLabharthiRecords(page, pageSize);

    if (error) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch public labharthi records", records: [], totalPages: 1 },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      records: data ?? [],
      totalCount,
      totalPages,
    });
  } catch (error) {
    console.error("Public labharthi route error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", records: [], totalPages: 1 },
      { status: 500 },
    );
  }
}
