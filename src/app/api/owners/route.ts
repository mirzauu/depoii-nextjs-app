import { NextRequest, NextResponse } from "next/server";
import { queryOwnersDirectory } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const data = await queryOwnersDirectory(q);
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/owners error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to query commercial owners directory" },
      { status: 500 }
    );
  }
}
