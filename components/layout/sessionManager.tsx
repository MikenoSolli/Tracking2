"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const IDLE_TIMEOUT       = 10 * 60 * 1000;   // 10 mins inactivity → warn
const REFRESH_THRESHOLD  = 5 * 60 * 1000;     // refresh when 5 mins left
const CHECK_INTERVAL     = 60 * 1000;          // check every 60 seconds
const WARNING_TIME       = 2 * 60 * 1000;      // warn when 2 mins left

// Activity events that reset the idle timer
const ACTIVITY_EVENTS = [
    "mousedown", "mousemove", "keydown",
    "scroll", "touchstart", "click",
];

export default function SessionManager() {
    const router = useRouter();
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [idleExpired, setIdleExpired] = useState(false);
    const lastActivityRef = useRef<number>(Date.now());
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    const logout = useCallback(() => {
        setShowWarning(false);
        router.push("/logout");
    }, [router]);

    const refreshSession = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/refresh", { method: "POST" });
            if (!res.ok) {
                logout();
                return false;
            }
            setShowWarning(false);
            setIdleExpired(false);
            setTimeLeft(null);
            lastActivityRef.current = Date.now();
            return true;
        } catch {
            logout();
            return false;
        }
    }, [logout]);

    const checkSession = useCallback(async () => {
        // ── Idle timeout check ──
        const idleTime = Date.now() - lastActivityRef.current;
        const userIsActive = idleTime < IDLE_TIMEOUT;

        if (!userIsActive && !showWarning) {
            // Idle threshold crossed — start the warning countdown
            setIdleExpired(true);
            setTimeLeft(Math.floor(WARNING_TIME / 1000));
            setShowWarning(true);

            if (countdownRef.current) clearInterval(countdownRef.current);
            countdownRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev === null || prev <= 1) {
                        logout();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return;
        }

        // ── Token expiry check ──
        try {
            const res = await fetch("/api/auth/refresh");
            if (!res.ok) {
                logout();
                return;
            }

            const data = await res.json();
            if (!data.valid) {
                logout();
                return;
            }

            const msLeft = data.timeLeft as number;

            // If user is active and session is close to expiring, refresh
            if (msLeft < REFRESH_THRESHOLD && userIsActive) {
                await refreshSession();
                return;
            }

            // Show warning if close to expiry (but not due to idle)
            if (msLeft < WARNING_TIME && !idleExpired) {
                setTimeLeft(Math.floor(msLeft / 1000));
                setShowWarning(true);

                if (countdownRef.current) clearInterval(countdownRef.current);
                countdownRef.current = setInterval(() => {
                    setTimeLeft(prev => {
                        if (prev === null || prev <= 1) {
                            logout();
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
        } catch {
            console.warn("Session check failed - will retry");
        }
    }, [logout, refreshSession, showWarning, idleExpired]);

    // Track user activity
    useEffect(() => {
        const handleActivity = () => {
            const wasIdle = Date.now() - lastActivityRef.current >= IDLE_TIMEOUT;
            lastActivityRef.current = Date.now();

            if (wasIdle && showWarning) {
                // User came back from idle — dismiss warning silently
                setShowWarning(false);
                setIdleExpired(false);
                setTimeLeft(null);
                if (countdownRef.current) clearInterval(countdownRef.current);
            }

            // If warning is showing (token expiry, not idle), refresh immediately
            if (showWarning && !idleExpired) {
                refreshSession();
            }
        };

        ACTIVITY_EVENTS.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        return () => {
            ACTIVITY_EVENTS.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [showWarning, idleExpired, refreshSession]);

    // Periodic session check
    useEffect(() => {
        checkSession();

        checkIntervalRef.current = setInterval(checkSession, CHECK_INTERVAL);

        return () => {
            if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [checkSession]);

    if (!showWarning) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
                <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                        />
                    </svg>
                </div>

                <h2 className="text-xl font-bold text-slate-900 mb-2">
                    {idleExpired ? "Session Idle Timeout" : "Session Expiring"}
                </h2>
                <p className="text-slate-500 text-sm mb-6">
                    {idleExpired
                        ? "You've been inactive. Your session will expire in "
                        : "Your session will expire in "}
                    <span className="font-bold text-red-600 text-lg">
                        {timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}` : "..."}
                    </span>
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={logout}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
                    >
                        Logout
                    </button>
                    <button
                        onClick={refreshSession}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition cursor-pointer"
                    >
                        {idleExpired ? "Resume Session" : "Stay Logged In"}
                    </button>
                </div>
            </div>
        </div>
    );
}