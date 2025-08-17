"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChefHat, Sparkles, ArrowLeft, RefreshCw } from "lucide-react"
import { RecipeCard } from "@/components/recipe-card"
import AuthModal from "@/components/auth/auth-modal"
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
    const isUUID = (id: string) => {
      // Simple UUID v4 regex
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    }

    const loadGeneratedRecipes = async () => {
      try {
        const savedFormData = sessionStorage.getItem("recipeFormData")
        const generatedRecipes = sessionStorage.getItem("generatedRecipes")

        if (savedFormData) {
          setFormData(JSON.parse(savedFormData))
        }

        if (!generatedRecipes || JSON.parse(generatedRecipes).length === 0) {
          setHasResults(false)
          setRecipes([])
          setTimeout(() => router.push("/"), 1500)
          return
        }

        const parsedRecipes = JSON.parse(generatedRecipes)
        let recipesWithSaveStatus = parsedRecipes

        if (user) {
          // Only check Supabase for recipes with valid UUID ids
          const uuidRecipeIds = parsedRecipes.filter((r: Recipe) => isUUID(r.id)).map((r: Recipe) => r.id)
          let savedRecipeIds: string[] = []
          if (uuidRecipeIds.length > 0) {
            const { data: savedRecipes } = await supabase
              .from("user_saved_recipes")
              .select("recipe_id")
              .eq("user_id", user.id)
              .in("recipe_id", uuidRecipeIds)
            savedRecipeIds = savedRecipes?.map((sr) => sr.recipe_id) || []
          }
          recipesWithSaveStatus = parsedRecipes.map((recipe: Recipe) => ({
            ...recipe,
            isSaved: isUUID(recipe.id) ? savedRecipeIds.includes(recipe.id) : false,
          }))
        }

        setRecipes(recipesWithSaveStatus)
        setHasResults(true)
      } catch (error) {
        console.error("[v0] Error loading recipes:", error)
        setHasResults(false)
        setRecipes([])
        setTimeout(() => router.push("/"), 1500)
      } finally {
        setLoading(false)
      }
    }

    loadGeneratedRecipes()
  }, [user, router])

  const handleSaveRecipe = async (recipeId: string) => {
    if (!user) {
      setPendingSaveRecipeId(recipeId)
      setShowAuthModal(true)
      return
    }

    try {
      const recipe = recipes.find((r) => r.id === recipeId)
      if (!recipe) return

      if (recipe.isSaved) {
        await supabase.from("user_saved_recipes").delete().eq("user_id", user.id).eq("recipe_id", recipeId)
      } else {
        await supabase.from("user_saved_recipes").insert({
          user_id: user.id,
          recipe_id: recipeId,
        })
      }

      setRecipes((prev) =>
        prev.map((recipe) => (recipe.id === recipeId ? { ...recipe, isSaved: !recipe.isSaved } : recipe)),
      )
    } catch (error) {
      console.error("[v0] Error saving recipe:", error)
    }
  }


  const handleAuthSuccess = async () => {
    setShowAuthModal(false)

    // Always refresh session/user state after auth
    const {
      data: { session },
    } = await supabase.auth.getSession()
    setUser(session?.user ?? null)

    // Wait for user state to be set before saving
    if (pendingSaveRecipeId) {
      // Wait until user is set (max 1s)
      let tries = 0;
      while (!session?.user && tries < 10) {
        await new Promise((res) => setTimeout(res, 100));
        const {
          data: { session: newSession },
        } = await supabase.auth.getSession();
        setUser(newSession?.user ?? null);
        if (newSession?.user) break;
        tries++;
      }
      if (session?.user || tries > 0) {
        handleSaveRecipe(pendingSaveRecipeId);
        setPendingSaveRecipeId(null);
      }
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push("/")
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
        <div className="text-center animate-fade-in">
          <ChefHat className="h-16 w-16 text-primary mx-auto mb-6 animate-bounce" />
          <p className="text-lg text-primary font-semibold mb-2">Loading your recipes...</p>
          <p className="text-muted-foreground">Please wait while we prepare your delicious results.</p>
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
                  onClick={() => router.push("/saved-recipes")}
                >
                  Saved Recipes
                </Button>
                <Button variant="ghost" className="text-foreground hover:bg-muted" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                className="text-foreground hover:bg-muted"
                onClick={() => setShowAuthModal(true)}
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
                      id: recipe.id,
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

      {user === null && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false)
            setPendingSaveRecipeId(null)
            // Always refresh session/user state after modal closes
            const getUser = async () => {
              const {
                data: { session },
              } = await supabase.auth.getSession()
              setUser(session?.user ?? null)
            }
            getUser()
          }}
          onAuthSuccess={handleAuthSuccess}
        />
      )}
    </div>
  )
}
