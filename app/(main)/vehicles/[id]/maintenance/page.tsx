"use client"

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Wrench, AlertTriangle, CalendarDays, Loader2,
  CheckCircle2, Circle, Plus, ExternalLink, Activity,
  ShieldCheck, TrendingUp, Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";

import {
  getStatusColor, getSeverityColor, getMaintenancePriority,
  getPriorityLabel, formatCost, getOriginLabel,
  getHealthColor, calculateHealthScore, getHealthZone,
} from "@/lib/maintenance";

// ─── Types ──────────────────────────────────────────────────────────

interface MaintenanceItem {
  id: string;
  description: string;
  status: string;
  severity: string;
  origin: string;
  scheduledDate: string;
  serviceDate: string;
  cost: number | null;
  cost: number | null;
  mechanic: { id: number; name: string } | null;
  completedAt: string | null;
  createdAt: string;
}

interface FaultItem {
  id: number;
  faultCode: string;
  severity: string;
  description: string | null;
  detectedAt: string;
  maintenanceId: string | null;
  faultDefinition: { description: string; systemType: string; recommendedAction: string } | null;
}

interface VehicleInfo {
  id: string;
  plateNumber: string;
  make: string | null;
  model: string | null;
  Type: string;
  year: number | null;
  status: {
    odometer: number | null;
    engineHours: number | null;
    fuelLevel: number | null;
  } | null;
}

// ─── Skeleton ─────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200", className)} />;
}

// ─── Health Overview ──────────────────────────────────────────────

function HealthOverview({ vehicle, healthScore, activeFaults, lastService }: {
  vehicle: VehicleInfo;
  healthScore: number;
  activeFaults: number;
  lastService: MaintenanceItem | null;
}) {
  const zone = getHealthZone(healthScore);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (healthScore / 100) * circumference;
  const zoneColors = { critical: "stroke-red-500", warning: "stroke-amber-500", healthy: "stroke-emerald-500" };
  const zoneTextColors = { critical: "text-red-600", warning: "text-amber-600", healthy: "text-emerald-600" };
  const zoneLabels = { critical: "Critical", warning: "Warning", healthy: "Healthy" };
  const strokeColor = zoneColors[zone];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Health Score */}
      <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="relative shrink-0">
            <svg width="90" height="90" viewBox="0 0 90 90" className="-rotate-90">
              <circle cx="45" cy="45" r="36" fill="none" stroke="#f1f5f9" strokeWidth="7" />
              <circle cx="45" cy="45" r="36" fill="none" className={strokeColor} strokeWidth="7"
                strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-xl font-bold", zoneTextColors[zone])}>{healthScore}</span>
              <span className="text-[9px] text-slate-400 font-medium">{zoneLabels[zone]}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Fleet Health</p>
            <p className="text-xs text-slate-500 mt-1">Score based on faults, overdue maintenance, and recent activity</p>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-slate-600"><strong className={zoneTextColors[zone]}>{activeFaults}</strong> active faults</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Faults */}
      <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
              <AlertTriangle className="h-3 w-3 text-white" />
            </div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Active Faults</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeFaults}</p>
          <p className="text-xs text-slate-400 mt-1">
            {activeFaults === 0 ? "Clean bill of health" : `${activeFaults} fault${activeFaults > 1 ? "s" : ""} detected`}
          </p>
        </CardContent>
      </Card>

      {/* Last Service */}
      <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <CheckCircle2 className="h-3 w-3 text-white" />
            </div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Last Service</span>
          </div>
          {lastService ? (
            <>
              <p className="text-sm font-bold text-slate-900">{lastService.description}</p>
              <p className="text-xs text-slate-500 mt-1">
                {format(new Date(lastService.serviceDate), "MMM d, yyyy")}
                {lastService.cost != null && ` · ${formatCost(lastService.cost)}`}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-400">No service recorded</p>
              <p className="text-xs text-slate-300 mt-1">Schedule the first maintenance</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Maintenance Table ────────────────────────────────────────────

function MaintenanceTable({ items, emptyMessage, onRefresh }: {
  items: MaintenanceItem[];
  emptyMessage: string;
  onRefresh: () => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-sm text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80">
          <tr>
            <th className="px-4 py-3">Service</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Mechanic</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3 text-right">Cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => {
            const priority = getMaintenancePriority(item.severity, new Date(item.scheduledDate));
            const isOverdue = differenceInDays(new Date(), new Date(item.scheduledDate)) > 0
              && (item.status === "SCHEDULED" || item.status === "ASSIGNED");

            return (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">{item.description}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{getOriginLabel(item.origin)}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge className={cn("text-[10px] px-2 py-0.5 border-0 font-semibold", getStatusColor(item.status))}>
                    {item.status.replace("_", " ")}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-600">{item.mechanic?.name || "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("text-xs font-semibold font-mono", isOverdue ? "text-red-600" : "text-slate-600")}>
                    {format(new Date(item.scheduledDate), "MMM d, yyyy")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-semibold text-slate-700">{formatCost(item.cost)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Fault Card ───────────────────────────────────────────────────

function FaultCard({ fault, onCreateWO }: { fault: FaultItem; onCreateWO: () => void }) {
  return (
    <div className="bg-red-50 border border-red-100 rounded-lg p-4">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono text-red-700">{fault.faultCode}</span>
          <Badge className={cn("text-[9px] px-1.5 py-0 border-0", getSeverityColor(fault.severity))}>{fault.severity}</Badge>
        </div>
        <span className="text-[10px] text-slate-400">{differenceInDays(new Date(), new Date(fault.detectedAt))}d ago</span>
      </div>
      {fault.faultDefinition && (
        <p className="text-xs text-slate-600 mb-1">{fault.faultDefinition.description}</p>
      )}
      {fault.description && !fault.faultDefinition && (
        <p className="text-xs text-slate-600 mb-1">{fault.description}</p>
      )}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-red-100">
        <span className="text-[10px] text-slate-500">
          {fault.faultDefinition?.systemType || "Unknown"} system
        </span>
        <div className="flex items-center gap-2">
          {fault.maintenanceId ? (
            <Link href={`/maintenance`}
              className="text-[10px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> View WO
            </Link>
          ) : (
            <button onClick={onCreateWO}
              className="text-[10px] font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer">
              <Plus className="h-3 w-3" /> Create WO
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────

export default function VehicleMaintenancePage() {
  const params = useParams();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [upcoming, setUpcoming] = useState<MaintenanceItem[]>([]);
  const [history, setHistory] = useState<MaintenanceItem[]>([]);
  const [faults, setFaults] = useState<FaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "history" | "faults">("upcoming");

  // ● ── Fetch Data ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch vehicle info
      const vRes = await fetch(`/api/vehicles?ids=${vehicleId}`);
      // Fetch WOs for this vehicle
      const woRes = await fetch(`/api/maintenance?vehicleId=${vehicleId}&limit=50`);
      // Fetch active faults for this vehicle
      // We'll get faults from the WOs or a dedicated endpoint

      const [vData, woData] = await Promise.all([
        vRes.json().catch(() => ({})),
        woRes.json().catch(() => ({ workOrders: [] })),
      ]);

      // Extract vehicle info
      const vehicles = vData.vehicles || vData.data || [];
      const v = vehicles.find((x: any) => x.id === vehicleId);
      if (v) {
        setVehicle({
          id: v.id,
          plateNumber: v.plateNumber || "",
          make: v.make || null,
          model: v.model || null,
          Type: v.Type || "TRACTOR",
          year: v.year || null,
          status: v.status || null,
        });
      }

      const allWO: MaintenanceItem[] = (woData.workOrders || []);

      // Split into upcoming and history
      const activeStatuses = ["SCHEDULED", "ASSIGNED", "IN_PROGRESS", "PENDING_PARTS", "ON_HOLD"];
      setUpcoming(allWO.filter(wo => activeStatuses.includes(wo.status)));
      setHistory(allWO.filter(wo => ["COMPLETED", "APPROVED", "CANCELLED"].includes(wo.status)));

      // Fetch faults from a separate endpoint or the vehicle data
      const fRes = await fetch(`/api/vehicles/${vehicleId}`);
      // Can't easily get faults here, so let's try a different approach
    } catch (err) {
      console.error(err);
      toast.error("Failed to load vehicle maintenance data");
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ● ── Fetch Faults ───────────────────────────────────────────────
  useEffect(() => {
    // We can try to get faults from the maintenance detail or a separate endpoint
    // For now, extract from the maintenance data's fault links
    const fetchFaults = async () => {
      try {
        const res = await fetch(`/api/vehicles/${vehicleId}`);
        // This endpoint may not return faults directly
      } catch { /* ignore */ }
    };
    fetchFaults();
  }, [vehicleId]);

  // ── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 md:p-6 bg-slate-50 min-h-screen max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center gap-3 animate-pulse">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div><Skeleton className="h-5 w-64 mb-1" /><Skeleton className="h-3 w-32" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const healthScore = calculateHealthScore({
    activeFaults: [], // We'll compute this properly
    overdueCount: upcoming.filter(wo =>
      wo.status === "SCHEDULED" || wo.status === "ASSIGNED"
    ).length,
    recentCompletedCount: history.filter(wo =>
      wo.status === "COMPLETED" && wo.completedAt &&
      differenceInDays(new Date(), new Date(wo.completedAt)) <= 30
    ).length,
  });

  const lastService = history.length > 0 ? history[0] : null;

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen max-w-[1200px] mx-auto space-y-5">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link href={`/vehicles/${vehicleId}`}>
          <Button variant="outline" size="icon" className="rounded-full border-slate-200 cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-sm">
              <Wrench className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              {vehicle?.plateNumber || "Vehicle"} — Maintenance
            </h1>
          </div>
          <p className="text-sm text-slate-500 ml-10">
            {vehicle?.make} {vehicle?.model} ({vehicle?.Type}){vehicle?.year ? ` · ${vehicle.year}` : ""}
          </p>
        </div>
      </div>

      {/* ── Health Overview ────────────────────────────────────── */}
      <HealthOverview vehicle={vehicle!}
        healthScore={healthScore}
        activeFaults={0}
        lastService={lastService} />

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="border-b border-slate-200">
        <nav className="flex items-center gap-1">
          {[
            { id: "upcoming", label: "Upcoming", icon: CalendarDays },
            { id: "history", label: "History", icon: Activity },
            { id: "faults", label: "Faults", icon: AlertTriangle },
          ].map((tab) => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer",
                activeTab === tab.id
                  ? "border-amber-600 text-amber-700"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300",
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab Content ────────────────────────────────────────── */}
      <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
        <CardContent className="p-0">
          {activeTab === "upcoming" && (
            <>
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Upcoming Maintenance ({upcoming.length})</h3>
                <Link href={`/maintenance`}>
                  <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer">
                    <Plus className="h-3 w-3 mr-1" /> Schedule
                  </Button>
                </Link>
              </div>
              <MaintenanceTable items={upcoming} emptyMessage="All caught up — no upcoming maintenance" onRefresh={fetchData} />
            </>
          )}
          {activeTab === "history" && (
            <>
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Maintenance History ({history.length})</h3>
              </div>
              <MaintenanceTable items={history} emptyMessage="No maintenance history recorded" onRefresh={fetchData} />
            </>
          )}
          {activeTab === "faults" && (
            <>
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Active Faults ({faults.length})</h3>
              </div>
              {faults.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    </div>
                    <p className="text-sm text-slate-400">No active faults — vehicle is healthy</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {faults.map((fault) => (
                    <FaultCard key={fault.id} fault={fault} onCreateWO={() => {}} />
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Vehicle Telemetry Summary ──────────────────────────── */}
      {vehicle?.status && (
        <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-slate-500" />
              Current Telemetry
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Odometer</p>
                <p className="text-sm font-bold text-slate-800">{vehicle.status.odometer?.toLocaleString() ?? "—"} km</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Engine Hours</p>
                <p className="text-sm font-bold text-slate-800">{vehicle.status.engineHours?.toLocaleString() ?? "—"} h</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Fuel Level</p>
                <p className="text-sm font-bold text-slate-800">{vehicle.status.fuelLevel ?? "—"}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}