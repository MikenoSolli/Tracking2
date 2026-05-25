"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import {
  AlertTriangle, Wrench, Filter, Search, X, User, Ban, MoreHorizontal,
} from "lucide-react";
import {
  getStatusColor, getSeverityColor, getMaintenancePriority, getOverdueLabel,
} from "@/lib/maintenance";
import { Skeleton, StatusActions } from "./maintenance-ui";

// ─── Types ─────────────────────────────────────────────────────────

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

interface MechanicItem {
  id: number;
  name: string;
}

interface OverviewTabProps {
  stats: StatsData | null;
  workOrders: WorkOrder[];
  loading: boolean;
  selectedIds: Set<string>;
  mechanics: MechanicItem[];
  statusFilter: string;
  severityFilter: string;
  searchQuery: string;
  onStatusFilter: (v: string) => void;
  onSeverityFilter: (v: string) => void;
  onSearchQuery: (v: string) => void;
  onSelectIds: (ids: Set<string>) => void;
  onOpenDetail: (id: string) => void;
  onCancelWO: (id: string) => void;
  onBulkAssign: () => void;
  onBulkCancel: () => void;
  onInlineAssign: (woId: string, mechanicId: string) => void;
  onRefresh: () => void;
  onFilterByStatus: (status: string) => void;
}

export default function WorkOrdersTab({
  stats,
  workOrders,
  loading,
  selectedIds,
  mechanics,
  statusFilter,
  severityFilter,
  searchQuery,
  onStatusFilter,
  onSeverityFilter,
  onSearchQuery,
  onSelectIds,
  onOpenDetail,
  onCancelWO,
  onBulkAssign,
  onBulkCancel,
  onInlineAssign,
  onRefresh,
  onFilterByStatus,
}: OverviewTabProps) {
  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-slate-200">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Search vehicle or description..."
            className="pl-8 h-8"
            value={searchQuery}
            onChange={(e) => onSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRefresh();
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-slate-400" />
          <Select
            value={statusFilter}
            onValueChange={onStatusFilter}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="ASSIGNED">Assigned</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="ON_HOLD">On Hold</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={severityFilter}
            onValueChange={onSeverityFilter}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          <span className="text-sm font-medium text-amber-800">
            {selectedIds.size} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectIds(new Set())}
          >
            <X className="size-3" />
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkAssign}
          >
            <User className="size-3" />
            Assign
          </Button>
          <Button variant="outline" size="sm" onClick={onBulkCancel}>
            <Ban className="size-3" />
            Cancel
          </Button>
        </div>
      )}

      {/* Work Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left p-3 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300"
                      checked={
                        selectedIds.size === workOrders.length &&
                        workOrders.length > 0
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          onSelectIds(
                            new Set(workOrders.map((wo) => wo.id)),
                          );
                        } else {
                          onSelectIds(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Mechanic
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="p-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : workOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-8 text-center text-slate-400"
                    >
                      <Wrench className="size-8 mx-auto mb-2 opacity-50" />
                      <p>No work orders found</p>
                    </td>
                  </tr>
                ) : (
                  workOrders.map((wo) => {
                    const priority = getMaintenancePriority(
                      wo.severity,
                      new Date(wo.scheduledDate),
                    );
                    const pColor =
                      priority === "P0"
                        ? "bg-red-600 text-white"
                        : priority === "P1"
                          ? "bg-amber-500 text-white"
                          : priority === "P2"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600";
                    const dueDate = new Date(wo.scheduledDate);
                    const daysDiff = differenceInDays(dueDate, new Date());
                    const isOverdue =
                      daysDiff < 0 &&
                      !["COMPLETED", "CANCELLED"].includes(wo.status);

                    return (
                      <tr
                        key={wo.id}
                        className={cn(
                          "border-b border-slate-100 transition-colors hover:bg-slate-50",
                          isOverdue && "bg-red-50/40",
                        )}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300"
                            checked={selectedIds.has(wo.id)}
                            onChange={(e) => {
                              const next = new Set(selectedIds);
                              if (e.target.checked) next.add(wo.id);
                              else next.delete(wo.id);
                              onSelectIds(next);
                            }}
                          />
                        </td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold",
                              pColor,
                            )}
                          >
                            {priority}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-900">
                          <button
                            className="hover:text-amber-600 transition-colors"
                            onClick={() => onOpenDetail(wo.id)}
                          >
                            {wo.vehicle}
                          </button>
                          {wo.vehicleType && (
                            <span className="ml-1.5 text-[10px] text-slate-400 uppercase">
                              {wo.vehicleType}
                            </span>
                          )}
                        </td>
                        <td className="p-3 max-w-[200px] truncate text-slate-600">
                          {wo.description}
                        </td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                              getStatusColor(wo.status),
                            )}
                          >
                            {wo.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-3">
                          <Select
                            value={wo.mechanicId?.toString() || "none"}
                            onValueChange={(v) =>
                              onInlineAssign(wo.id, v)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs w-[140px]">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                — Unassigned
                              </SelectItem>
                              {mechanics.map((m) => (
                                <SelectItem
                                  key={m.id}
                                  value={m.id.toString()}
                                >
                                  {m.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "text-xs font-medium",
                              isOverdue
                                ? "text-red-600"
                                : daysDiff <= 0
                                  ? "text-amber-600"
                                  : "text-slate-600",
                            )}
                          >
                            {format(dueDate, "MMM d")}
                            {isOverdue &&
                              ` (${getOverdueLabel(Math.abs(daysDiff))})`}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <StatusActions
                              status={wo.status}
                              onStatusChange={(s) =>
                                onInlineAssign(wo.id, s)
                              }
                              loading={false}
                            />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => onOpenDetail(wo.id)}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
