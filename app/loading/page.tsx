"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChefHat } from "lucide-react"

export default function LoadingPage() {
  const router = useRouter()

  useEffect(() => {
    // Simulate AI processing time (3-5 seconds)
    const timer = setTimeout(() => {
      router.push("/results")
    }, 4000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md mx-auto">
        {/* Animated Logo */}
        <div className="mb-8 animate-bounce-gentle">
          <div className="bg-primary/10 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
            <ChefHat className="h-12 w-12 text-primary animate-pulse" />
          </div>
        </div>

        {/* Loading Spinner */}
        <div className="mb-8">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-muted rounded-full mx-auto"></div>
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
        </div>

        {/* Loading Messages */}
        <div className="space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground animate-fade-in">
            Whipping up some delicious ideas for you...
          </h1>
          <p className="text-muted-foreground text-lg animate-fade-in-delay-1">
            Our AI chef is analyzing your ingredients and crafting the perfect recipes!
          </p>

          {/* Progress Dots */}
          <div className="flex justify-center space-x-2 mt-6 animate-fade-in-delay-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
          </div>
        </div>

        {/* Fun Loading Text Animation */}
        <div className="mt-8 text-sm text-muted-foreground animate-fade-in-delay-2">
          <p className="animate-pulse">Mixing flavors... Adding spices... Almost ready!</p>
        </div>
      </div>
    </div>
  )
}
