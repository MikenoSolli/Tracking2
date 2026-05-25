"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const messages: Record<string, { title: string; desc: string; variant: "success" | "error" | "info" }> = {
  verified: {
    title: "Email Verified!",
    desc: "Your account is now active. You can log in to your dashboard.",
    variant: "success",
  },
  "already-verified": {
    title: "Already Verified",
    desc: "This account has already been verified. You can log in.",
    variant: "info",
  },
  "invalid-token": {
    title: "Invalid Link",
    desc: "This verification link is invalid or has expired. Please register again.",
    variant: "error",
  },
  "missing-token": {
    title: "Missing Token",
    desc: "No verification token was provided. Check your email for the full link.",
    variant: "error",
  },
  failed: {
    title: "Verification Failed",
    desc: "Something went wrong. Please try registering again.",
    variant: "error",
  },
};

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const messageKey = searchParams.get("message") || searchParams.get("error") || "failed";
  const msg = messages[messageKey] || messages.failed;

  const colors = {
    success: "text-green-600 border-green-200 bg-green-50",
    error: "text-red-600 border-red-200 bg-red-50",
    info: "text-blue-600 border-blue-200 bg-blue-50",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm shadow-xl rounded-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold text-center">
            {msg.title}
          </CardTitle>
          <CardDescription className="text-center">
            {msg.desc}
          </CardDescription>
        </CardHeader>
        <CardContent>
<Button asChild className="w-full">
              <Link href="/">Go to Home</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
