import { NextResponse } from "next/server";
import { getSession } from "@/app/_lib/sessions";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      userId: Number(session.sub),
      role: session.role,
      companyId: session.companyId,
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
