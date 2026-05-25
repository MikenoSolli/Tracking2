"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, CheckCircle2, AlertTriangle, Mail, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

function VerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""

  const [digits, setDigits] = useState(["", "", "", "", "", ""])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [verified, setVerified] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const handleDigit = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newDigits = [...digits]
    newDigits[index] = value.slice(-1)
    setDigits(newDigits)
    setError(null)

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    const newDigits = [...digits]
    text.split("").forEach((d, i) => { if (i < 6) newDigits[i] = d })
    setDigits(newDigits)
  }

  const handleVerify = async () => {
    const code = digits.join("")
    if (code.length !== 6) {
      setError("Please enter all 6 digits")
      return
    }
    if (!email) {
      setError("No email found. Please register again.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || "Verification failed")
        return
      }

      if (json.message === "already-verified") {
        setMessage("Your account is already verified!")
      } else {
        setMessage("Email verified successfully!")
      }
      setVerified(true)

      setTimeout(() => router.push("/login"), 2500)
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || !email) return
    setResending(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/verify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Failed to resend")
        return
      }
      setMessage("New code sent! Check your email.")
      setCooldown(60)
    } catch {
      setError("Failed to resend code")
    } finally {
      setResending(false)
    }
  }

  if (!email) {
    return (
      <Card className="w-full max-w-md shadow-xl rounded-2xl">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <CardTitle className="text-xl mb-2">Missing Email</CardTitle>
          <p className="text-sm text-muted-foreground mb-6">
            No email address was provided. Please register first.
          </p>
          <Link href="/">
            <Button className="bg-green-800 hover:bg-green-900 cursor-pointer">Go to Register</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md shadow-xl rounded-2xl">
      <CardHeader className="space-y-1">
        <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
          {verified ? (
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          ) : (
            <Mail className="h-6 w-6 text-green-600" />
          )}
        </div>
        <CardTitle className="text-2xl font-semibold text-center">
          {verified ? "Verified!" : "Verify Your Email"}
        </CardTitle>
        <CardDescription className="text-center">
          {verified
            ? "Redirecting to login..."
            : `Enter the 6-digit code sent to ${email}`}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {verified ? (
          <div className="text-center py-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-3" />
            <p className="text-green-700 font-semibold">{message}</p>
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <Input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={cn(
                    "w-11 h-14 text-center text-xl font-bold border-2 rounded-xl transition-all",
                    error ? "border-red-400 focus-visible:ring-red-400" : "border-slate-200 focus-visible:ring-green-500",
                  )}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="text-sm">{message}</span>
              </div>
            )}

            <Button
              onClick={handleVerify}
              disabled={loading || digits.join("").length !== 6}
              className="w-full h-11 bg-green-800 hover:bg-green-900 text-white font-semibold transition-all cursor-pointer"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading ? "Verifying..." : "Verify Email"}
            </Button>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="text-sm text-green-700 hover:text-green-800 underline-offset-2 hover:underline transition-colors disabled:text-slate-400 disabled:no-underline cursor-pointer"
              >
                {resending
                  ? "Sending..."
                  : cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : "Didn't receive the code? Resend"}
              </button>
            </div>

            <div className="mt-6 text-center">
              <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to home
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Suspense fallback={
        <Card className="w-full max-w-md shadow-xl rounded-2xl">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto" />
          </CardContent>
        </Card>
      }>
        <VerifyForm />
      </Suspense>
    </div>
  )
}