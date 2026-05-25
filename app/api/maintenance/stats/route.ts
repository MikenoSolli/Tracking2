import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getSession } from "@/app/_lib/sessions";
import { startOfDay, endOfDay, addDays } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
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

    const companyId = user.companyId;
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const in7Days = addDays(todayStart, 7);

    const vehicles = await prisma.vehicle.findMany({
      where: { companyId, isActive: true },
      select: { id: true },
    });
    const vehicleIds = vehicles.map((v) => v.id);

    const allWOs = await prisma.maintenance.findMany({
      where: {
        vehicle: { companyId },
        status: { in: ["SCHEDULED", "ASSIGNED", "IN_PROGRESS"] },
      },
      select: { id: true, status: true, scheduledDate: true, severity: true },
    });

    const overdue = allWOs.filter(
      (wo) =>
        wo.scheduledDate < now &&
        (wo.status === "SCHEDULED" || wo.status === "ASSIGNED"),
    );

    const dueToday = allWOs.filter(
      (wo) => wo.scheduledDate >= todayStart && wo.scheduledDate <= todayEnd,
    );

    const upcoming = allWOs.filter(
      (wo) =>
        wo.scheduledDate > todayEnd && wo.scheduledDate <= in7Days,
    );

    const inProgress = allWOs.filter((wo) => wo.status === "IN_PROGRESS");

    const activeFaults = vehicleIds.length > 0
      ? await prisma.vehicle_faults.count({
          where: { vehicleId: { in: vehicleIds }, isActive: true },
        })
      : 0;

    const totalActive = vehicles.length;
    const healthScore = totalActive > 0 && activeFaults === 0 && overdue.length === 0
      ? 92
      : Math.max(
          0,
          Math.min(
            100,
            100 - overdue.length * 15 - activeFaults * 4,
          ),
        );

    return NextResponse.json({
      overdue: overdue.length,
      dueToday: dueToday.length,
      upcoming: upcoming.length,
      inProgress: inProgress.length,
      healthScore,
      totalVehicles: totalActive,
      activeFaults,
    });
  } catch (error) {
    console.error("Maintenance Stats Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}