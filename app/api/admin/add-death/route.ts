import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createDeath } from "@/lib/db";
import { validateDeath } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const { member_name, member_id, death_date, age, cause_of_death, family_info } = body;

    const validation = validateDeath({ member_name, death_date, age });
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: "Validation failed", errors: validation.errors },
        { status: 400 },
      );
    }

    const { data, error } = await createDeath({
      member_name: member_name.trim(),
      member_id: member_id || null,
      death_date,
      age: age ? Number(age) : null,
      cause_of_death: cause_of_death?.trim() || null,
      family_info: family_info?.trim() || null,
      created_by: auth.session!.user.id,
    });

    if (error || !data) {
      return NextResponse.json(
        { success: false, message: "Failed to add death record" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Death record added successfully",
      deathId: data.id,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
