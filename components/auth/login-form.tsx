"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { signIn } from "@/lib/actions"

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
          Signing in...
        </>
      ) : (
        "Sign In"
      )}
    </Button>
  )
}

interface LoginFormProps {
  onSuccess?: () => void
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [state, formAction] = useActionState(signIn, null)

  // Handle successful login
  useEffect(() => {
    if (state?.success) {
      toast({
        title: "Login Successful!",
        description: state.success,
        duration: 3000,
      })
      
      // Force refresh the auth state
      supabase.auth.refreshSession().then(() => {
        console.log("Session refreshed after login")
      })
      
      // Call onSuccess to close the modal
      onSuccess?.()
    }
  }, [state, toast, onSuccess])

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-white">Welcome back</h1>
        <p className="text-lg text-gray-400">Sign in to your account</p>
      </div>

      <form action={formAction} className="space-y-6">
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
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className="bg-slate-800 border-slate-700 text-white placeholder:text-gray-500 focus:border-amber-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="bg-slate-800 border-slate-700 text-white focus:border-amber-500"
            />
          </div>
        </div>

        <SubmitButton />
      </form>
    </div>
  )
}
