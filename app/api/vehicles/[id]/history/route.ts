import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");

    if (!fromStr || !toStr) {
      return NextResponse.json({ error: "Missing date range" }, { status: 400 });
    }

    const from = new Date(fromStr);
    const to = new Date(toStr);

    // Fetch from gps_events — use endOfDay on `to` so a single-day selection
    // covers the full day, not just midnight
    const history = await prisma.gps_events.findMany({
      where: {
        vehicleId: id,
        timestamp: {
          gte: startOfDay(from),
          lte: endOfDay(to),
        },
      },
      orderBy: { timestamp: "asc" },
      take: 100,
    });

    const formattedHistory = history
      .filter(e => e.latitude !== null && e.longitude !== null)
      .map(e => ({
        pos: [e.latitude, e.longitude] as [number, number],
        time: e.timestamp.toISOString(),
      }));

    return NextResponse.json(formattedHistory, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });

  } catch (error) {
    console.error("History API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}