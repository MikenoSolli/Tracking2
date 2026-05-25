"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Activity, Truck, Zap, Clock, Fuel, AlertTriangle,
  TrendingUp, Car, Tractor, Bus, Loader2,
  Wrench, Award, Target, TrendingDown, Calendar,
  Users, Shield, Gauge, CheckCircle2,
  Info, BarChart3, Bell, RefreshCw, Navigation,
  ChevronDown, ChevronRight, CircleDot,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

// ─── Skeleton Loading ─────────────────────────────────────────
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-white/60 border border-slate-200/60 p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="h-9 w-9 rounded-lg bg-slate-200" />
        <div className="h-5 w-14 rounded-full bg-slate-200" />
      </div>
      <div className="h-7 w-24 bg-slate-200 rounded mb-1" />
      <div className="h-3 w-16 bg-slate-200 rounded" />
    </div>
  );
}

function SkeletonMap() {
  return (
    <div className="rounded-xl bg-white/60 border border-slate-200/60 overflow-hidden animate-pulse">
      <div className="p-4 pb-2 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-slate-200" />
          <div>
            <div className="h-4 w-36 bg-slate-200 rounded mb-1" />
            <div className="h-3 w-24 bg-slate-200 rounded" />
          </div>
        </div>
        <div className="h-6 w-24 rounded-full bg-slate-200" />
      </div>
      <div className="h-[400px] bg-slate-100 m-2 rounded-lg flex items-center justify-center">
        <div className="h-8 w-8 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

function SkeletonNotifications() {
  return (
    <div className="rounded-xl bg-white/60 border border-slate-200/60 animate-pulse p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-28 bg-slate-200 rounded" />
        <div className="h-5 w-12 rounded-full bg-slate-200" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 mb-3">
          <div className="h-8 w-8 rounded-lg bg-slate-200 shrink-0" />
          <div className="flex-1">
            <div className="h-3.5 w-32 bg-slate-200 rounded mb-1.5" />
            <div className="h-3 w-full bg-slate-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonTabs() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-28 rounded-lg bg-slate-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl bg-white/60 border border-slate-200/60 p-4">
          <div className="h-[280px] bg-slate-100 rounded-lg" />
        </div>
        <div className="rounded-xl bg-white/60 border border-slate-200/60 p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

const VehicleMap = dynamic(
  () => import('@/components/vehicle/dashboard/vehicleMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] bg-slate-100 rounded-lg flex items-center justify-center" role="status" aria-label="Loading map">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        <span className="sr-only">Loading vehicle map...</span>
      </div>
    )
  }
);

// ─── Types ──────────────────────────────────────────────────────
interface DashboardData {
  fleet: { total: number; active: number; idle: number; offline: number };
  today: { distance: number; fuel: number; runningHours: number; idleHours: number };
  week: { distance: number; fuel: number; runningHours: number };
  chartData: { day: string; distance: number; fuel: number; hours: number }[];
  topVehicles: { id: string; name: string; type: string; distance: number }[];
  alerts: { id: string; vehicle: string; type: string; severity: string; message: string; time: string }[];
}

// ─── Sub-components ────────────────────────────────────────────
function EmptyChartState({ icon: Icon = BarChart3, title = "No weekly data available yet", subtitle = "Data will appear once trips are recorded" }: {
  icon?: React.ElementType; title?: string; subtitle?: string;
}) {
  return (
    <div className="flex items-center justify-center h-full" role="status">
      <div className="text-center">
        <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
          <Icon className="h-7 w-7 text-slate-300" />
        </div>
        <p className="text-sm font-semibold text-slate-400">{title}</p>
        <p className="text-xs text-slate-300 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-lg p-3 min-w-[140px]">
      <p className="text-xs font-semibold text-slate-500 mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-xs text-slate-600">{entry.name}</span>
            </div>
            <span className="text-xs font-bold text-slate-900">{typeof entry.value === 'number' ? entry.value.toFixed(0) : entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3" role="alert">
      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-red-800">Failed to load dashboard data</p>
        <p className="text-xs text-red-600 mt-0.5 truncate">{message}</p>
      </div>
      <button type="button" onClick={onRetry}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition"
        aria-label="Retry loading dashboard data">
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
}

function MetricCard({
  icon: Icon, label, value, unit, color, badge, trend,
}: {
  icon: React.ElementType; label: string; value: string | number;
  unit?: string; color: string; badge?: string; trend?: { dir: 'up' | 'down'; value: string };
}) {
  return (
    <Card className="shadow-sm hover:shadow-lg transition-all duration-300 border-0 overflow-hidden group bg-white/90 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg", color)}>
            <Icon className="h-4.5 w-4.5 text-white" />
          </div>
          {badge && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-semibold tracking-wide uppercase">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-slate-900 leading-none tracking-tight" aria-live="polite">
              {value}
              {unit && <span className="text-sm font-medium text-slate-400 ml-0.5">{unit}</span>}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">{label}</p>
          </div>
          {trend && (
            <span className={cn(
              "flex items-center gap-0.5 text-xs font-semibold",
              trend.dir === 'up' ? 'text-emerald-600' : 'text-red-500'
            )}>
              {trend.dir === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AlertItem({ alert }: { alert: DashboardData['alerts'][0] }) {
  const severityColor = alert.severity === 'HIGH' || alert.severity === 'CRITICAL'
    ? 'bg-red-100 text-red-700 border-red-200'
    : alert.severity === 'MEDIUM'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-blue-100 text-blue-700 border-blue-200';

  const severityDot = alert.severity === 'HIGH' || alert.severity === 'CRITICAL'
    ? 'bg-red-500'
    : alert.severity === 'MEDIUM'
      ? 'bg-amber-500'
      : 'bg-blue-500';

  const isHigh = alert.severity === 'HIGH' || alert.severity === 'CRITICAL';

  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer",
      isHigh
        ? "border-red-100 hover:border-red-300 hover:bg-red-50/50 hover:shadow-sm"
        : "border-slate-100 hover:border-amber-200 hover:bg-amber-50/30"
    )} role="alert">
      <div className="mt-1">
        <div className={cn("p-1.5 rounded-lg border", severityColor)} aria-hidden="true">
          <AlertTriangle className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn("w-1.5 h-1.5 rounded-full", severityDot)} aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-900 truncate">{alert.vehicle}</p>
          </div>
          <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono">
            {alert.time ? format(new Date(alert.time), 'HH:mm') : '--:--'}
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{alert.message}</p>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("overview");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(errBody || `Server responded with ${res.status}`);
      }
      const json: DashboardData = await res.json();
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // ── Derived metrics ──────────────────────────────────────────
  const utilization = data
    ? ((data.today.runningHours / (data.today.runningHours + data.today.idleHours || 1)) * 100)
    : 0;
  const avgSpeed = data && data.today.runningHours > 0
    ? data.today.distance / data.today.runningHours
    : 0;
  const fuelEfficiency = data && data.today.fuel > 0
    ? data.today.distance / data.today.fuel
    : 0;

  // Notification grouping by alert type
  const notifications = data?.alerts?.slice(0, 8) ?? [];
  const activeAlerts = data?.alerts?.filter(a =>
    a.severity === 'HIGH' || a.severity === 'CRITICAL'
  ) ?? [];

  const chartHasData = data?.chartData && data.chartData.length > 0;

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-green-50">
        <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-[1800px] mx-auto">
          {/* Skeleton header */}
          <div className="flex items-center gap-3 animate-pulse">
            <div className="h-12 w-12 rounded-2xl bg-slate-200" />
            <div>
              <div className="h-6 w-56 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-40 bg-slate-200 rounded" />
            </div>
          </div>

          {/* Skeleton metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
          </div>

          {/* Skeleton map */}
          <SkeletonMap />

          {/* Skeleton notification panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            <SkeletonNotifications />
            <SkeletonNotifications />
          </div>

          {/* Skeleton tabs */}
          <SkeletonTabs />

          {/* Skeleton footer */}
          <div className="rounded-xl bg-white/60 border border-slate-200/60 p-4 md:p-6 animate-pulse">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div>
                <div className="h-5 w-24 bg-slate-200 rounded mb-2" />
                <div className="h-6 w-48 bg-slate-200 rounded mb-1" />
                <div className="h-3 w-36 bg-slate-200 rounded" />
              </div>
              <div className="grid grid-cols-3 gap-6 md:gap-10">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="text-center">
                    <div className="h-7 w-16 bg-slate-200 rounded mx-auto mb-1" />
                    <div className="h-3 w-20 bg-slate-200 rounded mx-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-green-50">
        <div className="p-4 md:p-6 max-w-[1800px] mx-auto space-y-4">
          <ErrorBanner message={error} onRetry={fetchDashboard} />
          <div className="text-center py-12 bg-white/60 rounded-2xl border border-dashed border-slate-200">
            <div className="h-16 w-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <p className="text-slate-800 font-semibold">Dashboard Connection Lost</p>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
              We couldn&apos;t retrieve your fleet data. This may be a network issue or the server may be temporarily unavailable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-green-50">
      <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-[1800px] mx-auto">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-2.5 md:p-3 bg-gradient-to-br from-green-600 to-green-700 rounded-xl md:rounded-2xl shadow-lg shadow-green-600/25">
                <Activity className="h-5 w-5 md:h-7 md:w-7 text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-green-400 border-2 border-white rounded-full" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-bold tracking-tight text-slate-900">
                Fleet Intelligence Center
              </h1>
              <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 mt-0.5">
                <span>{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                  </span>
                  Live
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/70 backdrop-blur-sm rounded-lg border border-slate-200/60 text-xs text-slate-500 shadow-sm">
              <RefreshCw className="h-3 w-3" />
              Auto-refresh
            </div>
            <Badge className="bg-green-100 text-green-700 border-0 px-2.5 py-1 text-xs font-medium">
              <span className="relative flex h-1.5 w-1.5 mr-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
              Connected
            </Badge>
          </div>
        </div>

        {/* ── Top 5 Metric Cards ──────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <Card className="shadow-sm hover:shadow-lg transition-all duration-300 border-0 overflow-hidden bg-white/90 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
                  <Zap className="h-4.5 w-4.5 text-white" />
                </div>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-semibold tracking-wide uppercase">
                  On Road
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-2xl font-bold text-emerald-600 leading-none tracking-tight">
                    {data?.fleet.active ?? 0}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Active</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <p className="text-2xl font-bold text-amber-500 leading-none tracking-tight">
                    {data?.fleet.idle ?? 0}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Idle</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <MetricCard
            icon={Clock} label="Offline Vehicles"
            value={data?.fleet.offline ?? 0}
            color="bg-gradient-to-br from-slate-400 to-slate-500"
          />
          <MetricCard
            icon={Target} label="Fleet Utilization"
            value={Math.round(utilization)}
            unit="%"
            color="bg-gradient-to-br from-indigo-500 to-indigo-600"
            trend={{ dir: utilization > 50 ? 'up' : 'down', value: `${Math.round(utilization)}%` }}
          />
          <MetricCard
            icon={Navigation} label="Distance Today"
            value={(data?.today.distance ?? 0).toFixed(0)}
            unit="km"
            color="bg-gradient-to-br from-blue-500 to-blue-600"
            badge="Today"
          />
          <MetricCard
            icon={AlertTriangle} label="Active Alerts"
            value={activeAlerts.length}
            color={activeAlerts.length > 0
              ? "bg-gradient-to-br from-red-500 to-red-600"
              : "bg-gradient-to-br from-slate-400 to-slate-500"}
          />
        </div>

        {/* ── Live Fleet Tracking Map ─────────────────────────── */}
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-0 overflow-hidden bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-2 md:pb-3">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-sm">
                  <Navigation className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg font-semibold text-slate-900">Live Fleet Tracking</CardTitle>
                  <p className="text-xs text-slate-500">Real-time vehicle positions on map</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" /> {data?.fleet.active ?? 0} Active
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" /> {data?.fleet.idle ?? 0} Idle
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-300" /> {data?.fleet.offline ?? 0} Offline
                  </span>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-1 text-xs font-medium" role="status" aria-label={`${data?.fleet.active ?? 0} active vehicles`}>
                  <span className="relative flex h-1.5 w-1.5 mr-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  {data?.fleet.active ?? 0} on road
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-1 md:p-2">
            <VehicleMap />
          </CardContent>
        </Card>

        {/* ── Persistent Notifications & Active Alerts ────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">

          {/* NOTIFICATIONS */}
          <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm md:text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-slate-500" />
                  Notifications
                </CardTitle>
                {notifications.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-semibold">
                    {notifications.length} new
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="max-h-[340px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="text-center py-10">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-emerald-700">All Clear</p>
                  <p className="text-xs text-slate-400 mt-1">No new notifications</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {notifications.map((alert) => {
                    const typeStyles: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
                      MAINTENANCE_DUE: {
                        bg: 'bg-amber-50/80',
                        border: 'border-amber-200/60',
                        icon: <Wrench className="h-3.5 w-3.5 text-amber-600" />,
                      },
                      LOW_FUEL: {
                        bg: 'bg-orange-50/80',
                        border: 'border-orange-200/60',
                        icon: <Fuel className="h-3.5 w-3.5 text-orange-600" />,
                      },
                      FAULT: {
                        bg: 'bg-red-50/80',
                        border: 'border-red-200/60',
                        icon: <AlertTriangle className="h-3.5 w-3.5 text-red-600" />,
                      },
                    };
                    const style = typeStyles[alert.type] ?? {
                      bg: 'bg-slate-50/80',
                      border: 'border-slate-200/60',
                      icon: <Info className="h-3.5 w-3.5 text-slate-600" />,
                    };
                    return (
                      <div key={alert.id} className={cn("flex items-start gap-2.5 p-2.5 rounded-lg border transition-all hover:shadow-sm cursor-pointer", style.bg, style.border)} role="alert">
                        <div className="mt-0.5 shrink-0">{style.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-800">{alert.vehicle}</p>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono">
                              {alert.time ? format(new Date(alert.time), 'HH:mm') : ''}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{alert.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ACTIVE ALERTS */}
          <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm md:text-base font-semibold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className={cn("h-4 w-4", activeAlerts.length > 0 ? 'text-red-500' : 'text-slate-400')} />
                  Active Alerts
                </CardTitle>
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-semibold",
                  activeAlerts.length > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                )}>
                  {activeAlerts.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="max-h-[340px] overflow-y-auto custom-scrollbar">
              {activeAlerts.length === 0 ? (
                <div className="text-center py-10">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <Shield className="h-6 w-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-emerald-700">All Clear</p>
                  <p className="text-xs text-slate-400 mt-1">No active alerts — fleet is operating normally</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {activeAlerts.map((alert) => (
                    <AlertItem key={alert.id} alert={alert} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Tabbed Analytics ────────────────────────────────── */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="bg-white/90 backdrop-blur-sm shadow-sm p-1 h-auto rounded-xl border border-slate-200/60 flex flex-wrap">
            <TabsTrigger value="overview"
              className="rounded-lg px-3 md:px-5 py-1.5 md:py-2 text-xs md:text-sm font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-green-700 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-green-600/20 transition-all duration-200">
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="fuel"
              className="rounded-lg px-3 md:px-5 py-1.5 md:py-2 text-xs md:text-sm font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-green-700 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-green-600/20 transition-all duration-200">
              <Fuel className="h-3.5 w-3.5 mr-1.5" />
              Fuel Analytics
            </TabsTrigger>
            <TabsTrigger value="performance"
              className="rounded-lg px-3 md:px-5 py-1.5 md:py-2 text-xs md:text-sm font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-green-700 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-green-600/20 transition-all duration-200">
              <Award className="h-3.5 w-3.5 mr-1.5" />
              Driver Performance
            </TabsTrigger>
            <TabsTrigger value="maintenance"
              className="rounded-lg px-3 md:px-5 py-1.5 md:py-2 text-xs md:text-sm font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-green-700 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-green-600/20 transition-all duration-200">
              <Wrench className="h-3.5 w-3.5 mr-1.5" />
              Maintenance
            </TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW TAB ──────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-4 md:space-y-5" id="panel-overview" role="tabpanel">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">

              {/* Weekly Activity Chart */}
              <Card className="lg:col-span-2 shadow-sm border-0 bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base md:text-lg font-semibold text-slate-900">Weekly Activity Trends</CardTitle>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-semibold">Last 7 Days</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] md:h-[320px] w-full">
                    {chartHasData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data!.chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorDist" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorHrs" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={8} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dx={-4} />
                          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                          <Area type="monotone" dataKey="distance" name="Distance (km)" stroke="#16a34a" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDist)" activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#16a34a' }} />
                          <Area type="monotone" dataKey="hours" name="Active Hours" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHrs)" activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#6366f1' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChartState />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Fleet Operations Summary */}
              <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base md:text-lg font-semibold text-slate-900">Fleet Operations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Average Speed */}
                  <div className="p-3.5 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-100/80">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Navigation className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-semibold text-indigo-700">Average Speed</span>
                    </div>
                    <p className="text-2xl font-bold text-indigo-800">
                      {avgSpeed.toFixed(1)}
                      <span className="text-sm font-medium text-indigo-500 ml-1">km/h</span>
                    </p>
                  </div>

                  {/* Active / Idle split */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100/80">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                        <span className="text-xs font-semibold text-emerald-700">Active</span>
                      </div>
                      <p className="text-lg font-bold text-emerald-800">
                        {(data?.today.runningHours ?? 0).toFixed(1)}<span className="text-xs font-medium text-emerald-500 ml-0.5">h</span>
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100/80">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                        <span className="text-xs font-semibold text-amber-700">Idle</span>
                      </div>
                      <p className="text-lg font-bold text-amber-800">
                        {(data?.today.idleHours ?? 0).toFixed(1)}<span className="text-xs font-medium text-amber-500 ml-0.5">h</span>
                      </p>
                    </div>
                  </div>

                  {/* Fleet Utilization Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-600 font-medium">Fleet Utilization</span>
                      <span className="text-xs font-bold text-indigo-600">{Math.round(utilization)}%</span>
                    </div>
                    <Progress value={utilization} className="h-2 rounded-full bg-slate-100" aria-label={`Fleet utilization at ${Math.round(utilization)} percent`} />
                  </div>

                  {/* Distance Today */}
                  <div className="flex items-center justify-between py-2.5 px-3 bg-slate-50/80 rounded-xl border border-slate-100/60">
                    <span className="text-xs text-slate-600 font-medium">Distance Today</span>
                    <span className="text-sm font-bold text-slate-900">
                      {(data?.today.distance ?? 0).toFixed(0)} km
                    </span>
                  </div>

                  {/* Running Hours */}
                  <div className="flex items-center justify-between py-2.5 px-3 bg-slate-50/80 rounded-xl border border-slate-100/60">
                    <span className="text-xs text-slate-600 font-medium">Running Hours</span>
                    <span className="text-sm font-bold text-slate-900">
                      {(data?.today.runningHours ?? 0).toFixed(1)} h
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── FUEL ANALYTICS TAB ─────────────────────────────── */}
          <TabsContent value="fuel" className="space-y-4 md:space-y-5" id="panel-fuel" role="tabpanel">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-sm border-0 bg-gradient-to-br from-blue-600 to-blue-700 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 opacity-[0.06]" aria-hidden="true">
                  <Fuel className="h-32 w-32" />
                </div>
                <CardContent className="p-4 md:p-5 relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <Fuel className="h-6 w-6 md:h-7 md:w-7 opacity-80" />
                    <span className="px-2 py-0.5 bg-white/20 text-white/90 rounded-md text-[10px] font-semibold">Today</span>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold">{(data?.today.fuel ?? 0).toFixed(1)}<span className="text-sm font-medium text-blue-200 ml-1">L</span></p>
                  <p className="text-blue-100/80 text-xs mt-2 font-medium">Total Fuel Used</p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <TrendingUp className="h-6 w-6 md:h-7 md:w-7 text-emerald-600" />
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-semibold">{fuelEfficiency.toFixed(1)} km/L</span>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{fuelEfficiency.toFixed(1)}</p>
                  <p className="text-slate-500 text-xs mt-2 font-medium">Km per Liter</p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Target className="h-6 w-6 md:h-7 md:w-7 text-orange-500" />
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{Math.round(utilization)}%</p>
                  <p className="text-slate-500 text-xs mt-2 font-medium">Fleet Utilization</p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Calendar className="h-6 w-6 md:h-7 md:w-7 text-slate-500" />
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-semibold">Week</span>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{(data?.week.fuel ?? 0).toFixed(0)}<span className="text-sm font-medium text-slate-400 ml-1">L</span></p>
                  <p className="text-slate-500 text-xs mt-2 font-medium">Weekly Fuel Total</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
              <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base font-semibold text-slate-900">Fuel Consumption Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs text-slate-600 font-medium">Running Fuel</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-700">
                        {data?.today.runningHours && data?.today.idleHours
                          ? Math.round((data.today.runningHours / (data.today.runningHours + data.today.idleHours)) * 100)
                          : 0}%
                      </span>
                    </div>
                    <Progress value={data?.today.runningHours && data?.today.idleHours
                      ? (data.today.runningHours / (data.today.runningHours + data.today.idleHours)) * 100
                      : 0} className="h-2.5 rounded-full bg-slate-100 [&>[data-slot=progress-indicator]]:bg-emerald-500" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-xs text-slate-600 font-medium">Idle Waste</span>
                      </div>
                      <span className="text-xs font-bold text-amber-700">
                        {data?.today.idleHours && data?.today.runningHours
                          ? Math.round((data.today.idleHours / (data.today.runningHours + data.today.idleHours)) * 100)
                          : 0}%
                      </span>
                    </div>
                    <Progress value={data?.today.idleHours && data?.today.runningHours
                      ? (data.today.idleHours / (data.today.runningHours + data.today.idleHours)) * 100
                      : 0} className="h-2.5 rounded-full bg-slate-100 [&>[data-slot=progress-indicator]]:bg-amber-400" />
                  </div>
                  <div className="pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Total Active Time</span>
                      <span className="font-semibold text-slate-700">{(data?.today.runningHours ?? 0).toFixed(1)}h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base font-semibold text-slate-900">Fuel Efficiency Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-100/60">
                    <span className="text-xs text-slate-600 font-medium">Distance per Liter</span>
                    <span className="text-sm font-bold text-slate-900">{fuelEfficiency.toFixed(2)} <span className="text-xs font-medium text-slate-400">km/L</span></span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-100/60">
                    <span className="text-xs text-slate-600 font-medium">Total Distance</span>
                    <span className="text-sm font-bold text-slate-900">{(data?.today.distance ?? 0).toFixed(0)} <span className="text-xs font-medium text-slate-400">km</span></span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-100/60">
                    <span className="text-xs text-slate-600 font-medium">Fuel Cost (est.)</span>
                    <span className="text-sm font-bold text-slate-900">
                      {(data?.today.fuel ?? 0) * 1.5 > 0 ? <>$<span className="text-base">{((data?.today.fuel ?? 0) * 1.5).toFixed(0)}</span></> : <span className="text-slate-300">&mdash;</span>}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-100/60">
                    <span className="text-xs text-slate-600 font-medium">Avg Speed Today</span>
                    <span className="text-sm font-bold text-slate-900">{avgSpeed.toFixed(1)} <span className="text-xs font-medium text-slate-400">km/h</span></span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── DRIVER PERFORMANCE TAB ─────────────────────────── */}
          <TabsContent value="performance" className="space-y-4 md:space-y-5" id="panel-performance" role="tabpanel">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="shadow-sm border-0 bg-gradient-to-br from-green-600 to-emerald-700 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 opacity-[0.06]" aria-hidden="true">
                  <Award className="h-32 w-32" />
                </div>
                <CardContent className="p-4 md:p-5 relative z-10">
                  <Award className="h-6 w-6 md:h-7 md:w-7 opacity-80 mb-3" />
                  <p className="text-2xl md:text-3xl font-bold">&mdash;</p>
                  <p className="text-green-100/80 text-xs mt-2 font-medium">Average Driver Score</p>
                  <p className="text-green-200/60 text-[10px] mt-1">Data available after trips</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
                <CardContent className="p-4 md:p-5">
                  <AlertTriangle className="h-6 w-6 md:h-7 md:w-7 text-amber-500 mb-3" />
                  <p className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">&mdash;</p>
                  <p className="text-slate-500 text-xs mt-2 font-medium">Harsh Events This Week</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
                <CardContent className="p-4 md:p-5">
                  <Shield className="h-6 w-6 md:h-7 md:w-7 text-red-500 mb-3" />
                  <p className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">&mdash;</p>
                  <p className="text-slate-500 text-xs mt-2 font-medium">Safety Incidents</p>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Top Drivers This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.topVehicles && data.topVehicles.length > 0 ? (
                  <div className="space-y-2">
                    {data.topVehicles.slice(0, 5).map((v, i) => (
                      <div key={v.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                            i === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm shadow-amber-500/30' :
                            i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                            i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-sm shadow-orange-500/30' :
                            'bg-slate-100 text-slate-500'
                          )}>{i + 1}</div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{v.name || 'Unknown'}</p>
                            <p className="text-xs text-slate-500">{v.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-emerald-600">{v.distance.toFixed(0)}</p>
                          <p className="text-[10px] text-slate-400 font-medium">km</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyChartState icon={Users} title="No driver data available" subtitle="Data will appear as vehicles are assigned" />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── MAINTENANCE TAB ────────────────────────────────── */}
          <TabsContent value="maintenance" className="space-y-4 md:space-y-5" id="panel-maintenance" role="tabpanel">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Wrench className="h-6 w-6 md:h-7 md:w-7 text-blue-600" />
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-semibold">All time</span>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                    {data?.alerts?.filter(a => a.type === 'MAINTENANCE_DUE').length ?? 0}
                  </p>
                  <p className="text-slate-500 text-xs mt-2 font-medium">Maintenance Alerts</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <AlertTriangle className="h-6 w-6 md:h-7 md:w-7 text-amber-500" />
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                    {data?.alerts?.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length ?? 0}
                  </p>
                  <p className="text-slate-500 text-xs mt-2 font-medium">High Priority Issues</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Gauge className="h-6 w-6 md:h-7 md:w-7 text-emerald-600" />
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                    {data?.fleet.total && data?.fleet.active
                      ? Math.round((data.fleet.active / data.fleet.total) * 100)
                      : 0}%
                  </p>
                  <p className="text-slate-500 text-xs mt-2 font-medium">Fleet Health Score</p>
                  <Progress
                    value={data?.fleet.total && data?.fleet.active ? (data.fleet.active / data.fleet.total) * 100 : 0}
                    className="h-2 rounded-full bg-slate-100 mt-3" />
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-500" />
                  Recent Maintenance Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.alerts && data.alerts.filter(a => a.type === 'MAINTENANCE_DUE').length > 0 ? (
                  <div className="space-y-2">
                    {data.alerts.filter(a => a.type === 'MAINTENANCE_DUE').map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/40 transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100/60 flex items-center justify-center shrink-0">
                            <Wrench className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{alert.vehicle}</p>
                            <p className="text-xs text-slate-500">{alert.message}</p>
                          </div>
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-semibold",
                          alert.severity === 'HIGH' || alert.severity === 'CRITICAL'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-amber-50 text-amber-600'
                        )}>{alert.severity}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    </div>
                    <p className="text-sm font-semibold text-emerald-700">All Caught Up</p>
                    <p className="text-xs text-slate-400 mt-1">No maintenance alerts at this time</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Week Summary Footer ──────────────────────────────── */}
        <Card className="shadow-sm border-0 bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 text-white overflow-hidden relative">
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} aria-hidden="true" />
          <div className="absolute top-0 right-0 opacity-[0.06]" aria-hidden="true">
            <Activity className="h-48 w-48 md:h-72 md:w-72" />
          </div>
          <CardContent className="p-4 md:p-6 relative z-10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/15 text-white/90 rounded-md text-[10px] font-semibold mb-2">
                  <Calendar className="h-3 w-3" />
                  Week Summary
                </span>
                <h3 className="text-xl md:text-2xl font-bold tracking-tight">Fleet Performance</h3>
                <p className="text-green-100/80 text-xs mt-1">
                  {data?.fleet.total ?? 0} vehicles &bull; {Math.round(utilization)}% utilization &bull; {data?.alerts?.length ?? 0} alerts
                </p>
              </div>
              <div className="grid grid-cols-3 gap-6 md:gap-10">
                <div className="text-center">
                  <p className="text-xl md:text-3xl font-bold tracking-tight">{(data?.week.distance ?? 0).toFixed(0)}</p>
                  <p className="text-green-200/70 text-[10px] md:text-xs mt-0.5 font-medium">km traveled</p>
                </div>
                <div className="text-center">
                  <p className="text-xl md:text-3xl font-bold tracking-tight">{(data?.week.fuel ?? 0).toFixed(0)}</p>
                  <p className="text-green-200/70 text-[10px] md:text-xs mt-0.5 font-medium">liters used</p>
                </div>
                <div className="text-center">
                  <p className="text-xl md:text-3xl font-bold tracking-tight">{(data?.week.runningHours ?? 0).toFixed(0)}</p>
                  <p className="text-green-200/70 text-[10px] md:text-xs mt-0.5 font-medium">active hours</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}