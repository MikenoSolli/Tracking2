'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, AlertTriangle, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
});

interface VehicleLocation {
  id: string;
  plateNumber: string;
  type: string;
  make: string | null;
  model: string | null;
  driverName: string | null;
  location: { lat: number; lng: number };
  speed: number;
  course: number;
  state: string;
  fuelLevel: number;
  engineHours: number;
  odometer: number;
  lastUpdate: string;
  hasAlert: boolean;
  alertSeverity?: string;
  alertMessage?: string;
}

interface MapData {
  vehicles: VehicleLocation[];
  lastUpdate: string;
}

const DEFAULT_CENTER: [number, number] = [-1.286389, 36.817223];

function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
}

function AutoRefreshMap({ onRefresh }: { onRefresh: () => void }) {
  const map = useMap();

  useEffect(() => {
    const interval = setInterval(onRefresh, 30000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  return null;
}

function getVehicleIcon(state: string, hasAlert: boolean) {
  const color = hasAlert ? '#ef4444'
    : state === 'ACTIVE' ? '#16a34a'
    : state === 'IDLE' ? '#eab308'
    : '#94a3b8';

  const showPing = state === 'ACTIVE' && !hasAlert;

  return divIcon({
    className: 'custom-dynamic-dot',
    html: `<div class="relative flex h-5 w-5">
      ${showPing ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full" style="background:${color}; opacity:0.75"></span>` : ''}
      <span class="relative inline-flex rounded-full h-5 w-5 border-2 border-white shadow-lg" style="background:${color}"></span>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -16],
  });
}

export default function VehicleMap() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleLocation | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const initialCenterSet = useRef(false);

  const fetchVehicles = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/map');
      if (!response.ok) throw new Error('Failed to fetch vehicles');
      const data: MapData = await response.json();
      setVehicles(data.vehicles);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchVehicles, 60000);
    return () => clearInterval(interval);
  }, [fetchVehicles]);

  // ---- SSE live connection ----
  useEffect(() => {
    const es = new EventSource('/api/dashboard/map/live');

    es.addEventListener('init', (event) => {
      try {
        const data = JSON.parse(event.data);
        setVehicles(data.vehicles);
        if (data.vehicles.length > 0 && !initialCenterSet.current) {
          setMapCenter([data.vehicles[0].location.lat, data.vehicles[0].location.lng]);
          initialCenterSet.current = true;
        }
        setLoading(false);
        setError(null);
      } catch {
        // skip malformed init
      }
    });

    es.addEventListener('update', (event) => {
      try {
        const data = JSON.parse(event.data);
        setVehicles((prev) =>
          prev.map((v) =>
            v.id === data.id
              ? {
                  ...v,
                  state: data.state ?? v.state,
                  location: {
                    lat: data.lat ?? v.location.lat,
                    lng: data.lng ?? v.location.lng,
                  },
                  speed: data.speed ?? v.speed,
                  fuelLevel: data.fuel ?? v.fuelLevel,
                  engineHours: data.engineHours ?? v.engineHours,
                  lastUpdate: data.timestamp ?? v.lastUpdate,
                }
              : v
          )
        );
      } catch {
        // skip malformed update
      }
    });

    es.addEventListener('error', () => {
      setLoading(false);
    });

    return () => {
      es.close();
    };
  }, []);

  if (loading) {
    return (
      <div className="h-[50vh] min-h-[400px] max-h-[600px] flex items-center justify-center bg-slate-100 rounded-lg" role="status" aria-label="Loading vehicle map">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        <span className="sr-only">Loading vehicle locations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[50vh] min-h-[400px] max-h-[600px] flex items-center justify-center bg-slate-100 rounded-lg" role="alert">
        <div className="text-center text-red-500">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" aria-hidden="true" />
          <p>Error loading map: {error}</p>
        </div>
      </div>
    );
  }

  const activeCount = vehicles.filter(v => v.state === 'ACTIVE').length;
  const idleCount = vehicles.filter(v => v.state === 'IDLE').length;
  const alertCount = vehicles.filter(v => v.hasAlert).length;

  return (
    <div className="relative h-[50vh] min-h-[400px] max-h-[600px] rounded-lg overflow-hidden border shadow-sm">
      <MapContainer
        center={mapCenter}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapCenterUpdater center={mapCenter} />
        <AutoRefreshMap onRefresh={fetchVehicles} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {vehicles.map((vehicle) => (
            <Marker
              key={vehicle.id}
              position={[vehicle.location.lat, vehicle.location.lng]}
              icon={getVehicleIcon(vehicle.state, vehicle.hasAlert)}
              eventHandlers={{
                click: () => setSelectedVehicle(vehicle)
              }}
              aria-label={`Vehicle ${vehicle.plateNumber} - ${vehicle.state}`}
            >
              <Tooltip permanent={false}>
                <div className="font-semibold">{vehicle.plateNumber}</div>
                <div className="text-xs">{vehicle.state === 'OFFLINE' ? '— km/h' : `${vehicle.speed} km/h`}</div>
              </Tooltip>

              <Popup>
                <div className="min-w-[180px] max-w-[220px]">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-bold text-sm text-slate-900 truncate">{vehicle.plateNumber}</h3>
                    {vehicle.hasAlert && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-semibold leading-none">
                        Alert
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Type</span>
                      <span className="font-medium text-slate-800">{vehicle.type}</span>
                    </div>

                    {vehicle.make && vehicle.model && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">Model</span>
                        <span className="text-slate-700 truncate">{vehicle.make} {vehicle.model}</span>
                      </div>
                    )}

                    {vehicle.driverName && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">Driver</span>
                        <span className="text-slate-700 truncate">{vehicle.driverName}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Status</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none",
                        vehicle.state === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                        vehicle.state === 'IDLE' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      )}>
                        {vehicle.state}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Speed</span>
                      <span className="font-mono font-medium text-slate-800">
                        {vehicle.state === 'OFFLINE' ? '—' : `${vehicle.speed} km/h`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Fuel</span>
                      <span className={cn(
                        "font-medium",
                        vehicle.fuelLevel < 20 ? 'text-red-600' : 'text-slate-800'
                      )}>
                        {vehicle.fuelLevel}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 pt-0.5 border-t border-slate-100 mt-1">
                      <span>Updated</span>
                      <span>{new Date(vehicle.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {vehicle.alertMessage && (
                      <div className="p-1.5 bg-red-50 rounded text-red-700 text-[10px] leading-tight flex items-start gap-1" role="alert">
                        <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{vehicle.alertMessage}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => router.push(`/reports/tractors/${vehicle.id}`)}
                      className="flex-1 text-center text-xs bg-emerald-600 text-white py-1.5 rounded-md hover:bg-emerald-700 transition font-medium"
                    >
                      Reports
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/vehicles/${vehicle.id}`)}
                      className="flex-1 text-center text-xs bg-white text-slate-700 py-1.5 rounded-md border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition font-medium"
                    >
                      Vehicle
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}