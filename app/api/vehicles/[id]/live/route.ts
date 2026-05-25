import { NextRequest } from "next/server";
import Redis from "ioredis";
import redis from "@/lib/redis";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const encoder = new TextEncoder();
  let destroyed = false;
  let lastPolledData = "";

  const send = (event: string, data: object) => {
    if (destroyed) return;
    try {
      const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      // Use Uint8Array to ensure proper flushing in the ReadableStream
      controller.enqueue(encoder.encode(frame));
    } catch {
      // stream closed
    }
  };

  // ---- INITIAL SNAPSHOT: try live:${id} first, then tractor:last_state:${id} ----
  let initialSnapshot: Record<string, any> | null = null;
  const coord = (v: any) => (v != null && !isNaN(Number(v))) ? Number(v) : null;
  try {
    let raw = await redis.get(`live:${id}`);
    if (!raw) {
      raw = await redis.get(`tractor:last_state:${id}`);
    }
    if (raw) {
      const d = JSON.parse(raw);
      initialSnapshot = {
        state: d.state ?? d.status ?? null,
        lat: coord(d.lat ?? d.lastLat),
        lng: coord(d.lng ?? d.lastLng),
        speed: d.speed ?? null,
        fuel: d.fuel ?? d.fuelLevel ?? null,
        engineHours: d.engineHours ?? null,
        timestamp: d.timestamp ?? null,
        event: null,
      };
    }
  } catch {
    // Redis unavailable — stream will still open
  }

  // ---- DEDICATED SUBSCRIBER CONNECTION ----
  const subscriber = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: 0,
    retryStrategy(times) {
      if (times > 60) {
        console.error(`[SSE ${id}] Redis subscriber: max retries reached`);
        return null;
      }
      const delay = Math.min(times * 1000, 10000);
      console.error(`[SSE ${id}] Redis subscriber: reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
  });

  subscriber.on('connect', () => {
    console.log(`[SSE ${id}] Redis subscriber connected`);
  });

  subscriber.on('error', (err) => {
    console.error(`[SSE ${id}] Redis subscriber error:`, err.message);
  });

  const cleanup = () => {
    if (destroyed) return;
    destroyed = true;
    try { subscriber.unsubscribe('live_map_updates'); } catch {}
    try { subscriber.disconnect(); } catch {}
    console.log(`[SSE ${id}] Connection closed, subscriber cleaned up`);
  };

  // We need controller in scope for send(). We declare it here, assign in stream start.
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream({
    start(c) {
      controller = c;

      // Push initial snapshot
      if (initialSnapshot) {
        send("live", initialSnapshot);
      }

      // ---- Subscribe to Redis pub/sub ----
      subscriber.subscribe('live_map_updates', (err) => {
        if (err) {
          console.error(`[SSE ${id}] Subscription error:`, err.message);
          send("error", { error: "subscription failed" });
        } else {
          console.log(`[SSE ${id}] Subscribed to live_map_updates`);
        }
      });

      subscriber.on('message', (_channel, message) => {
        try {
          const data = JSON.parse(message);
          // Match by either vehicle_id or vehicleId
          const vehicleId = data.vehicle_id ?? data.vehicleId;
          if (!vehicleId || String(vehicleId) !== id) return;

          send("live", {
            state: data.state ?? data.status ?? null,
            lat: data.lat ?? data.lastLat ?? null,
            lng: data.lng ?? data.lastLng ?? null,
            speed: data.speed ?? null,
            fuel: data.fuel ?? data.fuelLevel ?? null,
            engineHours: data.engineHours ?? null,
            timestamp: data.timestamp ?? null,
            event: data.event ?? null,
          });
        } catch {
          /* skip malformed */
        }
      });

      // ---- Keepalive ----
      const keepAlive = setInterval(() => {
        if (destroyed) return;
        try { controller.enqueue(encoder.encode(`: keepalive\n\n`)); } catch {}
      }, 15000);

      // ---- Polling fallback: re-read Redis keys every 30s ----
      const pollInterval = setInterval(async () => {
        if (destroyed) return;
        try {
          let raw = await redis.get(`live:${id}`);
          if (!raw) {
            raw = await redis.get(`tractor:last_state:${id}`);
          }
          if (raw && raw !== lastPolledData) {
            lastPolledData = raw;
            const d = JSON.parse(raw);
            send("live", {
              state: d.state ?? d.status ?? null,
              lat: d.lat ?? d.lastLat ?? null,
              lng: d.lng ?? d.lastLng ?? null,
              speed: d.speed ?? null,
              fuel: d.fuel ?? d.fuelLevel ?? null,
              engineHours: d.engineHours ?? null,
              timestamp: d.timestamp ?? null,
              event: null,
            });
            console.log(`[SSE ${id}] Polling fallback: caught up`);
          }
        } catch {
          /* skip poll errors */
        }
      }, 30000);

      // ---- Client disconnect handling ----
      req.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        clearInterval(pollInterval);
        cleanup();
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}