import { NextRequest, NextResponse } from "next/server";
import { ownerProfile } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);
    const data = await ownerProfile(decodedId);
    
    if (!data.owner) {
      return NextResponse.json({ error: "Commercial owner portfolio not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/owners/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch owner profile" },
      { status: 500 }
    );
  }
}
