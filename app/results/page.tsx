"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChefHat, Sparkles, ArrowLeft, RefreshCw } from "lucide-react"
import { RecipeCard } from "@/components/recipe-card"
import { AuthModal } from "@/components/auth/auth-modal"
import { supabase } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface Recipe {
  id: string
  name: string
  description: string
  difficulty: string
  cooking_time: number
  image_url: string
  cuisine_type: string
  spice_level: string
  servings: number
  ingredients: Array<{ name: string; amount: string; unit?: string }>
  instructions: Array<{ step: number; instruction: string; time?: number }>
  tags: string[]
  isSaved?: boolean
}

export default function ResultsPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [hasResults, setHasResults] = useState(true)
  const [formData, setFormData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingSaveRecipeId, setPendingSaveRecipeId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const loadGeneratedRecipes = async () => {
      try {
        const savedFormData = sessionStorage.getItem("recipeFormData")
        const generatedRecipes = sessionStorage.getItem("generatedRecipes")

        if (savedFormData) {
          setFormData(JSON.parse(savedFormData))
        }

        if (generatedRecipes) {
          const parsedRecipes = JSON.parse(generatedRecipes)
          console.log("[v0] Loaded generated recipes:", parsedRecipes.length)

          if (parsedRecipes.length === 0) {
            setHasResults(false)
            setRecipes([])
          } else {
            let recipesWithSaveStatus = parsedRecipes

            if (user) {
              const { data: savedRecipes } = await supabase
                .from("user_saved_recipes")
                .select("recipe_id")
                .eq("user_id", user.id)

              const savedRecipeIds = savedRecipes?.map((sr) => sr.recipe_id) || []

              recipesWithSaveStatus = parsedRecipes.map((recipe: Recipe) => ({
                ...recipe,
                isSaved: savedRecipeIds.includes(recipe.id),
              }))
            }

            setRecipes(recipesWithSaveStatus)
            setHasResults(true)
          }
        } else {
          console.log("[v0] No generated recipes found, redirecting to home")
          router.push("/")
          return
        }
      } catch (error) {
        console.error("[v0] Error loading recipes:", error)
        setHasResults(false)
        setRecipes([])
      } finally {
        setLoading(false)
      }
    }

    loadGeneratedRecipes()
  }, [user, router])

  const handleSaveRecipe = async (recipeId: number) => {
    const recipeIdStr = recipeId.toString()

    if (!user) {
      setPendingSaveRecipeId(recipeIdStr)
      setShowAuthModal(true)
      return
    }

    try {
      const recipe = recipes.find((r) => r.id === recipeIdStr)
      if (!recipe) return

      if (recipe.isSaved) {
        await supabase.from("user_saved_recipes").delete().eq("user_id", user.id).eq("recipe_id", recipeIdStr)
      } else {
        await supabase.from("user_saved_recipes").insert({
          user_id: user.id,
          recipe_id: recipeIdStr,
        })
      }

      setRecipes((prev) =>
        prev.map((recipe) => (recipe.id === recipeIdStr ? { ...recipe, isSaved: !recipe.isSaved } : recipe)),
      )
    } catch (error) {
      console.error("[v0] Error saving recipe:", error)
    }
  }

  const handleAuthSuccess = async () => {
    setShowAuthModal(false)

    if (pendingSaveRecipeId) {
      setTimeout(() => {
        handleSaveRecipe(Number.parseInt(pendingSaveRecipeId))
        setPendingSaveRecipeId(null)
      }, 500)
    }
  }

  const handleGenerateMore = () => {
    sessionStorage.removeItem("generatedRecipes")
    router.push("/")
  }

  const handleViewRecipe = (recipeId: string) => {
    router.push(`/recipe/${recipeId}`)
  }

  const handleBackToHome = () => {
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading your recipes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ChefHat className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">What's Cooking?</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={handleBackToHome} className="text-foreground hover:bg-muted">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            {user ? (
              <>
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
                >
                  Saved Recipes
                </Button>
                <Button variant="ghost" className="text-foreground hover:bg-muted">
                  Logout
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                className="text-foreground hover:bg-muted"
                onClick={() => router.push("/auth/login")}
              >
                Login / Signup
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          {hasResults ? (
            <>
              <div className="text-center mb-12 animate-fade-in">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                  <h2 className="text-4xl md:text-5xl font-bold text-foreground">Your Delicious Discoveries!</h2>
                </div>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Based on your ingredients, here are some amazing recipes our AI chef has prepared just for you.
                </p>
                {formData && (
                  <div className="mt-4 p-4 bg-muted rounded-lg max-w-2xl mx-auto">
                    <p className="text-sm text-muted-foreground">
                      <strong>Your ingredients:</strong> {formData.ingredients}
                      {formData.cuisineType && formData.cuisineType !== "any" && (
                        <span>
                          {" "}
                          • <strong>Cuisine:</strong> {formData.cuisineType}
                        </span>
                      )}
                      {formData.spiceLevel && formData.spiceLevel !== "any" && (
                        <span>
                          {" "}
                          • <strong>Spice:</strong> {formData.spiceLevel}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12 animate-fade-in-delay-1">
                {recipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={{
                      id: Number.parseInt(recipe.id),
                      name: recipe.name,
                      description: recipe.description,
                      difficulty: recipe.difficulty as "Easy" | "Medium" | "Hard",
                      prepTime: `${recipe.cooking_time} min`,
                      image: recipe.image_url,
                      isSaved: recipe.isSaved || false,
                    }}
                    onSave={handleSaveRecipe}
                    onView={() => handleViewRecipe(recipe.id)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16 animate-fade-in">
              <div className="mb-8">
                <ChefHat className="h-24 w-24 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Oops! No recipes found</h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                  We couldn't generate any recipes with your current ingredients. Try adjusting your ingredients or
                  preferences for better results!
                </p>
              </div>

              <div className="space-y-4">
                <Button onClick={handleBackToHome} size="lg" variant="outline" className="mr-4 bg-transparent">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Try Different Ingredients
                </Button>
                <Button
                  onClick={handleGenerateMore}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Generate New Ideas
                </Button>
              </div>
            </div>
          )}

          {hasResults && (
            <div className="text-center animate-fade-in-delay-2">
              <Button
                onClick={handleGenerateMore}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg font-semibold rounded-full transform hover:scale-105 transition-all duration-200"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Generate More Ideas
              </Button>
              <p className="text-muted-foreground mt-4 text-sm">
                Not quite what you're looking for? Let's try some different combinations!
              </p>
            </div>
          )}
        </div>
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false)
          setPendingSaveRecipeId(null)
        }}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  )
}
