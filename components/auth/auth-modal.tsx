"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import LoginForm from "./login-form"
import SignUpForm from "./signup-form"
import OTPVerificationForm from "./otp-verification-form"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onAuthSuccess?: () => void // Added onAuthSuccess prop
  defaultTab?: "login" | "signup"
}

const AuthModal = ({ isOpen, onClose, onAuthSuccess, defaultTab = "login" }: AuthModalProps) => {
  const [activeTab, setActiveTab] = useState<"login" | "signup" | "otp">(defaultTab)
  // Only reset tab when modal is opened, not on every close
  useEffect(() => {
    if (isOpen) setActiveTab(defaultTab)
  }, [isOpen, defaultTab])
  const [otpEmail, setOTPEmail] = useState("")
  const handleOTPRequired = (email: string) => {
    setOTPEmail(email)
    setActiveTab("otp")
  }

  const handleOTPSuccess = () => {
    setActiveTab("login")
    setOTPEmail("")
    if (onAuthSuccess) {
      onAuthSuccess()
    }
    // Modal will close and parent will refresh session
  }

  const handleLoginSuccess = () => {
    if (onAuthSuccess) {
      onAuthSuccess()
    }
    handleClose()
  }

  const handleClose = () => {
    setActiveTab(defaultTab)
    setOTPEmail("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white text-center">
            {activeTab === "login" && "Sign In"}
            {activeTab === "signup" && "Create Account"}
            {activeTab === "otp" && "Verify Your Email"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6">
          {activeTab === "login" && (
            <>
              <LoginForm onSuccess={handleLoginSuccess} />
              <div className="text-center text-gray-400">
                Don't have an account?{" "}
                <Button
                  variant="link"
                  className="text-amber-400 hover:text-amber-300 p-0"
                  onClick={() => setActiveTab("signup")}
                >
                  Sign up
                </Button>
              </div>
            </>
          )}

          {activeTab === "signup" && (
            <>
              <SignUpForm onOTPRequired={handleOTPRequired} />
              <div className="text-center text-gray-400">
                Already have an account?{" "}
                <Button
                  variant="link"
                  className="text-amber-400 hover:text-amber-300 p-0"
                  onClick={() => setActiveTab("login")}
                >
                  Sign in
                </Button>
              </div>
            </>
          )}

          {activeTab === "otp" && (
            <OTPVerificationForm
              email={otpEmail}
              onSuccess={handleOTPSuccess}
              onBack={() => setActiveTab("signup")}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AuthModal
