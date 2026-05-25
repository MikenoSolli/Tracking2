// app/vehicles/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import VehicleDetailClient from "./VehicleDetailClient";
import { startOfDay } from "date-fns"

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      status: true,
      maintenance: { orderBy: { scheduledDate: 'desc' }, take: 1 }
    }
  });

  if (!vehicle) {
    notFound();
  }

  // Fetch GPS history from gps_events table (location history)
  let gpsHistory = await prisma.gps_events.findMany({
    where: { vehicleId: id, timestamp: { gte: startOfDay(new Date()) } },
    orderBy: { timestamp: 'desc' },
    take: 50
  });

  // No data today? Fall back to the last 50 data points ever
  if (gpsHistory.length === 0) {
    gpsHistory = await prisma.gps_events.findMany({
      where: { vehicleId: id },
      orderBy: { timestamp: 'desc' },
      take: 50
    });
  }

  // Get the latest status record (singular relation on vehicle)
  const latestStatus = vehicle.status;
  const lastMaintenance = vehicle.maintenance[0];

  // Validate status data
  let currentstatus = "OFFLINE";
  let latestUpdate = null;

  if (latestStatus?.updatedAt) {
    latestUpdate = latestStatus.updatedAt;

    const now = new Date();
    const diffInMinutes = (now.getTime() - latestUpdate.getTime()) / (1000 * 60);

    if (diffInMinutes <= 15) {
      currentstatus = latestStatus.state;
    }

    if (latestUpdate.getDay() !== now.getDay()) {
      latestUpdate = latestUpdate.toLocaleDateString() + " " + latestUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      latestUpdate = latestUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  const formattedVehicle = {
    id: vehicle.id,
    name: `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() || "Unit " + id.slice(-4),
    plate: vehicle.plateNumber || "NO PLATE",
    status: currentstatus,
    type: vehicle.Type,
    telemetry: {
      fuel: latestStatus?.fuelLevel ?? 0,
      speed: latestStatus?.speed ?? 0,
      engineHours: latestStatus?.engineHours ?? 0,
      lat: latestStatus?.latitude ?? -1.2921,
      lng: latestStatus?.longitude ?? 36.8219,
      lastUpdate: latestUpdate || "No Data",
    },
    history: gpsHistory
      .filter(g => g.latitude && g.longitude)
      .map(g => ({
        pos: [g.latitude, g.longitude] as [number, number],
        time: g.timestamp.toISOString()
      }))
      .reverse(),
    daysToService: lastMaintenance?.nextServiceDate
      ? Math.ceil((lastMaintenance.nextServiceDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) + " Days"
      : "Pending"
  };

  return <VehicleDetailClient vehicle={formattedVehicle} />;
}