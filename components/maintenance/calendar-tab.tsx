"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { CalendarGrid } from "./maintenance-ui";

export default function CalendarTab() {
  const [calendarMonth, setCalendarMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [calendarData, setCalendarData] = useState<Record<string, any[]>>({});
  const [calendarLoading, setCalendarLoading] = useState(false);

  const fetchCalendar = useCallback(async (month: string) => {
    setCalendarLoading(true);
    try {
      const res = await fetch(`/api/maintenance/calendar?month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch calendar");
      const data = await res.json();
      setCalendarData(data.grouped || {});
    } catch {
      // silent
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar(calendarMonth);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrevMonth = () => {
    const [y, m] = calendarMonth.split("-").map(Number);
    const totalMonths = y * 12 + (m - 1) - 1;
    const newY = Math.floor(totalMonths / 12);
    const newM = totalMonths % 12 + 1;
    const val = `${newY}-${String(newM).padStart(2, "0")}`;
    setCalendarMonth(val);
    fetchCalendar(val);
  };

  const handleNextMonth = () => {
    const [y, m] = calendarMonth.split("-").map(Number);
    const totalMonths = y * 12 + (m - 1) + 1;
    const newY = Math.floor(totalMonths / 12);
    const newM = totalMonths % 12 + 1;
    const val = `${newY}-${String(newM).padStart(2, "0")}`;
    setCalendarMonth(val);
    fetchCalendar(val);
  };

  const handleToday = () => {
    const d = new Date();
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setCalendarMonth(val);
    fetchCalendar(val);
  };

  const handleDayClick = (dateStr: string) => {
    const entries = calendarData[dateStr] || [];
    if (entries.length > 0) {
      // Day click notification handled inline
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={handlePrevMonth}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-lg font-semibold text-slate-900 min-w-[140px] text-center">
            {format(new Date(calendarMonth + "-01"), "MMMM yyyy")}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleNextMonth}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={handleToday}
          >
            Today
          </Button>
        </div>
      </div>
      {calendarLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <CalendarGrid
          month={calendarMonth}
          data={calendarData}
          onDayClick={handleDayClick}
        />
      )}
    </div>
  );
}
