import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { sendVerificationEmail } from "@/lib/email";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const companyType = (formData.get("companyType") as string) || "INDIVIDUAL";
    const companyName = formData.get("companyName") as string;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const code = generateCode();
    const hashedCode = await bcrypt.hash(code, 10);

    const company = await prisma.companies.create({
      data: {
        name: companyName || email,
        companyType: companyType as any,
        serviceType: "FLEET",
      },
    });

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "OWNER",
        companyId: company.id,
        isActive: false,
        verificationToken: hashedCode,
      },
    });

    // Non-blocking email — account is created regardless
    let emailSent = false;
    try {
      await sendVerificationEmail(email, name, code);
      emailSent = true;
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? "Account created! Check your email for the verification code."
        : "Account created! Could not send email — request a new code below.",
      email,
      emailSent,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "This email is already registered." }, { status: 400 });
    }
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
