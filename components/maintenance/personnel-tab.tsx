"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Users, Plus, Mail } from "lucide-react";
import { Skeleton } from "./maintenance-ui";

interface PersonnelItem {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  activeWorkOrders?: number;
}

interface PersonnelTabProps {
  onAddPersonnel: () => void;
}

export default function PersonnelTab({ onAddPersonnel }: PersonnelTabProps) {
  const [personnelList, setPersonnelList] = useState<PersonnelItem[]>([]);
  const [personnelLoading, setPersonnelLoading] = useState(false);

  const fetchPersonnel = useCallback(async () => {
    setPersonnelLoading(true);
    try {
      const res = await fetch("/api/maintenance/mechanics");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setPersonnelList(data.mechanics || []);
    } catch {
      // silent
    } finally {
      setPersonnelLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonnel();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTogglePersonnel = useCallback(
    async (id: number, isActive: boolean) => {
      try {
        const res = await fetch("/api/maintenance/mechanics", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, isActive }),
        });
        if (!res.ok) throw new Error("Failed to update");
        fetchPersonnel();
      } catch {
        // silent
      }
    },
    [fetchPersonnel],
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          onClick={onAddPersonnel}
        >
          <Plus className="size-4" />
          Add Personnel
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
                    Email
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Active Orders
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {personnelLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="p-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : personnelList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-slate-400"
                    >
                      <Users className="size-8 mx-auto mb-2 opacity-50" />
                      <p>No personnel found</p>
                    </td>
                  </tr>
                ) : (
                  personnelList.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
                            {p.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              ID: {p.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="size-3.5 text-slate-400" />
                          {p.email}
                        </div>
                      </td>
                      <td className="p-3 font-medium text-slate-900">
                        {p.activeWorkOrders ?? 0}
                      </td>
                      <td className="p-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                            p.isActive !== false
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {p.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() =>
                            handleTogglePersonnel(
                              p.id,
                              p.isActive === false,
                            )
                          }
                        >
                          {p.isActive !== false
                            ? "Deactivate"
                            : "Activate"}
                        </Button>
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
