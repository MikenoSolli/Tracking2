"use client";
import { useEffect } from "react";
import { Loader2, LogOut } from "lucide-react";
import handle_logout from "./action";

export default function LogoutPage() {
  useEffect(() => {
    handle_logout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-gray-50">
      <div className="text-center space-y-4">
        <div className="h-14 w-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
          <LogOut className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Signing out</h1>
          <p className="text-sm text-gray-500 mt-1">Please wait while we log you out...</p>
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-green-600 mx-auto" />
      </div>
    </div>
  );
}