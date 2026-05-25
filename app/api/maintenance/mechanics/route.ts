import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/_lib/sessions";

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

    const mechanics = await prisma.user.findMany({
      where: {
        companyId: user.companyId,
        role: "MECHANIC",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    // Get assigned work order counts
    const counts = await prisma.maintenance.groupBy({
      by: ["mechanicId"],
      where: {
        mechanicId: { not: null },
        status: { in: ["SCHEDULED", "ASSIGNED", "IN_PROGRESS"] },
      },
      _count: { id: true },
    });
    const countMap = new Map(counts.map((c) => [c.mechanicId!, c._count.id]));

    const result = mechanics.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      isActive: m.isActive,
      activeWorkOrders: countMap.get(m.id) || 0,
      joinedAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json({ mechanics: result });
  } catch (error) {
    console.error("Mechanics list error:", error);
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
    const { name, email, password } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const hashedPw = password ? await bcrypt.hash(password, 10) : await bcrypt.hash("mechanic123", 10);

    const mechanic = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPw,
        role: "MECHANIC",
        companyId: user.companyId,
        isActive: true,
        verifiedAt: new Date(),
      },
      select: { id: true, name: true, email: true, isActive: true, createdAt: true },
    });

    return NextResponse.json({
      mechanic: {
        id: mechanic.id,
        name: mechanic.name,
        email: mechanic.email,
        isActive: mechanic.isActive,
        activeWorkOrders: 0,
        joinedAt: mechanic.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Create mechanic error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, email, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Mechanic ID is required" }, { status: 400 });
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data,
      select: { id: true, name: true, email: true, isActive: true },
    });

    return NextResponse.json({ mechanic: updated });
  } catch (error) {
    console.error("Update mechanic error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}