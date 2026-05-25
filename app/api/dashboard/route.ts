import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { getSession } from "@/app/_lib/sessions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const userId = Number(session?.sub);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's companyId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      return NextResponse.json(
        { error: "User has no company" },
        { status: 403 },
      );
    }

    const today = new Date();
    const startToday = startOfDay(today);
    const endToday = endOfDay(today);
    const startThisWeek = startOfWeek(today);
    const endThisWeek = endOfWeek(today);

    // Get vehicles belonging to the user's company
    const vehicles = await prisma.vehicle.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        plateNumber: true,
        Type: true,
        make: true,
        model: true,
      },
    });

    const vehicleIds = vehicles.map((v) => v.id);

    // Get today's status data
    const todayStatuses = await prisma.status.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        updatedAt: { gte: startToday, lte: endToday },
      },
      select: { state: true, speed: true, distance: true, fuelUsed: true },
    });

    // Get today's summaries
    const todaySummaries = await prisma.dailySummary.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        date: { gte: startToday, lte: endToday },
      },
    });

    // Get this week's summaries
    const weekSummaries = await prisma.dailySummary.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        date: { gte: startThisWeek, lte: endThisWeek },
      },
    });

    // Get recent alerts
    const recentAlerts = await prisma.alert.findMany({
      where: { vehicleId: { in: vehicleIds } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { vehicle: { select: { plateNumber: true } } },
    });

    // Calculate fleet status
    const latestStatuses = await prisma.status.findMany({
      where: { vehicleId: { in: vehicleIds } },
      orderBy: { updatedAt: "desc" },
      take: vehicleIds.length,
    });

    const statusMap = new Map(latestStatuses.map((s) => [s.vehicleId, s]));
    const now = new Date().getTime();

    let activeCount = 0;
    let idleCount = 0;
    let offlineCount = 0;

    vehicles.forEach((v) => {
      const status = statusMap.get(v.id);
      if (!status) {
        offlineCount++;
      } else {
        if (status.state === "ACTIVE") activeCount++;
        else if (status.state === "IDLE") idleCount++;
        else offlineCount++; // including undefined/null/other states
      }
    });

    // Today's metrics
    const todayDistance = todaySummaries.reduce(
      (acc, s) => acc + s.totalDistance,
      0,
    );
    const todayFuel = todaySummaries.reduce(
      (acc, s) => acc + s.totalFuelUsed,
      0,
    );
    const todayRunningHours = todaySummaries.reduce(
      (acc, s) => acc + s.runningTime,
      0,
    );
    const todayIdleHours = todaySummaries.reduce(
      (acc, s) => acc + s.idleTime,
      0,
    );

    // This week's metrics
    const weekDistance = weekSummaries.reduce(
      (acc, s) => acc + s.totalDistance,
      0,
    );
    const weekFuel = weekSummaries.reduce((acc, s) => acc + s.totalFuelUsed, 0);
    const weekRunningHours = weekSummaries.reduce(
      (acc, s) => acc + s.runningTime,
      0,
    );

    // Daily chart data (last 7 days)
    const last7Days: {
      day: string;
      distance: number;
      fuel: number;
      hours: number;
    }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const daySummaries = await prisma.dailySummary.findMany({
        where: {
          vehicleId: { in: vehicleIds },
          date: { gte: dayStart, lte: dayEnd },
        },
      });

      last7Days.push({
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        distance:
          Math.round(
            daySummaries.reduce((acc, s) => acc + s.totalDistance, 0) * 10,
          ) / 10,
        fuel:
          Math.round(
            daySummaries.reduce((acc, s) => acc + s.totalFuelUsed, 0) * 10,
          ) / 10,
        hours:
          Math.round(
            daySummaries.reduce((acc, s) => acc + s.runningTime, 0) * 10,
          ) / 10,
      });
    }

    // Top vehicles by distance this week
    const vehicleWeekData = new Map<string, number>();
    weekSummaries.forEach((s) => {
      const current = vehicleWeekData.get(s.vehicleId) || 0;
      vehicleWeekData.set(s.vehicleId, current + s.totalDistance);
    });

    const topVehicles = vehicles
      .map((v) => ({
        id: v.id,
        name: v.plateNumber,
        type: v.Type,
        distance: vehicleWeekData.get(v.id) || 0,
      }))
      .sort((a, b) => b.distance - a.distance)
      .slice(0, 5);

    return NextResponse.json({
      fleet: {
        total: vehicles.length || 0,
        active: activeCount || 0,
        idle: idleCount || 0,
        offline: offlineCount || 0,
      },
      today: {
        distance: Math.round(todayDistance * 10) / 10,
        fuel: Math.round(todayFuel * 10) / 10,
        runningHours: Math.round(todayRunningHours * 10) / 10,
        idleHours: Math.round(todayIdleHours * 10) / 10,
      },
      week: {
        distance: Math.round(weekDistance * 10) / 10,
        fuel: Math.round(weekFuel * 10) / 10,
        runningHours: Math.round(weekRunningHours * 10) / 10,
      },
      chartData: last7Days,
      topVehicles,
      alerts: recentAlerts.map((a) => ({
        id: a.id,
        vehicle: a.vehicle?.plateNumber || "Unknown",
        type: a.type,
        severity: a.severity,
        message: a.message,
        time: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
