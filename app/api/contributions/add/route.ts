import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createContribution, getDeathById, getUserById } from "@/lib/db";
import { validateContribution } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const { deathId, contributorId, amount } = body;

    const validation = validateContribution({
      deathId,
      contributorId,
      amount: Number(amount),
    });

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: "Validation failed", errors: validation.errors },
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

    if (death.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Cannot add contribution to a closed death record" },
        { status: 400 },
      );
    }

    const { data: contributor, error: userError } = await getUserById(contributorId);

    if (userError || !contributor) {
      return NextResponse.json(
        { success: false, message: "Contributor not found" },
        { status: 404 },
      );
    }

    if (contributor.status !== "approved") {
      return NextResponse.json(
        { success: false, message: "Contributor must be an approved member" },
        { status: 400 },
      );
    }

    const { error } = await createContribution({
      death_id: deathId,
      contributor_id: contributorId,
      contributor_name: contributor.name,
      amount: Number(amount),
      contribution_date: new Date().toISOString().split("T")[0],
    });

    if (error) {
      return NextResponse.json(
        { success: false, message: "Failed to add contribution" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Contribution added successfully",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
