import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { code, email } = await req.json();

    if (!code || !email) {
      return NextResponse.json({ error: "Code and email are required" }, { status: 400 });
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, verificationToken: true, verifiedAt: true, isActive: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.verifiedAt) {
      return NextResponse.json({ message: "already-verified" });
    }

    if (!user.verificationToken) {
      return NextResponse.json({ error: "No verification code found. Request a new one." }, { status: 400 });
    }

    const isValid = await bcrypt.compare(code, user.verificationToken);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        verifiedAt: new Date(),
        verificationToken: null,
      },
    });

    return NextResponse.json({ success: true, message: "verified" });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, verifiedAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.verifiedAt) {
      return NextResponse.json({ message: "already-verified" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(code, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken: hashedCode },
    });

    const { sendVerificationEmail } = await import("@/lib/email");
    await sendVerificationEmail(email, user.name || "there", code);

    return NextResponse.json({ success: true, message: "Code resent" });
  } catch (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}