import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { randomUUID, createHash } from "crypto";

const secretKey = process.env.SESSION_SECRET;
if (!secretKey) {
  throw new Error("SESSION_SECRET environment variable is required");
}
const encodedKey = new TextEncoder().encode(secretKey);

const ACCESS_TOKEN_DURATION = 45 * 60; // 45 min in seconds
const REFRESH_TOKEN_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

export interface SessionPayload {
  sub: string;
  role: string;
  companyId: number;
  iat?: number;
  exp?: number;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAccessToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_DURATION}s`)
    .sign(encodedKey);
}

export async function verifyAccessToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(userId: number, userRole: string, companyId: number) {
  const rawToken = randomUUID();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DURATION * 1000);
  const cookieStore = await cookies();

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const accessToken = await createAccessToken({
    sub: String(userId),
    role: userRole,
    companyId,
  });

  cookieStore.set("access_token", accessToken, {
    httpOnly: true,
    //secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_DURATION,
  });

  cookieStore.set("refresh_token", rawToken, {
    httpOnly: true,
    //secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/refresh",
    maxAge: REFRESH_TOKEN_DURATION,
  });
}

export async function refreshAccessToken(): Promise<boolean> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get("refresh_token")?.value;
  if (!rawToken) return false;

  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: { select: { role: true, companyId: true, isActive: true } } },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");
    return false;
  }

  // Rotate: delete old session, create new one
  const newRawToken = randomUUID();
  const newTokenHash = hashToken(newRawToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_DURATION * 1000);

  await prisma.session.create({
    data: {
      userId: session.userId,
      tokenHash: newTokenHash,
      expiresAt: newExpiresAt,
    },
  });
  await prisma.session.delete({ where: { id: session.id } });

  const newAccessToken = await createAccessToken({
    sub: String(session.userId),
    role: session.user.role,
    companyId: session.user.companyId,
  });

  cookieStore.set("access_token", newAccessToken, {
    httpOnly: true,
    //secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_DURATION,
  });

  cookieStore.set("refresh_token", newRawToken, {
    httpOnly: true,
    //secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/refresh",
    maxAge: REFRESH_TOKEN_DURATION,
  });

  return true;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) return null;

  return verifyAccessToken(accessToken);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get("refresh_token")?.value;

  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    await prisma.session.deleteMany({ where: { tokenHash } });
  }

  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
}

export async function cleanExpiredSessions() {
  await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
