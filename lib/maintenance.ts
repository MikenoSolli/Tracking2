// lib/maintenance.ts
// ─── Shared utilities for the maintenance subsystem ─────────────────

import {
  differenceInDays,
  differenceInHours,
  addDays,
  isPast,
} from "date-fns";

// ─── Types ──────────────────────────────────────────────────────────

export type MaintenancePriority = "P0" | "P1" | "P2" | "P3";
export type HealthZone = "critical" | "warning" | "healthy";

export interface HealthScoreInput {
  activeFaults: { severity: string }[];
  overdueCount: number;
  recentCompletedCount: number;
}

export interface IntervalCheck {
  timeIntervalDays: number | null;
  mileageIntervalKm: number | null;
  engineHoursInterval: number | null;
}

export interface LastService {
  serviceDate: Date;
  odometerAtService: number | null;
  engineHoursAtService: number | null;
}

export interface CurrentState {
  odometer: number | null;
  engineHours: number | null;
}

// ─── Priority ──────────────────────────────────────────────────────

const PRIORITY_SEVERITY_MAP: Record<string, MaintenancePriority> = {
  CRITICAL: "P0",
  HIGH: "P1",
  MEDIUM: "P2",
  LOW: "P3",
};

export function getMaintenancePriority(
  severity: string,
  scheduledDate: Date,
): MaintenancePriority {
  const daysOverdue = differenceInDays(new Date(), scheduledDate);

  if (severity === "CRITICAL" || daysOverdue > 14) return "P0";
  if (severity === "HIGH" || daysOverdue > 7) return "P1";
  if (severity === "MEDIUM" || daysOverdue > 0) return "P2";
  return "P3";
}

export function getPriorityLabel(priority: MaintenancePriority): string {
  const labels: Record<MaintenancePriority, string> = {
    P0: "Critical",
    P1: "High",
    P2: "Medium",
    P3: "Low",
  };
  return labels[priority];
}

// ─── Health Score ──────────────────────────────────────────────────

const FAULT_PENALTIES: Record<string, number> = {
  CRITICAL: 40,
  HIGH: 20,
  MEDIUM: 10,
  LOW: 5,
};

const OVERDUE_PENALTY = 15;
const RECENT_COMPLETION_BONUS = 10;

export function calculateHealthScore(input: HealthScoreInput): number {
  let score = 100;

  for (const fault of input.activeFaults) {
    score -= FAULT_PENALTIES[fault.severity] ?? 5;
  }

  score -= input.overdueCount * OVERDUE_PENALTY;
  score += input.recentCompletedCount * RECENT_COMPLETION_BONUS;

  return Math.max(0, Math.min(100, score));
}

export function getHealthZone(score: number): HealthZone {
  if (score < 50) return "critical";
  if (score < 75) return "warning";
  return "healthy";
}

export function getHealthColor(score: number): string {
  if (score < 50) return "text-red-600 bg-red-50 border-red-200";
  if (score < 75) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-emerald-600 bg-emerald-50 border-emerald-200";
}

// ─── Interval Scheduling ──────────────────────────────────────────

const GRACE_DAYS = 3;
const GRACE_MILEAGE = 500;
const GRACE_ENGINE_HOURS = 10;
const SCHEDULE_BUFFER_DAYS = 7;

export interface IntervalResult {
  thresholdCrossed: boolean;
  crossedBy: string | null;
  dueDate: Date;
  deltas: {
    daysSinceLast: number | null;
    kmSinceLast: number | null;
    hoursSinceLast: number | null;
  };
}

export function checkServiceInterval(
  interval: IntervalCheck,
  lastService: LastService | null,
  currentState: CurrentState,
): IntervalResult {
  const now = new Date();
  const deltas = {
    daysSinceLast: lastService
      ? differenceInDays(now, lastService.serviceDate)
      : null,
    kmSinceLast:
      lastService?.odometerAtService != null &&
      currentState.odometer != null
        ? currentState.odometer - lastService.odometerAtService
        : null,
    hoursSinceLast:
      lastService?.engineHoursAtService != null &&
      currentState.engineHours != null
        ? currentState.engineHours - lastService.engineHoursAtService
        : null,
  };

  const exceeded: string[] = [];

  if (
    interval.timeIntervalDays != null &&
    deltas.daysSinceLast != null &&
    deltas.daysSinceLast >= interval.timeIntervalDays - GRACE_DAYS
  ) {
    exceeded.push("time");
  }

  if (
    interval.mileageIntervalKm != null &&
    deltas.kmSinceLast != null &&
    deltas.kmSinceLast >= interval.mileageIntervalKm - GRACE_MILEAGE
  ) {
    exceeded.push("mileage");
  }

  if (
    interval.engineHoursInterval != null &&
    deltas.hoursSinceLast != null &&
    deltas.hoursSinceLast >= interval.engineHoursInterval - GRACE_ENGINE_HOURS
  ) {
    exceeded.push("engine_hours");
  }

  const thresholdCrossed = exceeded.length > 0;

  const dueDate = thresholdCrossed
    ? addDays(now, SCHEDULE_BUFFER_DAYS)
    : lastService
      ? calculateExpectedDueDate(interval, lastService)
      : addDays(now, 7);

  return {
    thresholdCrossed,
    crossedBy: thresholdCrossed ? exceeded.join(", ") : null,
    dueDate,
    deltas,
  };
}

function calculateExpectedDueDate(
  interval: IntervalCheck,
  lastService: LastService,
): Date {
  const dates: Date[] = [];

  if (interval.timeIntervalDays != null) {
    dates.push(addDays(lastService.serviceDate, interval.timeIntervalDays));
  }

  if (dates.length === 0) {
    return addDays(lastService.serviceDate, 30);
  }

  return dates.sort((a, b) => a.getTime() - b.getTime())[0];
}

// ─── Days Overdue ─────────────────────────────────────────────────

export function getDaysOverdue(scheduledDate: Date): number {
  return differenceInDays(new Date(), scheduledDate);
}

export function getOverdueLabel(days: number): string {
  if (days <= 0) return `${Math.abs(days)} days remaining`;
  if (days === 0) return "Due today";
  if (days === 1) return "1 day overdue";
  return `${days} days overdue`;
}

// ─── Colors & Labels ──────────────────────────────────────────────

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-700 border-blue-200",
    ASSIGNED: "bg-indigo-100 text-indigo-700 border-indigo-200",
    IN_PROGRESS: "bg-amber-100 text-amber-700 border-amber-200",
    PENDING_PARTS: "bg-orange-100 text-orange-700 border-orange-200",
    ON_HOLD: "bg-purple-100 text-purple-700 border-purple-200",
    COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    APPROVED: "bg-teal-100 text-teal-700 border-teal-200",
    CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
    ESCALATED: "bg-red-100 text-red-700 border-red-200",
  };
  return map[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

export function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    LOW: "bg-slate-100 text-slate-600",
    MEDIUM: "bg-amber-100 text-amber-700",
    HIGH: "bg-red-100 text-red-700",
    CRITICAL: "bg-red-600 text-white",
  };
  return map[severity] ?? "bg-slate-100 text-slate-600";
}

export function getOriginLabel(origin: string): string {
  const map: Record<string, string> = {
    INTERVAL: "Auto-scheduled",
    FAULT: "Fault-triggered",
    MANUAL: "Manually created",
    DRIVER: "Driver-reported",
  };
  return map[origin] ?? origin;
}

// ─── Formatting ───────────────────────────────────────────────────

export function formatCost(cost: number | null | undefined): string {
  if (cost == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cost);
}

export function formatDuration(hours: number | null | undefined): string {
  if (hours == null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours % 1 === 0) return `${hours}h`;
  return `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;
}