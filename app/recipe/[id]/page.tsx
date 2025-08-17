"use client"


import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Heart, Clock, ChefHat, Globe, Flame } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import AuthModal from "@/components/auth/auth-modal"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface Recipe {
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
  nutrition_info?: any
  tags?: string[]
  image_url?: string
  notes?: string
}


export default function RecipeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingSave, setPendingSave] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    checkAuth()

    const isUUID = (id: string) => {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    }

    const loadRecipe = async () => {
      try {
        const recipeId = params.id as string

        // First try to get from session storage (recently generated recipes)
        const generatedRecipes = JSON.parse(sessionStorage.getItem("generatedRecipes") || "[]")
        let recipeData = generatedRecipes.find((r: Recipe) => r.id === recipeId)

        // If not found in session, try to fetch from database
        if (!recipeData) {
          const { data, error } = await supabase.from("recipes").select("*").eq("id", recipeId).single()

          if (data && !error) {
            recipeData = data
          }
        }

        if (recipeData) {
          setRecipe(recipeData)

          // Only check if saved if recipeId is a valid UUID
          if (user && isUUID(recipeId)) {
            const { data: savedRecipe } = await supabase
              .from("user_saved_recipes")
              .select("id")
              .eq("user_id", user.id)
              .eq("recipe_id", recipeId)
              .single()

            setIsSaved(!!savedRecipe)
          } else {
            setIsSaved(false)
          }
        }
      } catch (error) {
        console.error("Error loading recipe:", error)
      } finally {
        setLoading(false)
      }
    }

    loadRecipe()
  }, [params.id, user])

  const handleSaveRecipe = async () => {
    if (!user) {
      setPendingSave(true)
      setShowAuthModal(true)
      return
    }

    try {
      const recipeId = params.id as string

      if (isSaved) {
        // Remove from saved
        const { error } = await supabase
          .from("user_saved_recipes")
          .delete()
          .eq("user_id", user.id)
          .eq("recipe_id", recipeId)

        if (!error) {
          setIsSaved(false)
        }
      } else {
        // Add to saved
        const { error } = await supabase.from("user_saved_recipes").insert({
          user_id: user.id,
          recipe_id: recipeId,
        })

        if (!error) {
          setIsSaved(true)
        }
      }
    } catch (error) {
      console.error("Error saving recipe:", error)
    }
  }

  const handleAuthSuccess = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)
    setShowAuthModal(false)

    // If user was trying to save a recipe, save it now
    if (pendingSave) {
      setPendingSave(false)
      // Wait a moment for state to update, then save
      setTimeout(() => {
        handleSaveRecipe()
      }, 100)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsSaved(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading recipe...</p>
        </div>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Recipe Not Found</h1>
          <Button onClick={() => router.push("/results")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Results
          </Button>
        </div>
      </div>
    )
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "hard":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getSpiceLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "mild":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "hot":
      case "spicy":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                  onClick={() => {
                    const from = searchParams.get("from")
                    router.push(from === "saved" ? "/saved-recipes" : "/results")
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-slate-300 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {searchParams.get("from") === "saved" ? "Back to Saved Recipes" : "Back to Results"}
                </Button>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-white">What's Cooking? 🍳</span>
            </div>

            <div className="flex items-center space-x-2">
              {user ? (
                <Button onClick={handleLogout} variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                  Logout
                </Button>
              ) : (
                <Button
                  onClick={() => setShowAuthModal(true)}
                  variant="ghost"
                  size="sm"
                  className="text-slate-300 hover:text-white"
                >
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-slate-800/50 border-slate-700 overflow-hidden shadow-xl rounded-3xl">
          <CardContent className="p-0">

            <div className="p-6 sm:p-8">
              {/* Recipe Header */}
              <div className="mb-6">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">{recipe.name}</h1>
                <p className="text-lg text-gray-300 leading-relaxed mb-6">{recipe.description}</p>

                {/* Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <ChefHat className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Difficulty</p>
                      <Badge className={getDifficultyColor(recipe.difficulty)}>{recipe.difficulty}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Cook Time</p>
                      <p className="text-white font-medium">{recipe.cooking_time} min</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Globe className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Cuisine</p>
                      <p className="text-white font-medium">{recipe.cuisine_type}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Flame className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Spice Level</p>
                      <Badge className={getSpiceLevelColor(recipe.spice_level)}>{recipe.spice_level}</Badge>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleSaveRecipe}
                    variant={isSaved ? "default" : "outline"}
                    className={
                      isSaved
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "border-slate-600 text-slate-300 hover:bg-slate-700"
                    }
                  >
                    <Heart className={`w-4 h-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
                    {isSaved ? "Saved" : "Save Recipe"}
                  </Button>
                </div>
              </div>

              {/* Ingredients Section */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                    1
                  </span>
                  Ingredients
                  {recipe.servings && (
                    <span className="ml-2 text-sm text-slate-400 font-normal">(Serves {recipe.servings})</span>
                  )}
                </h2>
                <div className="bg-slate-700/30 rounded-lg p-6">
                  <ul className="space-y-3">
                    {recipe.ingredients?.map((ingredient: any, index: number) => (
                      <li key={index} className="flex items-start space-x-3">
                        <span className="w-2 h-2 bg-amber-400 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-slate-200 leading-relaxed">
                          {typeof ingredient === "string"
                            ? ingredient
                            : `${ingredient.amount || ""} ${ingredient.unit || ""} ${ingredient.name || ""}`.trim()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Instructions Section */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                    2
                  </span>
                  Instructions
                </h2>
                <div className="space-y-4">
                  {recipe.instructions?.map((instruction: any, index: number) => (
                    <div key={index} className="flex space-x-4">
                      <span className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-amber-400 font-bold text-sm flex-shrink-0 mt-1">
                        {index + 1}
                      </span>
                      <div className="pt-1">
                        <p className="text-slate-200 leading-relaxed">
                          {typeof instruction === "string" ? instruction : instruction.instruction || instruction}
                        </p>
                        {typeof instruction === "object" && instruction.time && (
                          <p className="text-amber-400 text-sm mt-1">⏱️ {instruction.time} minutes</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes Section */}
              {recipe.notes && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-amber-400 mb-2 flex items-center">💡 Chef's Tips</h3>
                  <p className="text-slate-200 leading-relaxed">{recipe.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800/50 border-t border-slate-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-slate-400">
            <p>&copy; 2025 What's Cooking? All rights reserved.</p>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false)
          setPendingSave(false)
        }}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  )
}
