import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { generateUserIdCardPdfBuffer } from "@/lib/pdf";
import { getCurrentUserIdCardData } from "@/lib/user-id-card";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) {
    return auth.error;
  }

  const { user, swsId, error } = await getCurrentUserIdCardData(auth.session.user.id);
  if (error || !user) {
    return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
  }

  const pdfBuffer = await generateUserIdCardPdfBuffer({ user, swsId });

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="user-id-card-${(user.name || "member").replace(/[^a-zA-Z0-9._-]/g, "-")}.pdf"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
