import { NextResponse } from "next/server";
import { refreshAccessToken, verifyAccessToken } from "@/app/_lib/sessions";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const success = await refreshAccessToken();
    if (!success) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;
    const payload = accessToken ? await verifyAccessToken(accessToken) : null;

    return NextResponse.json({
      success: true,
      userId: payload ? Number(payload.sub) : null,
      role: payload?.role,
      companyId: payload?.companyId,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    const payload = await verifyAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    const exp = payload.exp as number;
    const msLeft = exp * 1000 - Date.now();

    return NextResponse.json({
      valid: true,
      userId: Number(payload.sub),
      role: payload.role,
      companyId: payload.companyId,
      msLeft,
    });
  } catch (error) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
}
