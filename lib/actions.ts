"use server"

import { createClient } from "@/lib/supabase/server"
import { sendOTPEmail, sendWelcomeEmail } from "@/lib/email"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

// Sign up with OTP verification
export async function signUp(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const fullName = formData.get("fullName")
  const email = formData.get("email")
  const password = formData.get("password")

  if (!fullName || !email || !password) {
    return { error: "All fields are required" }
  }

  const supabase = createClient()

  try {
    console.log("[SIGNUP] Starting signup process for email:", email.toString())
    
    // First, generate OTP
    console.log("[SIGNUP] Generating OTP...")
    const { data: otpData, error: otpError } = await supabase.rpc("generate_otp", { user_email: email.toString() })

    if (otpError) {
      console.error("[SIGNUP] Failed to generate OTP:", otpError)
      return { error: "Failed to generate verification code. Please check your database setup." }
    }

    console.log("[SIGNUP] OTP generated successfully")

    // Send OTP email and store pending signup in parallel for speed
    const cookieStore = await cookies()
    console.log("[SIGNUP] Sending OTP email...")
    
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    console.log("[SIGNUP] Using site URL:", siteUrl)
    
    const [emailRes] = await Promise.all([
      fetch(`${siteUrl}/api/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_email: email.toString(), otp_code: otpData })
      }),
      cookieStore.set(
        "pending_signup",
        JSON.stringify({
          fullName: fullName.toString(),
          email: email.toString(),
          password: password.toString(),
        }),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 600, // 10 minutes
        },
      )
    ])
    
    console.log("[SIGNUP] Email response status:", emailRes.status)
    const emailResult = await emailRes.json()
    console.log("[SIGNUP] Email result:", emailResult)
    
    if (!emailResult.success) {
      console.error("[SIGNUP] Failed to send OTP email:", emailResult.error)
      return { error: "Failed to send verification email. Please check your email configuration." }
    }

    console.log("[SIGNUP] OTP sent successfully to:", email.toString())

    return {
      success: "Verification code sent to your email. Please check your inbox and spam folder.",
      requiresOTP: true,
      email: email.toString(),
    }
  } catch (error) {
    console.error("[SIGNUP] Signup error:", error)
    console.error("[SIGNUP] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return { error: `Signup failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

// Verify OTP and complete signup
export async function verifyOTPAndSignUp(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const otp = formData.get("otp")

  if (!email || !otp) {
    return { error: "Email and OTP are required" }
  }

  const supabase = createClient()
  const cookieStore = await cookies()

  try {
    console.log("Verifying OTP for email:", email.toString(), "OTP:", otp.toString())
    
    // Verify OTP
    const { data: isValid, error: verifyError } = await supabase.rpc("verify_otp", {
      user_email: email.toString(),
      provided_otp: otp.toString(),
    })

    console.log("OTP verification result:", { isValid, verifyError })

    if (verifyError) {
      console.error("OTP verification database error:", verifyError)
      return { error: "Database error during OTP verification. Please check if the database functions are set up correctly." }
    }
    
    if (!isValid) {
      return { error: "Invalid or expired OTP. Please check your email for the correct code." }
    }
    
    console.log("OTP verification successful")

    // Get pending signup data
  const pendingSignup = cookieStore.get("pending_signup")
    if (!pendingSignup) {
      return { error: "Signup session expired. Please try again." }
    }

    const userData = JSON.parse(pendingSignup.value)

    // Create user account with email confirmation disabled (since we handle OTP ourselves)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
        data: {
          full_name: userData.fullName,
        },
      },
    })

    if (authError) {
      console.error("Supabase signup error:", authError)
      return { error: authError.message }
    }

    console.log("User created in Supabase:", authData.user?.id, authData.user?.email)


    if (authData.user) {
      // Always create user_profiles row using a secure RPC (service role)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/create-user-profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: authData.user.id,
            full_name: userData.fullName,
            email: userData.email,
          })
        })
        const result = await res.json()
        if (!result.success) {
          console.error("Profile creation error (RPC):", result.error)
        } else {
          console.log("User profile created via RPC:", result)
        }
      } catch (profileError) {
        console.error("Profile creation error (RPC):", profileError)
      }

      // Send welcome email
      try {
        await sendWelcomeEmail(userData.email, userData.fullName)
        console.log("Welcome email sent successfully")
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError)
        // Don't fail the signup process if email fails
      }
    } else {
      console.error("No user data returned from Supabase signup")
    }

    // Clear pending signup data
    cookieStore.delete("pending_signup")

    return { success: "Account created successfully! Please log in to continue." }
  } catch (error) {
    console.error("OTP verification error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Sign in
export async function signIn(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const supabase = createClient()

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toString(),
      password: password.toString(),
    })

    if (error) {
      return { error: error.message }
    }

    console.log("User signed in successfully:", data.user?.email)
    
    return { success: "Welcome back! You have been signed in successfully." }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Sign out
export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect("/")
}
