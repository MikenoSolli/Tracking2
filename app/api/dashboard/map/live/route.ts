import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/_lib/sessions";
import Redis from "ioredis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let destroyed = false;

  const send = (event: string, data: object) => {
    if (destroyed) return;
    try {
      const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(frame));
    } catch {
      // stream closed
    }
  };

  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream({
    start: async (c) => {
      controller = c;

      // ---- AUTH ----
      const session = await getSession();
      const companyId = session?.companyId;
      if (!companyId) {
        send("error", { error: "unauthorized" });
        try { controller.close(); } catch {}
        return;
      }

      // ---- INITIAL SNAPSHOT FROM DATABASE ----
      try {
        const vehicles = await prisma.vehicle.findMany({
          where: { companyId, isActive: true },
          select: {
            id: true,
            plateNumber: true,
            Type: true,
            make: true,
            model: true,
            year: true,
            status: {
              select: {
                latitude: true,
                longitude: true,
                speed: true,
                course: true,
                state: true,
                fuelLevel: true,
                engineHours: true,
                odometer: true,
                updatedAt: true,
              },
            },
            driver: {
              select: { name: true, phone: true },
            },
            alerts: {
              where: {
                isResolved: false,
                severity: { in: ["HIGH", "CRITICAL"] },
              },
              take: 1,
              orderBy: { createdAt: "desc" },
              select: { severity: true, message: true, type: true },
            },
          },
        });

        const vehicleIds = vehicles.map((v) => v.id);

        const vehiclesWithLocation = vehicles
          .filter((v) => v.status?.latitude && v.status?.longitude)
          .map((v) => ({
            id: v.id,
            plateNumber: v.plateNumber,
            type: v.Type,
            make: v.make,
            model: v.model,
            driverName: v.driver?.name,
            location: {
              lat: v.status!.latitude,
              lng: v.status!.longitude,
            },
            speed: v.status!.speed || 0,
            course: v.status!.course || 0,
            state: v.status!.state,
            fuelLevel: v.status!.fuelLevel || 0,
            engineHours: v.status!.engineHours || 0,
            odometer: v.status!.odometer || 0,
            lastUpdate: v.status!.updatedAt,
            hasAlert: v.alerts.length > 0,
            alertSeverity: v.alerts[0]?.severity,
            alertMessage: v.alerts[0]?.message,
          }));

        send("init", { vehicles: vehiclesWithLocation });

        // ---- REDIS SUBSCRIBER ----
        const subscriber = new Redis({
          host: process.env.REDIS_HOST || "localhost",
          port: Number(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          db: 0,
          retryStrategy(times) {
            if (times > 60) return null;
            return Math.min(times * 1000, 10000);
          },
        });

        const vehicleIdSet = new Set(vehicleIds);

        const cleanup = () => {
          if (destroyed) return;
          destroyed = true;
          try { subscriber.unsubscribe("live_map_updates"); } catch {}
          try { subscriber.disconnect(); } catch {}
        };

        subscriber.on("connect", () => {
          console.log("[Map SSE] Redis subscriber connected");
        });

        subscriber.on("error", (err) => {
          console.error("[Map SSE] Redis subscriber error:", err.message);
        });

        subscriber.subscribe("live_map_updates", (err) => {
          if (err) {
            console.error("[Map SSE] Subscription error:", err.message);
            send("error", { error: "subscription failed" });
          }
        });

        subscriber.on("message", (_channel, message) => {
          try {
            const data = JSON.parse(message);
            const vehicleId = data.vehicle_id ?? data.vehicleId;
            if (!vehicleId || !vehicleIdSet.has(String(vehicleId))) return;

            const hasLocation = data.lat != null || data.lastLat != null;

            send("update", {
              id: String(vehicleId),
              state: data.state ?? data.status ?? null,
              lat: hasLocation ? (data.lat ?? data.lastLat) : null,
              lng: hasLocation ? (data.lng ?? data.lastLng) : null,
              speed: data.speed ?? null,
              fuel: data.fuel ?? data.fuelLevel ?? null,
              engineHours: data.engineHours ?? null,
              timestamp: data.timestamp ?? null,
            });
          } catch {
            // skip malformed
          }
        });

        // ---- KEEPALIVE ----
        const keepAlive = setInterval(() => {
          if (destroyed) return;
          try { controller.enqueue(encoder.encode(`: keepalive\n\n`)); } catch {}
        }, 15000);

        // ---- CLIENT DISCONNECT ----
        req.signal.addEventListener("abort", () => {
          clearInterval(keepAlive);
          cleanup();
        });

        return () => {
          clearInterval(keepAlive);
          cleanup();
        };
      } catch (error) {
        console.error("[Map SSE] Initialization error:", error);
        send("error", { error: "initialization failed" });
        try { controller.close(); } catch {}
      }
    },
    cancel() {
      destroyed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}