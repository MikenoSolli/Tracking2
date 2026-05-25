import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/_lib/sessions";

export const dynamic = "force-dynamic";

export async function POST(
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
    const { note } = body;

    if (!note) {
      return NextResponse.json({ error: "Note is required" }, { status: 400 });
    }

    // Fetch current work order
    const wo = await prisma.maintenance.findUnique({
      where: { id },
      select: { notes: true },
    });

    if (!wo) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const timestamp = new Date().toISOString();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const entry = `[${timestamp}] ${user?.name || "Unknown"}: ${note}`;
    const updatedNotes = wo.notes ? `${wo.notes}\n${entry}` : entry;

    const updated = await prisma.maintenance.update({
      where: { id },
      data: { notes: updatedNotes },
      select: { id: true, notes: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Add Note Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
