import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/_lib/sessions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const userId = Number(session?.sub);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    if (!user?.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // "2026-05"
    const mechanicId = searchParams.get("mechanicId");
    const vehicleType = searchParams.get("vehicleType");
    const status = searchParams.get("status");

    // Parse month to date range
    let dateFrom: Date, dateTo: Date;
    if (month) {
      const [year, mon] = month.split("-").map(Number);
      dateFrom = new Date(year, mon - 1, 1);
      dateTo = new Date(year, mon, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const where: any = {
      vehicle: { companyId: user.companyId },
      scheduledDate: { gte: dateFrom, lte: dateTo },
    };

    if (mechanicId && mechanicId !== "all") {
      where.mechanicId = parseInt(mechanicId);
    }

    if (vehicleType && vehicleType !== "all") {
      where.vehicle = { ...where.vehicle, Type: vehicleType as any };
    }

    if (status && status !== "all") {
      const statuses = status.split(",");
      where.status = { in: statuses };
    }

    const workOrders = await prisma.maintenance.findMany({
      where,
      orderBy: { scheduledDate: "asc" },
      select: {
        id: true,
        description: true,
        status: true,
        severity: true,
        origin: true,
        scheduledDate: true,
        cost: true,
        vehicle: { select: { id: true, plateNumber: true, make: true, model: true, Type: true } },
        mechanic: { select: { id: true, name: true } },
      },
    });

    // Group by date string
    const grouped: Record<string, typeof workOrders> = {};
    for (const wo of workOrders) {
      const dateKey = wo.scheduledDate.toISOString().slice(0, 10);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(wo);
    }

    // Also get mechanic list for the filter dropdown
    const mechanics = await prisma.user.findMany({
      where: { companyId: user.companyId, role: "MECHANIC", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      grouped,
      mechanics,
      dateRange: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
    });
  } catch (error) {
    console.error("Calendar Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
