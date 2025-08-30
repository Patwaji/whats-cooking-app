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
    console.log("[OTP] Verifying OTP for email:", email.toString(), "OTP:", otp.toString())
    
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    
    // Verify OTP
    const { data: isValid, error: verifyError } = await supabase.rpc("verify_otp", {
      user_email: email.toString(),
      provided_otp: otp.toString(),
    })

    console.log("[OTP] OTP verification result:", { isValid, verifyError })

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
      return { error: "Signup session expired. Please try signing in if you already have an account." }
    }

    const userData = JSON.parse(pendingSignup.value)

    // First check if user already exists
    const { data: existingUser } = await supabase.auth.getUser()
    if (existingUser.user) {
      console.log("[SIGNUP] User already signed in:", existingUser.user.email)
      cookieStore.delete("pending_signup")
      redirect("/")
      return
    }

    // Check if user already exists in auth but not signed in
    const { data: signInAttempt, error: signInAttemptError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: userData.password,
    })

    if (signInAttempt.user) {
      console.log("[SIGNUP] User already exists, signing in:", signInAttempt.user.email)
      
      // Make sure profile exists
      try {
        const res = await fetch(`${siteUrl}/api/create-user-profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: signInAttempt.user.id,
            full_name: userData.fullName,
            email: userData.email,
          })
        })
        const result = await res.json()
        console.log("[SIGNUP] Profile creation result:", result)
      } catch (profileError) {
        console.error("[SIGNUP] Profile creation error:", profileError)
      }

      cookieStore.delete("pending_signup")
      redirect("/")
      return
    }

    // Create user account with email confirmation disabled (since we handle OTP ourselves)
    console.log("[SIGNUP] Creating new user account...")
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${siteUrl}/auth/callback`,
        data: {
          full_name: userData.fullName,
        },
      },
    })

    if (authError) {
      console.error("[SIGNUP] Supabase signup error:", authError)
      // If user already exists, try to sign them in
      if (authError.message.includes("already registered") || authError.message.includes("already exists")) {
        console.log("[SIGNUP] User exists, attempting sign in...")
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: userData.email,
          password: userData.password,
        })
        
        if (signInData.user) {
          console.log("[SIGNUP] Successfully signed in existing user")
          cookieStore.delete("pending_signup")
          redirect("/")
          return
        }
        
        return { error: "User already exists. Please sign in instead." }
      }
      return { error: authError.message }
    }

    console.log("[SIGNUP] User created in Supabase:", authData.user?.id, authData.user?.email)


    if (authData.user) {
      // Always create user_profiles row using a secure RPC (service role)
      try {
        console.log("[SIGNUP] Creating user profile...")
        const res = await fetch(`${siteUrl}/api/create-user-profile`, {
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
          console.error("[SIGNUP] Profile creation error:", result.error)
        } else {
          console.log("[SIGNUP] User profile created successfully:", result)
        }
      } catch (profileError) {
        console.error("[SIGNUP] Profile creation error:", profileError)
        // Don't fail the whole process if profile creation fails
      }

      // Send welcome email (don't fail if this fails)
      try {
        console.log("[SIGNUP] Sending welcome email...")
        await sendWelcomeEmail(userData.email, userData.fullName)
        console.log("[SIGNUP] Welcome email sent successfully")
      } catch (emailError) {
        console.error("[SIGNUP] Failed to send welcome email:", emailError)
        // Don't fail the signup process if email fails
      }

      // Now automatically sign in the user
      console.log("[SIGNUP] Auto-signing in the user...")
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password,
      })

      if (signInError) {
        console.error("[SIGNUP] Auto sign-in error:", signInError)
        // Still return success since account was created
        cookieStore.delete("pending_signup")
        return { success: "Account created successfully! Please sign in to continue." }
      }

      console.log("[SIGNUP] User automatically signed in:", signInData.user?.email)

      // Clear pending signup data and redirect
      cookieStore.delete("pending_signup")
      redirect("/")
      
    } else {
      console.error("[SIGNUP] No user data returned from Supabase signup")
      cookieStore.delete("pending_signup")
      return { error: "Account creation failed. Please try again." }
    }
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
