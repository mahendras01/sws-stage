import { NextRequest, NextResponse } from "next/server";

import { getDepartments, getPosts, getDistrictByName } from "@/lib/db";
import { UP_DISTRICT_NAMES, resolveDistrictFromPincode } from "@/lib/up-districts";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const pincode = request.nextUrl.searchParams.get("pincode") ?? "";

    if (pincode) {
      try {
        const result = await resolveDistrictFromPincode(pincode);
        const districtRow = await getDistrictByName(result.districtName);

        return NextResponse.json({
          success: true,
          district: {
            district_name: result.districtName,
            district_id: districtRow.data?.id ?? null,
            state_name: result.stateName,
          },
        });
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            message: error instanceof Error ? error.message : "Unable to verify the PIN code.",
          },
          { status: 400 },
        );
      }
    }

    const [departmentsResult, postsResult] = await Promise.all([getDepartments(), getPosts()]);

    if (departmentsResult.error || postsResult.error) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to load department and post data right now.",
          departments: [],
          posts: [],
          districts: [],
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      departments: departmentsResult.data ?? [],
      posts: postsResult.data ?? [],
      districts: UP_DISTRICT_NAMES,
    });
  } catch (error) {
    console.error("Master data lookup failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to load department and post data right now.",
        departments: [],
        posts: [],
        districts: [],
      },
      { status: 500 },
    );
  }
}
