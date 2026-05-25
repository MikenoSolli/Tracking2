import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachDayOfInterval, eachMonthOfInterval,
  format, isSameDay, isSameMonth
} from "date-fns";
import { getSession } from "@/app/_lib/sessions";

// ─── Cache ─────────────────────────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000;
const reportCache = new Map<string, { data: unknown; timestamp: number }>();

function getCached<T>(key: string): T | null {
  const entry = reportCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { reportCache.delete(key); return null; }
  return entry.data as T;
}
function setCache(key: string, data: unknown) {
  reportCache.set(key, { data, timestamp: Date.now() });
}

// ─── Response Type ─────────────────────────────────────────────────
interface ReportVehicleMetric {
  id: string; plate: string; type: string; make: string; model: string;
  distance: number; fuel: number; runningTime: number; idleTime: number;
  utilization: number; avgSpeed: number;
}
interface ReportResponse {
  period: { range: string; start: string; end: string };
  fleet: {
    total: number; active: number; idle: number; offline: number;
    typeBreakdown: { type: string; count: number }[];
  };
  stats: {
    distance: number; fuel: number; engineHours: number;
    runningTime: number; idleTime: number;
    utilization: number; avgSpeed: number; fuelEfficiency: number;
  };
  chartData: { name: string; distance: number; fuel: number; hours: number }[];
  vehicles: ReportVehicleMetric[];
  topVehicles: { id: string; name: string; plate: string; distance: number }[];
  alerts: { id: string; vehicle: string; type: string; severity: string; message: string; time: string }[];
  maintenance: { id: string; vehicle: string; description: string; status: string; scheduledDate: string }[];
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || new Date().toISOString();
    const range = searchParams.get("range") || "daily";
    const targetDate = new Date(dateParam);

    // Session — single source of truth
    const session = await getSession();
    const userId = Number(session?.sub);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cache check
    const cacheKey = `report_general_${userId}_${dateParam}_${range}`;
    const cached = getCached<ReportResponse>(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Company check
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    if (!user?.companyId) {
      return NextResponse.json({ error: "User has no company" }, { status: 403 });
    }

    // ─── Vehicles ──────────────────────────────────────────────
    const vehicles = await prisma.vehicle.findMany({
      where: { companyId: user.companyId, isActive: true },
      select: { id: true, plateNumber: true, Type: true, make: true, model: true },
    });
    const vehicleIds = vehicles.map((v) => v.id);

    if (vehicleIds.length === 0) {
      const empty: ReportResponse = {
        period: { range, start: "", end: "" },
        fleet: { total: 0, active: 0, idle: 0, offline: 0, typeBreakdown: [] },
        stats: { distance: 0, fuel: 0, engineHours: 0, runningTime: 0, idleTime: 0, utilization: 0, avgSpeed: 0, fuelEfficiency: 0 },
        chartData: [],
        vehicles: [],
        topVehicles: [],
        alerts: [],
        maintenance: [],
      };
      return NextResponse.json(empty);
    }

    // ─── Date Windows ──────────────────────────────────────────
    let start: Date, end: Date, intervals: Date[], fmt: string;
    switch (range) {
      case "weekly":
        start = startOfWeek(targetDate);
        end = endOfWeek(targetDate);
        intervals = eachDayOfInterval({ start, end });
        fmt = "EEE";
        break;
      case "monthly":
        start = startOfMonth(targetDate);
        end = endOfMonth(targetDate);
        intervals = eachDayOfInterval({ start, end });
        fmt = "dd MMM";
        break;
      case "yearly":
        start = startOfYear(targetDate);
        end = endOfYear(targetDate);
        intervals = eachMonthOfInterval({ start, end });
        fmt = "MMM";
        break;
      default: // daily
        start = startOfDay(targetDate);
        end = endOfDay(targetDate);
        intervals = eachDayOfInterval({ start, end });
        fmt = "EEE";
    }

    // ─── Fleet Status Counts ──────────────────────────────────
    const latestStatuses = await prisma.status.findMany({
      where: { vehicleId: { in: vehicleIds } },
      orderBy: { updatedAt: "desc" },
      take: vehicleIds.length,
    });
    const statusByVehicle = new Map(latestStatuses.map((s) => [s.vehicleId, s]));
    let active = 0, idle = 0, offline = 0;
    vehicles.forEach((v) => {
      const s = statusByVehicle.get(v.id);
      if (!s || s.state === "OFFLINE") offline++;
      else if (s.state === "ACTIVE") active++;
      else if (s.state === "IDLE") idle++;
    });

    // ─── Type Breakdown ────────────────────────────────────────
    const typeBreakdown = await prisma.vehicle.groupBy({
      where: { companyId: user.companyId, isActive: true },
      by: ["Type"],
      _count: { id: true },
    });

    // ─── Summaries for the period ──────────────────────────────
    const summaries = await prisma.dailySummary.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        date: { gte: start, lte: end },
      },
    });

    // ─── Chart Data ────────────────────────────────────────────
    const chartData = intervals.map((ivStart) => {
      const ivEnd =
        range === "yearly"
          ? new Date(ivStart.getFullYear(), ivStart.getMonth() + 1, 0, 23, 59, 59)
          : new Date(ivStart.getTime() + 86400000);

      const bucket = summaries.filter((s) => {
        if (range === "yearly") return isSameMonth(s.date, ivStart);
        return s.date >= ivStart && s.date < ivEnd;
      });

      return {
        name: format(ivStart, fmt),
        distance: bucket.reduce((a, s) => a + s.totalDistance, 0),
        fuel: bucket.reduce((a, s) => a + s.totalFuelUsed, 0),
        hours: bucket.reduce((a, s) => a + s.runningTime + s.idleTime, 0),
      };
    });

    // ─── Aggregate Stats ───────────────────────────────────────
    const totalDistance = summaries.reduce((a, s) => a + s.totalDistance, 0);
    const totalFuel = summaries.reduce((a, s) => a + s.totalFuelUsed, 0);
    const totalRunning = summaries.reduce((a, s) => a + s.runningTime, 0);
    const totalIdle = summaries.reduce((a, s) => a + s.idleTime, 0);
    const totalEngineHrs = summaries.reduce((a, s) => a + s.totalEngineHrs, 0);
    const totalTime = totalRunning + totalIdle || 1;
    const utilization = Math.round((totalRunning / totalTime) * 100);
    const avgSpeed = totalRunning > 0 ? totalDistance / totalRunning : 0;
    const fuelEfficiency = totalFuel > 0 ? totalDistance / totalFuel : 0;

    // ─── Per-Vehicle Breakdown ─────────────────────────────────
    const vehicleMetrics: ReportVehicleMetric[] = vehicles.map((v) => {
      const vs = summaries.filter((s) => s.vehicleId === v.id);
      const d = vs.reduce((a, s) => a + s.totalDistance, 0);
      const f = vs.reduce((a, s) => a + s.totalFuelUsed, 0);
      const rt = vs.reduce((a, s) => a + s.runningTime, 0);
      const it = vs.reduce((a, s) => a + s.idleTime, 0);
      const tt = rt + it || 1;
      return {
        id: v.id,
        plate: v.plateNumber || "N/A",
        type: v.Type,
        make: v.make || "",
        model: v.model || "",
        distance: Math.round(d * 100) / 100,
        fuel: Math.round(f * 100) / 100,
        runningTime: Math.round(rt * 100) / 100,
        idleTime: Math.round(it * 100) / 100,
        utilization: Math.round((rt / tt) * 100),
        avgSpeed: rt > 0 ? Math.round((d / rt) * 100) / 100 : 0,
      };
    });

    // ─── Top Vehicles ──────────────────────────────────────────
    const topVehicles = vehicleMetrics
      .filter((v) => v.distance > 0)
      .sort((a, b) => b.distance - a.distance)
      .slice(0, 5)
      .map((v) => ({ id: v.id, name: v.make && v.model ? `${v.make} ${v.model}` : v.plate, plate: v.plate, distance: v.distance }));

    // ─── Alerts ────────────────────────────────────────────────
    const alertRecords = await prisma.alert.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        createdAt: { gte: start, lte: end },
      },
      include: { vehicle: { select: { plateNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // ─── Maintenance ───────────────────────────────────────────
    const maintRecords = await prisma.maintenance.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        scheduledDate: { gte: start, lte: end },
      },
      include: { vehicle: { select: { plateNumber: true } } },
      orderBy: { scheduledDate: "asc" },
      take: 10,
    });

    // ─── Build Response ────────────────────────────────────────
    const response: ReportResponse = {
      period: { range, start: start.toISOString(), end: end.toISOString() },
      fleet: {
        total: vehicles.length,
        active,
        idle,
        offline,
        typeBreakdown: typeBreakdown.map((t) => ({ type: t.Type, count: t._count.id })),
      },
      stats: {
        distance: Math.round(totalDistance * 100) / 100,
        fuel: Math.round(totalFuel * 100) / 100,
        engineHours: Math.round(totalEngineHrs * 100) / 100,
        runningTime: Math.round(totalRunning * 100) / 100,
        idleTime: Math.round(totalIdle * 100) / 100,
        utilization,
        avgSpeed: Math.round(avgSpeed * 100) / 100,
        fuelEfficiency: Math.round(fuelEfficiency * 100) / 100,
      },
      chartData,
      vehicles: vehicleMetrics.filter((v) => v.distance > 0 || v.runningTime > 0),
      topVehicles,
      alerts: alertRecords.map((a) => ({
        id: a.id,
        vehicle: a.vehicle?.plateNumber || "Unknown",
        type: a.type,
        severity: a.severity,
        message: a.message,
        time: a.createdAt.toISOString(),
      })),
      maintenance: maintRecords.map((m) => ({
        id: m.id,
        vehicle: m.vehicle?.plateNumber || "Unknown",
        description: m.description,
        status: m.status,
        scheduledDate: m.scheduledDate.toISOString(),
      })),
    };

    setCache(cacheKey, response);
    return NextResponse.json(response);
  } catch (error) {
    console.error("General Report Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}