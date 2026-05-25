import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getSession } from "@/app/_lib/sessions";
import { calculateHealthScore, getHealthZone } from "@/lib/maintenance";

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

    // Get all active vehicles with their status
    const vehicles = await prisma.vehicle.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        plateNumber: true,
        make: true,
        model: true,
        Type: true,
        status: { select: { latitude: true, longitude: true } },
      },
    });

    const vehicleIds = vehicles.map((v) => v.id);

    // Get active faults grouped by vehicle
    const activeFaults = await prisma.vehicle_faults.findMany({
      where: { vehicleId: { in: vehicleIds }, isActive: true },
      select: { vehicleId: true, severity: true as any },
    });

    // Get overdue maintenance grouped by vehicle
    const now = new Date();
    const overdueWOs = await prisma.maintenance.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        scheduledDate: { lt: now },
        status: { in: ["SCHEDULED", "ASSIGNED"] },
      },
      select: { vehicleId: true },
    });

    // Get recently completed WOs (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentCompleted = await prisma.maintenance.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        status: "COMPLETED",
        completedAt: { gte: thirtyDaysAgo },
      },
      select: { vehicleId: true },
    });

    // Build vehicle-level aggregates
    const faultsByVehicle = new Map<string, { severity: string }[]>();
    for (const f of activeFaults) {
      const list = faultsByVehicle.get(f.vehicleId) || [];
      list.push({ severity: f.severity });
      faultsByVehicle.set(f.vehicleId, list);
    }

    const overdueByVehicle = new Map<string, number>();
    for (const wo of overdueWOs) {
      overdueByVehicle.set(wo.vehicleId, (overdueByVehicle.get(wo.vehicleId) || 0) + 1);
    }

    const completedByVehicle = new Map<string, number>();
    for (const wo of recentCompleted) {
      completedByVehicle.set(wo.vehicleId, (completedByVehicle.get(wo.vehicleId) || 0) + 1);
    }

    // Compute health for each vehicle
    const healthData = vehicles.map((v) => {
      const faults = faultsByVehicle.get(v.id) || [];
      const overdueCount = overdueByVehicle.get(v.id) || 0;
      const recentCompletedCount = completedByVehicle.get(v.id) || 0;
      const score = calculateHealthScore({ activeFaults: faults, overdueCount, recentCompletedCount });

      return {
        vehicleId: v.id,
        plateNumber: v.plateNumber,
        make: v.make,
        model: v.model,
        type: v.Type,
        lat: v.status?.latitude,
        lng: v.status?.longitude,
        healthScore: score,
        healthZone: getHealthZone(score),
        activeFaults: faults.length,
        overdueCount,
      };
    });

    // Aggregate fleet stats
    const avgScore = healthData.length > 0
      ? Math.round(healthData.reduce((sum, v) => sum + v.healthScore, 0) / healthData.length)
      : 0;

    const criticalCount = healthData.filter((v) => v.healthZone === "critical").length;
    const warningCount = healthData.filter((v) => v.healthZone === "warning").length;
    const healthyCount = healthData.filter((v) => v.healthZone === "healthy").length;

    return NextResponse.json({
      vehicles: healthData,
      fleet: {
        avgScore,
        total: healthData.length,
        critical: criticalCount,
        warning: warningCount,
        healthy: healthyCount,
        totalFaults: activeFaults.length,
        totalOverdue: overdueWOs.length,
      },
    });
  } catch (error) {
    console.error("Health Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
