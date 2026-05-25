"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin, Zap, Fuel, Gauge, Thermometer, Wrench,
  AlertTriangle, Activity, Truck, Car, Bus,
  Tractor, Bike, ArrowRight, ChevronDown, Menu, X, Battery,
  Loader2, Eye, EyeOff, Mail, Lock, User, Building2,
  CheckCircle2, AlertCircle, Shield,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─── Data ───────────────────────────────────────────────────────
const vehicleCategories = [
  { icon: Tractor, name: "Tractors", desc: "Agricultural & heavy machinery", color: "from-green-500 to-green-600" },
  { icon: Truck, name: "Trucks", desc: "Logistics & long-haul transport", color: "from-blue-500 to-blue-600" },
  { icon: Car, name: "Cars", desc: "Executive & utility fleet", color: "from-purple-500 to-purple-600" },
  { icon: Bus, name: "Buses", desc: "Passenger transport", color: "from-amber-500 to-amber-600" },
  { icon: Bike, name: "Motorcycles", desc: "Two-wheelers & quick delivery", color: "from-red-500 to-red-600" },
];

const telematicsData = [
  { icon: MapPin, title: "Location Tracking", desc: "GPS coordinates, route history, geofencing", color: "text-green-600" },
  { icon: Zap, title: "Engine Telematics", desc: "RPM, load, horsepower monitoring", color: "text-amber-600" },
  { icon: Fuel, title: "Fuel Management", desc: "Fuel level, consumption rate, efficiency", color: "text-blue-600" },
  { icon: Gauge, title: "Speed & Movement", desc: "Real-time speed, distance traveled, state", color: "text-purple-600" },
  { icon: Thermometer, title: "Temperature", desc: "Engine temp, coolant temperature", color: "text-red-600" },
  { icon: Battery, title: "Electrical", desc: "Battery voltage, oil pressure", color: "text-slate-600" },
  { icon: Wrench, title: "Maintenance", desc: "Service schedules, alerts, history", color: "text-cyan-600" },
  { icon: AlertTriangle, title: "Alerts", desc: "Speeding, geofence, fuel theft detection", color: "text-orange-600" },
];

const features = [
  { title: "Real-time GPS Tracking", desc: "Monitor vehicle locations live on interactive maps" },
  { title: "OBD/J1939 Telematics", desc: "Deep vehicle diagnostics via standard protocols" },
  { title: "Smart Maintenance", desc: "Automated service scheduling and reminders" },
  { title: "Intelligent Alerts", desc: "Instant notifications for anomalies & violations" },
];

const stats = [
  { value: "5+", label: "Vehicle Types" },
  { value: "8+", label: "Data Points" },
  { value: "24/7", label: "Real-time" },
  { value: "99.9%", label: "Uptime" },
];

// ─── Password Strength ───────────────────────────────────────────
function getPasswordStrength(pw: string): { label: string; color: string; width: string } {
  if (!pw) return { label: "", color: "bg-gray-200", width: "w-0" };
  const len = pw.length;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length + (len >= 12 ? 1 : 0) + (len >= 8 ? 1 : 0);
  if (score <= 2) return { label: "Weak", color: "bg-red-500", width: "w-[25%]" };
  if (score <= 3) return { label: "Fair", color: "bg-orange-500", width: "w-[50%]" };
  if (score <= 4) return { label: "Good", color: "bg-yellow-500", width: "w-[75%]" };
  return { label: "Strong", color: "bg-green-500", width: "w-full" };
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="space-y-1 animate-fadeIn">
      <div className="h-1 w-full rounded-full bg-gray-200 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", strength.color, strength.width)} />
      </div>
      <p className="text-[11px] font-medium text-gray-500">{strength.label}</p>
    </div>
  );
}

// ─── UseInView Hook ──────────────────────────────────────────────
function useInView(threshold = 0.15): [React.RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.unobserve(el); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView];
}

// ─── Animated Counter ────────────────────────────────────────────
function AnimatedStat({ value, label }: { value: string; label: string }) {
  const [ref, inView] = useInView(0.5);
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={cn(
      "text-center transition-all duration-700",
      inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
    )}>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-gray-500 mt-1">{label}</p>
    </div>
  );
}

// ─── Form Field ──────────────────────────────────────────────────
function FormField({
  id, label, children, error,
}: {
  id: string; label: string; children: React.ReactNode; error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</Label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-red-600 mt-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"login" | "register" | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [loginData, setLoginData] = useState({ email: "", password: "", remember: false });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginTouched, setLoginTouched] = useState({ email: false, password: false });

  const [registerData, setRegisterData] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    companyType: "INDIVIDUAL", companyName: ""
  });
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regTouched, setRegTouched] = useState({ name: false, email: false, password: false, confirmPassword: false });

  // Open / close dialog
  const openModal = (type: "login" | "register") => {
    setActiveModal(type);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    // reset after animation
    setTimeout(() => {
      setActiveModal(null);
      setLoginError("");
      setRegisterError("");
      setRegisterSuccess("");
    }, 200);
  };

  const switchModal = (to: "login" | "register") => {
    setLoginError("");
    setRegisterError("");
    setRegisterSuccess("");
    setActiveModal(to);
  };

  // Scroll events
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Login ──────────────────────────────────────────────────────
  const validateLogin = () => {
    const errors: Record<string, string> = {};
    if (!loginData.email) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginData.email)) errors.email = "Invalid email format";
    if (!loginData.password) errors.password = "Password is required";
    return errors;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateLogin();
    if (Object.keys(errors).length) return;
    setLoginError("");
    setLoginLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", loginData.email);
      formData.append("password", loginData.password);

      const response = await fetch("/api/auth/login", { method: "POST", body: formData });
      const result = await response.json();

      if (result.success || response.ok) {
        closeModal();
        router.push("/dashboard");
      } else {
        setLoginError(result.error || "Invalid email or password");
      }
    } catch {
      setLoginError("Connection error. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Register ───────────────────────────────────────────────────
  const validateRegister = () => {
    const errors: Record<string, string> = {};
    if (!registerData.name.trim()) errors.name = "Name is required";
    if (!registerData.email) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerData.email)) errors.email = "Invalid email format";
    if (!registerData.password) errors.password = "Password is required";
    else if (registerData.password.length < 8) errors.password = "At least 8 characters";
    if (registerData.password !== registerData.confirmPassword) errors.confirmPassword = "Passwords do not match";
    if (registerData.companyType === "COMPANY" && !registerData.companyName.trim()) errors.companyName = "Company name is required";
    return errors;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateRegister();
    if (Object.keys(errors).length) {
      setRegTouched({ name: true, email: true, password: true, confirmPassword: true });
      return;
    }
    setRegisterError("");
    setRegisterSuccess("");
    setRegisterLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", registerData.name);
      formData.append("email", registerData.email);
      formData.append("password", registerData.password);
      formData.append("companyType", registerData.companyType);
      formData.append("companyName", registerData.companyName);

      const response = await fetch("/api/auth/register", { method: "POST", body: formData });
      const result = await response.json();

      if (result.success || response.ok) {
        closeModal();
        router.push(`/validate?email=${encodeURIComponent(registerData.email)}`);
        setRegisterData({ name: "", email: "", password: "", confirmPassword: "", companyType: "INDIVIDUAL", companyName: "" });
      } else {
        setRegisterError(result.error || "Registration failed");
      }
    } catch {
      setRegisterError("Connection error. Please try again.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const [heroRef, heroInView] = useInView(0.1);
  const [vehiclesRef, vehiclesInView] = useInView(0.1);
  const [dataRef, dataInView] = useInView(0.1);
  const [featuresRef, featuresInView] = useInView(0.1);
  const [ctaRef, ctaInView] = useInView(0.1);

  return (
    <div className="min-h-screen bg-white">
      {/* ─── NAVBAR ──────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-3">
        <nav className={cn(
          "max-w-7xl mx-auto transition-all duration-500",
          scrolled || mobileMenuOpen
            ? "bg-white/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 rounded-2xl px-6 py-3"
            : "bg-transparent px-6 py-3"
        )}>
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:shadow-green-500/25 transition-all duration-300">
                <Truck className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">TractorTrack</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {["vehicles", "data", "features"].map((item) => (
                <a key={item} href={`#${item}`}
                  className="text-sm text-gray-500 hover:text-green-600 font-medium transition-colors duration-200 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-green-500 after:transition-all after:duration-300 hover:after:w-full after:-bottom-1">
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </a>
              ))}
              <Button onClick={() => openModal("login")} size="sm"
                className="bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-600/20 cursor-pointer">
                Sign In
              </Button>
              <Button onClick={() => openModal("register")} variant="outline" size="sm"
                className="border-green-600 text-green-600 hover:bg-green-50 cursor-pointer">
                Get Started
              </Button>
            </div>

            <button className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile menu */}
          <div className={cn(
            "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
            mobileMenuOpen ? "max-h-80 opacity-100 mt-4" : "max-h-0 opacity-0"
          )}>
            <div className="flex flex-col gap-2 pt-4 border-t border-gray-100">
              {["vehicles", "data", "features"].map((item) => (
                <a key={item} href={`#${item}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-green-50 hover:text-green-700 font-medium transition-colors cursor-pointer">
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </a>
              ))}
              <div className="flex gap-2 pt-2">
                <Button onClick={() => { setMobileMenuOpen(false); openModal("login"); }} variant="outline" className="flex-1 cursor-pointer">
                  Sign In
                </Button>
                <Button onClick={() => { setMobileMenuOpen(false); openModal("register"); }} className="flex-1 bg-green-600 hover:bg-green-700 text-white cursor-pointer">
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* ─── AUTH DIALOG ─────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent showCloseButton={false} className="sm:max-w-[400px] p-0 gap-0 rounded-2xl shadow-2xl border-0 overflow-hidden">
          <button onClick={closeModal}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>

          {/* Glowing header accent line */}
          <div className="h-1 bg-gradient-to-r from-green-500 via-green-600 to-emerald-500" />

          {/* ── LOGIN ──────────────────────────────────────────────── */}
          <div className={cn(
            "px-7 pb-7 pt-6 transition-all duration-300",
            activeModal === "login" ? "block" : "hidden"
          )}>
            <div className="text-center mb-6">
              <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-500/20">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <DialogTitle className="text-xl font-bold text-gray-900">Welcome back</DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-1">
                Sign in to your fleet dashboard
              </DialogDescription>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <FormField id="login-email" label="Email"
                error={loginTouched.email && !loginData.email ? "Email is required" :
                       loginTouched.email && loginData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginData.email) ? "Invalid email" : undefined}>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input id="login-email" type="email" value={loginData.email}
                    onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                    onBlur={() => setLoginTouched(p => ({...p, email: true}))}
                    placeholder="name@example.com"
                    className="pl-9 h-10 bg-gray-50/80 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all rounded-lg text-sm" required />
                </div>
              </FormField>

              <FormField id="login-password" label="Password"
                error={loginTouched.password && !loginData.password ? "Password is required" : undefined}>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input id="login-password" type={showLoginPassword ? "text" : "password"}
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    onBlur={() => setLoginTouched(p => ({...p, password: true}))}
                    placeholder="Enter your password"
                    className="pl-9 pr-10 h-10 bg-gray-50/80 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all rounded-lg text-sm" required />
                  <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showLoginPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </FormField>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={loginData.remember}
                    onChange={(e) => setLoginData({...loginData, remember: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500/30 accent-green-600" />
                  <span className="text-xs text-gray-500">Remember me</span>
                </label>
                <button type="button" className="text-xs font-medium text-green-600 hover:text-green-700 transition-colors">
                  Forgot password?
                </button>
              </div>

              {loginError && (
                <div className="flex items-start gap-2.5 bg-red-50/80 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-lg text-xs animate-fadeIn">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <Button type="submit" disabled={loginLoading}
                className="w-full h-10 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-md shadow-green-600/20 hover:shadow-lg hover:shadow-green-600/30 transition-all text-sm">
                {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <button type="button" onClick={() => switchModal("register")}
                className="font-semibold text-green-600 hover:text-green-700 transition-colors">
                Create one
              </button>
            </div>
          </div>

          {/* ── REGISTER ───────────────────────────────────────────── */}
          <div className={cn(
            "px-7 pb-7 pt-6 transition-all duration-300",
            activeModal === "register" ? "block" : "hidden"
          )}>
            {registerSuccess ? (
              <div className="space-y-5 animate-fadeIn">
                <div className="text-center mb-4">
                  <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-500/20">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <DialogTitle className="text-xl font-bold text-gray-900">Account created!</DialogTitle>
                  <DialogDescription className="text-sm text-gray-500 mt-1">
                    Check your email to verify your account
                  </DialogDescription>
                </div>
                <div className="bg-green-50/80 border border-green-200 rounded-xl px-4 py-3.5">
                  <p className="text-sm text-green-700 text-center">{registerSuccess}</p>
                </div>
                <Button onClick={() => switchModal("login")}
                  className="w-full h-10 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg">
                  Sign in
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-500/20">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <DialogTitle className="text-xl font-bold text-gray-900">Create account</DialogTitle>
                  <DialogDescription className="text-sm text-gray-500 mt-1">
                    Get started with your fleet management
                  </DialogDescription>
                </div>

                <form onSubmit={handleRegister} className="space-y-3.5">
                  <FormField id="reg-name" label="Full Name"
                    error={regTouched.name && !registerData.name.trim() ? "Name is required" : undefined}>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input id="reg-name" type="text" value={registerData.name}
                        onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                        onBlur={() => setRegTouched(p => ({...p, name: true}))}
                        placeholder="John Doe"
                        className="pl-9 h-10 bg-gray-50/80 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all rounded-lg text-sm" required />
                    </div>
                  </FormField>

                  <FormField id="reg-email" label="Email"
                    error={regTouched.email && !registerData.email ? "Email is required" :
                           regTouched.email && registerData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerData.email) ? "Invalid email" : undefined}>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input id="reg-email" type="email" value={registerData.email}
                        onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                        onBlur={() => setRegTouched(p => ({...p, email: true}))}
                        placeholder="name@example.com"
                        className="pl-9 h-10 bg-gray-50/80 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all rounded-lg text-sm" required />
                    </div>
                  </FormField>

                  <FormField id="reg-password" label="Password"
                    error={regTouched.password && !registerData.password ? "Password is required" :
                           regTouched.password && registerData.password.length < 8 ? "At least 8 characters" : undefined}>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input id="reg-password" type={showRegPassword ? "text" : "password"}
                        value={registerData.password}
                        onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                        onBlur={() => setRegTouched(p => ({...p, password: true}))}
                        placeholder="Create a strong password"
                        className="pl-9 pr-10 h-10 bg-gray-50/80 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all rounded-lg text-sm" required />
                      <button type="button" onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showRegPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <PasswordStrengthIndicator password={registerData.password} />
                  </FormField>

                  <FormField id="reg-confirm-password" label="Confirm Password"
                    error={regTouched.confirmPassword && registerData.password !== registerData.confirmPassword ? "Passwords do not match" : undefined}>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input id="reg-confirm-password" type={showRegConfirm ? "text" : "password"}
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                        onBlur={() => setRegTouched(p => ({...p, confirmPassword: true}))}
                        placeholder="Repeat your password"
                        className="pl-9 pr-10 h-10 bg-gray-50/80 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all rounded-lg text-sm" required />
                      <button type="button" onClick={() => setShowRegConfirm(!showRegConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showRegConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </FormField>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Account Type</Label>
                    <div className="flex gap-2">
                      {([{ type: "INDIVIDUAL", icon: User, label: "Individual" },
                         { type: "COMPANY", icon: Building2, label: "Company" }] as const).map((opt) => (
                        <button key={opt.type} type="button"
                          onClick={() => setRegisterData({...registerData, companyType: opt.type, companyName: opt.type === "INDIVIDUAL" ? "" : registerData.companyName})}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                            registerData.companyType === opt.type
                              ? "border-green-500 bg-green-50 text-green-700 shadow-sm"
                              : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
                          )}>
                          <opt.icon className="h-3.5 w-3.5" />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {registerData.companyType === "COMPANY" && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <Label htmlFor="reg-company" className="text-sm font-medium text-gray-700">Company Name</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input id="reg-company" type="text" value={registerData.companyName}
                          onChange={(e) => setRegisterData({...registerData, companyName: e.target.value})}
                          placeholder="My Fleet Ltd."
                          className="pl-9 h-10 bg-gray-50/80 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all rounded-lg text-sm" required />
                      </div>
                    </div>
                  )}

                  {registerError && (
                    <div className="flex items-start gap-2.5 bg-red-50/80 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-lg text-xs animate-fadeIn">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>{registerError}</span>
                    </div>
                  )}

                  <Button type="submit" disabled={registerLoading}
                    className="w-full h-10 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-md shadow-green-600/20 hover:shadow-lg hover:shadow-green-600/30 transition-all text-sm">
                    {registerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                  Already have an account?{" "}
                  <button type="button" onClick={() => switchModal("login")}
                    className="font-semibold text-green-600 hover:text-green-700 transition-colors">
                    Sign in
                  </button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── HERO ────────────────────────────────────────────────── */}
      <section id="hero" ref={heroRef as React.RefObject<HTMLElement>}
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100">
          <div className="absolute inset-0">
            <div className={cn(
              "absolute top-20 left-10 w-80 h-80 bg-green-200/30 rounded-full blur-3xl transition-all duration-[1500ms]",
              heroInView ? "opacity-100 scale-100" : "opacity-0 scale-50"
            )} />
            <div className={cn(
              "absolute -top-20 right-20 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl transition-all duration-[1500ms] delay-300",
              heroInView ? "opacity-100 scale-100" : "opacity-0 scale-50"
            )} />
            <div className={cn(
              "absolute bottom-40 left-1/4 w-64 h-64 bg-amber-200/25 rounded-full blur-3xl transition-all duration-[1500ms] delay-500",
              heroInView ? "opacity-100 scale-100" : "opacity-0 scale-50"
            )} />
            <div className={cn(
              "absolute bottom-20 right-1/3 w-48 h-48 bg-blue-200/20 rounded-full blur-3xl transition-all duration-[1500ms] delay-700",
              heroInView ? "opacity-100 scale-100" : "opacity-0 scale-50"
            )} />
          </div>
        </div>

        <div className={cn(
          "relative z-10 max-w-5xl mx-auto px-6 text-center transition-all duration-1000",
          heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
        )}>
          {/* Pill badge with glow */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 border border-green-200/80 rounded-full mb-7 shadow-sm animate-glowPulse">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-sm font-medium text-green-700">Vehicle Telematics Platform</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-gray-900 mb-6 leading-[1.1] tracking-tight">
            Comprehensive
            <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-500 bg-clip-text text-transparent"> Fleet Tracking</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Monitor, analyze, and optimize your entire fleet in real-time.
            From tractors to trucks, get complete visibility into vehicle telematics,
            maintenance, and operations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => openModal("register")} size="lg"
              className="h-12 px-8 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-lg shadow-green-600/25 hover:shadow-xl hover:shadow-green-600/30 transition-all text-base gap-2 group">
              Get Started
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <a href="#features"
              className="h-12 px-8 inline-flex items-center justify-center rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-base hover:border-green-500 hover:text-green-600 transition-all bg-white/60 hover:bg-white">
              Explore Features
            </a>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <AnimatedStat key={i} {...stat} />
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-400 animate-float">
          <span className="text-xs font-medium">Scroll</span>
          <ChevronDown className="h-4 w-4" />
        </div>
      </section>

      {/* ─── VEHICLES ────────────────────────────────────────────── */}
      <section id="vehicles" ref={vehiclesRef as React.RefObject<HTMLElement>}
        className="py-24 bg-gray-50/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className={cn(
            "text-center mb-16 transition-all duration-700",
            vehiclesInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-green-600 mb-3">Categories</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Vehicle Categories</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Comprehensive support for all types of vehicles in your fleet
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {vehicleCategories.map((vehicle, index) => (
              <div key={index} className={cn(
                "group p-6 rounded-2xl border border-gray-200 hover:border-green-300 bg-white transition-all duration-500 cursor-pointer",
                "hover:shadow-xl hover:shadow-green-900/8 hover:-translate-y-1",
                vehiclesInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
                style={{ transitionDelay: vehiclesInView ? `${index * 100}ms` : "0ms" }}>
                <div className={cn(
                  "h-14 w-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4",
                  "group-hover:scale-110 group-hover:rotate-3 transition-all duration-300",
                  vehicle.color
                )}>
                  <vehicle.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{vehicle.name}</h3>
                <p className="text-sm text-gray-500">{vehicle.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TELEMATICS DATA ─────────────────────────────────────── */}
      <section id="data" ref={dataRef as React.RefObject<HTMLElement>}
        className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className={cn(
            "text-center mb-16 transition-all duration-700",
            dataInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-green-600 mb-3">Telemetry</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Telematics Data</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Deep insights into every aspect of your vehicles
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {telematicsData.map((item, index) => (
              <div key={index} className={cn(
                "group p-6 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white transition-all duration-500 hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5",
                dataInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
                style={{ transitionDelay: dataInView ? `${index * 80}ms` : "0ms" }}>
                <div className="h-11 w-11 rounded-xl bg-white border border-gray-200 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-green-200 group-hover:shadow-sm transition-all duration-300">
                  <item.icon className={cn("h-5 w-5", item.color)} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1.5">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ────────────────────────────────────────────── */}
      <section id="features" ref={featuresRef as React.RefObject<HTMLElement>}
        className="py-24 bg-gray-50/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className={cn(
            "text-center mb-16 transition-all duration-700",
            featuresInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-green-600 mb-3">Features</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Key Features</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Everything you need to manage your fleet efficiently
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div key={index} className={cn(
                "flex items-start gap-5 p-6 rounded-2xl border border-gray-200 bg-white hover:border-green-200 hover:shadow-lg hover:shadow-green-900/5 transition-all duration-300 group",
                featuresInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
                style={{ transitionDelay: featuresInView ? `${index * 120}ms` : "0ms" }}>
                <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 border border-green-100 group-hover:border-green-200 group-hover:bg-green-100 transition-colors">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1.5">{feature.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────── */}
      <section id="cta" ref={ctaRef as React.RefObject<HTMLElement>}
        className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-emerald-600 to-green-700">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 -left-20 w-80 h-80 bg-white rounded-full blur-3xl" />
            <div className="absolute -bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
          </div>
        </div>

        <div className={cn(
          "relative max-w-4xl mx-auto px-6 text-center transition-all duration-700",
          ctaInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Transform Your Fleet?</h2>
          <p className="text-lg text-green-100/90 mb-10 max-w-2xl mx-auto">
            Get real-time insights, optimize operations, and reduce costs with TractorTrack
          </p>
          <Button onClick={() => openModal("register")} size="lg"
            className="h-13 px-10 bg-white hover:bg-gray-50 text-green-700 font-bold rounded-xl shadow-xl shadow-green-900/20 hover:shadow-2xl hover:shadow-green-900/30 transition-all text-base gap-2 group">
            Get Started Free
            <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────── */}
      <footer className="py-8 bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-8 w-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Truck className="h-5 w-5 text-white" />
              </div>
              <span className="text-base font-bold text-white">TractorTrack</span>
            </Link>
            <p className="text-gray-500 text-sm">
              &copy; 2026 TractorTrack. Vehicle Telematics Platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}