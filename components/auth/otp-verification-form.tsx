"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, ArrowLeft } from "lucide-react"
import { verifyOTPAndSignUp } from "@/lib/actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-amber-600 hover:bg-amber-700 text-white py-6 text-lg font-medium rounded-lg h-[60px]"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Verifying...
        </>
      ) : (
        "Verify & Create Account"
      )}
    </Button>
  )
}

interface OTPVerificationFormProps {
  email: string
  demoOtpCode?: string
  onSuccess?: () => void
  onBack?: () => void
}

export default function OTPVerificationForm({ email, demoOtpCode, onSuccess, onBack }: OTPVerificationFormProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [state, formAction] = useActionState(verifyOTPAndSignUp, null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Auto-fill demo OTP code if provided
  useEffect(() => {
    if (demoOtpCode && demoOtpCode.length === 6) {
      const otpArray = demoOtpCode.split("")
      setOtp(otpArray)
    }
  }, [demoOtpCode])

  // Handle successful verification
  useEffect(() => {
    if (state?.success && onSuccess) {
      onSuccess()
    }
  }, [state, onSuccess])

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return // Prevent multiple characters

    const newOtp = [...otp]
    newOtp[index] = value

    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").slice(0, 6)
    if (/^\d+$/.test(pastedData)) {
      const otpArray = pastedData.split("").concat(Array(6 - pastedData.length).fill(""))
      setOtp(otpArray.slice(0, 6))
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-white">Verify Your Email</h1>
        <p className="text-lg text-gray-400">We've sent a 6-digit code to</p>
        <p className="text-amber-400 font-medium">{email}</p>
        {demoOtpCode && (
          <div className="bg-blue-500/10 border border-blue-500/50 text-blue-400 px-4 py-3 rounded mt-4">
            <p className="text-sm">
              Demo Mode: Your OTP code is <strong>{demoOtpCode}</strong>
            </p>
          </div>
        )}
      </div>

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="otp" value={otp.join("")} />

        {state?.error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded">{state.error}</div>
        )}

        {state?.success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded">
            {state.success}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300 text-center">Enter verification code</label>
            <div className="flex justify-center space-x-2">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-12 text-center text-xl font-bold bg-slate-800 border-slate-700 text-white focus:border-amber-500"
                />
              ))}
            </div>
          </div>
        </div>

        <SubmitButton />

        <div className="flex justify-center">
          <Button type="button" variant="ghost" onClick={onBack} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sign Up
          </Button>
        </div>
      </form>

      <div className="text-center text-sm text-gray-400">
        <p>Didn't receive the code?</p>
        <Button
          variant="link"
          className="text-amber-400 hover:text-amber-300 p-0"
          onClick={() => {
            // In a real app, this would resend the OTP
            console.log("Resending OTP...")
          }}
        >
          Resend code
        </Button>
      </div>
    </div>
  )
}
