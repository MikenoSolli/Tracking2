import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/_lib/sessions";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    const userId = Number(session?.sub);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { partName, partNumber, quantity, cost } = body;

    if (!partName || !quantity || !cost) {
      return NextResponse.json(
        { error: "partName, quantity, and cost are required" },
        { status: 400 },
      );
    }

    // Fetch current work order to get existing metadata
    const wo = await prisma.maintenance.findUnique({
      where: { id },
      select: { metadata: true },
    });

    if (!wo) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const metadata = (wo.metadata as any) || {};
    const partsUsed = (metadata.parts_used || []) as any[];

    partsUsed.push({
      part_name: partName,
      part_number: partNumber || null,
      quantity: parseInt(quantity),
      cost: parseFloat(cost),
      loggedAt: new Date().toISOString(),
    });

    const updated = await prisma.maintenance.update({
      where: { id },
      data: {
        metadata: { ...metadata, parts_used: partsUsed },
      },
      select: { id: true, metadata: true, cost: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Log Part Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
