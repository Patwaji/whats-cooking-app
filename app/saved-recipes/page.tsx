"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ChefHat, Clock, Users, Heart, ArrowLeft, BookOpen } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import RecipeCard from "@/components/recipe-card"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface SavedRecipe {
  id: string
  recipe_id: string
  saved_at: string
  recipe: {
    id: string
    name: string
    description: string
    cuisine_type: string
    spice_level: string
    cooking_time: number
    difficulty: string
    servings: number
    ingredients: any[]
    instructions: any[]
    nutrition_info: any
    tags: string[]
    image_url: string
  }
}

export default function SavedRecipesPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<{ full_name: string } | null>(null)
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndLoadRecipes = async () => {
      try {
        // Check authentication
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          router.push("/")
          return
        }

        setUser(session.user)

        // Fetch user profile
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .single()

        setUserProfile(profile)

        // Fetch saved recipes
        const { data: savedRecipesData, error } = await supabase
          .from("user_saved_recipes")
          .select(`
            id,
            recipe_id,
            saved_at,
            recipe:recipes(
              id,
              name,
              description,
              cuisine_type,
              spice_level,
              cooking_time,
              difficulty,
              servings,
              ingredients,
              instructions,
              nutrition_info,
              tags,
              image_url
            )
          `)
          .eq("user_id", session.user.id)
          .order("saved_at", { ascending: false })

        if (error) {
          console.error("Error fetching saved recipes:", error)
          toast({
            title: "Error",
            description: "Failed to load saved recipes. Please try again.",
            variant: "destructive"
          })
        } else {
          setSavedRecipes(savedRecipesData || [])
        }
      } catch (error) {
        console.error("Error:", error)
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndLoadRecipes()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        router.push("/")
      }
    })

    return () => subscription.unsubscribe()
  }, [router, toast])

  const handleUnsaveRecipe = async (savedRecipeId: string) => {
    try {
      const { error } = await supabase
        .from("user_saved_recipes")
        .delete()
        .eq("id", savedRecipeId)

      if (error) {
        throw error
      }

      setSavedRecipes(prev => prev.filter(saved => saved.id !== savedRecipeId))
      
      toast({
        title: "Recipe removed",
        description: "Recipe has been removed from your saved collection."
      })
    } catch (error) {
      console.error("Error unsaving recipe:", error)
      toast({
        title: "Error",
        description: "Failed to remove recipe. Please try again.",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading your saved recipes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className="text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <div className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">My Saved Recipes</h1>
            </div>
          </div>
          
          {userProfile && (
            <div className="flex items-center space-x-2 text-foreground">
              <Heart className="h-4 w-4" />
              <span className="text-sm">Welcome, {userProfile.full_name}!</span>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {savedRecipes.length > 0 ? (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Your Recipe Collection
              </h2>
              <p className="text-muted-foreground">
                You have {savedRecipes.length} saved recipe{savedRecipes.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {savedRecipes.map((savedRecipe) => (
                <div key={savedRecipe.id} className="relative">
                  <RecipeCard
                    recipe={savedRecipe.recipe}
                    onSave={() => handleUnsaveRecipe(savedRecipe.id)}
                    isSaved={true}
                  />
                  <div className="absolute top-2 right-2 bg-background/90 rounded-full p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnsaveRecipe(savedRecipe.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="h-24 w-24 text-muted-foreground mx-auto mb-6 opacity-50" />
            <h2 className="text-2xl font-bold text-foreground mb-4">
              No Saved Recipes Yet
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Start by generating some recipes and save your favorites! 
              Your culinary collection awaits.
            </p>
            <Button
              onClick={() => router.push("/")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3"
            >
              <ChefHat className="h-4 w-4 mr-2" />
              Generate Recipes
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
