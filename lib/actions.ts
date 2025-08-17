"use server"

import { createClient } from "@/lib/supabase/server"
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
    // First, generate OTP
    const { data: otpData, error: otpError } = await supabase.rpc("generate_otp", { user_email: email.toString() })

    if (otpError) {
      return { error: "Failed to generate OTP" }
    }

    // Store user data temporarily in session for OTP verification
    const cookieStore = cookies()
    cookieStore.set(
      "pending_signup",
      JSON.stringify({
        fullName: fullName.toString(),
        email: email.toString(),
        password: password.toString(),
      }),
      {
        httpOnly: true,
        secure: true,
        maxAge: 600, // 10 minutes
      },
    )

    // In a real app, you would send the OTP via email here
    // For demo purposes, we'll return it in the response
    console.log("OTP Code:", otpData)

    return {
      success: "OTP sent to your email. Please check and verify.",
      requiresOTP: true,
      email: email.toString(),
      // Remove this in production - only for demo
      otpCode: otpData,
    }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "An unexpected error occurred. Please try again." }
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
  const cookieStore = cookies()

  try {
    // Verify OTP
    const { data: isValid, error: verifyError } = await supabase.rpc("verify_otp", {
      user_email: email.toString(),
      provided_otp: otp.toString(),
    })

    if (verifyError || !isValid) {
      return { error: "Invalid or expired OTP" }
    }

    // Get pending signup data
    const pendingSignup = cookieStore.get("pending_signup")
    if (!pendingSignup) {
      return { error: "Signup session expired. Please try again." }
    }

    const userData = JSON.parse(pendingSignup.value)

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
      },
    })

    if (authError) {
      return { error: authError.message }
    }

    // Create user profile
    if (authData.user) {
      const { error: profileError } = await supabase.from("user_profiles").insert({
        id: authData.user.id,
        full_name: userData.fullName,
        email: userData.email,
      })

      if (profileError) {
        console.error("Profile creation error:", profileError)
      }
    }

    // Clear pending signup data
    cookieStore.delete("pending_signup")

    return { success: "Account created successfully! You can now sign in." }
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
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toString(),
      password: password.toString(),
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Sign out
export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
