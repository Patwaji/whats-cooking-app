import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(request: NextRequest) {
  try {
    console.log("[API] Starting recipe generation with Gemini...")
    
    const body = await request.json()
    const { ingredients, cuisineType, spiceLevel, dietaryRestrictions, cookingTime, sessionId } = body

    // Validate required fields
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: "Ingredients are required" }, { status: 400 })
    }

    // Check if required env vars are present
    if (!process.env.GEMINI_API_KEY) {
      console.error("[API] Missing GEMINI_API_KEY")
      return NextResponse.json({ error: "Missing Gemini API configuration" }, { status: 500 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[API] Missing SUPABASE_SERVICE_ROLE_KEY")
      return NextResponse.json({ error: "Missing database configuration" }, { status: 500 })
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

Please respond with a JSON object in this exact format:
{
  "recipes": [
    {
      "name": "Recipe Name",
      "description": "Brief description",
      "cuisine_type": "Cuisine Type",
      "spice_level": "mild/medium/hot",
      "difficulty": "Easy/Medium/Hard",
      "servings": 4,
      "cooking_time": 30,
      "ingredients": [
        {"name": "ingredient", "amount": "1 cup", "unit": "cup"}
      ],
      "instructions": [
        {"step": 1, "instruction": "Detailed step", "time": 5}
      ],
      "nutrition_info": {
        "calories": 350,
        "protein": "25g",
        "carbs": "30g",
        "fat": "15g"
      },
      "tags": ["tag1", "tag2"]
    }
  ]
}`

    console.log("[API] Calling Gemini API...")
    console.log("[API] Using API key:", process.env.GEMINI_API_KEY?.substring(0, 10) + "...")

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    })

    console.log("[API] Sending prompt to Gemini...")
    let result, response, text;
    try {
      result = await model.generateContent(prompt)
      response = await result.response
      text = response.text()
    } catch (geminiError) {
      console.error("[API] Gemini API error:", geminiError)
      return NextResponse.json({ 
        error: "AI service temporarily unavailable. Please try again." 
      }, { status: 503 })
    }
    
    console.log("[API] Gemini response length:", text.length)
    console.log("[API] First 200 chars:", text.substring(0, 200))

    // Parse JSON response
    let parsedResponse
    try {
      // Clean the response to extract JSON - handle markdown code blocks
      let cleanedText = text.trim()
      
      // Remove markdown code block markers
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '')
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '')
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.replace(/\s*```$/, '')
      }
      
      // Find JSON object bounds
      const jsonStart = cleanedText.indexOf('{')
      const jsonEnd = cleanedText.lastIndexOf('}') + 1
      
      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error("No JSON found in response")
      }
      
      let jsonString = cleanedText.substring(jsonStart, jsonEnd)
      
      // Fix common JSON issues that Gemini might produce
      // Remove JSON comments (// ... lines)
      jsonString = jsonString.replace(/\/\/.*$/gm, '')
      
      // Remove /* ... */ style comments
      jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '')
      
      // Fix fractions like "1/2" to decimals like "0.5"
      jsonString = jsonString.replace(/"amount":\s*"(\d+)\/(\d+)"/g, (match, num, denom) => {
        const decimal = parseFloat(num) / parseFloat(denom)
        return `"amount": "${decimal}"`
      })
      
      // Fix standalone fractions without quotes
      jsonString = jsonString.replace(/:\s*"(\d+)\/(\d+)"/g, (match, num, denom) => {
        const decimal = parseFloat(num) / parseFloat(denom)
        return `: "${decimal}"`
      })
      
      // Fix duplicate unit fields by keeping only the last one
      jsonString = jsonString.replace(/"unit":\s*"[^"]*",\s*"unit":\s*"([^"]*)"/g, '"unit": "$1"')
      
      // Fix non-numeric amounts in ingredients to be strings
      jsonString = jsonString.replace(/"amount":\s*([^",\[\]{}]+),/g, '"amount": "$1",')
      
      // Clean up any trailing commas before closing braces/brackets
      jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1')
      
      // Remove empty lines and extra whitespace
      jsonString = jsonString.replace(/^\s*[\r\n]/gm, '')
      
      console.log("[API] Cleaned JSON string length:", jsonString.length)
      console.log("[API] First 200 chars of JSON:", jsonString.substring(0, 200))
      
      parsedResponse = JSON.parse(jsonString)
    } catch (parseError) {
      console.error("[API] JSON parse error:", parseError)
      console.error("[API] Raw response:", text.substring(0, 500))
      console.error("[API] Full raw response:", text)
      return NextResponse.json({ error: "Failed to parse recipe data" }, { status: 500 })
    }

    const generatedRecipes = parsedResponse.recipes
    console.log("[API] Generated recipes count:", generatedRecipes?.length || 0)

    if (!generatedRecipes || generatedRecipes.length === 0) {
      console.error("[API] No recipes generated")
      return NextResponse.json({ error: "No recipes generated" }, { status: 500 })
    }

    // Insert all recipes in one call and get their UUIDs
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    
    // Prepare recipe data for insertion
    const recipesToInsert = generatedRecipes.map((recipe: any) => ({
      name: recipe.name || "Untitled Recipe",
      description: recipe.description || "A delicious recipe",
      cuisine_type: recipe.cuisine_type || cuisineType || "Any",
      spice_level: recipe.spice_level || spiceLevel || "medium",
      dietary_restrictions: dietaryRestrictions || [],
      cooking_time: recipe.cooking_time || cookingTime || 60,
      difficulty: recipe.difficulty || "Medium",
      servings: recipe.servings || 4,
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      nutrition_info: recipe.nutrition_info || {},
      tags: recipe.tags || [],
      image_url: `/placeholder.svg?height=300&width=400&query=${encodeURIComponent((recipe.name || "Recipe") + " " + (recipe.cuisine_type || "dish"))}`,
      // Set expires_at for auto-deletion if not saved (1 hour from now)
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }))
    
    console.log("[API] Inserting recipes into Supabase:", recipesToInsert.length)
    const { data: savedRecipes, error } = await supabase
      .from("recipes")
      .insert(recipesToInsert)
      .select("*")

    if (error || !savedRecipes) {
      console.error("[API] Error saving recipes:", {
        error,
        code: error?.code,
        details: error?.details,
        message: error?.message,
        hint: error?.hint
      })
      return NextResponse.json({ error: "Failed to save recipes to database." }, { status: 500 })
    }

    // Store generation request if needed
    if (savedRecipes && savedRecipes.length) {
      await supabase.from("recipe_generations").insert({
        session_id: sessionId,
        ingredients,
        cuisine_type: cuisineType,
        spice_level: spiceLevel,
        dietary_restrictions: dietaryRestrictions || [],
        cooking_time: cookingTime,
        generated_recipe_ids: savedRecipes.map((r) => r.id),
      })
      console.log("[API] Stored", savedRecipes.length, "recipes in database")
    }

    // Return recipes with real UUIDs to client
    const recipesWithUUIDs = savedRecipes.map((recipe, i) => ({
      ...generatedRecipes[i],
      id: recipe.id,
      image_url: recipe.image_url,
    }))

    return NextResponse.json({
      success: true,
      recipes: recipesWithUUIDs,
      count: recipesWithUUIDs.length,
    })
  } catch (error) {
    console.error("[API] Recipe generation error:", error)
    return NextResponse.json({ error: "Failed to generate recipes. Please try again." }, { status: 500 })
  }
}
