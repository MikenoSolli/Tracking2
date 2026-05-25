// app/(main)/vehicles/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/app/_lib/sessions";
import { redirect } from "next/navigation";

const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);

const endOfToday = new Date();
endOfToday.setHours(23, 59, 59, 999);

export async function addVehicle(formData: FormData) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const companyId = session.companyId;

  const make = formData.get("make") as string;
  const model = formData.get("model") as string;
  const plateNumber = formData.get("plateNumber") as string;
  const type = formData.get("type") as any;
  const imei = formData.get("imei") as string;
  const subscriptionType =
    (formData.get("subscriptionType") as string) || "STANDARD";

  // Parse custom configuration
  let selectedFeatures: string[] = [];
  let customSensors: {
    name: string;
    type: string;
    unit: string;
    min: string;
    max: string;
    alertThreshold: string;
    alertCondition: string;
  }[] = [];

  if (subscriptionType === "CUSTOM") {
    try {
      selectedFeatures =
        JSON.parse(formData.get("selectedFeatures") as string) || [];
      customSensors = JSON.parse(formData.get("customSensors") as string) || [];
    } catch {
      /* ignore parse errors */
    }
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      make,
      model,
      plateNumber,
      Type: type,
      Imei: imei || undefined,
      companyId,
      subscription: {
        create: {
          subscriptionType: subscriptionType as any,
        },
      },
    },
    include: { subscription: true },
  });

  // Create feature configs for CUSTOM subscription
  if (
    subscriptionType === "CUSTOM" &&
    selectedFeatures.length > 0 &&
    vehicle.subscription
  ) {
    for (const featureType of selectedFeatures) {
      const config = await prisma.vehicle_feature_config.create({
        data: {
          vehicleSubscriptionId: vehicle.subscription.id,
          featureType: featureType as any,
          isEnabled: true,
        },
      });

      // If CUSTOM_SENSORS feature is enabled, create the custom sensors
      if (featureType === "CUSTOM_SENSORS" && customSensors.length > 0) {
        for (const sensor of customSensors) {
          if (!sensor.name) continue;
          await prisma.custom_sensor.create({
            data: {
              featureConfigId: config.id,
              vehicleId: vehicle.id,
              sensorName: sensor.name,
              sensorType: sensor.type as any,
              unit: sensor.unit || undefined,
              minValue: sensor.min ? parseFloat(sensor.min) : undefined,
              maxValue: sensor.max ? parseFloat(sensor.max) : undefined,
              alertThreshold: sensor.alertThreshold
                ? parseFloat(sensor.alertThreshold)
                : undefined,
              alertCondition: (sensor.alertCondition as any) || undefined,
            },
          });
        }
      }
    }
  }

  revalidatePath("/vehicles");
  return vehicle;
}

export async function updateVehicle(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = formData.get("id") as string;
  const make = formData.get("make") as string;
  const model = formData.get("model") as string;
  const plateNumber = formData.get("plateNumber") as string;
  const type = formData.get("type") as any;
  const imei = formData.get("imei") as string;
  const subscriptionType = formData.get("subscriptionType") as string;

  await prisma.vehicle.update({
    where: { id },
    data: {
      make,
      model,
      plateNumber,
      Type: type,
      Imei: imei || undefined,
    },
  });

  // Update or create subscription
  if (subscriptionType) {
    const existing = await prisma.vehicle_subscription.findUnique({
      where: { vehicleId: id },
      include: { features: { include: { customSensors: true } } },
    });

    if (existing) {
      await prisma.vehicle_subscription.update({
        where: { vehicleId: id },
        data: { subscriptionType: subscriptionType as any },
      });

      // If changing to/from CUSTOM, handle feature configs
      if (subscriptionType === "CUSTOM") {
        let selectedFeatures: string[] = [];
        let customSensors: any[] = [];
        try {
          selectedFeatures =
            JSON.parse(formData.get("selectedFeatures") as string) || [];
          customSensors =
            JSON.parse(formData.get("customSensors") as string) || [];
        } catch {
          /* ignore */
        }

        // Delete existing features and sensors, then recreate
        if (existing.features.length > 0) {
          for (const feat of existing.features) {
            await prisma.custom_sensor.deleteMany({
              where: { featureConfigId: feat.id },
            });
          }
          await prisma.vehicle_feature_config.deleteMany({
            where: { vehicleSubscriptionId: existing.id },
          });
        }

        // Recreate features
        for (const featureType of selectedFeatures) {
          const config = await prisma.vehicle_feature_config.create({
            data: {
              vehicleSubscriptionId: existing.id,
              featureType: featureType as any,
              isEnabled: true,
            },
          });

          if (featureType === "CUSTOM_SENSORS" && customSensors.length > 0) {
            for (const sensor of customSensors) {
              if (!sensor.name) continue;
              await prisma.custom_sensor.create({
                data: {
                  featureConfigId: config.id,
                  vehicleId: id,
                  sensorName: sensor.name,
                  sensorType: sensor.type as any,
                  unit: sensor.unit || undefined,
                  minValue: sensor.min ? parseFloat(sensor.min) : undefined,
                  maxValue: sensor.max ? parseFloat(sensor.max) : undefined,
                  alertThreshold: sensor.alertThreshold
                    ? parseFloat(sensor.alertThreshold)
                    : undefined,
                  alertCondition: (sensor.alertCondition as any) || undefined,
                },
              });
            }
          }
        }
      } else if (existing.features.length > 0) {
        // Switching from CUSTOM to non-CUSTOM: remove features
        for (const feat of existing.features) {
          await prisma.custom_sensor.deleteMany({
            where: { featureConfigId: feat.id },
          });
        }
        await prisma.vehicle_feature_config.deleteMany({
          where: { vehicleSubscriptionId: existing.id },
        });
      }
    } else {
      await prisma.vehicle_subscription.create({
        data: {
          vehicleId: id,
          subscriptionType: subscriptionType as any,
        },
      });

      // Create features if CUSTOM
      if (subscriptionType === "CUSTOM") {
        let selectedFeatures: string[] = [];
        let customSensors: any[] = [];
        try {
          selectedFeatures =
            JSON.parse(formData.get("selectedFeatures") as string) || [];
          customSensors =
            JSON.parse(formData.get("customSensors") as string) || [];
        } catch {
          /* ignore */
        }

        const sub = await prisma.vehicle_subscription.findUnique({
          where: { vehicleId: id },
        });
        if (sub) {
          for (const featureType of selectedFeatures) {
            const config = await prisma.vehicle_feature_config.create({
              data: {
                vehicleSubscriptionId: sub.id,
                featureType: featureType as any,
                isEnabled: true,
              },
            });
            if (featureType === "CUSTOM_SENSORS" && customSensors.length > 0) {
              for (const sensor of customSensors) {
                if (!sensor.name) continue;
                await prisma.custom_sensor.create({
                  data: {
                    featureConfigId: config.id,
                    vehicleId: id,
                    sensorName: sensor.name,
                    sensorType: sensor.type as any,
                    unit: sensor.unit || undefined,
                    minValue: sensor.min ? parseFloat(sensor.min) : undefined,
                    maxValue: sensor.max ? parseFloat(sensor.max) : undefined,
                    alertThreshold: sensor.alertThreshold
                      ? parseFloat(sensor.alertThreshold)
                      : undefined,
                    alertCondition: (sensor.alertCondition as any) || undefined,
                  },
                });
              }
            }
          }
        }
      }
    }
  }

  revalidatePath("/vehicles");
}

export async function getVehicle(vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      subscription: true,
      status: true,
    },
  });
  return vehicle;
}

export async function deleteVehicles(ids: string[]) {
  const session = await getSession();
  if (!session) redirect("/login");

  await prisma.vehicle.deleteMany({
    where: { id: { in: ids } },
  });

  revalidatePath("/vehicles");
}

export async function getVehicleCurrentUpdate(vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { status: true },
  });

  if (!vehicle) return null;

  const latest = vehicle.status;

  return {
    id: vehicle.id,
    name: `${vehicle.make} ${vehicle.model}`,
    plateNumber: vehicle.plateNumber,
    type: vehicle.Type,
    state: latest?.state || "OFFLINE",
    lat: latest?.latitude,
    lng: latest?.longitude,
    speed: latest?.speed,
    fuel: latest?.fuelLevel,
    lastSeen: latest?.updatedAt,
  };
}

export async function getVehicleHistory(
  vehicleId: string,
  limit: number = 100,
) {
  return await prisma.status.findMany({
    where: { vehicleId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      latitude: true,
      longitude: true,
      speed: true,
      fuelLevel: true,
      updatedAt: true,
      state: true,
    },
  });
}

export async function getAllVehiclesDisplayData() {
  try {
    const session = await getSession();
    const companyId = session?.companyId;
    if (!companyId) return [];

    const vehicles = await prisma.vehicle.findMany({
      where: { companyId },
      include: {
        status: true,
        alerts: {
          where: {
            createdAt: { gte: startOfToday, lte: endOfToday },
          },
          orderBy: { createdAt: "desc" },
        },
        subscription: true,
      },
    });

    return vehicles.map((v: any) => {
      const updatedAt = v.status?.updatedAt;

      let vehiclestatus = v.status?.state || "OFFLINE";

      return {
        id: v.id,
        Name: `${v.make} ${v.model}`,
        plateNumber: v.plateNumber,
        type: v.Type,
        make: v.make,
        model: v.model,
        imei: v.Imei,
        year: v.year,
        status: vehiclestatus,
        fuel: v.status?.fuelLevel || 0,
        lat: v.status?.latitude,
        lng: v.status?.longitude,
        speed: v.status?.speed,
        lastSeen: updatedAt,
        dataLevel: v.subscription?.subscriptionType || "STANDARD",
        alertsToday: v.alerts?.length || 0,
      };
    });
  } catch (error) {
    console.error("❌ PRISMA ERROR:", error);
    throw new Error("Failed to fetch vehicle data. Check server logs.");
  }
}
