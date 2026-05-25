"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle, Fuel, Timer, ArrowRight, ShieldAlert, Clock,
  MapPin, Loader2, Wrench, Gauge, TrendingUp, TrendingDown,
  Circle, Truck, Car, Tractor, Bus, Bike, Navigation,
  FileText, AlertCircle, Target, Zap, Info, CheckCircle2, BarChart3, Award,CalendarIcon, ChevronDown, Download,Activity
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format, parse, startOfMonth, startOfWeek, startOfDay, setMonth } from "date-fns";

// ─── Types ─────────────────────────────────────────────────────────
interface ReportStats {
  distance: number; fuel: number; engineHours: number;
  runningTime: number; idleTime: number;
  utilization: number; avgSpeed: number; fuelEfficiency: number;
}
interface ChartPoint { name: string; distance: number; fuel: number; hours: number; }
interface VehicleMetric {
  id: string; plate: string; type: string; make: string; model: string;
  distance: number; fuel: number; runningTime: number; idleTime: number;
  utilization: number; avgSpeed: number;
}
interface ReportAlert {
  id: string; vehicle: string; type: string; severity: string; message: string; time: string;
}
interface MaintItem {
  id: string; vehicle: string; description: string; status: string; scheduledDate: string;
}
interface ReportData {
  period: { range: string; start: string; end: string };
  fleet: { total: number; active: number; idle: number; offline: number; typeBreakdown: { type: string; count: number }[] };
  stats: ReportStats;
  chartData: ChartPoint[];
  vehicles: VehicleMetric[];
  topVehicles: { id: string; name: string; plate: string; distance: number }[];
  alerts: ReportAlert[];
  maintenance: MaintItem[];
}

// ─── Helpers ───────────────────────────────────────────────────────
const VEHICLE_ICONS: Record<string, React.ElementType> = {
  TRACTOR: Tractor, TRUCK: Truck, CAR: Car, BUS: Bus, MOTORCYCLE: Bike, VAN: Car, PICKUP: Truck,
};
const VEHICLE_TYPE_ROUTES: Record<string, string> = {
  TRACTOR: "/reports/tractors", TRUCK: "/reports/trucks", CAR: "/reports/cars",
  BUS: "/reports/bus", MOTORCYCLE: "/reports/tractors", VAN: "/reports/cars", PICKUP: "/reports/trucks",
};

function formatNum(n: number, decimals = 0): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ─── Skeleton ──────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200", className)} />;
}

// ─── Chart Tooltip ─────────────────────────────────────────────────
function ChartTooltipContent({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-lg p-3 min-w-[140px]">
      <p className="text-xs font-semibold text-slate-500 mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((e, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
              <span className="text-xs text-slate-600">{e.name}</span>
            </div>
            <span className="text-xs font-bold text-slate-900">
              {typeof e.value === "number" ? formatNum(e.value, 1) : e.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stats Card ────────────────────────────────────────────────────
function StatsCard({ icon: Icon, label, value, unit, color, sub }: {
  icon: React.ElementType; label: string; value: string | number; unit?: string; color: string; sub?: string;
}) {
  return (
    <Card className="shadow-sm border-0 overflow-hidden group bg-white/90 backdrop-blur-sm">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg", color)}>
            <Icon className="h-3 w-3 text-white" />
          </div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        </div>
        <p className="text-lg font-bold text-slate-900 leading-none tracking-tight">
          {value}{unit && <span className="text-[10px] font-medium text-slate-400 ml-0.5">{unit}</span>}
        </p>
        {sub && <p className="text-[9px] text-slate-400 mt-0.5 truncate">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Empty State ───────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, subtitle }: {
  icon: React.ElementType; title: string; subtitle?: string;
}) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
          <Icon className="h-7 w-7 text-slate-300" />
        </div>
        <p className="text-sm font-semibold text-slate-400">{title}</p>
        {subtitle && <p className="text-xs text-slate-300 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function GeneralReport() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState("daily");
  const [date, setDate] = useState<Date>(new Date());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/general?date=${date.toISOString()}&range=${timeRange}`);
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const json: ReportData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [date, timeRange]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // ── Drill-Down ───────────────────────────────────────────────
  const handleChartClick = useCallback((nextState: { activeLabel?: string }) => {
    if (!nextState?.activeLabel) return;
    const label = nextState.activeLabel;

    if (timeRange === "yearly") {
      const m = parse(label, "MMM", new Date());
      setDate(startOfMonth(setMonth(date, m.getMonth())));
      setTimeRange("monthly");
    } else if (timeRange === "monthly") {
      setDate(startOfMonth(date));
      setTimeRange("weekly");
    } else if (timeRange === "weekly") {
      const d = parse(label, "EEE", date);
      setDate(startOfDay(d));
      setTimeRange("daily");
    }
  }, [timeRange, date]);

  // ── Exports ──────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    if (!data?.chartData?.length) return;
    const rows = [["Period", "Distance (km)", "Fuel (L)", "Hours"].join(",")];
    data.chartData.forEach((p) => rows.push(`${p.name},${p.distance.toFixed(1)},${p.fuel.toFixed(1)},${p.hours.toFixed(1)}`));
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `fleet_report_${format(date, "yyyy-MM-dd")}_${timeRange}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data, date, timeRange]);

  // ── Derived ──────────────────────────────────────────────────
  const hasChartData = data?.chartData && data.chartData.length > 0 && data.chartData.some((p) => p.distance > 0 || p.hours > 0);
  const hasAlerts = data?.alerts && data.alerts.length > 0;
  const hasMaintenance = data?.maintenance && data.maintenance.length > 0;
  const hasVehicles = data?.vehicles && data.vehicles.length > 0;

  // ── Loading ──────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen space-y-6">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="h-10 w-10 rounded-xl bg-slate-200" />
          <div><div className="h-5 w-48 bg-slate-200 rounded mb-1" /><div className="h-3 w-32 bg-slate-200 rounded" /></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-[350px]" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen">
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3" role="alert">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-800">Failed to load report</p>
            <p className="text-xs text-red-600 mt-0.5 truncate">{error}</p>
          </div>
          <button type="button" onClick={fetchReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition"
          >Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-5 max-w-[1600px] mx-auto">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-sm">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">General Fleet Report</h1>
          </div>
          <p className="text-sm text-slate-500 ml-10">Global performance and health overview</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
          {/* Time range tabs */}
          <div className="flex bg-slate-100 rounded-xl p-0.5">
            {["daily", "weekly", "monthly", "yearly"].map((r) => (
              <button key={r} onClick={() => { setTimeRange(r); }}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold capitalize rounded-lg transition-all cursor-pointer",
                  timeRange === r ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >{r}</button>
            ))}
          </div>
          <div className="h-6 w-px bg-slate-200" />
          {/* Date picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="text-xs font-semibold text-slate-700 hover:bg-slate-50 h-8 cursor-pointer">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                {format(date, "PPP")}
                <ChevronDown className="ml-1 h-3 w-3 text-slate-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
            </PopoverContent>
          </Popover>
          <div className="h-6 w-px bg-slate-200" />
          {/* Export */}
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 text-xs cursor-pointer">
            <Download className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => alert("PDF export coming soon")} className="h-8 text-xs cursor-pointer">
            <FileText className="h-3.5 w-3.5 mr-1.5 text-purple-600" />
            PDF
          </Button>
        </div>
      </div>

      {/* ── Stats Strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <StatsCard icon={Navigation} label="Distance" value={formatNum(data?.stats.distance ?? 0, 0)} unit="km"
          color="bg-gradient-to-br from-blue-500 to-blue-600" sub={timeRange} />
        <StatsCard icon={Fuel} label="Fuel" value={formatNum(data?.stats.fuel ?? 0, 0)} unit="L"
          color="bg-gradient-to-br from-amber-500 to-amber-600" />
        <StatsCard icon={Timer} label="Engine Hrs" value={formatNum(data?.stats.engineHours ?? 0, 0)} unit="h"
          color="bg-gradient-to-br from-indigo-500 to-indigo-600" />
        <StatsCard icon={Target} label="Utilization" value={data?.stats.utilization ?? 0} unit="%"
          color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          sub={`${formatNum(data?.stats.runningTime ?? 0, 0)}h / ${formatNum(data?.stats.idleTime ?? 0, 0)}h idle`} />
        <StatsCard icon={Gauge} label="Avg Speed" value={formatNum(data?.stats.avgSpeed ?? 0, 0)} unit="km/h"
          color="bg-gradient-to-br from-violet-500 to-violet-600" />
        <StatsCard icon={TrendingUp} label="Efficiency" value={formatNum(data?.stats.fuelEfficiency ?? 0, 1)} unit="km/L"
          color="bg-gradient-to-br from-cyan-500 to-cyan-600" />
      </div>

      {/* ── Chart + Fleet Composition ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart — 2/3 */}
        <Card className="lg:col-span-2 shadow-sm border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">Fleet Activity ({timeRange})</CardTitle>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> Distance</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400" /> Fuel</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-400" /> Hours</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {hasChartData ? (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data!.chartData} onClick={handleChartClick} style={{ cursor: "pointer" }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <Tooltip content={<ChartTooltipContent />} cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="distance" name="Distance (km)" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="fuel" name="Fuel (L)" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="hours" name="Hours" fill="#818cf8" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-center text-[10px] text-slate-400 mt-1">Click a bar to drill down</p>
              </div>
            ) : (
              <EmptyState icon={BarChart3} title="No data for this period" subtitle="Try a different date range or add vehicles" />
            )}
          </CardContent>
        </Card>

        {/* Fleet composition — 1/3 */}
        <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Truck className="h-4 w-4 text-slate-500" />
              Fleet Composition
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.fleet.typeBreakdown && data.fleet.typeBreakdown.length > 0 ? (
              <div className="space-y-2">
                {data.fleet.typeBreakdown.map((t) => {
                  const Icon = VEHICLE_ICONS[t.type] || Truck;
                  const pct = data.fleet.total > 0 ? Math.round((t.count / data.fleet.total) * 100) : 0;
                  const route = VEHICLE_TYPE_ROUTES[t.type] || "/reports/tractors";
                  return (
                    <div key={t.type} onClick={() => router.push(route)}
                      className="flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all hover:bg-emerald-50 hover:border-emerald-200 border border-transparent"
                    >
                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-700 capitalize">{t.type.toLowerCase()}</span>
                          <span className="text-sm font-bold text-slate-900">{t.count}</span>
                        </div>
                        <Progress value={pct} className="h-1.5 mt-1 bg-slate-100 [&>[data-slot=progress-indicator]]:bg-emerald-500" />
                      </div>
                      <span className="text-xs text-slate-400 font-medium w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Total Vehicles</span>
                  <span className="font-bold text-slate-800">{data.fleet.total}</span>
                </div>
              </div>
            ) : (
              <EmptyState icon={Truck} title="No vehicles" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Fleet Status + Top Vehicles ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status summary */}
        <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-500" />
              Fleet Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-700">Active</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-800">{data.fleet.active}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-2">
                    <Circle className="h-2 w-2 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium text-amber-700">Idle</span>
                  </div>
                  <span className="text-lg font-bold text-amber-800">{data.fleet.idle}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Circle className="h-2 w-2 fill-slate-400 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">Offline</span>
                  </div>
                  <span className="text-lg font-bold text-slate-700">{data.fleet.offline}</span>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Fleet Health</span>
                    <span className="font-semibold text-emerald-600">{data.fleet.total > 0 ? Math.round(((data.fleet.active + data.fleet.idle) / data.fleet.total) * 100) : 0}% online</span>
                  </div>
                  <Progress value={data.fleet.total > 0 ? ((data.fleet.active + data.fleet.idle) / data.fleet.total) * 100 : 0}
                    className="h-2 bg-slate-100 [&>[data-slot=progress-indicator]]:bg-emerald-500" />
                </div>
              </div>
            ) : (
              <EmptyState icon={Activity} title="No status data" />
            )}
          </CardContent>
        </Card>

        {/* Top vehicles */}
        <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Top Vehicles by Distance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topVehicles && data.topVehicles.length > 0 ? (
              <div className="space-y-2">
                {data.topVehicles.map((v, i) => (
                  <div key={v.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        i === 0 ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white" :
                        i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white" :
                        i === 2 ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white" :
                        "bg-slate-100 text-slate-500"
                      )}>{i + 1}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{v.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{v.plate}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-bold text-emerald-600">{formatNum(v.distance, 0)}</p>
                      <p className="text-[10px] text-slate-400 font-medium">km</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Award} title="No trip data yet" subtitle="Data appears once vehicles start moving" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Per-Vehicle Breakdown Table ────────────────────────── */}
      <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-500" />
            Vehicle Breakdown
            {hasVehicles && <span className="text-xs font-normal text-slate-400">({data!.vehicles.length} vehicles)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {hasVehicles ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                  <tr>
                    <th className="px-5 py-3.5">Vehicle</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5 text-right">Distance</th>
                    <th className="px-5 py-3.5 text-right">Fuel</th>
                    <th className="px-5 py-3.5 text-right">Run Time</th>
                    <th className="px-5 py-3.5 text-right">Idle Time</th>
                    <th className="px-5 py-3.5 text-right">Utilization</th>
                    <th className="px-5 py-3.5 text-right">Avg Speed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data!.vehicles.map((v) => {
                    const Icon = VEHICLE_ICONS[v.type] || Truck;
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-all">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <Icon className="h-3.5 w-3.5 text-slate-600" />
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{v.plate}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-slate-500 capitalize">{v.type.toLowerCase()}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm font-semibold text-slate-700">
                          {formatNum(v.distance, 1)}
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm text-slate-600">
                          {formatNum(v.fuel, 1)} <span className="text-[10px] text-slate-400">L</span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm text-slate-600">
                          {formatNum(v.runningTime, 1)} <span className="text-[10px] text-slate-400">h</span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm text-slate-600">
                          {formatNum(v.idleTime, 1)} <span className="text-[10px] text-slate-400">h</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={cn(
                            "inline-block px-2 py-0.5 rounded-md text-[10px] font-bold",
                            v.utilization >= 70 ? "bg-emerald-50 text-emerald-700" :
                            v.utilization >= 40 ? "bg-amber-50 text-amber-700" :
                            "bg-red-50 text-red-700"
                          )}>{v.utilization}%</span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm text-slate-600">
                          {formatNum(v.avgSpeed, 1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState icon={BarChart3} title="No vehicle data for this period" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Alerts + Maintenance ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alerts */}
        <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Alerts
              </CardTitle>
              {hasAlerts && (
                <Badge className="bg-red-50 text-red-600 border-0 text-[10px] font-semibold">{data!.alerts.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            {hasAlerts ? (
              <div className="space-y-2">
                {data!.alerts.map((a) => {
                  const isHigh = a.severity === "HIGH" || a.severity === "CRITICAL";
                  return (
                    <div key={a.id} className={cn(
                      "flex items-start gap-2.5 p-2.5 rounded-lg border transition-all",
                      isHigh ? "border-red-100 bg-red-50/50" : "border-amber-100 bg-amber-50/50"
                    )}>
                      <div className={cn("p-1 rounded-lg shrink-0", isHigh ? "bg-red-100" : "bg-amber-100")}>
                        <AlertTriangle className={cn("h-3 w-3", isHigh ? "text-red-600" : "text-amber-600")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-800">{a.vehicle}</p>
                          <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                            {a.time ? format(new Date(a.time), "MMM d, HH:mm") : ""}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{a.message}</p>
                        <Badge className={cn(
                          "mt-1 text-[9px] px-1.5 py-0 border-0",
                          isHigh ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        )}>{a.severity}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={CheckCircle2} title="No alerts for this period" subtitle="Fleet is operating normally" />
            )}
          </CardContent>
        </Card>

        {/* Maintenance */}
        <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-500" />
                Scheduled Maintenance
              </CardTitle>
              {hasMaintenance && (
                <Badge className="bg-amber-50 text-amber-600 border-0 text-[10px] font-semibold">{data!.maintenance.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            {hasMaintenance ? (
              <div className="space-y-2">
                {data!.maintenance.map((m) => (
                  <div key={m.id} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                    <div className="p-1 rounded-lg bg-amber-100 shrink-0">
                      <Wrench className="h-3 w-3 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-800">{m.vehicle}</p>
                        <Badge className={cn(
                          "text-[9px] px-1.5 py-0 border-0",
                          m.status === "SCHEDULED" ? "bg-blue-100 text-blue-700" :
                          m.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-700" :
                          "bg-emerald-100 text-emerald-700"
                        )}>{m.status.replace("_", " ")}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{m.description}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono">
                        {format(new Date(m.scheduledDate), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={CheckCircle2} title="No maintenance scheduled" subtitle="All caught up for this period" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Footer summary ──────────────────────────────────────── */}
      {data && (
        <Card className="shadow-sm border-0 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <p className="text-xs text-emerald-100/80 font-medium">
                  {data.period.range} &bull; {data.period.start ? format(new Date(data.period.start), "MMM d") : "—"} — {data.period.end ? format(new Date(data.period.end), "MMM d, yyyy") : "—"}
                </p>
                <p className="text-lg font-bold mt-0.5">
                  {formatNum(data.stats.distance, 0)} km traveled &bull; {formatNum(data.stats.fuel, 0)} L used &bull; {data.fleet.total} vehicles
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xl font-bold">{data.stats.utilization}%</p>
                  <p className="text-[10px] text-emerald-200/80 font-medium">Utilization</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{formatNum(data.stats.avgSpeed, 0)}</p>
                  <p className="text-[10px] text-emerald-200/80 font-medium">Avg km/h</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{data.alerts.length}</p>
                  <p className="text-[10px] text-emerald-200/80 font-medium">Alerts</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}