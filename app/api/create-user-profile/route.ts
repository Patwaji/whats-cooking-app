
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

// This API route uses the Supabase service role to insert user_profiles, bypassing RLS for profile creation
export async function POST(req: NextRequest) {
  const { id, full_name, email } = await req.json()
  if (!id || !full_name || !email) {
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
  }

  // Use service role for RLS bypass
  // Use the Supabase service role key from env
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const { error } = await supabase.from("user_profiles").insert({ id, full_name, email })
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || err.toString() }, { status: 500 })
  }
}
