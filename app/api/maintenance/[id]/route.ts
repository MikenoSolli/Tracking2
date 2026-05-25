import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/_lib/sessions";

export const dynamic = "force-dynamic";

export async function GET(
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

    const workOrder = await prisma.maintenance.findUnique({
      where: { id },
      include: {
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            make: true,
            model: true,
            Type: true,
            year: true,
            status: {
              select: {
                odometer: true,
                engineHours: true,
                fuelLevel: true,
                latitude: true,
                longitude: true,
                updatedAt: true,
              },
            },
          },
        },
        mechanic: { select: { id: true, name: true, email: true } },
        template: { select: { id: true, name: true } },
        faults: {
          where: { isActive: true },
          include: {
            faultDefinition: {
              select: { description: true, systemType: true, recommendedAction: true },
            },
          },
        },
        alerts: {
          select: { id: true, message: true, severity: true, createdAt: true, isResolved: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!workOrder) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(workOrder);
  } catch (error) {
    console.error("Work Order Detail Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

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
    const { status, mechanicId, cost, notes, metadata, severity, scheduledDate } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (mechanicId !== undefined) updateData.mechanicId = mechanicId;
    if (cost !== undefined) updateData.cost = cost;
    if (notes !== undefined) updateData.notes = notes;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (severity) updateData.severity = severity;
    if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);

    if (status === "IN_PROGRESS") {
      updateData.serviceDate = new Date();
    }

    if (status === "COMPLETED") {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.maintenance.update({
      where: { id },
      data: updateData,
      include: {
        vehicle: { select: { id: true, plateNumber: true, make: true, model: true } },
        mechanic: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update Work Order Error:", error);
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

    await prisma.maintenance.update({
      where: { id },
      data: {
        status: "CANCELLED",
        notes: "Cancelled by fleet manager",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel Work Order Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}