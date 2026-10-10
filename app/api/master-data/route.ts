import { NextRequest, NextResponse } from "next/server";

import { ensureRequiredRegistrationMasterData, getDepartments, getPosts, getDistrictByName } from "@/lib/db";
import { UP_DISTRICT_NAMES, resolveDistrictFromPincode } from "@/lib/up-districts";
import { getRequestMeta, log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const meta = getRequestMeta(request);

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
        log.warn("master_data.pincode_lookup_failed", { ...meta, pincode, error });
        return NextResponse.json(
          {
            success: false,
            message: error instanceof Error ? error.message : "Unable to verify the PIN code.",
          },
          { status: 400 },
        );
      }
    }

    const [departmentSeed, departmentsResult, postsResult] = await Promise.all([
      ensureRequiredRegistrationMasterData(),
      getDepartments(),
      getPosts(),
    ]);

    if (departmentSeed.error || departmentsResult.error || postsResult.error) {
      log.error("master_data.lookup_failed", {
        ...meta,
        seedError: departmentSeed.error,
        departmentsError: departmentsResult.error,
        postsError: postsResult.error,
      });
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

    const registrationDepartmentName = "Panchayati Raj Vibhag";
    const registrationPostName = "Safai Karamchari";

    const normalizedDepartments = (departmentsResult.data ?? []).filter((department) => {
      const value = department.name?.trim().toLowerCase();
      return value === registrationDepartmentName.toLowerCase() || value?.includes("panchayati") || value?.includes("raj") || value?.includes("vibhag");
    });

    const normalizedPosts = (postsResult.data ?? []).filter((post) => {
      const value = post.name?.trim().toLowerCase();
      return (
        value === registrationPostName.toLowerCase() ||
        value?.includes("safai") ||
        value?.includes("karamchari") ||
        (departmentSeed.department && post.department_id === departmentSeed.department.id)
      );
    });

    const departments = normalizedDepartments.length > 0 ? normalizedDepartments : departmentSeed.department ? [departmentSeed.department] : [];
    const posts = normalizedPosts.length > 0 ? normalizedPosts : departmentSeed.post ? [departmentSeed.post] : [];

    return NextResponse.json({
      success: true,
      departments,
      posts,
      districts: UP_DISTRICT_NAMES,
    });
  } catch (error) {
    log.error("master_data.exception", { ...meta, error });
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
