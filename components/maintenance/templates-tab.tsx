"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FileText, Plus } from "lucide-react";
import { getSeverityColor, formatCost } from "@/lib/maintenance";
import { Skeleton } from "./maintenance-ui";

interface TemplateItem {
  id: string;
  name: string;
  description?: string;
  vehicleType?: string;
  defaultSeverity: string;
  estimatedCost: number | null;
  estimatedDuration: number | null;
  timeIntervalDays?: number | null;
  mileageIntervalKm?: number | null;
  engineHoursInterval?: number | null;
}

interface TemplatesTabProps {
  onAddTemplate: () => void;
}

export default function TemplatesTab({ onAddTemplate }: TemplatesTabProps) {
  const [templateList, setTemplateList] = useState<TemplateItem[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setTemplateLoading(true);
    try {
      const res = await fetch("/api/maintenance/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      const data = await res.json();
      setTemplateList(data.templates || []);
    } catch {
      // silent
    } finally {
      setTemplateLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          onClick={onAddTemplate}
        >
          <Plus className="size-4" />
          Add Template
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Vehicle Type
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Intervals
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Est. Cost
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                {templateLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="p-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : templateList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-slate-400"
                    >
                      <FileText className="size-8 mx-auto mb-2 opacity-50" />
                      <p>No templates found</p>
                    </td>
                  </tr>
                ) : (
                  templateList.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="p-3">
                        <p className="font-medium text-slate-900">
                          {t.name}
                        </p>
                        {t.description && (
                          <p className="text-xs text-slate-400 truncate max-w-[200px]">
                            {t.description}
                          </p>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-slate-600 uppercase">
                          {t.vehicleType || "—"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {t.timeIntervalDays && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                              {t.timeIntervalDays}d
                            </span>
                          )}
                          {t.mileageIntervalKm && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700">
                              {t.mileageIntervalKm}km
                            </span>
                          )}
                          {t.engineHoursInterval && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                              {t.engineHoursInterval}h
                            </span>
                          )}
                          {!t.timeIntervalDays &&
                            !t.mileageIntervalKm &&
                            !t.engineHoursInterval && (
                              <span className="text-xs text-slate-400">
                                —
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                            getSeverityColor(t.defaultSeverity),
                          )}
                        >
                          {t.defaultSeverity || "MEDIUM"}
                        </span>
                      </td>
                      <td className="p-3 text-slate-900 font-medium">
                        {formatCost(t.estimatedCost)}
                      </td>
                      <td className="p-3 text-slate-600">
                        {t.estimatedDuration != null
                          ? t.estimatedDuration < 1
                            ? `${Math.round(t.estimatedDuration * 60)} min`
                            : `${t.estimatedDuration}h`
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
