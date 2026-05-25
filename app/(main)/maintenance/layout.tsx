"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Wrench, CalendarDays, FileStack } from "lucide-react";

const subNavLinks = [];

export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1600px] mx-auto">{children}</div>
    </div>
  );
}
