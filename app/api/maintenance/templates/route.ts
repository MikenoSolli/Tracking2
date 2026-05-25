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
    const vehicleType = searchParams.get("vehicleType");

    const where: any = { companyId: user.companyId, isActive: true };
    if (vehicleType && vehicleType !== "all") {
      where.vehicleType = vehicleType as any;
    }

    const templates = await prisma.maintenance_template.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Templates List Error:", error);
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    if (!user?.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name, description, vehicleType,
      timeIntervalDays, mileageIntervalKm, engineHoursInterval,
      defaultSeverity, estimatedCost, estimatedDuration,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const template = await prisma.maintenance_template.create({
      data: {
        companyId: user.companyId,
        name,
        description,
        vehicleType: vehicleType || null,
        timeIntervalDays: timeIntervalDays ? parseInt(timeIntervalDays) : null,
        mileageIntervalKm: mileageIntervalKm ? parseFloat(mileageIntervalKm) : null,
        engineHoursInterval: engineHoursInterval ? parseFloat(engineHoursInterval) : null,
        defaultSeverity: defaultSeverity || "MEDIUM",
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
        estimatedDuration: estimatedDuration ? parseFloat(estimatedDuration) : null,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Create Template Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
