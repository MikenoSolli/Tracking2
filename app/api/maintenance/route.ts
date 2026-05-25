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
    const status = searchParams.get("status");
    const vehicleType = searchParams.get("vehicleType");
    const vehicleId = searchParams.get("vehicleId");
    const severity = searchParams.get("severity");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = { vehicle: { companyId: user.companyId } };

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    if (status && status !== "all") {
      const statuses = status.split(",");
      where.status = { in: statuses };
    }

    if (severity && severity !== "all") {
      where.severity = severity as any;
    }

    if (vehicleType && vehicleType !== "all") {
      where.vehicle = { ...where.vehicle, Type: vehicleType as any };
    }

    if (dateFrom || dateTo) {
      where.scheduledDate = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    if (search) {
      where.OR = [
        { description: { contains: search } },
        { vehicle: { plateNumber: { contains: search } } },
      ];
    }

    const [total, workOrders] = await Promise.all([
      prisma.maintenance.count({ where }),
      prisma.maintenance.findMany({
        where,
        orderBy: [
          { scheduledDate: "asc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          vehicle: { select: { id: true, plateNumber: true, make: true, model: true, Type: true } },
          mechanic: { select: { id: true, name: true } },
          faults: { where: { isActive: true }, select: { id: true, faultCode: true, severity: true } },
        },
      }),
    ]);

    const mapped = workOrders.map((wo) => ({
      id: wo.id,
      vehicle: wo.vehicle.plateNumber || `${wo.vehicle.make} ${wo.vehicle.model}`,
      vehicleId: wo.vehicle.id,
      vehicleType: wo.vehicle.Type,
      description: wo.description,
      status: wo.status,
      severity: wo.severity,
      origin: wo.origin,
      scheduledDate: wo.scheduledDate.toISOString(),
      serviceDate: wo.serviceDate.toISOString(),
      cost: wo.cost,
      mechanic: wo.mechanic?.name || null,
      mechanicId: wo.mechanic?.id || null,
      activeFaults: wo.faults.length,
      completedAt: wo.completedAt?.toISOString() || null,
      createdAt: wo.createdAt.toISOString(),
    }));

    return NextResponse.json({
      workOrders: mapped,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Maintenance List Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const userId = Number(session?.sub);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      vehicleId, description, scheduledDate, severity, mechanicId, templateId,
    } = body;

    if (!vehicleId || !description) {
      return NextResponse.json(
        { error: "vehicleId and description are required" },
        { status: 400 },
      );
    }

    const workOrder = await prisma.maintenance.create({
      data: {
        vehicleId,
        description,
        scheduledDate: new Date(scheduledDate || Date.now()),
        serviceDate: new Date(scheduledDate || Date.now()),
        severity: severity || "MEDIUM",
        status: "SCHEDULED",
        origin: "MANUAL",
        mechanicId: mechanicId || undefined,
        templateId: templateId || undefined,
      },
      include: {
        vehicle: { select: { id: true, plateNumber: true, make: true, model: true, Type: true } },
        mechanic: { select: { id: true, name: true } },
      },
    });

    await prisma.alert.create({
      data: {
        vehicleId,
        type: "MAINTENANCE_DUE",
        severity: (severity || "MEDIUM") as any,
        message: `Scheduled: ${description} for ${workOrder.vehicle.plateNumber || "vehicle"}`,
        isMaintenanceRelated: true,
        maintenanceId: workOrder.id,
        alertCategory: "MAINTENANCE",
      },
    });

    return NextResponse.json(workOrder, { status: 201 });
  } catch (error) {
    console.error("Create Work Order Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}