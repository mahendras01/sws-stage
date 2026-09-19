import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: true, message: "Already logged out" });
    }

    // Client should call signOut from next-auth/react; this endpoint confirms logout intent
    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
