"use client"

import { useState, useEffect } from "react"; // Added useEffect
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Polyline, 
  Tooltip, 
  CircleMarker,
  useMap, // Import this
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { MapPin, Clock, Map as MapIcon, Layers } from "lucide-react";

export type DeviceStatus = "ACTIVE" | "IDLE" | "OFFLINE";

// --- HELPER COMPONENT FOR MAP MANIPULATION ---
function MapController({ activePosition, isPlayback }: { activePosition: [number, number], isPlayback: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (isPlayback) {
      map.panTo(activePosition, { animate: true, duration: 0.8 });
    } else {
      // Live tracking — gentle pan so the dot never leaves the viewport
      map.panTo(activePosition, { animate: true, duration: 0.5 });
    }
  }, [activePosition, isPlayback, map]);

  return null;
}

const DotIcon = (status: DeviceStatus) => {
  const statusConfig = {
    ACTIVE: { color: "bg-green-500", ping: "bg-green-400", showPing: true },
    IDLE: { color: "bg-amber-500", ping: "", showPing: false },
    OFFLINE: { color: "bg-slate-500", ping: "", showPing: false }
  };

  const config = statusConfig[status] || statusConfig.OFFLINE;

  return L.divIcon({
    className: "custom-dynamic-dot",
    html: `<div class="relative flex h-5 w-5">
            ${config.showPing ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full ${config.ping} opacity-75"></span>` : ''}
            <span class="relative inline-flex rounded-full h-5 w-5 ${config.color} border-2 border-white shadow-lg"></span>
          </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

export default function Map({ center, history, status, playbackIndex = null }: { center: [number, number], history: any[], status: DeviceStatus, playbackIndex?: number | null }) {
  const [isSatellite, setIsSatellite] = useState(true);
  
  // Logic for the gliding position
  const activePosition = (playbackIndex !== null && history[playbackIndex]) 
    ? history[playbackIndex].pos 
    : center;

  const polylinePositions = history.map(point => point.pos);

  const getAddress = async (lat: number, lng: number, time: string) => {
    const toastId = toast.loading("Fetching location details...");
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await response.json();
      const address = data.display_name;

      toast.success("Location Identified", {
        id: toastId,
        duration: 5000,
        description: (
          <div className="mt-2 space-y-1 text-slate-600">
             <div className="flex items-center gap-2 text-xs font-medium text-slate-900">
                <Clock className="h-3 w-3" /> <span>{time}</span>
             </div>
             <div className="flex items-start gap-2">
                <MapPin className="h-3 w-3 mt-1 text-green-600" /> 
                <span className="text-xs leading-tight line-clamp-2">{address}</span>
             </div>
          </div>
        ),
      });
    } catch (error) {
      toast.error("Could not fetch address", { id: toastId });
    }
  };

  return (
    <div className="h-full w-full relative group">
      <style jsx global>{`
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        .animate-ping { animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `}</style>

      <button 
        onClick={() => setIsSatellite(!isSatellite)}
        className="absolute bottom-6 right-6 z-1000 flex items-center gap-2 bg-white/90 backdrop-blur-md p-2 px-3 rounded-full shadow-xl border border-slate-200 hover:bg-white transition-all active:scale-95 text-slate-700 font-medium text-sm"
      >
        {isSatellite ? (
          <><MapIcon className="h-4 w-4 text-blue-600" /><span>Street View</span></>
        ) : (
          <><Layers className="h-4 w-4 text-green-600" /><span>Satellite</span></>
        )}
      </button>

      <MapContainer center={center} zoom={15} className="h-full w-full" zoomControl={false}>
        {/* THIS COMPONENT HANDLES THE PANNING */}
        <MapController 
          activePosition={activePosition} 
          isPlayback={playbackIndex !== null} 
        />

        {isSatellite ? (
          <>
            <TileLayer
              key="satellite"
              attribution='&copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            <TileLayer
              key="sat-labels"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              opacity={0.8}
            />
          </>
        ) : (
          <TileLayer
            key="street"
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        
        <Polyline 
          positions={polylinePositions} 
          pathOptions={{ 
            color: isSatellite ? '#4ade80' : '#16a34a', 
            weight: 5, 
            opacity: 0.7,
            lineCap: 'round',
            lineJoin: 'round',
            smoothFactor: 2.0 
          } as any} 
        />

        {history.map((point, idx) => (
          <CircleMarker 
            key={idx} 
            center={point.pos} 
            radius={playbackIndex === idx ? 8 : 5} 
            pathOptions={{ 
              color: playbackIndex === idx ? 'white' : 'transparent',
              fillColor: playbackIndex === idx ? '#22c55e' : '#94a3b8',
              fillOpacity: 1, 
              weight: 20,
              opacity: 0,
              className: "cursor-pointer" 
            }}
            eventHandlers={{ 
              click: () => getAddress(point.pos[0], point.pos[1], point.time) 
            }}
          >
            <Tooltip>At {point.time}</Tooltip>
          </CircleMarker>
        ))}

        {/* Use activePosition here so the marker glides along the interpolation */}
        <Marker position={activePosition} icon={DotIcon(status)}/>
      </MapContainer>
    </div>
  );
}