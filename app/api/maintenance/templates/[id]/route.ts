import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/_lib/sessions";

export const dynamic = "force-dynamic";

export async function PATCH(
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

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.vehicleType !== undefined) updateData.vehicleType = body.vehicleType;
    if (body.timeIntervalDays !== undefined) updateData.timeIntervalDays = body.timeIntervalDays ? parseInt(body.timeIntervalDays) : null;
    if (body.mileageIntervalKm !== undefined) updateData.mileageIntervalKm = body.mileageIntervalKm ? parseFloat(body.mileageIntervalKm) : null;
    if (body.engineHoursInterval !== undefined) updateData.engineHoursInterval = body.engineHoursInterval ? parseFloat(body.engineHoursInterval) : null;
    if (body.defaultSeverity !== undefined) updateData.defaultSeverity = body.defaultSeverity;
    if (body.estimatedCost !== undefined) updateData.estimatedCost = body.estimatedCost ? parseFloat(body.estimatedCost) : null;
    if (body.estimatedDuration !== undefined) updateData.estimatedDuration = body.estimatedDuration ? parseFloat(body.estimatedDuration) : null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const template = await prisma.maintenance_template.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Update Template Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Soft delete by setting isActive = false
    await prisma.maintenance_template.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Template Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
