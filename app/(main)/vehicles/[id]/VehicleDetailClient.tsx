"use client"

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Fuel, Gauge, Battery, ArrowLeft, Calendar as CalendarIcon, PlayCircle, XCircle,
  ShieldCheck, Navigation, History, Info, ChevronLeft, ChevronRight , Loader2,Play, Pause, RotateCcw,
  SkipBack, SkipForward
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";  


type DeviceStatus = "ACTIVE" | "IDLE" | "OFFLINE";

const Map = dynamic(() => import("./Map"), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-100 animate-pulse" />
});

// 1. Define the interface so TypeScript knows what 'vehicle' looks like
interface VehicleProps {
  vehicle: {
    id: string;
    name: string;
    plate: string;
    status: string;
    type: string;
    daysToService: string;
    telemetry: {
      fuel: number;
      speed: number;
      engineHours: number;
      lat: number;
      lng: number;
      lastUpdate: string;
    };
    history: { pos: [number, number]; time: string }[];
  }
}



// 2. Accept 'vehicle' as a prop
export default function VehicleDetailClient({ vehicle }: VehicleProps) {
  const [date, setDate] = useState<DateRange | undefined>();
  const [showStats, setShowStats] = useState(false);
  const [activeTab, setActiveTab] = useState("live");
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasInitialized = useRef(false);

  // Redis live data state
  const [liveData, setLiveData] = useState<{
    state: string | null;
    lat: number;
    lng: number;
    speed: number | null;
    fuel: number | null;
    engineHours: number | null;
    timestamp: string | null;
  } | null>(null);

  // Accumulated live trail — seeded from SSR history, extended with each live ping
  const [liveTrail, setLiveTrail] = useState<{ pos: [number, number]; time: string }[]>(vehicle.history);

  // Ref to avoid duplicate consecutive positions
  const lastLivePosRef = useRef<[number, number] | null>(null);

  const [playbackEnabled, setPlaybackEnabled] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const lastTimeRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [smoothPos, setSmoothPos] = useState<[number, number] | null>(null);
  const progressRef = useRef(0); // Tracking 0.0 to 1.0 between points
  const requestRef = useRef<number | undefined>(undefined);


  useEffect(() => {
  if (!playbackEnabled) {
    setIsPlaying(false);
    setPlaybackIndex(0);
    setSmoothPos(null); // Clear the interpolated position
    progressRef.current = 0;
  }
}, [playbackEnabled]);

useEffect(()=>{
if (!hasInitialized.current) {
    const isBigScreen = window.innerWidth >= 768;
    
    if (isBigScreen) {
      setShowStats(true);
    }
    
    hasInitialized.current = true;
  }
});
  // SSE connection to Redis live data — also accumulates the live trail
  useEffect(() => {
    if (activeTab !== "live") {
      setLiveData(null);
      setLiveTrail(vehicle.history);   // Reset trail to SSR baseline
      lastLivePosRef.current = null;   // Reset dedup ref
      return;
    }

    const eventSource = new EventSource(`/api/vehicles/${vehicle.id}/live`);

    eventSource.addEventListener('live', (event) => {
      try {
        const data = JSON.parse(event.data);
        setLiveData(prev => {
          // OFFLINE events may skip location — preserve the previous position
          const hasLocation = data.lat != null && data.lng != null;
          if (prev && !hasLocation && data.state === prev.state) {
            return prev;
          }
          return {
            state: data.state ?? null,
            lat: hasLocation ? data.lat : (prev?.lat ?? null),
            lng: hasLocation ? data.lng : (prev?.lng ?? null),
            speed: data.speed ?? null,
            fuel: data.fuel ?? null,
            engineHours: data.engineHours ?? null,
            timestamp: data.timestamp ?? null,
          };
        });

        // // SignificantTurn — refetch GPS trail from database to reload the path
        // if (data.event === 'SignificantTurn') {
        //   const now = new Date();
        //   const todayStart = new Date(now);
        //   todayStart.setHours(0, 0, 0, 0);
        //   const from = todayStart.toISOString();
        //   const to = now.toISOString();
        //
        //   fetch(`/api/vehicles/${vehicle.id}/history?from=${from}&to=${to}`)
        //     .then(r => r.json())
        //     .then((points: any[]) => {
        //       setLiveTrail(points.filter((p: any) => p.pos));
        //     })
        //     .catch(() => {});
        //   return;
        // }

        // Regular live ping — append to trail (skip if position hasn't changed)
        if (data.lat != null && data.lng != null) {
          const newPos: [number, number] = [data.lat, data.lng];
          const last = lastLivePosRef.current;
          if (!last || last[0] !== newPos[0] || last[1] !== newPos[1]) {
            lastLivePosRef.current = newPos;
            setLiveTrail(prev => {
              // Limit trail to 500 points to avoid memory bloat
              const next = [...prev, { pos: newPos, time: data.timestamp || new Date().toISOString() }];
              return next.length > 500 ? next.slice(next.length - 500) : next;
            });
          }
        }
      } catch {}
    });

    return () => {
      eventSource.close();
    };
  }, [activeTab, vehicle.id, vehicle.history]);

  const interpolate = (p1: [number, number], p2: [number, number], t: number): [number, number] => {
    return [
      p1[0] + (p2[0] - p1[0]) * t,
      p1[1] + (p2[1] - p1[1]) * t
    ];
  };

  const fetchHistory = async (range: DateRange) => {
    if (!range.from || !range.to) return;
    
  setIsLoading(true);
  try {
    // Format dates to ISO strings for the API
    const from = range.from.toISOString();
    const to = range.to.toISOString();
    
    const response = await fetch(`/api/vehicles/${vehicle.id}/history?from=${from}&to=${to}`);
    
    if (!response.ok) throw new Error("Failed to fetch history");
    
    const data = await response.json();
    
    setHistoryData(data); // Save the database results to state
    setActiveTab("history"); // Switch the map to history view
    
  } catch (error) {
    console.error("History Error:", error);
    // You can add a toast notification here
  } finally {
    setIsLoading(false);
  }
};


const handleDateSelect = (range: DateRange | undefined) => {
    setDate(range);
    if (range?.from && range?.to) {
      // Trigger data pull
      console.log("Pulling data for:", range.from, "to", range.to);
      fetchHistory(range);
    }
  };

  const mapHistory = activeTab === "live" ? liveTrail : historyData;

const animate = (time: number) => {
  if (lastTimeRef.current !== undefined && isPlaying) {
    const deltaTime = time - lastTimeRef.current;
    
    if (playbackIndex < mapHistory.length - 1) {
      // 0.001 is the base speed (1 second per segment at 1x)
      // Multiply by playbackSpeed to go faster
      const step = (deltaTime * 0.001) * playbackSpeed;
      progressRef.current += step;

      if (progressRef.current >= 1) {
        progressRef.current = 0;
        setPlaybackIndex(prev => prev + 1);
      } else {
        const p1 = mapHistory[playbackIndex].pos;
        const p2 = mapHistory[playbackIndex + 1].pos;
        setSmoothPos(interpolate(p1, p2, progressRef.current));
      }
      requestRef.current = requestAnimationFrame(animate);
    } else {
      setIsPlaying(false);
    }
  }
  lastTimeRef.current = time;
};

useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying, playbackIndex]);


  // Live status from Redis state field — falls back to SSR status when no live data
  const displayStatus = (liveData?.state || vehicle.status) as DeviceStatus;

  // Use live Redis data for position when available (only when not in playback)
  const currentPos: [number, number] = liveData?.lat != null && liveData?.lng != null
    ? [liveData.lat, liveData.lng]
    : [vehicle.telemetry.lat, vehicle.telemetry.lng];

  const currentFuel = liveData?.fuel ?? vehicle.telemetry.fuel;
  const currentSpeed = liveData?.speed ?? vehicle.telemetry.speed;
  const currentEngineHours = liveData?.engineHours ?? vehicle.telemetry.engineHours;
  const lastUpdate = liveData?.timestamp
    ? new Date(liveData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : vehicle.telemetry.lastUpdate;

  const finalPos = playbackEnabled ? (smoothPos || mapHistory[playbackIndex]?.pos) : currentPos;

  const fmtTime = (iso: string) => {
    try { return format(new Date(iso), 'HH:mm:ss'); } catch { return iso; }
  };

  const handlePlayPause = () => {
    if (playbackIndex >= mapHistory.length - 1) {
      setPlaybackIndex(0);
      progressRef.current = 0;
      setSmoothPos(null);
    }
    setIsPlaying(p => !p);
  };

  const skip = (dir: -1 | 1) => {
    const next = Math.max(0, Math.min(mapHistory.length - 1, playbackIndex + dir));
    setPlaybackIndex(next);
    setIsPlaying(false);
    setSmoothPos(null);
    progressRef.current = 0;
  };

  return (
    <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-50">
      
      {/* TOP NAVIGATION BAR */}
      <div className="absolute top-4 left-4 right-4 z-1000 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link href="/vehicles">
            <Button variant="outline" size="icon" className="shadow-md rounded-full bg-white border-none">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Button>
          </Link>
          <div className="bg-white px-4 py-2 rounded-xl shadow-md border border-slate-200">
            <Link href={`/reports/${vehicle.type.toLowerCase()+'s'}/${vehicle.id}`}>
            <h1 className="font-bold text-slate-900 flex items-center gap-2">
              {vehicle.name}
              {liveData && (
                <span className="text-[9px] font-mono tracking-widest text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="animate-pulse h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                  LIVE
                </span>
              )}
            </h1>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{vehicle.plate}</p>
            </Link>
          </div>
          <Button onClick={() => setShowStats(!showStats)} variant="outline" size="icon" className="md:hidden shadow-md rounded-full bg-white border-none pointer-events-auto">
            <Info className={`h-5 w-5 ${showStats ? 'text-green-600' : 'text-slate-600'}`} />
          </Button>
        </div>

       <div className="flex gap-2 pointer-events-auto">
  <Button 
    onClick={() => setActiveTab("live")} 
    variant={activeTab === "live" ? "default" : "secondary"} 
    className={`shadow-md rounded-full ${activeTab === 'live' ? 'bg-green-700 hover:bg-green-800' : 'bg-white text-slate-600'}`}
  >
    <Navigation className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Live</span>
  </Button>

  <Popover>
    <PopoverTrigger asChild>
      <Button 
        variant={activeTab === "history" ? "default" : "secondary"} 
        className={cn(
          "shadow-md rounded-full bg-white",
          activeTab === "history" && "bg-slate-900 text-white hover:bg-slate-800"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <History className="h-4 w-4 mr-2" />
        )}
        <span className="hidden sm:inline">
        {date?.from ? (
          date.to ? `${format(date.from, "MMM dd")} - ${format(date.to, "MMM dd")}` : format(date.from, "MMM dd")
        ) : (
          "History"
        )}
        </span>
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl" align="end">
      <Calendar
        initialFocus
        mode="range"
        selected={date}
        onSelect={(range) => {
          setDate(range);
          if (range?.from && range?.to) fetchHistory(range);
        }}
        numberOfMonths={1}
      />
    </PopoverContent>
  </Popover>
    </div>
      </div>

      {/* 1. PLAYBACK TOGGLE BUTTON (entry only — exit is inside the controller) */}
      {!playbackEnabled && (
        <div className="absolute bottom-6 left-6 z-1001">
          <Button
            onClick={() => setPlaybackEnabled(true)}
            className="h-10 md:h-12 rounded-full shadow-2xl gap-2 px-4 border-none bg-white hover:bg-slate-50 text-slate-900"
          >
            <PlayCircle className="h-5 w-5 text-green-600" />
            <span className="font-bold text-xs md:text-sm">Playback Mode</span>
          </Button>
        </div>
      )}

      {/* 2. PLAYBACK CONTROLLER (Center Bottom) */}
      {playbackEnabled && mapHistory.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-1000 w-[calc(100%-32px)] max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Card className="p-3 bg-slate-900/95 backdrop-blur-md border-none shadow-2xl text-white rounded-[20px]">
                       {/* Single row: label + position + controls + close */}
            <div className="flex items-center justify-between mt-1 mb-1.5 px-1">
              {/* Left: Label + Time */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {activeTab === "live" ? "Replay" : "History"}
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono text-green-400 truncate">
                  {fmtTime(mapHistory[playbackIndex]?.time)}
                </span>
              </div>

              {/* Center: Playback Controls */}
              <div className="flex items-center justify-center gap-0.5">
                <button
                  onClick={() => skip(-1)}
                  title="Skip backward"
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <SkipBack className="h-3 w-3" />
                </button>

                <button
                  onClick={handlePlayPause}
                  title={isPlaying ? "Pause" : "Play"}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  {isPlaying
                    ? <Pause className="fill-white h-3.5 w-3.5" />
                    : <Play className="fill-white h-3.5 w-3.5 ml-0.5" />
                  }
                </button>

                <button
                  onClick={() => skip(1)}
                  title="Skip forward"
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <SkipForward className="h-3 w-3" />
                </button>

                <div className="w-px h-4 bg-slate-700 mx-1.5" />

                <button
                  onClick={() => setPlaybackSpeed(s => s === 8 ? 1 : s * 2)}
                  title="Change speed"
                  className="h-6 px-1.5 rounded-md text-[10px] font-bold font-mono text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-colors"
                >
                  {playbackSpeed}x
                </button>

                <div className="w-px h-4 bg-slate-700 mx-1.5" />

                <button
                  onClick={() => { setPlaybackIndex(0); setIsPlaying(false); setSmoothPos(null); progressRef.current = 0; }}
                  title="Restart"
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>

              {/* Right: Position + Close */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono">
                  {playbackIndex + 1}/{mapHistory.length}
                </span>
                <button
                  onClick={() => setPlaybackEnabled(false)}
                  title="Exit playback"
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </button>
              </div>
            </div>
           
           
            {/* Slider */}
            <Slider
              value={[playbackIndex]}
              max={mapHistory.length - 1}
              step={1}
              onValueChange={(val) => {
                setPlaybackIndex(val[0]);
                setIsPlaying(false);
                setSmoothPos(null);
                progressRef.current = 0;
              }}
              className="py-0.5"
            />

          </Card>
        </div>
      )}

      {/* Backdrop on mobile when stats are visible */}
      {showStats && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          onClick={() => setShowStats(false)}
        />
      )}

      {/* LEFT SIDE DATA OVERLAY */}
      {/* <div className={cn(`absolute top-24 left-4 z-1000 w-72 space-y-4 transition-all duration-300 transform 
        ${showStats ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 md:translate-x-0 md:opacity-100'}`)}>
         */}
        <div
          className={cn(
          "absolute top-24 left-4 z-40 w-64 sm:w-72 max-h-[calc(100dvh-140px)] overflow-y-auto md:max-h-none md:overflow-y-visible transition-all duration-500 ease-in-out",
          showStats
            ? "translate-x-0 opacity-90" // TRUE: Show the panel
            : "-translate-x-[calc(100%+16px)] md:-translate-x-[calc(100%-16px)] opacity-0 md:opacity-50" // FALSE: Hide/Peek
        )}>

          <Button 
            onClick={() => setShowStats(!showStats)} 
            className="hidden md:flex absolute -right-10 top-0 h-8 w-8 rounded-full bg-white shadow-md border border-slate-200 p-0 items-center justify-center hover:bg-slate-50 transition-colors"
          >
            {/* If panel is shown, arrow points Left (to hide it). If hidden, arrow points Right (to reveal it) */}
            {showStats ? (
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-600" />
            )}
          </Button>

        <div className={`${!showStats ? 'md:block hidden' : 'block'} space-y-4`}>
          <Card className="p-4 shadow-xl border-none bg-white/95 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <Badge className={displayStatus==="OFFLINE"
                ? "bg-gray-200 text-gray-600"
                : displayStatus === "ACTIVE"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
              }>
                {liveData && <span className="animate-pulse mr-1 h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />}
                ● {displayStatus}
              </Badge>
              <span className="text-[10px] text-slate-400 font-medium tracking-tighter uppercase">Updated {lastUpdate}</span>
            </div>

            <div className="space-y-4">
              {/* FUEL */}
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg"><Fuel className="h-4 w-4 text-amber-600" /></div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">Fuel Level</p>
                    <p className="text-lg font-bold text-slate-700 leading-none">{currentFuel}%</p>
                  </div>
                </div>
                <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full" style={{ width: `${currentFuel}%` }}></div>
                </div>
              </div>

              {/* SPEED */}
              <div className="flex items-center gap-3 group">
                <div className="p-2 bg-blue-50 rounded-lg"><Gauge className="h-4 w-4 text-blue-600" /></div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">Current Speed</p>
                  <p className="text-lg font-bold text-slate-700 leading-none">{currentSpeed} <span className="text-xs font-normal text-slate-400">km/h</span></p>
                </div>
              </div>

              {/* ENGINE HOURS */}
              <div className="flex items-center gap-3 group">
                <div className="p-2 bg-slate-50 rounded-lg"><Battery className="h-4 w-4 text-slate-600" /></div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">Engine Hours</p>
                  <p className="text-lg font-bold text-slate-700 leading-none">{currentEngineHours} <span className="text-xs font-normal text-slate-400">hrs</span></p>
                </div>
              </div>
            </div>
          </Card>

          {/* MAINTENANCE CARD */}
          <Card className="p-4 shadow-xl border-none bg-slate-900 text-white">
              <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-3 tracking-widest">Safety & Maintenance</h4>
              <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs p-2 bg-slate-800 rounded-lg">
                      <span className="flex items-center gap-2"><ShieldCheck className="h-3 w-3 text-green-400" /> Insurance</span>
                      <span className="text-green-400 font-bold">Valid</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2 bg-slate-800 rounded-lg">
                      <span className="flex items-center gap-2"><CalendarIcon className="h-3 w-3 text-amber-400" /> Next Service</span>
                      <span className="text-slate-300">{vehicle.daysToService}</span>
                  </div>
                  <Link href={`/vehicles/${vehicle.id}/maintenance`}
                    className="flex items-center justify-between text-xs p-2 bg-amber-600/20 hover:bg-amber-600/30 rounded-lg transition-colors"
                  >
                      <span className="flex items-center gap-2"><Wrench className="h-3 w-3 text-amber-400" /> Maintenance</span>
                      <span className="text-amber-400 font-bold text-[10px]">View →</span>
                  </Link>
              </div>
          </Card>
        </div>
      </div>

      {/* THE MAP CONTAINER */}
      <div className="absolute inset-0 z-0">
          <Map
              center={finalPos as [number, number]}
              history={mapHistory}
              status={displayStatus}
              playbackIndex={playbackEnabled ? playbackIndex : null}
            />
      </div>

    </div>
  );
}