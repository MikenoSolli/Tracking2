"use client"

import { useState, useEffect, useCallback } from "react"
import { AlertTriangle, CheckCircle2, Info, AlertCircle, Wrench, Loader2, Activity, Award, Calendar as CalendarIcon, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { format, formatDistanceToNow } from "date-fns"
import { getSeverityColor } from "@/lib/maintenance"
import { MetricCard, HealthGauge } from "./maintenance-ui"

interface AlertItem {
  id: string
  message: string
  severity: string
  type: string
  vehicle: string
  maintenanceDesc: string | null
  createdAt: string
}

interface NotificationItem {
  id: string
  message: string
  severity: string
  vehicle: string
  resolvedAt: string
}

interface IssueItem {
  id: string
  description: string
  severity: string
  scheduledDate: string
  vehicle: string
  vehicleType: string
}

interface OverviewData {
  activeAlerts: AlertItem[]
  notifications: NotificationItem[]
  unassignedIssues: IssueItem[]
}

interface StatsData {
  overdue: number; dueToday: number; upcoming: number; inProgress: number;
  healthScore: number; totalVehicles: number; activeFaults: number;
}

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-amber-500",
  MEDIUM: "bg-blue-500",
  LOW: "bg-slate-400",
}

export default function OverviewTab() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [overviewRes, statsRes] = await Promise.all([
        fetch("/api/maintenance/alerts?mode=all"),
        fetch("/api/maintenance/stats"),
      ])
      if (overviewRes.ok) setData(await overviewRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading && !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="shadow-sm border-0 bg-white/90">
            <CardContent className="p-4 space-y-3">
              <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
        <span className="text-sm text-red-700">{error}</span>
        <Button size="sm" variant="outline" onClick={fetchData} className="ml-auto text-xs border-red-200 text-red-600 cursor-pointer">
          Retry
        </Button>
      </div>
    )
  }

  const issues = data?.unassignedIssues || []
  const alerts = data?.activeAlerts || []
  const notifications = data?.notifications || []

  issues.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99))

  return (
    <div className="space-y-5">
      {/* KPI Strip */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard icon={AlertTriangle} label="Overdue" value={stats.overdue} color="bg-red-100" sub={stats.overdue > 0 ? `${stats.overdue} need attention` : "All clear"} />
          <MetricCard icon={Clock} label="Due Today" value={stats.dueToday} color="bg-amber-100" />
          <MetricCard icon={CalendarIcon} label="Upcoming (7d)" value={stats.upcoming} color="bg-blue-100" />
          <MetricCard icon={Wrench} label="In Progress" value={stats.inProgress} color="bg-indigo-100" />
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Fleet Health</p>
                <HealthGauge score={stats.healthScore} />
              </div>
              <div className="rounded-lg bg-emerald-100 p-2.5"><Activity className="size-5 text-emerald-600" /></div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ── Unassigned Issues ─────────────────────────────────── */}
      <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm lg:col-span-1">
        <CardHeader className="pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-500" />
              Unassigned Issues
            </CardTitle>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{issues.length}</span>
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          {issues.length > 0 ? (
            issues.map((issue) => (
              <div key={issue.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50/40 transition-all cursor-pointer">
                <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", SEVERITY_DOT[issue.severity] || "bg-slate-400")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", getSeverityColor(issue.severity))}>{issue.severity}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{issue.vehicleType}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 truncate">{issue.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500">{issue.vehicle}</span>
                    <span className="text-[9px] text-slate-300">•</span>
                    <span className="text-[9px] text-slate-400">{formatDistanceToNow(new Date(issue.scheduledDate), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-400">All issues assigned</p>
              <p className="text-[10px] text-slate-300 mt-0.5">Every work order has a mechanic</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Active Alerts ─────────────────────────────────────── */}
      <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm lg:col-span-1">
        <CardHeader className="pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Active Alerts
            </CardTitle>
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", alerts.length > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600")}>{alerts.length}</span>
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-red-100 bg-red-50/40">
                <AlertCircle className={cn("h-4 w-4 mt-0.5 shrink-0", alert.severity === "CRITICAL" || alert.severity === "HIGH" ? "text-red-500" : "text-amber-500")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", getSeverityColor(alert.severity))}>{alert.severity}</span>
                    <span className="text-[10px] text-slate-400">{alert.type}</span>
                  </div>
                  <p className="text-xs text-slate-700">{alert.message}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500 font-medium">{alert.vehicle}</span>
                    {alert.maintenanceDesc && (
                      <>
                        <span className="text-[9px] text-slate-300">•</span>
                        <span className="text-[9px] text-slate-400 truncate">{alert.maintenanceDesc}</span>
                      </>
                    )}
                    <span className="text-[9px] text-slate-300 ml-auto">{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-400">No active alerts</p>
              <p className="text-[10px] text-slate-300 mt-0.5">All maintenance alerts resolved</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Notifications ─────────────────────────────────────── */}
      <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm lg:col-span-1">
        <CardHeader className="pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-500" />
              Notifications
            </CardTitle>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{notifications.length}</span>
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100">
                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="h-3 w-3 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700">{n.message}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500 font-medium">{n.vehicle}</span>
                    <span className="text-[9px] text-slate-300">•</span>
                    <span className="text-[9px] text-slate-400">
                      {formatDistanceToNow(new Date(n.resolvedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Info className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-400">No notifications</p>
              <p className="text-[10px] text-slate-300 mt-0.5">Activity trail will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}