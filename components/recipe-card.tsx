"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, Clock, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

interface Recipe {
  id: string
  name: string
  description: string
  difficulty: "Easy" | "Medium" | "Hard"
  prepTime: string
  image: string
  isSaved: boolean
}

interface RecipeCardProps {
  recipe: Recipe
  onSave: (recipeId: string) => void // Updated to pass recipe ID as string
  onView?: () => void
}

export function RecipeCard({ recipe, onSave, onView }: RecipeCardProps) {
  const router = useRouter()

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "Medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case "Hard":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }


  const isUUID = (id: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  }

  const [showTooltip, setShowTooltip] = useState(false)

  const handleViewRecipe = () => {
    if (onView) {
      onView()
    } else {
      router.push(`/recipe/${recipe.id}`)
    }
  }

  const handleSave = () => {
    if (!isUUID(recipe.id)) {
      setShowTooltip(true)
      setTimeout(() => setShowTooltip(false), 2000)
      return
    }
    onSave(recipe.id)
  }

  return (
    <Card className="group bg-card border-border rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
      <CardContent className="p-6">
        {/* Recipe Name */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-card-foreground line-clamp-2 group-hover:text-primary transition-colors flex-1">
            {recipe.name}
          </h3>
          <div className="relative">
            <button
              onClick={handleSave}
              disabled={!isUUID(recipe.id)}
              className={cn(
                "ml-3 p-2 rounded-full transition-all duration-200 hover:scale-110 flex-shrink-0",
                recipe.isSaved ? "text-red-500" : "text-muted-foreground hover:text-red-500",
                !isUUID(recipe.id) && "opacity-50 cursor-not-allowed"
              )}
              onMouseEnter={() => { if (!isUUID(recipe.id)) setShowTooltip(true) }}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <Heart className={cn("h-5 w-5", recipe.isSaved && "fill-current")} />
            </button>
            {showTooltip && !isUUID(recipe.id) && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-black text-white text-xs rounded shadow z-10 whitespace-nowrap">
                Saving is only available for recipes with a real ID.
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3 leading-relaxed">{recipe.description}</p>

        {/* Difficulty and Time Indicators */}
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className={cn("text-xs font-medium", getDifficultyColor(recipe.difficulty))}>
            {recipe.difficulty}
          </Badge>

          <div className="flex items-center space-x-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">{recipe.prepTime}</span>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleViewRecipe}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all duration-200 hover:shadow-md"
        >
          <Eye className="h-4 w-4 mr-2" />
          View Recipe
        </Button>
      </CardContent>
    </Card>
  )
}
