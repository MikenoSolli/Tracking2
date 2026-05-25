"use client"

import React, { useState, useEffect, useMemo } from "react";
import {
  Users, UserPlus, Search, ShieldCheck,
  Star, AlertCircle, TrendingUp, Download, Edit3, Loader2,
  Phone, FileText, X, Unlink, Link2, AlertTriangle, CheckCircle, Plus,
  Circle, Activity, WifiOff, ChevronLeft, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: string;
  severity: string;
  message: string;
  createdAt: string;
}

interface Driver {
  id: string;
  name: string;
  phone: string | null;
  licenseNo: string | null;
  performance: number;
  licenceExp: string | null;
  vehicle?: {
    id: string;
    model: string;
    plateNumber: string;
    make: string;
    Type: string;
  } | null;
  alert: Alert[];
  _count: {
    alert: number;
  };
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  plateNumber: string;
  Type: string;
  driverId: string | null;
}

// ─── Metric Card (matching vehicles page) ──────────────────────────
function MetricCard({
  icon: Icon, label, value, color, badge,
}: {
  icon: React.ElementType; label: string; value: string | number;
  color: string; badge?: string;
}) {
  return (
    <Card className="shadow-sm hover:shadow-lg transition-all duration-300 border-0 overflow-hidden group bg-white">
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
            <p className="text-2xl font-bold text-slate-900 leading-none tracking-tight">
              {value}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DriverManagement() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/drivers");
      const data = await res.json();
      setDrivers(data);
    } catch (error) {
      console.error("Failed to fetch drivers", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/vehicles");
      const data = await res.json();
      setVehicles(data);
    } catch (error) {
      console.error("Failed to fetch vehicles", error);
    }
  };

  useEffect(() => {
    fetchDrivers();
    fetchVehicles();
  }, []);

  const filteredDrivers = useMemo(() => {
    return drivers.filter(d =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vehicle?.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vehicle?.plateNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, drivers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredDrivers.length / itemsPerPage);
  const paginatedDrivers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDrivers.slice(start, start + itemsPerPage);
  }, [filteredDrivers, currentPage]);

  const availableVehicles = useMemo(() => {
    return vehicles.filter(v => !v.driverId);
  }, [vehicles]);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name"),
      phone: formData.get("phone"),
      licenseNo: formData.get("licenseNo"),
      licenceExp: formData.get("licenceExp"),
    };

    const res = await fetch("/api/drivers", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setIsRegisterOpen(false);
      fetchDrivers();
    }
  };

  const handleEditDriver = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/drivers", {
      method: "PATCH",
      body: JSON.stringify({
        id: selectedDriver?.id,
        name: formData.get("name"),
        phone: formData.get("phone"),
        licenseNo: formData.get("licenseNo"),
        licenceExp: formData.get("licenceExp"),
      }),
    });

    if (res.ok) {
      setIsEditOpen(false);
      setSelectedDriver(null);
      fetchDrivers();
    }
  };

  const handleAssignVehicle = async (vehicleId: string) => {
    if (!selectedDriver) return;
    setActionLoading(true);

    const res = await fetch("/api/drivers", {
      method: "PUT",
      body: JSON.stringify({
        driverId: selectedDriver.id,
        vehicleId,
        action: "assign",
      }),
    });

    if (res.ok) {
      setIsAssignOpen(false);
      setSelectedDriver(null);
      fetchDrivers();
      fetchVehicles();
    }
    setActionLoading(false);
  };

  const handleUnassignDriver = async () => {
    if (!selectedDriver) return;
    setActionLoading(true);

    const res = await fetch("/api/drivers", {
      method: "PUT",
      body: JSON.stringify({
        driverId: selectedDriver.id,
        action: "unassign",
      }),
    });

    if (res.ok) {
      setSelectedDriver(null);
      fetchDrivers();
      fetchVehicles();
    }
    setActionLoading(false);
  };

  const handleDeleteDriver = async () => {
    if (!selectedDriver) return;
    setActionLoading(true);

    const res = await fetch(`/api/drivers?id=${selectedDriver.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setSelectedDriver(null);
      fetchDrivers();
    }
    setActionLoading(false);
  };

  // Derived stats
  const expiredLicenses = drivers.filter(d => d.licenceExp && new Date(d.licenceExp) < new Date()).length;
  const avgPerformance = drivers.length > 0
    ? Math.round(drivers.reduce((s, d) => s + d.performance, 0) / drivers.length)
    : 0;

  if (loading) return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6">
      <div className="flex items-center justify-between animate-pulse">
        <div><div className="h-7 w-36 bg-slate-200 rounded mb-1" /><div className="h-4 w-48 bg-slate-200 rounded" /></div>
        <div className="h-11 w-40 bg-slate-200 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="animate-pulse rounded-xl bg-white border border-slate-200/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-lg bg-slate-200" />
              <div className="h-5 w-14 rounded-full bg-slate-200" />
            </div>
            <div className="h-7 w-24 bg-slate-200 rounded mb-1" />
            <div className="h-3 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
      <div className="animate-pulse rounded-xl bg-white border border-slate-200/60">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 border-b border-slate-100 last:border-0 px-6 flex items-center">
            <div className="h-4 w-full bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-sm">
              <Users className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Drivers</h1>
          </div>
          <p className="text-sm text-slate-500 ml-10">Fleet personnel management and compliance tracking</p>
        </div>

        <Sheet open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
          <SheetTrigger asChild>
            <Button className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer">
              <Plus className="h-4 w-4 stroke-[3px]" />
              <span className="font-semibold">Register Driver</span>
            </Button>
          </SheetTrigger>

          <SheetContent className="sm:max-w-xl p-0 flex flex-col border-l border-slate-200 shadow-xl">
            <form onSubmit={handleRegister} className="h-full flex flex-col">
              <div className="p-6 bg-zinc-800 text-white">
                <SheetHeader className="text-left">
                  <SheetTitle className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-400" />
                    Driver Registration
                  </SheetTitle>
                  <SheetDescription className="text-slate-400">
                    Add a new driver to the fleet management system.
                  </SheetDescription>
                </SheetHeader>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 border-b border-emerald-100 pb-2">
                    Personal Information
                  </h4>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="reg-name" className="text-xs font-bold text-slate-500 uppercase">Full Name</Label>
                      <Input id="reg-name" name="name" placeholder="e.g. John Doe" className="h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600 transition-all" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="reg-phone" className="text-xs font-bold text-slate-500 uppercase">Phone Number</Label>
                      <Input id="reg-phone" name="phone" placeholder="e.g. +254 700 000 000" className="h-11 border-slate-200 focus-visible:ring-0" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 border-b border-emerald-100 pb-2">
                    License Details
                  </h4>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="reg-licenseNo" className="text-xs font-bold text-slate-500 uppercase">License Number</Label>
                      <Input id="reg-licenseNo" name="licenseNo" placeholder="e.g. DL-001234" className="h-11 border-slate-200 focus-visible:ring-0" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="reg-licenceExp" className="text-xs font-bold text-slate-500 uppercase">License Expiry</Label>
                      <Input id="reg-licenceExp" name="licenceExp" type="date" className="h-11 border-slate-200 focus-visible:ring-0" required />
                    </div>
                  </div>
                </div>
              </div>

              <SheetFooter className="p-6 border-t border-slate-100 bg-slate-50">
                <div className="flex w-full items-center gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)} className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-100 h-11 cursor-pointer">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-emerald-700 hover:bg-emerald-800 h-11 shadow-md font-semibold cursor-pointer">
                    Register Driver
                  </Button>
                </div>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* ── Summary Stats ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Total Staff"
          value={drivers.length}
          color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          badge="Verified"
        />
        <MetricCard
          icon={Activity}
          label="Assigned"
          value={drivers.filter(d => d.vehicle).length}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          badge={drivers.length > 0 ? `${Math.round((drivers.filter(d => d.vehicle).length / drivers.length) * 100)}%` : undefined}
        />
        <MetricCard
          icon={Star}
          label="Performance Avg"
          value={`${avgPerformance}%`}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
        />
        <MetricCard
          icon={AlertCircle}
          label="License Alerts"
          value={expiredLicenses}
          color={expiredLicenses > 0
            ? "bg-gradient-to-br from-red-500 to-red-600"
            : "bg-gradient-to-br from-slate-400 to-slate-500"
          }
          badge={expiredLicenses > 0 ? "Expired" : undefined}
        />
      </div>

      {/* ── Main Content ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* MAIN TABLE */}
        <Card className="lg:col-span-2 shadow-sm border-0 overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search by name, vehicle, or plate..."
                className="h-10 w-full pl-9 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-0 focus:border-emerald-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredDrivers.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                  {searchQuery
                    ? <Search className="h-7 w-7 text-slate-300" />
                    : <Users className="h-7 w-7 text-slate-300" />
                  }
                </div>
                <p className="text-slate-800 font-semibold">
                  {searchQuery ? "No drivers match your search" : "No drivers registered"}
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  {searchQuery ? "Try adjusting your search terms" : "Register your first driver to get started"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-50 z-10">
                      <tr>
                        <th className="px-5 py-3.5 w-52">Driver</th>
                        <th className="px-5 py-3.5 w-48">Assigned Unit</th>
                        <th className="px-5 py-3.5 w-24">Performance</th>
                        <th className="px-5 py-3.5 w-20">Alerts</th>
                        <th className="px-5 py-3.5 w-32">License</th>
                        <th className="px-5 py-3.5 w-20 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedDrivers.map((driver) => {
                        const isExpired = driver.licenceExp && new Date(driver.licenceExp) < new Date();
                        return (
                          <tr key={driver.id} className="hover:bg-slate-50/80 transition-all group">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => { setSelectedDriver(driver); setIsEditOpen(true); }}
                                  className="h-9 w-9 bg-slate-900 rounded-lg flex items-center justify-center font-bold text-white text-xs hover:bg-slate-700 transition shrink-0"
                                >
                                  {driver.name.substring(0, 2).toUpperCase()}
                                </button>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate max-w-[140px]">{driver.name}</p>
                                  {driver.phone && (
                                    <p className="text-[11px] text-slate-400 font-medium truncate">{driver.phone}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              {driver.vehicle ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-200 bg-emerald-50 whitespace-nowrap px-2.5 py-0.5 rounded-lg">
                                    {driver.vehicle.make} {driver.vehicle.model}
                                  </Badge>
                                  <span className="text-[10px] text-slate-400 hidden sm:inline font-mono">{driver.vehicle.plateNumber}</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={cn(
                                "inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold",
                                driver.performance >= 85
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : driver.performance >= 70
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-red-50 text-red-700 border border-red-200"
                              )}>
                                {driver.performance}%
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              {driver._count.alert > 0 ? (
                                <button
                                  onClick={() => { setSelectedDriver(driver); setIsAlertsOpen(true); }}
                                  className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 rounded-lg hover:bg-red-100 transition border border-red-100 cursor-pointer"
                                >
                                  <AlertCircle className="h-3 w-3 text-red-500" />
                                  <span className="text-[10px] font-bold text-red-600">{driver._count.alert}</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-300 font-mono">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              {driver.licenceExp ? (
                                <span className={cn(
                                  "text-[11px] font-semibold font-mono",
                                  isExpired ? "text-red-600" : "text-emerald-600"
                                )}>
                                  {new Date(driver.licenceExp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-300 font-mono">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex justify-end gap-0.5">
                                <button
                                  onClick={() => { setSelectedDriver(driver); setIsEditOpen(true); }}
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                                  title="Edit driver"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => { setSelectedDriver(driver); setIsAssignOpen(true); }}
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                  title="Assign vehicle"
                                >
                                  <Link2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                    <p className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span>
                      {" — "}
                      <span className="font-medium text-slate-700">{Math.min(currentPage * itemsPerPage, filteredDrivers.length)}</span>
                      {" of "}
                      <span className="font-medium text-slate-700">{filteredDrivers.length}</span> drivers
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="h-8 px-2 text-xs border-slate-200"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                        Prev
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "h-8 w-8 p-0 text-xs",
                            currentPage === page && "bg-emerald-700 hover:bg-emerald-800"
                          )}
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="h-8 px-2 text-xs border-slate-200"
                      >
                        Next
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* SIDEBAR */}
        <div className="space-y-5">
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> Performance Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {drivers.length > 0 ? (
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={drivers.slice(0, 8)} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.substring(0, 3)} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        formatter={(value) => [`${value}%`, 'Performance']}
                      />
                      <Bar dataKey="performance" radius={[6, 6, 0, 0]} maxBarSize={32}>
                        {drivers.slice(0, 8).map((e, i) => (
                          <Cell key={i} fill={e.performance >= 85 ? '#16a34a' : e.performance >= 70 ? '#d97706' : '#dc2626'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-xs text-slate-400">No data yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 bg-slate-900 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 opacity-[0.04]" aria-hidden="true">
              <ShieldCheck className="h-32 w-32" />
            </div>
            <CardContent className="p-6 relative z-10">
              <div className="p-3 bg-white/10 w-fit rounded-2xl mb-4">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <CardTitle className="text-base font-bold mb-1">Fleet Compliance</CardTitle>
              <p className="text-[11px] text-slate-400 mb-6 font-medium leading-relaxed">
                Auto-calculating license validity across {drivers.length} operator{drivers.length !== 1 ? 's' : ''}.
                {expiredLicenses > 0 && (
                  <span className="block text-red-400 mt-1 font-semibold">{expiredLicenses} expired license{expiredLicenses > 1 ? 's' : ''} need attention.</span>
                )}
              </p>
              <Button className="w-full bg-white text-slate-900 rounded-xl font-bold text-xs h-11 hover:bg-slate-100 transition-all active:scale-[0.98] cursor-pointer">
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── EDIT DRIVER SHEET ────────────────────────────────────── */}
      <Sheet open={isEditOpen} onOpenChange={(v) => { if (!v) { setIsEditOpen(false); setSelectedDriver(null); } }}>
        <SheetContent className="sm:max-w-xl p-0 flex flex-col border-l border-slate-200 shadow-xl">
          <form onSubmit={handleEditDriver} className="h-full flex flex-col">
            <div className="p-6 bg-zinc-800 text-white">
              <SheetHeader className="text-left">
                <SheetTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-emerald-400" />
                  {selectedDriver?.name || 'Edit Driver'}
                </SheetTitle>
                <SheetDescription className="text-slate-400">
                  Update driver details and manage assignments.
                </SheetDescription>
              </SheetHeader>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 border-b border-emerald-100 pb-2">
                  Personal Information
                </h4>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name" className="text-xs font-bold text-slate-500 uppercase">Full Name</Label>
                    <Input id="edit-name" name="name" defaultValue={selectedDriver?.name} className="h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-phone" className="text-xs font-bold text-slate-500 uppercase">Phone Number</Label>
                    <Input id="edit-phone" name="phone" defaultValue={selectedDriver?.phone || ""} className="h-11 border-slate-200 focus-visible:ring-0" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 border-b border-emerald-100 pb-2">
                  License Details
                </h4>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-licenseNo" className="text-xs font-bold text-slate-500 uppercase">License Number</Label>
                    <Input id="edit-licenseNo" name="licenseNo" defaultValue={selectedDriver?.licenseNo || ""} className="h-11 border-slate-200 focus-visible:ring-0" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-licenceExp" className="text-xs font-bold text-slate-500 uppercase">License Expiry</Label>
                    <Input id="edit-licenceExp" name="licenceExp" type="date" defaultValue={selectedDriver?.licenceExp ? selectedDriver.licenceExp.split('T')[0] : ""} className="h-11 border-slate-200 focus-visible:ring-0" required />
                  </div>
                </div>
              </div>

              {selectedDriver?.vehicle && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Currently Assigned</p>
                  <p className="text-sm font-semibold text-emerald-800">{selectedDriver.vehicle.make} {selectedDriver.vehicle.model}</p>
                  <p className="text-xs text-emerald-600 font-mono mt-0.5">{selectedDriver.vehicle.plateNumber}</p>
                </div>
              )}
            </div>

            <SheetFooter className="p-6 border-t border-slate-100 bg-slate-50">
              <div className="flex w-full items-center gap-3">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteDriver}
                  disabled={actionLoading}
                  className="px-4 h-11 rounded-xl font-semibold cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setIsEditOpen(false); setSelectedDriver(null); }} className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-100 h-11 cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-emerald-700 hover:bg-emerald-800 h-11 shadow-md font-semibold cursor-pointer">
                  Save Changes
                </Button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── ASSIGN VEHICLE DIALOG ────────────────────────────────── */}
      <Dialog open={isAssignOpen} onOpenChange={(v) => { if (!v) setIsAssignOpen(false); if (!v) setSelectedDriver(null); }}>
        <DialogContent className="rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2 text-lg">
              <Link2 className="h-4 w-4 text-emerald-600" /> Assign Vehicle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {selectedDriver?.vehicle && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Current Assignment</p>
                    <p className="text-sm font-semibold text-amber-800 mt-1">{selectedDriver.vehicle.make} {selectedDriver.vehicle.model}</p>
                    <p className="text-xs text-amber-600 font-mono">{selectedDriver.vehicle.plateNumber}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnassignDriver}
                    disabled={actionLoading}
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-100 h-8 text-xs cursor-pointer"
                  >
                    <Unlink className="h-3 w-3 mr-1" /> Unassign
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Vehicle</p>
              {availableVehicles.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableVehicles.map(vehicle => (
                    <button
                      key={vehicle.id}
                      onClick={() => handleAssignVehicle(vehicle.id)}
                      disabled={actionLoading}
                      className="w-full p-3.5 text-left rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all disabled:opacity-50 group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">{vehicle.make} {vehicle.model}</p>
                        <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">{vehicle.Type}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{vehicle.plateNumber}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-sm text-slate-500 font-medium">No available vehicles</p>
                  <p className="text-xs text-slate-400 mt-1">All vehicles are currently assigned</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── ALERTS DIALOG ────────────────────────────────────────── */}
      <Dialog open={isAlertsOpen} onOpenChange={(v) => { if (!v) setIsAlertsOpen(false); if (!v) setSelectedDriver(null); }}>
        <DialogContent className="rounded-xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2 text-lg">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Driver Alerts
              {selectedDriver && (
                <span className="text-sm font-normal text-slate-500 ml-1">— {selectedDriver.name}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 max-h-80 overflow-y-auto">
            {selectedDriver?.alert && selectedDriver.alert.length > 0 ? (
              selectedDriver.alert.map(alert => {
                const severityColor = alert.severity === 'HIGH' || alert.severity === 'CRITICAL'
                  ? 'bg-red-50 border-red-200'
                  : alert.severity === 'MEDIUM'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-blue-50 border-blue-200';
                const badgeColor = alert.severity === 'HIGH' || alert.severity === 'CRITICAL'
                  ? 'bg-red-100 text-red-700'
                  : alert.severity === 'MEDIUM'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700';

                return (
                  <div key={alert.id} className={`p-4 rounded-xl border ${severityColor}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-slate-900">{alert.type}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${badgeColor}`}>{alert.severity}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{alert.message}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-mono">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center">
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-emerald-700">All Clear</p>
                <p className="text-xs text-slate-400 mt-1">No alerts for this driver</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}