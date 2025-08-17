import { type NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { groq } from "@ai-sdk/groq"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"

// Schema for recipe generation
const RecipeSchema = z.object({
  recipes: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      cuisine_type: z.string(),
      spice_level: z.string(),
      difficulty: z.enum(["Easy", "Medium", "Hard"]),
      servings: z.number(),
      cooking_time: z.number(),
      ingredients: z.array(
        z.object({
          name: z.string(),
          amount: z.string(),
          unit: z.string().optional(),
        }),
      ),
      instructions: z.array(
        z.object({
          step: z.number(),
          instruction: z.string(),
          time: z.number().optional(),
        }),
      ),
      nutrition_info: z
        .object({
          calories: z.number().optional(),
          protein: z.string().optional(),
          carbs: z.string().optional(),
          fat: z.string().optional(),
        })
        .optional(),
      tags: z.array(z.string()),
    }),
  ),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ingredients, cuisineType, spiceLevel, dietaryRestrictions, cookingTime, sessionId } = body

    // Validate required fields
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: "Ingredients are required" }, { status: 400 })
    }

    const prompt = `Generate 6 diverse and creative recipes using the following criteria:

Available Ingredients: ${ingredients.join(", ")}
Cuisine Type: ${cuisineType || "Any"}
Spice Level: ${spiceLevel || "Medium"}
Dietary Restrictions: ${dietaryRestrictions?.length ? dietaryRestrictions.join(", ") : "None"}
Maximum Cooking Time: ${cookingTime || 60} minutes

Requirements:
- Each recipe should primarily use the provided ingredients
- Include realistic cooking times and serving sizes
- Provide VERY DETAILED step-by-step instructions (minimum 6-12 steps per recipe)
- Each instruction should be specific, clear, and actionable
- Include preparation techniques, cooking methods, temperatures, and timing
- Mention visual cues and doneness indicators
- Include tips for seasoning, texture, and flavor development
- Add specific cooking times for each step where relevant
- Include nutritional estimates where possible
- Add relevant tags for easy categorization
- Make recipes practical and achievable for home cooking
- Vary the difficulty levels across recipes
- Ensure recipes respect dietary restrictions if specified
- Instructions should be detailed enough that a beginner can follow them successfully

Example of detailed instruction style:
"Heat 2 tablespoons of olive oil in a large skillet over medium-high heat until shimmering (about 2-3 minutes). Add diced onions and cook, stirring occasionally, until translucent and lightly golden around the edges (5-7 minutes)."

Please generate creative, delicious recipes with comprehensive instructions that make the most of the available ingredients.`

    console.log("[v0] Generating recipes with Groq...")

    // Generate recipes using Groq
    const { object: generatedData } = await generateObject({
      model: groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
      prompt,
      schema: RecipeSchema,
    })

    console.log("[v0] Generated recipes:", generatedData.recipes.length)

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Store recipes in database
    const recipeIds: string[] = []

    for (const recipe of generatedData.recipes) {
      const { data: savedRecipe, error } = await supabase
        .from("recipes")
        .insert({
          name: recipe.name,
          description: recipe.description,
          cuisine_type: recipe.cuisine_type,
          spice_level: recipe.spice_level,
          dietary_restrictions: dietaryRestrictions || [],
          cooking_time: recipe.cooking_time,
          difficulty: recipe.difficulty,
          servings: recipe.servings,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          nutrition_info: recipe.nutrition_info,
          tags: recipe.tags,
          image_url: `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(recipe.name + " " + recipe.cuisine_type + " dish")}`,
        })
        .select("id")
        .single()

      if (error) {
        console.error("[v0] Error saving recipe:", error)
        continue
      }

      if (savedRecipe) {
        recipeIds.push(savedRecipe.id)
      }
    }

    // Store generation request
    await supabase.from("recipe_generations").insert({
      session_id: sessionId,
      ingredients,
      cuisine_type: cuisineType,
      spice_level: spiceLevel,
      dietary_restrictions: dietaryRestrictions || [],
      cooking_time: cookingTime,
      generated_recipe_ids: recipeIds,
    })

    console.log("[v0] Stored", recipeIds.length, "recipes in database")

    // Return the generated recipes with database IDs
    const recipesWithIds = generatedData.recipes.map((recipe, index) => ({
      ...recipe,
      id: recipeIds[index] || `temp-${index}`,
      image_url: `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(recipe.name + " " + recipe.cuisine_type + " dish")}`,
    }))

    return NextResponse.json({
      success: true,
      recipes: recipesWithIds,
      count: recipesWithIds.length,
    })
  } catch (error) {
    console.error("[v0] Recipe generation error:", error)
    return NextResponse.json({ error: "Failed to generate recipes. Please try again." }, { status: 500 })
  }
}
