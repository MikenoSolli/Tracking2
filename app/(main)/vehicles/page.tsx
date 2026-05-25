"use client"

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Search, Car, Tractor, Truck, MapPin, AlertTriangle, Fuel,
  Bus, Bike, Edit3, Trash2, Check, X,
  Loader2, Gauge, WifiOff,
  Map, FileText, Circle, TrendingUp, Activity,
  ChevronDown, ChevronRight, PlusCircle, Trash, Cpu,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getAllVehiclesDisplayData, addVehicle, updateVehicle, deleteVehicles, getVehicle } from "./actions";

// ─── Types ─────────────────────────────────────────────────────
interface VehicleData {
  id: string;
  Name: string;
  plateNumber: string | null;
  type: string;
  make: string | null;
  model: string | null;
  imei: string | null;
  year: number | null;
  status: string;
  fuel: number;
  lat: number | null;
  lng: number | null;
  speed: number | null;
  dataLevel: string;
  alertsToday: number;
}

// ─── Vehicle Type Config ────────────────────────────────────────
const vehicleTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  TRACTOR: { icon: Tractor, color: "from-emerald-500 to-emerald-600", label: "Tractor" },
  TRUCK: { icon: Truck, color: "from-blue-500 to-blue-600", label: "Truck" },
  CAR: { icon: Car, color: "from-violet-500 to-violet-600", label: "Car" },
  BUS: { icon: Bus, color: "from-amber-500 to-amber-600", label: "Bus" },
  MOTORCYCLE: { icon: Bike, color: "from-rose-500 to-rose-600", label: "Motorcycle" },
  VAN: { icon: Car, color: "from-cyan-500 to-cyan-600", label: "Van" },
  PICKUP: { icon: Truck, color: "from-orange-500 to-orange-600", label: "Pickup" },
};

const dataLevelLabels: Record<string, { label: string; color: string }> = {
  BASIC: { label: "Basic", color: "bg-slate-100 text-slate-600" },
  STANDARD: { label: "Standard", color: "bg-blue-100 text-blue-700" },
  ADVANCED: { label: "Advanced", color: "bg-purple-100 text-purple-700" },
  CUSTOM: { label: "Custom", color: "bg-amber-100 text-amber-700" },
  ENTERPRISE: { label: "Enterprise", color: "bg-emerald-100 text-emerald-700" },
};

const subscriptionOptions = [
  { value: "BASIC", label: "Basic", desc: "GPS location only" },
  { value: "STANDARD", label: "Standard", desc: "Location + Fuel" },
  { value: "ADVANCED", label: "Advanced", desc: "Location + Fuel + OBD" },
  { value: "CUSTOM", label: "Custom", desc: "Location + Custom selection" },
];

// ─── Feature & Sensor Type Config for Custom subscription ─────
interface SensorDef {
  name: string;
  type: string;
  unit: string;
  min: string;
  max: string;
  alertThreshold: string;
  alertCondition: string;
}

const featureTypeOptions: { value: string; label: string; category: string }[] = [
  { value: "GPS_TRACKING", label: "GPS Tracking", category: "Core" },
  { value: "SPEED_MONITORING", label: "Speed Monitoring", category: "Core" },
  { value: "FUEL_MONITORING", label: "Fuel Monitoring", category: "Core" },
  { value: "ENGINE_TELEMETRY", label: "Engine Telemetry", category: "Engine" },
  { value: "OBD_DIAGNOSTICS", label: "OBD Diagnostics", category: "Engine" },
  { value: "GEOFENCING", label: "Geofencing", category: "Safety" },
  { value: "DRIVER_BEHAVIOR", label: "Driver Behavior", category: "Safety" },
  { value: "MAINTENANCE_TRACKING", label: "Maintenance Tracking", category: "Management" },
  { value: "TEMPERATURE_MONITORING", label: "Temperature Monitoring", category: "Cargo" },
  { value: "HUMIDITY_MONITORING", label: "Humidity Monitoring", category: "Cargo" },
  { value: "CARGO_MONITORING", label: "Cargo Monitoring", category: "Cargo" },
  { value: "REFRIGERATION", label: "Refrigeration", category: "Cargo" },
  { value: "TIRE_PRESSURE", label: "Tire Pressure", category: "Safety" },
  { value: "WEIGHT_SENSOR", label: "Weight Sensor", category: "Cargo" },
  { value: "VIDEO_TELEMATICS", label: "Video Telematics", category: "Safety" },
  { value: "CUSTOM_SENSORS", label: "Custom Sensors (DIY)", category: "Custom" },
];

const customSensorTypeOptions: { value: string; label: string }[] = [
  { value: "TEMPERATURE", label: "Temperature" },
  { value: "PRESSURE", label: "Pressure" },
  { value: "HUMIDITY", label: "Humidity" },
  { value: "WEIGHT", label: "Weight" },
  { value: "VOLUME", label: "Volume" },
  { value: "DISTANCE", label: "Distance" },
  { value: "BINARY", label: "On/Off" },
  { value: "COUNTER", label: "Event Counter" },
  { value: "OTHER", label: "Other" },
];

const alertConditionOptions: { value: string; label: string }[] = [
  { value: "ABOVE", label: "Above threshold" },
  { value: "BELOW", label: "Below threshold" },
  { value: "EQUALS", label: "Equals threshold" },
  { value: "BETWEEN", label: "In range" },
  { value: "OUTSIDE", label: "Outside range" },
];

// ─── Metric Card (matching dashboard style) ─────────────────────
function MetricCard({
  icon: Icon, label, value, color, badge,
}: {
  icon: React.ElementType; label: string; value: string | number;
  color: string; badge?: string;
}) {
  return (
    <Card className="shadow-sm hover:shadow-lg transition-all duration-300 border-0 overflow-hidden group bg-white ">
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

// ─── Vehicle Form Fields (shared between Add & Edit) ────────────
function VehicleFormFields({
  formId = "",
  subscriptionType,
  onSubscriptionTypeChange,
  features,
  onFeaturesChange,
  sensors,
  onSensorsChange,
}: {
  formId?: string;
  subscriptionType?: string;
  onSubscriptionTypeChange?: (v: string) => void;
  features?: string[];
  onFeaturesChange?: (v: string[]) => void;
  sensors?: SensorDef[];
  onSensorsChange?: (v: SensorDef[]) => void;
}) {
  return (
    <>
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 border-b border-emerald-100 pb-2">
          Basic Information
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`${formId}make`} className="text-xs font-bold text-slate-500 uppercase">Make</Label>
            <Input id={`${formId}make`} name="make" placeholder="e.g. Mercedes-Benz" className="h-11 border-slate-200 focus-visible:ring-0 focus:border-emerald-600" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${formId}model`} className="text-xs font-bold text-slate-500 uppercase">Model</Label>
            <Input id={`${formId}model`} name="model" placeholder="e.g. Actros 2645" className="h-11 border-slate-200 focus-visible:ring-0" required />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 border-b border-emerald-100 pb-2">
          Vehicle Identity
        </h4>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`${formId}plateNumber`} className="text-xs font-bold text-slate-500 uppercase">Registration Plate</Label>
            <Input id={`${formId}plateNumber`} name="plateNumber" placeholder="KCX 001A" className="h-11 border-slate-200 font-mono text-lg tracking-widest uppercase placeholder:font-sans placeholder:text-sm placeholder:tracking-normal focus-visible:ring-0" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${formId}type`} className="text-xs font-bold text-slate-500 uppercase">Vehicle Category</Label>
            <Select name="type" defaultValue="TRACTOR">
              <SelectTrigger className="h-11 border-slate-200">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(vehicleTypeConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${formId}imei`} className="text-xs font-bold text-slate-500 uppercase">IMEI / Device ID</Label>
            <Input id={`${formId}imei`} name="imei" placeholder="e.g. 861234567890123" className="h-11 border-slate-200 font-mono text-sm focus-visible:ring-0" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 border-b border-emerald-100 pb-2">
          Data Subscription
        </h4>
        <div className="grid gap-3">
          {subscriptionOptions.map((opt) => (
            <label key={opt.value} className={cn(
              "flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all hover:border-slate-300",
              subscriptionType === opt.value
                ? "border-emerald-500 bg-emerald-50/50"
                : "border-slate-200"
            )}>
              <input
                type="radio"
                name="subscriptionType"
                value={opt.value}
                checked={subscriptionType === opt.value}
                onChange={() => onSubscriptionTypeChange?.(opt.value)}
                className="mt-1 accent-emerald-600"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Custom subscription: feature & sensor configuration */}
        {subscriptionType === "CUSTOM" && features && onFeaturesChange && sensors !== undefined && onSensorsChange && (
          <CustomConfigPanel
            features={features}
            onFeaturesChange={onFeaturesChange}
            sensors={sensors}
            onSensorsChange={onSensorsChange}
          />
        )}
      </div>
    </>
  );
}

// ─── Custom Configuration Panel ──────────────────────────────────
function CustomConfigPanel({
  features,
  onFeaturesChange,
  sensors,
  onSensorsChange,
}: {
  features: string[];
  onFeaturesChange: (v: string[]) => void;
  sensors: SensorDef[];
  onSensorsChange: (v: SensorDef[]) => void;
}) {
  const [featuresOpen, setFeaturesOpen] = useState(true);
  const [sensorsOpen, setSensorsOpen] = useState(false);

  const toggleFeature = (value: string) => {
    if (features.includes(value)) {
      onFeaturesChange(features.filter(f => f !== value));
    } else {
      onFeaturesChange([...features, value]);
    }
  };

  // Group features by category
  const grouped = featureTypeOptions.reduce<Record<string, typeof featureTypeOptions>>((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});

  const addSensor = () => {
    onSensorsChange([...sensors, { name: "", type: "TEMPERATURE", unit: "", min: "", max: "", alertThreshold: "", alertCondition: "ABOVE" }]);
  };

  const removeSensor = (idx: number) => {
    onSensorsChange(sensors.filter((_, i) => i !== idx));
  };

  const updateSensor = (idx: number, field: keyof SensorDef, value: string) => {
    const updated = sensors.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    onSensorsChange(updated);
  };

  return (
    <div className="pl-2 border-l-2 border-emerald-200 space-y-3">
      {/* Feature Toggles */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setFeaturesOpen(!featuresOpen)}
          className="flex items-center justify-between w-full px-3 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-50 cursor-pointer"
        >
          <span>Enabled Features</span>
          {featuresOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        {featuresOpen && (
          <div className="px-3 pb-3 space-y-3">
            {Object.entries(grouped).map(([category, feats]) => (
              <div key={category}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{category}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {feats.map(f => (
                    <label
                      key={f.value}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs cursor-pointer transition-all",
                        features.includes(f.value)
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={features.includes(f.value)}
                        onChange={() => toggleFeature(f.value)}
                        className="sr-only"
                      />
                      <div className={cn(
                        "h-3.5 w-3.5 rounded border flex items-center justify-center transition-all shrink-0",
                        features.includes(f.value) ? "bg-emerald-600 border-emerald-600" : "border-slate-300"
                      )}>
                        {features.includes(f.value) && <Check className="h-2.5 w-2.5 text-white stroke-[4]" />}
                      </div>
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom Sensors Builder */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setSensorsOpen(!sensorsOpen)}
          className="flex items-center justify-between w-full px-3 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-50 cursor-pointer"
        >
          <span>Custom Sensors ({sensors.length})</span>
          {sensorsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        {sensorsOpen && (
          <div className="px-3 pb-3 space-y-3">
            {sensors.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-3">No custom sensors configured yet</p>
            )}
            {sensors.map((sensor, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-white space-y-2.5 relative">
                <button
                  type="button"
                  onClick={() => removeSensor(idx)}
                  className="absolute top-2 right-2 h-6 w-6 rounded-md flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                >
                  <Trash className="h-3 w-3" />
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Name</Label>
                    <Input
                      value={sensor.name}
                      onChange={(e) => updateSensor(idx, "name", e.target.value)}
                      placeholder="e.g. Coolant Temp"
                      className="h-9 text-xs border-slate-200 focus-visible:ring-0"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Type</Label>
                    <Select value={sensor.type} onValueChange={(v) => updateSensor(idx, "type", v)}>
                      <SelectTrigger className="h-9 text-xs border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {customSensorTypeOptions.map(o => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Unit</Label>
                    <Input
                      value={sensor.unit}
                      onChange={(e) => updateSensor(idx, "unit", e.target.value)}
                      placeholder="°C"
                      className="h-9 text-xs border-slate-200 focus-visible:ring-0"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Min</Label>
                    <Input
                      type="number"
                      value={sensor.min}
                      onChange={(e) => updateSensor(idx, "min", e.target.value)}
                      placeholder="0"
                      className="h-9 text-xs border-slate-200 focus-visible:ring-0"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Max</Label>
                    <Input
                      type="number"
                      value={sensor.max}
                      onChange={(e) => updateSensor(idx, "max", e.target.value)}
                      placeholder="100"
                      className="h-9 text-xs border-slate-200 focus-visible:ring-0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Alert When</Label>
                    <Select value={sensor.alertCondition} onValueChange={(v) => updateSensor(idx, "alertCondition", v)}>
                      <SelectTrigger className="h-9 text-xs border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {alertConditionOptions.map(o => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Threshold</Label>
                    <Input
                      type="number"
                      value={sensor.alertThreshold}
                      onChange={(e) => updateSensor(idx, "alertThreshold", e.target.value)}
                      placeholder="e.g. 85"
                      className="h-9 text-xs border-slate-200 focus-visible:ring-0"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSensor}
              className="w-full border-dashed border-slate-300 text-slate-500 hover:text-emerald-600 hover:border-emerald-400 text-xs h-9 cursor-pointer"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              Add Sensor
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add Vehicle Drawer ─────────────────────────────────────────
function AddVehicleDrawer({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [subType, setSubType] = useState("STANDARD");
  const [features, setFeatures] = useState<string[]>(["GPS_TRACKING"]);
  const [sensors, setSensors] = useState<SensorDef[]>([]);

  return (
    <Sheet open={open} onOpenChange={(v) => {
      if (!v) { setSubType("STANDARD"); setFeatures(["GPS_TRACKING"]); setSensors([]); }
      setOpen(v);
    }}>
      <SheetTrigger asChild>
        <Button className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer">
          <Plus className="h-4 w-4 stroke-[3px]" />
          <span className="font-semibold">Add Vehicle</span>
        </Button>
      </SheetTrigger>

      <SheetContent className="sm:max-w-xl p-0 flex flex-col border-l border-slate-200 shadow-xl">
        <form action={async (fd) => {
          fd.set("selectedFeatures", JSON.stringify(features));
          fd.set("customSensors", JSON.stringify(sensors));
          await addVehicle(fd);
          setOpen(false);
          onSuccess();
        }} className="h-full flex flex-col">
          <div className="p-6 bg-zinc-800 text-white">
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-400" />
                New Asset Registration
              </SheetTitle>
              <SheetDescription className="text-slate-400">
                Complete the details below to add a vehicle to the active fleet.
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <VehicleFormFields
              formId="add-"
              subscriptionType={subType}
              onSubscriptionTypeChange={setSubType}
              features={features}
              onFeaturesChange={setFeatures}
              sensors={sensors}
              onSensorsChange={setSensors}
            />
          </div>

          <SheetFooter className="p-6 border-t border-slate-100 bg-slate-50">
            <div className="flex w-full items-center gap-3">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-100 h-11 cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-emerald-700 hover:bg-emerald-800 h-11 shadow-md font-semibold cursor-pointer">
                Save Asset
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ─── Edit Vehicle Drawer ────────────────────────────────────────
function EditVehicleDrawer({ vehicle, open, onOpenChange, onSuccess }: {
  vehicle: VehicleData | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [subType, setSubType] = useState(vehicle?.dataLevel || "STANDARD");
  const [features, setFeatures] = useState<string[]>(["GPS_TRACKING"]);
  const [sensors, setSensors] = useState<SensorDef[]>([]);

  // Reset state when vehicle changes
  useEffect(() => {
    if (vehicle) {
      setSubType(vehicle.dataLevel || "STANDARD");
      setFeatures(["GPS_TRACKING"]);
      setSensors([]);
    }
  }, [vehicle]);

  if (!vehicle) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl p-0 flex flex-col border-l border-slate-200 shadow-xl">
        <form action={async (fd) => {
          setLoading(true);
          fd.set("id", vehicle.id);
          fd.set("selectedFeatures", JSON.stringify(features));
          fd.set("customSensors", JSON.stringify(sensors));
          await updateVehicle(fd);
          setLoading(false);
          onOpenChange(false);
          onSuccess();
        }} className="h-full flex flex-col">
          <div className="p-6 bg-zinc-800 text-white">
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-emerald-400" />
                Edit {vehicle.Name}
              </SheetTitle>
              <SheetDescription className="text-slate-400">
                Update vehicle details and subscription preferences.
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <VehicleFormFields
              formId="edit-"
              subscriptionType={subType}
              onSubscriptionTypeChange={setSubType}
              features={features}
              onFeaturesChange={setFeatures}
              sensors={sensors}
              onSensorsChange={setSensors}
            />
          </div>

          <SheetFooter className="p-6 border-t border-slate-100 bg-slate-50">
            <div className="flex w-full items-center gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-100 h-11 cursor-pointer" type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 bg-emerald-700 hover:bg-emerald-800 h-11 shadow-md font-semibold cursor-pointer">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ─── Delete Confirmation ────────────────────────────────────────
function DeleteConfirmDialog({ ids, open, onOpenChange, onSuccess }: {
  ids: string[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  if (!open || ids.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 " onClick={() => onOpenChange(false)}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4 w-full" onClick={(e) => e.stopPropagation()}>
        <div className="h-12 w-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="h-6 w-6 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 text-center">Delete {ids.length} vehicle{ids.length > 1 ? "s" : ""}?</h3>
        <p className="text-sm text-slate-500 text-center mt-1 mb-6">
          This action cannot be undone. All associated data will be permanently removed.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 cursor-pointer" type="button">
            Cancel
          </Button>
          <Button onClick={async () => {
            setDeleting(true);
            await deleteVehicles(ids);
            setDeleting(false);
            onOpenChange(false);
            onSuccess();
          }} disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white cursor-pointer">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl bg-white border border-slate-200/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="h-9 w-9 rounded-lg bg-slate-200" />
        <div className="h-5 w-14 rounded-full bg-slate-200" />
      </div>
      <div className="h-7 w-24 bg-slate-200 rounded mb-1" />
      <div className="h-3 w-16 bg-slate-200 rounded" />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingVehicle, setEditingVehicle] = useState<VehicleData | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllVehiclesDisplayData();
      setVehicles(data);
    } catch (err) {
      console.error("Failed to fetch vehicles:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);

  // Derived stats
  const activeCount = vehicles.filter(v => v.status === "ACTIVE").length;
  const offlineCount = vehicles.filter(v => v.status === "OFFLINE").length;
  const lowFuelCount = vehicles.filter(v => v.fuel <= 25).length;
  const totalAlerts = vehicles.reduce((s, v) => s + v.alertsToday, 0);

  // Filters
  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase();
    const matchesSearch = !q || v.Name.toLowerCase().includes(q) || v.plateNumber?.toLowerCase().includes(q) || v.imei?.toLowerCase().includes(q);
    const matchesType = typeFilter === "ALL" || v.type === typeFilter;
    const matchesStatus = statusFilter === "ALL" || v.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const selectAll = filtered.length > 0 && selected.size === filtered.length;
  const toggleAll = () => {
    if (selectAll) setSelected(new Set());
    else setSelected(new Set(filtered.map(v => v.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const getReportPath = (type: string, id: string) => {
    const map: Record<string, string> = {
      TRACTOR: "tractors", TRUCK: "trucks", CAR: "cars", BUS: "bus",
    };
    return `/reports/${map[type] || "tractors"}/${id}`;
  };

  // ── Render ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen space-y-6">
        <div className="flex items-center justify-between animate-pulse">
          <div><div className="h-7 w-36 bg-slate-200 rounded mb-1" /><div className="h-4 w-48 bg-slate-200 rounded" /></div>
          <div className="h-11 w-36 bg-slate-200 rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-44 bg-white rounded-xl border border-slate-200" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-sm">
              <Truck className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vehicles</h1>
          </div>
          <p className="text-sm text-slate-500 ml-10">{vehicles.length} vehicles in fleet</p>
        </div>
        <AddVehicleDrawer onSuccess={loadVehicles} />
      </div>

      {/* ── Summary Stats (dashboard-style MetricCards) ─────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Activity}
          label="Active Vehicles"
          value={activeCount}
          color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          badge={vehicles.length > 0 ? `${((activeCount / vehicles.length) * 100).toFixed(0)}%` : undefined}
        />
        <MetricCard
          icon={WifiOff}
          label="Offline"
          value={offlineCount}
          color="bg-gradient-to-br from-slate-500 to-slate-600"
        />
        <MetricCard
          icon={Fuel}
          label="Low Fuel"
          value={lowFuelCount}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
          badge={lowFuelCount > 0 ? "Needs attention" : undefined}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Alerts Today"
          value={totalAlerts}
          color={totalAlerts > 0
            ? "bg-gradient-to-br from-red-500 to-red-600"
            : "bg-gradient-to-br from-slate-400 to-slate-500"
          }
          badge={totalAlerts > 0 ? `${totalAlerts} active` : undefined}
        />
      </div>

      {/* ── Bulk Action Bar ──────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 rounded-xl shadow-lg text-white animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-sm font-medium">
            <span className="font-bold">{selected.size}</span> vehicle{selected.size > 1 ? "s" : ""} selected
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="text-white/70 hover:text-white hover:bg-white/10 cursor-pointer">
              <X className="h-3.5 w-3.5 mr-1.5" /> Clear
            </Button>
            <Button size="sm" onClick={() => setDeleteOpen(true)} className="bg-red-600 hover:bg-red-700 text-white cursor-pointer">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
            </Button>
          </div>
        </div>
      )}

      {/* ── Search & Filters ────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input placeholder="Search by name, plate, or IMEI..."
            className="pl-9 h-11 bg-white border-slate-200 focus-visible:ring-0 focus:border-emerald-500 rounded-xl"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full md:w-44 h-11 bg-white border-slate-200 rounded-xl">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {Object.entries(vehicleTypeConfig).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-44 h-11 bg-white border-slate-200 rounded-xl">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="OFFLINE">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Vehicle Grid ─────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
            {search || typeFilter !== "ALL" || statusFilter !== "ALL"
              ? <Search className="h-8 w-8 text-slate-300" />
              : <Truck className="h-8 w-8 text-slate-300" />
            }
          </div>
          <p className="text-slate-800 font-semibold">
            {search || typeFilter !== "ALL" || statusFilter !== "ALL"
              ? "No vehicles match your filters"
              : "No vehicles in your fleet"
            }
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {search || typeFilter !== "ALL" || statusFilter !== "ALL"
              ? "Try adjusting your search or filters"
              : "Add your first vehicle to get started"}
          </p>
        </div>
      ) : (
        <>
          {/* Select all row */}
          <div className="flex items-center gap-3 px-1">
            <button onClick={toggleAll} className={cn(
              "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer",
              selectAll ? "bg-emerald-600 border-emerald-600" : "border-slate-300 hover:border-slate-400"
            )}>
              {selectAll && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
            </button>
            <span className="text-xs text-slate-500 font-medium">
              {filtered.length} vehicle{filtered.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {filtered.map((vehicle, index) => {
              const typeCfg = vehicleTypeConfig[vehicle.type] || vehicleTypeConfig.CAR;
              const TypeIcon = typeCfg.icon;
              const levelCfg = dataLevelLabels[vehicle.dataLevel] || dataLevelLabels.STANDARD;

              return (
                <div
                  key={vehicle.id}
                  onClick={() => window.location.href = `/vehicles/${vehicle.id}`}
                  className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {/* Selection checkbox */}
                  <button onClick={(e) => { e.stopPropagation(); toggleOne(vehicle.id); }} className={cn(
                    "absolute top-3 left-3 z-10 h-5 w-5 rounded border-2 flex items-center justify-center transition-all duration-200 cursor-pointer",
                    selected.has(vehicle.id)
                      ? "bg-emerald-600 border-emerald-600"
                      : "border-slate-300 opacity-0 group-hover:opacity-100"
                  )}>
                    {selected.has(vehicle.id) && <Check className="h-3 w-3 text-white stroke-[3]" />}
                  </button>

                  <div className="p-4 pl-10">
                    {/* Top row: icon + name + status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm shrink-0", typeCfg.color)}>
                          <TypeIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm leading-tight truncate max-w-[140px]">
                            {vehicle.Name || "Unknown"}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium truncate">{vehicle.plateNumber || "No plate"}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 border",
                        vehicle.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      )}>
                        <Circle className={cn(
                          "h-1.5 w-1.5 inline-block mr-1 -mt-0.5 rounded-full",
                          vehicle.status === "ACTIVE" ? "bg-emerald-500 fill-emerald-500" : "bg-slate-400 fill-slate-400"
                        )} />
                        {vehicle.status}
                      </span>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-500 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="h-3 w-3 text-slate-400 shrink-0" />
                        <span title="IMEI" className="truncate">{vehicle.imei ? vehicle.imei.slice(0, 8) + "..." : "No IMEI"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{vehicle.lat ? `${vehicle.lat.toFixed(4)}, ${vehicle.lng?.toFixed(4)}` : "No location"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Gauge className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{vehicle.speed ?? 0} km/h</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Fuel className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className={vehicle.fuel <= 25 ? "text-amber-600 font-semibold" : ""}>{vehicle.fuel}%</span>
                      </div>
                    </div>

                    {/* Fuel bar */}
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mb-3">
                      <div className={cn(
                        "h-full rounded-full transition-all duration-500",
                        vehicle.fuel > 50 ? "bg-emerald-500" : vehicle.fuel > 25 ? "bg-amber-400" : "bg-red-500"
                      )} style={{ width: `${vehicle.fuel}%` }} />
                    </div>

                    {/* Bottom: data level + actions */}
                    <div className="flex items-center justify-between">
                      <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold", levelCfg.color)}>
                        {levelCfg.label}
                      </span>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/vehicles/${vehicle.id}`} className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-200" title="View on map">
                          <Map className="h-3.5 w-3.5" />
                        </Link>
                        <Link href={getReportPath(vehicle.type, vehicle.id)} className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200" title="View report">
                          <FileText className="h-3.5 w-3.5" />
                        </Link>
                        <button onClick={(e) => { e.stopPropagation(); setEditingVehicle(vehicle); setEditOpen(true); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200 cursor-pointer" title="Edit vehicle">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setSelected(new Set([vehicle.id])); setDeleteOpen(true); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 cursor-pointer" title="Delete vehicle">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Edit Drawer ──────────────────────────────────────── */}
      <EditVehicleDrawer
        vehicle={editingVehicle}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={loadVehicles}
      />

      {/* ── Delete Dialog ────────────────────────────────────── */}
      <DeleteConfirmDialog
        ids={Array.from(selected)}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={() => { setSelected(new Set()); loadVehicles(); }}
      />
    </div>
  );
}