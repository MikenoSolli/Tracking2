"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Ban, User, Activity, CheckCircle2 } from "lucide-react";
import { getStatusColor, getSeverityColor } from "@/lib/maintenance";

// ─── Skeleton ─────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-slate-200", className)} />
  );
}

// ─── Metric Skeleton ──────────────────────────────────────────────

export function MetricSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-20" />
        </div>
        <Skeleton className="size-8 rounded-lg" />
      </div>
    </Card>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────

export function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-md cursor-pointer",
      )}
      onClick={onClick}
    >
      <div className={cn("absolute inset-0 opacity-[0.04]", color)} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {sub && <p className="text-xs text-slate-400">{sub}</p>}
          </div>
          <div className={cn("rounded-lg p-2.5", color)}>
            <Icon
              className={cn(
                "size-5",
                color.replace("bg-", "text-").replace("-100", "-600"),
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Health Gauge ────────────────────────────────────────────────

export function HealthGauge({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score < 50 ? "#dc2626" : score < 75 ? "#d97706" : "#059669";

  return (
    <div className="relative flex items-center justify-center size-16">
      <svg className="size-16 -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="5"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span
        className={cn(
          "absolute text-sm font-bold",
          score < 50
            ? "text-red-600"
            : score < 75
              ? "text-amber-600"
              : "text-emerald-600",
        )}
      >
        {score}
      </span>
    </div>
  );
}

// ─── Calendar Grid ───────────────────────────────────────────────

export function CalendarGrid({
  month,
  data,
  onDayClick,
}: {
  month: string;
  data: Record<string, unknown[]>;
  onDayClick: (date: string) => void;
}) {
  const [year, mon] = month.split("-").map(Number);
  const firstDay = new Date(year, mon - 1, 1);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const startOffset = firstDay.getDay();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const days: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const dayHeaders = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
        {dayHeaders.map((dh, i) => (
          <div
            key={`dh-${i}`}
            className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider"
          >
            {dh}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const dateStr = d ? `${month}-${String(d).padStart(2, "0")}` : "";
          const entries = dateStr && data[dateStr] ? data[dateStr] : [];
          const isToday = dateStr === todayStr;

          return (
            <button
              key={i}
              disabled={!d}
              onClick={() => d && onDayClick(dateStr)}
              className={cn(
                "relative flex flex-col items-center justify-start p-1.5 min-h-[60px] border-b border-r border-slate-100 text-sm transition-colors hover:bg-slate-50",
                isToday &&
                  "ring-2 ring-amber-400 ring-inset z-10 bg-amber-50/30",
                !d && "bg-slate-50/50",
              )}
            >
              {d && (
                <>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isToday ? "text-amber-700" : "text-slate-700",
                    )}
                  >
                    {d}
                  </span>
                  {entries.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                      <span className="inline-flex items-center justify-center size-4 rounded-full bg-amber-100 text-[9px] font-bold text-amber-700">
                        {entries.length}
                      </span>
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Cancel Dialog ───────────────────────────────────────────────

export function CancelDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Work Order</DialogTitle>
          <DialogDescription>
            Provide a reason for cancellation. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="cancel-reason-main">Reason</Label>
          <textarea
            id="cancel-reason-main"
            className="w-full min-h-[80px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="e.g. No longer needed, duplicate entry..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep
          </Button>
          <Button
            variant="destructive"
            disabled={loading || !reason.trim()}
            onClick={() => onConfirm(reason)}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Cancel Work Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Status Actions ──────────────────────────────────────────────

export function StatusActions({
  status,
  onStatusChange,
  loading,
}: {
  status: string;
  onStatusChange: (newStatus: string) => void;
  loading: boolean;
}) {
  if (status === "COMPLETED" || status === "CANCELLED") return null;

  const nextStatus =
    status === "SCHEDULED" || status === "ASSIGNED"
      ? "IN_PROGRESS"
      : status === "IN_PROGRESS"
        ? "COMPLETED"
        : null;

  if (!nextStatus) return null;

  const label = nextStatus === "COMPLETED" ? "Complete" : "Start";
  const variant = nextStatus === "COMPLETED" ? "default" : "secondary";

  return (
    <Button
      variant={variant}
      size="xs"
      disabled={loading}
      onClick={() => onStatusChange(nextStatus)}
    >
      {loading && <Loader2 className="size-3 animate-spin" />}
      {label}
    </Button>
  );
}
