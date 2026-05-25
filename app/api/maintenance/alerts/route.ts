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

    const companyId = user.companyId;
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "all";

    const vehicleIds = (
      await prisma.vehicle.findMany({
        where: { companyId, isActive: true },
        select: { id: true },
      })
    ).map((v) => v.id);

    if (vehicleIds.length === 0) {
      return NextResponse.json({ activeAlerts: [], notifications: [], unassignedIssues: [] });
    }

    // ── Active alerts (maintenance-related, not resolved) ──
    const activeAlerts =
      mode === "all" || mode === "alerts"
        ? await prisma.alert.findMany({
            where: {
              vehicleId: { in: vehicleIds },
              isMaintenanceRelated: true,
              isResolved: false,
            },
            orderBy: [
              { severity: "asc" }, // CRITICAL first (alphabetical: C < H < L < M)
              { createdAt: "desc" },
            ],
            take: 15,
            include: {
              vehicle: { select: { id: true, plateNumber: true } },
              maintenance: { select: { id: true, description: true } },
            },
          })
        : [];

    // ── Notifications (recently resolved/trails) ──
    const notifications =
      mode === "all" || mode === "notifications"
        ? await prisma.alert.findMany({
            where: {
              vehicleId: { in: vehicleIds },
              isMaintenanceRelated: true,
              isResolved: true,
            },
            orderBy: { resolvedAt: "desc" },
            take: 8,
            include: {
              vehicle: { select: { id: true, plateNumber: true } },
            },
          })
        : [];

    // ── Unassigned high-priority issues ──
    const unassignedIssues =
      mode === "all" || mode === "issues"
        ? await prisma.maintenance.findMany({
            where: {
              vehicle: { companyId },
              mechanicId: null,
              status: { in: ["SCHEDULED", "ASSIGNED"] },
            },
            orderBy: [
              { severity: "asc" }, // CRITICAL first
              { scheduledDate: "asc" },
            ],
            take: 15,
            include: {
              vehicle: { select: { id: true, plateNumber: true, make: true, model: true, Type: true } },
            },
          })
        : [];

    return NextResponse.json({
      activeAlerts: activeAlerts.map((a) => ({
        id: a.id,
        message: a.message,
        severity: a.severity,
        type: a.type,
        vehicle: a.vehicle.plateNumber || "Unknown",
        maintenanceDesc: a.maintenance?.description || null,
        createdAt: a.createdAt.toISOString(),
      })),
      notifications: notifications.map((n) => ({
        id: n.id,
        message: n.message,
        severity: n.severity,
        vehicle: n.vehicle.plateNumber || "Unknown",
        resolvedAt: n.resolvedAt?.toISOString() || n.createdAt.toISOString(),
      })),
      unassignedIssues: unassignedIssues.map((wo) => ({
        id: wo.id,
        description: wo.description,
        severity: wo.severity,
        scheduledDate: wo.scheduledDate.toISOString(),
        vehicle: wo.vehicle.plateNumber || `${wo.vehicle.make} ${wo.vehicle.model}`,
        vehicleType: wo.vehicle.Type,
      })),
    });
  } catch (error) {
    console.error("Maintenance overview error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}