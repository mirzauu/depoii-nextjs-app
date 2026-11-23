import { NextRequest, NextResponse } from "next/server";
import { queryDallasPublicPermitHistory } from "@/lib/public-permits/dallas-soda";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/permits/history
 * 
 * Unified endpoint for Dallas Public Building Permits (2013 – Present).
 * Federates City of Dallas Open Data across live and historical datasets in parallel.
 * 
 * Query Parameters:
 * - address: Street address (e.g. "2100 ROSS AVE", "1001 N RIVERFRONT BLVD")
 * - permit_number: Direct permit lookup (e.g. "1801055002")
 * - since: ISO Date string (default: "2013-01-01")
 * - trade: Optional filter by canonical trade ("roofing", "hvac", "electrical_solar", "plumbing", "fire_safety", "elevators", "paving_civil", "general_construction")
 * - limit: Max number of records to return (default: 100, max: 500)
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const address = sp.get("address")?.trim() || undefined;
    const permitNumber = sp.get("permit_number")?.trim() || sp.get("permit")?.trim() || undefined;
    const since = sp.get("since")?.trim() || undefined;
    const trade = sp.get("trade")?.trim() || undefined;
    const limit = sp.get("limit") ? parseInt(sp.get("limit")!, 10) : undefined;

    if (!address && !permitNumber) {
      return NextResponse.json(
        {
          error: "Missing required query parameter: 'address' or 'permit_number' must be provided.",
          example: "/api/public/permits/history?address=2100+ROSS+AVE&since=2013-01-01",
        },
        { status: 400 }
      );
    }

    const data = await queryDallasPublicPermitHistory({
      address,
      permit_number: permitNumber,
      since,
      trade,
      limit,
    });

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("GET /api/public/permits/history error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to query Dallas public permit datasets",
      },
      { status: 500 }
    );
  }
}
