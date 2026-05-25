"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wrench,
  AlertTriangle,
  Calendar as CalendarIcon,
  ChevronDown,
  Clock,
  Loader2,
  Plus,
  Search,
  X,
  CheckCircle2,
  Circle,
  Filter,
  MoreHorizontal,
  Activity,
  Award,
  User,
  Trash2,
  Ban,
  Users,
  Mail,
  FileText,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import {
  getStatusColor,
  getSeverityColor,
  getMaintenancePriority,
  getOverdueLabel,
  getPriorityLabel,
  formatCost,
  getOriginLabel,
} from "@/lib/maintenance";
import { Skeleton, MetricSkeleton, MetricCard, HealthGauge, CancelDialog, StatusActions } from "@/components/maintenance/maintenance-ui";
import WorkOrdersTab from "@/components/maintenance/workorders-tab";
import OverviewTab from "@/components/maintenance/overview-tab";
import CalendarTab from "@/components/maintenance/calendar-tab";
import PersonnelTab from "@/components/maintenance/personnel-tab";
import TemplatesTab from "@/components/maintenance/templates-tab";

// ─── Types ─────────────────────────────────────────────────────────────

interface WorkOrder {
  id: string;
  vehicle: string;
  vehicleId: string;
  vehicleType: string;
  description: string;
  status: string;
  severity: string;
  origin: string;
  scheduledDate: string;
  serviceDate: string;
  cost: number | null;
  mechanic: string | null;
  mechanicId: number | null;
  activeFaults: number;
  completedAt: string | null;
  createdAt: string;
}

interface StatsData {
  overdue: number;
  dueToday: number;
  upcoming: number;
  inProgress: number;
  healthScore: number;
  complianceRate: number;
  totalVehicles: number;
  activeFaults: number;
}

interface DetailData {
  id: string;
  description: string;
  status: string;
  severity: string;
  origin: string;
  scheduledDate: string;
  serviceDate: string;
  cost: number | null;
  completedAt: string | null;
  createdAt: string;
  vehicle: {
    id: string;
    plateNumber: string | null;
    make: string;
    model: string;
    Type: string;
    year: number | null;
    status: {
      odometer: number | null;
      engineHours: number | null;
      fuelLevel: number | null;
      latitude: number | null;
      longitude: number | null;
      updatedAt: string;
    } | null;
  } | null;
  mechanic: { id: number; name: string; email: string } | null;
  template: { id: string; name: string } | null;
  faults: {
    id: string;
    severity: string;
    faultDefinition: {
      description: string;
      systemType: string;
      recommendedAction: string;
    } | null;
  }[];
  alerts: {
    id: string;
    message: string;
    severity: string;
    createdAt: string;
    isResolved: boolean;
  }[];
}

interface MechanicItem {
  id: number;
  name: string;
}

interface TemplateItem {
  id: string;
  name: string;
  defaultSeverity: string;
  estimatedCost: number | null;
  estimatedDuration: number | null;
}

// ─── Main Component ────────────────────────────────────────────────────

export default function MaintenancePage() {
  // ── Data state ──────────────────────────────────────────────────────
  const [stats, setStats] = useState<StatsData | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filters ─────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Bulk actions ────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignMechanicId, setAssignMechanicId] = useState<string>("");

  // ── Detail drawer ───────────────────────────────────────────────────
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelWO, setCancelWO] = useState<WorkOrder | null>(null);
  const [completeWO, setCompleteWO] = useState<WorkOrder | null>(null);

  // ── Create sheet ────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [vehicles, setVehicles] = useState<{ id: string; label: string }[]>([]);
  const [mechanics, setMechanics] = useState<MechanicItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [createForm, setCreateForm] = useState({
    vehicleId: "",
    description: "",
    scheduledDate: "",
    severity: "MEDIUM",
    mechanicId: "none",
    templateId: "",
    origin: "MANUAL",
  });
  const [createLoading, setCreateLoading] = useState(false);

  // ── Tabs ────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<
    "overview" | "workorders" | "personnel" | "calendar" | "templates"
  >("overview");

  // ── Personnel ───────────────────────────────────────────────────────
  const [personnelList, setPersonnelList] = useState<any[]>([]);
  const [personnelLoading, setPersonnelLoading] = useState(false);
  const [addPersonnelOpen, setAddPersonnelOpen] = useState(false);
  const [personnelForm, setPersonnelForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [personnelFormLoading, setPersonnelFormLoading] = useState(false);

  // ── Calendar ────────────────────────────────────────────────────────
  const [calendarMonth, setCalendarMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [calendarData, setCalendarData] = useState<Record<string, any[]>>({});
  const [calendarMechanics, setCalendarMechanics] = useState<MechanicItem[]>(
    [],
  );
  const [calendarLoading, setCalendarLoading] = useState(false);

  // ── Templates ───────────────────────────────────────────────────────
  const [templateList, setTemplateList] = useState<any[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    vehicleType: "ALL",
    timeIntervalDays: "",
    mileageIntervalKm: "",
    engineHoursInterval: "",
    defaultSeverity: "MEDIUM",
    estimatedCost: "",
    estimatedDuration: "",
  });
  const [templateFormLoading, setTemplateFormLoading] = useState(false);

  // ── Fetch Helpers ───────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/maintenance/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data);
    } catch {
      // silent
    }
  }, []);

  const fetchMechanics = useCallback(async () => {
    try {
      const res = await fetch("/api/maintenance/mechanics");
      if (!res.ok) {
        const fallback = await fetch("/api/drivers?role=MECHANIC");
        if (fallback.ok) {
          const fd = await fallback.json();
          const list = (fd.drivers || fd || []).map((d: any) => ({
            id: d.id,
            name: d.name,
          }));
          setMechanics(list);
          return;
        }
        throw new Error("Failed");
      }
      const data = await res.json();
      setMechanics(data.mechanics || []);
    } catch {
      setMechanics([]);
    }
  }, []);

  const fetchWorkOrders = useCallback(
    async (status?: string, severity?: string, search?: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        const s = status ?? statusFilter;
        const sev = severity ?? severityFilter;
        const q = search ?? searchQuery;
        if (s && s !== "all") params.set("status", s);
        if (sev && sev !== "all") params.set("severity", sev);
        if (q) params.set("search", q);
        const res = await fetch(`/api/maintenance?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch work orders");
        const data = await res.json();
        setWorkOrders(data.workOrders || []);
        fetchStats();
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, severityFilter, searchQuery, fetchStats],
  );

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/maintenance/${id}`);
      if (!res.ok) throw new Error("Failed to fetch detail");
      const data = await res.json();
      setDetailData(data);
    } catch {
      toast.error("Failed to load work order details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openDetail = useCallback(
    (wo: WorkOrder) => {
      setSelectedWO(wo);
      fetchDetail(wo.id);
    },
    [fetchDetail],
  );

  const refreshDetail = useCallback(() => {
    if (selectedWO) {
      fetchDetail(selectedWO.id);
      fetchWorkOrders();
    }
  }, [selectedWO, fetchDetail, fetchWorkOrders]);

  const fetchCalendar = useCallback(async (month: string) => {
    setCalendarLoading(true);
    try {
      const res = await fetch(`/api/maintenance/calendar?month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch calendar");
      const data = await res.json();
      setCalendarData(data.grouped || {});
      setCalendarMechanics(data.mechanics || []);
    } catch {
      toast.error("Failed to load calendar");
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setTemplateLoading(true);
    try {
      const res = await fetch("/api/maintenance/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      const data = await res.json();
      setTemplateList(data.templates || []);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setTemplateLoading(false);
    }
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────

  const handleAddTemplate = useCallback(async () => {
    setTemplateFormLoading(true);
    try {
      const res = await fetch("/api/maintenance/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...templateForm,
          vehicleType:
            templateForm.vehicleType === "ALL" ? "" : templateForm.vehicleType,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create template");
      }
      toast.success("Template created");
      setAddTemplateOpen(false);
      setTemplateForm({
        name: "",
        description: "",
        vehicleType: "ALL",
        timeIntervalDays: "",
        mileageIntervalKm: "",
        engineHoursInterval: "",
        defaultSeverity: "MEDIUM",
        estimatedCost: "",
        estimatedDuration: "",
      });
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTemplateFormLoading(false);
    }
  }, [templateForm, fetchTemplates]);

  const openCreate = useCallback(async () => {
    setCreateOpen(true);
    try {
      const [vRes, mRes, tRes] = await Promise.all([
        fetch("/api/vehicles"),
        fetch("/api/maintenance/mechanics"),
        fetch("/api/maintenance/templates"),
      ]);
      if (vRes.ok) {
        const vData = await vRes.json();
        const vList = (
          Array.isArray(vData) ? vData : vData.vehicles || vData.data || []
        ).map((v: any) => ({
          id: v.id,
          label: `${v.make} ${v.model}${v.plateNumber ? ` (${v.plateNumber})` : ""}`,
        }));
        setVehicles(vList);
      }
      if (mRes.ok) {
        const mData = await mRes.json();
        setMechanics(mData.mechanics || []);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTemplates(tData.templates || []);
      }
    } catch {
      // silent
    }
  }, []);

  const handleCreate = useCallback(async () => {
    setCreateLoading(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: createForm.vehicleId,
          description: createForm.description,
          scheduledDate: createForm.scheduledDate || undefined,
          severity: createForm.severity,
          mechanicId:
            createForm.mechanicId && createForm.mechanicId !== "none"
              ? parseInt(createForm.mechanicId)
              : undefined,
          templateId: createForm.templateId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create work order");
      }
      toast.success("Work order created");
      setCreateOpen(false);
      setCreateForm({
        vehicleId: "",
        description: "",
        scheduledDate: "",
        severity: "MEDIUM",
        mechanicId: "none",
        templateId: "",
        origin: "MANUAL",
      });
      fetchWorkOrders();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreateLoading(false);
    }
  }, [createForm, fetchWorkOrders]);

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      const tpl = templates.find((t) => t.id === templateId);
      if (!tpl) return;
      setCreateForm((prev) => ({
        ...prev,
        templateId,
        description: tpl.name,
        severity: tpl.defaultSeverity || "MEDIUM",
      }));
    },
    [templates],
  );

  const handleInlineAssign = useCallback(
    async (woId: string, mechanicId: string) => {
      try {
        const parsedId =
          mechanicId && mechanicId !== "none" ? parseInt(mechanicId) : null;
        const r = await fetch(`/api/maintenance/${woId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mechanicId: parsedId,
            status: parsedId ? "ASSIGNED" : "SCHEDULED",
          }),
        });
        if (!r.ok) throw new Error("Failed to assign");
        toast.success("Assigned");
        fetchWorkOrders();
        if (selectedWO?.id === woId) refreshDetail();
      } catch {
        toast.error("Failed to assign mechanic");
      }
    },
    [fetchWorkOrders, selectedWO, refreshDetail],
  );

  const handleBulkAssign = useCallback(async () => {
    if (!assignMechanicId) return;
    const promises = Array.from(selectedIds).map((id) =>
      fetch(`/api/maintenance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mechanicId: parseInt(assignMechanicId),
          status: "ASSIGNED",
        }),
      }),
    );
    try {
      await Promise.all(promises);
      toast.success(`Assigned ${selectedIds.size} work orders`);
      setShowAssignDialog(false);
      setSelectedIds(new Set());
      fetchWorkOrders();
    } catch {
      toast.error("Bulk assign failed");
    }
  }, [assignMechanicId, selectedIds, fetchWorkOrders]);

  const handleBulkCancel = useCallback(async () => {
    const promises = Array.from(selectedIds).map((id) =>
      fetch(`/api/maintenance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      }),
    );
    try {
      await Promise.all(promises);
      toast.success(`Cancelled ${selectedIds.size} work orders`);
      setSelectedIds(new Set());
      fetchWorkOrders();
    } catch {
      toast.error("Bulk cancel failed");
    }
  }, [selectedIds, fetchWorkOrders]);

  const handleAddPersonnel = useCallback(async () => {
    setPersonnelFormLoading(true);
    try {
      const res = await fetch("/api/maintenance/mechanics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(personnelForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add personnel");
      }
      toast.success("Personnel added");
      setAddPersonnelOpen(false);
      setPersonnelForm({ name: "", email: "", password: "" });
      fetchPersonnel();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPersonnelFormLoading(false);
    }
  }, [personnelForm]);

  const handleTogglePersonnel = useCallback(
    async (id: number, isActive: boolean) => {
      try {
        const res = await fetch("/api/maintenance/mechanics", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, isActive }),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast.success(isActive ? "Activated" : "Deactivated");
        fetchPersonnel();
      } catch {
        toast.error("Failed to update personnel");
      }
    },
    [],
  );

  // ── Personnel fetch ─────────────────────────────────────────────────
  const fetchPersonnel = useCallback(async () => {
    setPersonnelLoading(true);
    try {
      const res = await fetch("/api/maintenance/mechanics");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setPersonnelList(data.mechanics || []);
    } catch {
      toast.error("Failed to load personnel");
    } finally {
      setPersonnelLoading(false);
    }
  }, []);

  // ── Status change handler ───────────────────────────────────────────
  const handleStatusChange = useCallback(
    async (woId: string, newStatus: string) => {
      try {
        const res = await fetch(`/api/maintenance/${woId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error("Failed");
        toast.success(`Status updated to ${newStatus}`);
        fetchWorkOrders();
        if (selectedWO?.id === woId) refreshDetail();
      } catch {
        toast.error("Failed to update status");
      }
    },
    [fetchWorkOrders, selectedWO, refreshDetail],
  );

  // ── Calendar day click ──────────────────────────────────────────────
  const handleDayClick = useCallback(
    (dateStr: string) => {
      const entries = calendarData[dateStr] || [];
      if (entries.length > 0) {
        toast(
          `${entries.length} work order(s) on ${format(new Date(dateStr), "MMM d, yyyy")}`,
        );
      }
    },
    [calendarData],
  );

  // ── Filter helpers ──────────────────────────────────────────────────
  const filterByStatus = useCallback(
    (status: string) => {
      setStatusFilter(status);
      fetchWorkOrders(status, severityFilter, searchQuery);
    },
    [severityFilter, searchQuery, fetchWorkOrders],
  );

  // ── Initial load ────────────────────────────────────────────────────
  useEffect(() => {
    fetchStats();
    fetchWorkOrders();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "calendar") fetchCalendar(calendarMonth);
    if (tab === "personnel") fetchPersonnel();
    if (tab === "templates") fetchTemplates();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading / Error states ──────────────────────────────────────────
  if (loading && !stats) {
    return (
      <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-5 max-w-[1600px] mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <MetricSkeleton key={i} />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="p-4 md:p-6 bg-slate-50 min-h-screen max-w-[1600px] mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="size-10 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium">
            Failed to load maintenance data
          </p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => fetchWorkOrders()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── Main Render ─────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Maintenance
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage work orders, fleet health &amp; personnel
          </p>
        </div>
        <Button
          className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          onClick={openCreate}
        >
          <Plus className="size-4" />
          New Work Order
        </Button>
      </div>

      {/* Mini Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-200 w-fit overflow-x-auto">
        {[
          { id: "overview" as const, label: "Overview", icon: Activity },
          { id: "workorders" as const, label: "Work Orders", icon: Wrench },
          { id: "calendar" as const, label: "Calendar", icon: CalendarIcon },
          { id: "personnel" as const, label: "Personnel", icon: Users },
          { id: "templates" as const, label: "Templates", icon: FileText },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              tab === t.id
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Overview Tab ──────────────────────────────────────────────── */}
      {tab === "overview" && <OverviewTab />}

      {/* ─── Work Orders Tab ──────────────────────────────────────────────── */}
      {tab === "workorders" && (
        <WorkOrdersTab
          stats={stats}
          workOrders={workOrders}
          loading={loading}
          selectedIds={selectedIds}
          mechanics={mechanics}
          statusFilter={statusFilter}
          severityFilter={severityFilter}
          searchQuery={searchQuery}
          onStatusFilter={(v) => { setStatusFilter(v); setSelectedIds(new Set()); }}
          onSeverityFilter={(v) => { setSeverityFilter(v); setSelectedIds(new Set()); }}
          onSearchQuery={setSearchQuery}
          onSelectIds={setSelectedIds}
          onOpenDetail={(id: string) => { const wo = workOrders.find(w => w.id === id); if (wo) openDetail(wo); }}
          onCancelWO={(id: string) => { const wo = workOrders.find(w => w.id === id); if (wo) setCancelWO(wo); }}
          onBulkAssign={() => setShowAssignDialog(true)}
          onBulkCancel={handleBulkCancel}
          onInlineAssign={handleInlineAssign}
          onRefresh={fetchWorkOrders}
          onFilterByStatus={(v) => { setStatusFilter(v); setSelectedIds(new Set()); }}
        />
      )}

      {/* ─── Calendar Tab ──────────────────────────────────────────────── */}
      {tab === "calendar" && <CalendarTab />}

      {/* ─── Personnel Tab ─────────────────────────────────────────────── */}
      {tab === "personnel" && <PersonnelTab onAddPersonnel={() => setAddPersonnelOpen(true)} />}

      {/* ─── Templates Tab ─────────────────────────────────────────────── */}
      {tab === "templates" && <TemplatesTab onAddTemplate={() => setAddTemplateOpen(true)} />}

      {/* ─── Detail Drawer ──────────────────────────────────────────────── */}
      <Sheet
        open={!!selectedWO}
        onOpenChange={(v) => {
          if (!v) {
            setSelectedWO(null);
            setDetailData(null);
          }
        }}
      >
        <SheetContent side="right" className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Work Order Details</SheetTitle>
            <SheetDescription>
              {selectedWO?.vehicle} — {selectedWO?.description}
            </SheetDescription>
          </SheetHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          ) : detailData ? (
            <div className="space-y-4 overflow-y-auto flex-1">
              {/* Status & Severity */}
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                    getStatusColor(detailData.status),
                  )}
                >
                  {detailData.status.replace("_", " ")}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                    getSeverityColor(detailData.severity),
                  )}
                >
                  {detailData.severity}
                </span>
                <span className="text-xs text-slate-400">
                  {getOriginLabel(detailData.origin)}
                </span>
              </div>

              {/* Vehicle info */}
              {detailData.vehicle && (
                <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Vehicle
                  </p>
                  <p className="font-medium text-slate-900">
                    {detailData.vehicle.make} {detailData.vehicle.model}
                    {detailData.vehicle.plateNumber &&
                      ` (${detailData.vehicle.plateNumber})`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {detailData.vehicle.Type}
                    {detailData.vehicle.year
                      ? ` · ${detailData.vehicle.year}`
                      : ""}
                    {detailData.vehicle.status?.odometer != null &&
                      ` · ${detailData.vehicle.status.odometer.toLocaleString()} km`}
                  </p>
                </div>
              )}

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Scheduled
                  </p>
                  <p className="font-medium text-slate-900">
                    {format(new Date(detailData.scheduledDate), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Serviced
                  </p>
                  <p className="font-medium text-slate-900">
                    {detailData.serviceDate
                      ? format(new Date(detailData.serviceDate), "MMM d, yyyy")
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Mechanic & Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Mechanic
                  </p>
                  <p className="font-medium text-slate-900">
                    {detailData.mechanic?.name || "Unassigned"}
                  </p>
                  {detailData.mechanic?.email && (
                    <p className="text-xs text-slate-400">
                      {detailData.mechanic.email}
                    </p>
                  )}
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Cost
                  </p>
                  <p className="font-medium text-slate-900">
                    {formatCost(detailData.cost)}
                  </p>
                </div>
              </div>

              {/* Template */}
              {detailData.template && (
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Template
                  </p>
                  <p className="font-medium text-slate-900">
                    {detailData.template.name}
                  </p>
                </div>
              )}

              {/* Active Faults */}
              {detailData.faults && detailData.faults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Active Faults ({detailData.faults.length})
                  </p>
                  {detailData.faults.map((f) => (
                    <div
                      key={f.id}
                      className="rounded-lg bg-red-50 border border-red-100 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                            getSeverityColor(f.severity),
                          )}
                        >
                          {f.severity}
                        </span>
                        <span className="text-xs text-slate-500">
                          {f.faultDefinition?.systemType}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mt-1">
                        {f.faultDefinition?.description || "Fault"}
                      </p>
                      {f.faultDefinition?.recommendedAction && (
                        <p className="text-xs text-slate-500 mt-1">
                          Recommended: {f.faultDefinition.recommendedAction}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Alerts */}
              {detailData.alerts && detailData.alerts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Recent Alerts
                  </p>
                  {detailData.alerts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-2 text-sm text-slate-600"
                    >
                      <div
                        className={cn(
                          "size-2 rounded-full mt-1.5 shrink-0",
                          a.isResolved ? "bg-emerald-400" : "bg-amber-400",
                        )}
                      />
                      <div>
                        <p>{a.message}</p>
                        <p className="text-[10px] text-slate-400">
                          {format(new Date(a.createdAt), "MMM d, yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <StatusActions
                  status={detailData.status}
                  onStatusChange={(s) => {
                    handleStatusChange(detailData.id, s);
                    refreshDetail();
                  }}
                  loading={false}
                />
                {!["COMPLETED", "CANCELLED"].includes(detailData.status) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setCancelWO(selectedWO);
                    }}
                  >
                    <Ban className="size-3" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ─── Create Work Order Sheet ────────────────────────────────────── */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="sm:max-w-xl p-0 flex flex-col border-l border-slate-200 shadow-xl">
          <div className="p-6 bg-zinc-800 text-white">
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Wrench className="h-5 w-5 text-emerald-400" />
                New Work Order
              </SheetTitle>
              <SheetDescription className="text-slate-400">
                Schedule maintenance for a vehicle.
              </SheetDescription>
            </SheetHeader>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 border-b border-emerald-100 pb-2">
                Service Details
              </h4>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase">
                  Template (optional)
                </Label>
                <Select
                  value={createForm.templateId}
                  onValueChange={handleTemplateSelect}
                >
                  <SelectTrigger className="w-full border-slate-200 focus-visible:ring-0 focus:border-emerald-600">
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase">
                  Vehicle *
                </Label>
                <Select
                  value={createForm.vehicleId}
                  onValueChange={(v) =>
                    setCreateForm((p) => ({ ...p, vehicleId: v }))
                  }
                >
                  <SelectTrigger className="w-full border-slate-200 focus-visible:ring-0 focus:border-emerald-600">
                    <SelectValue placeholder="Select vehicle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase">
                  Description *
                </Label>
                <Input
                  placeholder="e.g. Oil change"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  className="h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600"
                />
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 border-b border-emerald-100 pb-2">
                Schedule & Priority
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase">
                    Scheduled Date
                  </Label>
                  <Input
                    type="date"
                    value={createForm.scheduledDate}
                    onChange={(e) =>
                      setCreateForm((p) => ({
                        ...p,
                        scheduledDate: e.target.value,
                      }))
                    }
                    className="h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase">
                    Severity
                  </Label>
                  <Select
                    value={createForm.severity}
                    onValueChange={(v) =>
                      setCreateForm((p) => ({ ...p, severity: v }))
                    }
                  >
                    <SelectTrigger className="w-full h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase">
                    Origin
                  </Label>
                  <Select
                    value={createForm.origin}
                    onValueChange={(v) =>
                      setCreateForm((p) => ({ ...p, origin: v }))
                    }
                  >
                    <SelectTrigger className="w-full h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                      <SelectItem value="INTERVAL">Auto-scheduled</SelectItem>
                      <SelectItem value="FAULT">Fault-triggered</SelectItem>
                      <SelectItem value="DRIVER">Driver-reported</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase">
                    Assign Mechanic
                  </Label>
                  <Select
                    value={createForm.mechanicId}
                    onValueChange={(v) =>
                      setCreateForm((p) => ({ ...p, mechanicId: v }))
                    }
                  >
                    <SelectTrigger className="w-full h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {mechanics.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <SheetFooter className="p-6 border-t border-slate-100 bg-slate-50">
            <div className="flex w-full items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-100 h-11 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createLoading}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 h-11 shadow-md font-semibold cursor-pointer"
              >
                {createLoading ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <Plus className="size-4 mr-2" />
                )}
                Create Work Order
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Cancel Dialog ──────────────────────────────────────────────── */}
      <CancelDialog
        open={!!cancelWO}
        onOpenChange={(v) => {
          if (!v) setCancelWO(null);
        }}
        onConfirm={async (reason) => {
          if (!cancelWO) return;
          try {
            const res = await fetch(`/api/maintenance/${cancelWO.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "CANCELLED" }),
            });
            if (!res.ok) throw new Error("Failed");
            toast.success("Work order cancelled");
            setCancelWO(null);
            fetchWorkOrders();
            if (selectedWO?.id === cancelWO.id) refreshDetail();
          } catch {
            toast.error("Failed to cancel");
          }
        }}
        loading={false}
      />

      {/* ─── Bulk Assign Dialog ─────────────────────────────────────────── */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {selectedIds.size} Work Orders</DialogTitle>
            <DialogDescription>
              Select a mechanic to assign all selected orders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Mechanic</Label>
            <Select
              value={assignMechanicId}
              onValueChange={setAssignMechanicId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select mechanic..." />
              </SelectTrigger>
              <SelectContent>
                {mechanics.map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button disabled={!assignMechanicId} onClick={handleBulkAssign}>
              Assign All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Personnel Sheet ────────────────────────────────────────── */}
      <Sheet open={addPersonnelOpen} onOpenChange={setAddPersonnelOpen}>
        <SheetContent className="sm:max-w-md p-0 flex flex-col border-l border-slate-200 shadow-xl">
          <div className="p-6 bg-zinc-800 text-white">
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-400" />
                Add Mechanic
              </SheetTitle>
              <SheetDescription className="text-slate-400">
                Register a new maintenance personnel member.
              </SheetDescription>
            </SheetHeader>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 border-b border-emerald-100 pb-2">
                Account Information
              </h4>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase">
                  Full Name *
                </Label>
                <Input
                  placeholder="John Smith"
                  value={personnelForm.name}
                  onChange={(e) =>
                    setPersonnelForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase">
                  Email *
                </Label>
                <Input
                  type="email"
                  placeholder="mechanic@company.com"
                  value={personnelForm.email}
                  onChange={(e) =>
                    setPersonnelForm((p) => ({ ...p, email: e.target.value }))
                  }
                  className="h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase">
                  Password
                </Label>
                <Input
                  type="password"
                  placeholder="Defaults to mechanic123"
                  value={personnelForm.password}
                  onChange={(e) =>
                    setPersonnelForm((p) => ({
                      ...p,
                      password: e.target.value,
                    }))
                  }
                  className="h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600"
                />
              </div>
            </div>
          </div>
          <SheetFooter className="p-6 border-t border-slate-100 bg-slate-50">
            <div className="flex w-full items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setAddPersonnelOpen(false)}
                className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-100 h-11 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddPersonnel}
                disabled={
                  personnelFormLoading ||
                  !personnelForm.name ||
                  !personnelForm.email
                }
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 h-11 shadow-md font-semibold cursor-pointer"
              >
                {personnelFormLoading ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <Plus className="size-4 mr-2" />
                )}
                Add Mechanic
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Add Template Sheet ─────────────────────────────────────────── */}
      <Sheet open={addTemplateOpen} onOpenChange={setAddTemplateOpen}>
        <SheetContent className="sm:max-w-xl p-0 flex flex-col border-l border-slate-200 shadow-xl">
          <div className="p-6 bg-zinc-800 text-white">
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-400" />
                Add Service Template
              </SheetTitle>
              <SheetDescription className="text-slate-400">
                Define a recurring maintenance schedule template.
              </SheetDescription>
            </SheetHeader>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 border-b border-emerald-100 pb-2">
                Basic Information
              </h4>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase">
                  Name *
                </Label>
                <Input
                  placeholder="e.g. Oil Change"
                  value={templateForm.name}
                  onChange={(e) =>
                    setTemplateForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase">
                  Description
                </Label>
                <Input
                  placeholder="Brief description"
                  value={templateForm.description}
                  onChange={(e) =>
                    setTemplateForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  className="h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase">
                  Vehicle Type
                </Label>
                <Select
                  value={templateForm.vehicleType}
                  onValueChange={(v) =>
                    setTemplateForm((p) => ({ ...p, vehicleType: v }))
                  }
                >
                  <SelectTrigger className="w-full h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All types</SelectItem>
                    <SelectItem value="TRACTOR">Tractor</SelectItem>
                    <SelectItem value="TRUCK">Truck</SelectItem>
                    <SelectItem value="CAR">Car</SelectItem>
                    <SelectItem value="BUS">Bus</SelectItem>
                    <SelectItem value="MOTORCYCLE">Motorcycle</SelectItem>
                    <SelectItem value="VAN">Van</SelectItem>
                    <SelectItem value="PICKUP">Pickup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 border-b border-emerald-100 pb-2">
                Service Intervals
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase">
                    Days
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="180"
                    value={templateForm.timeIntervalDays}
                    onChange={(e) =>
                      setTemplateForm((p) => ({
                        ...p,
                        timeIntervalDays: e.target.value,
                      }))
                    }
                    className="h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase">
                    Mileage (km)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="10000"
                    value={templateForm.mileageIntervalKm}
                    onChange={(e) =>
                      setTemplateForm((p) => ({
                        ...p,
                        mileageIntervalKm: e.target.value,
                      }))
                    }
                    className="h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase">
                    Engine Hours
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="300"
                    value={templateForm.engineHoursInterval}
                    onChange={(e) =>
                      setTemplateForm((p) => ({
                        ...p,
                        engineHoursInterval: e.target.value,
                      }))
                    }
                    className="h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 border-b border-emerald-100 pb-2">
                Configuration
              </h4>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase">
                  Default Severity
                </Label>
                <Select
                  value={templateForm.defaultSeverity}
                  onValueChange={(v) =>
                    setTemplateForm((p) => ({ ...p, defaultSeverity: v }))
                  }
                >
                  <SelectTrigger className="w-full h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase">
                    Est. Cost ($)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={templateForm.estimatedCost}
                    onChange={(e) =>
                      setTemplateForm((p) => ({
                        ...p,
                        estimatedCost: e.target.value,
                      }))
                    }
                    className="h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase">
                    Duration (hours)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="1.0"
                    value={templateForm.estimatedDuration}
                    onChange={(e) =>
                      setTemplateForm((p) => ({
                        ...p,
                        estimatedDuration: e.target.value,
                      }))
                    }
                    className="h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>
          </div>
          <SheetFooter className="p-6 border-t border-slate-100 bg-slate-50">
            <div className="flex w-full items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setAddTemplateOpen(false)}
                className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-100 h-11 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTemplate}
                disabled={templateFormLoading || !templateForm.name}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 h-11 shadow-md font-semibold cursor-pointer"
              >
                {templateFormLoading ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <Plus className="size-4 mr-2" />
                )}
                Create Template
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
