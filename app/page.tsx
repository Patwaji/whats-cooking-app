"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { ChefHat, Clock, Heart, Sparkles, Users, Utensils, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { signOut } from "@/lib/actions"
import AuthModal from "@/components/auth/auth-modal"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface FormData {
  ingredients: string
  cuisineType: string
  spiceLevel: string
  dietaryRestrictions: string[]
  cookingTime: string
}

export default function HomePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<{ full_name: string } | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalTab, setAuthModalTab] = useState<"login" | "signup">("login")

  const [formData, setFormData] = useState<FormData>({
    ingredients: "",
    cuisineType: "",
    spiceLevel: "",
    dietaryRestrictions: [],
    cookingTime: "",
  })
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)

      if (session?.user) {
        // Fetch user profile
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .single()

        setUserProfile(profile)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        // Fetch user profile
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .single()

        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleDietaryChange = (restriction: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      dietaryRestrictions: checked
        ? [...prev.dietaryRestrictions, restriction]
        : prev.dietaryRestrictions.filter((r) => r !== restriction),
    }))
  }

  const handleSubmit = async () => {
    if (!formData.ingredients.trim()) {
      toast({
        title: "Missing ingredients!",
        description: "Please tell us what ingredients you have available.",
        variant: "destructive",
      })
      return
    }

    try {
      // Navigate to loading page first
      router.push("/loading")

      // Generate session ID for anonymous users
      const sessionId = crypto.randomUUID()

      // Prepare API request data
      const requestData = {
        ingredients: formData.ingredients
          .split(/[,\n]/)
          .map((i) => i.trim())
          .filter((i) => i.length > 0),
        cuisineType: formData.cuisineType || "any",
        spiceLevel: formData.spiceLevel || "medium",
        dietaryRestrictions: formData.dietaryRestrictions,
        cookingTime: formData.cookingTime
          ? formData.cookingTime === "quick"
            ? 30
            : formData.cookingTime === "moderate"
              ? 60
              : formData.cookingTime === "long"
                ? 120
                : 60
          : 60,
        sessionId,
      }

      console.log("[v0] Calling AI recipe generation API...")

      // Call the AI recipe generation API
      const response = await fetch("/api/generate-recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        throw new Error("Failed to generate recipes")
      }

      const result = await response.json()

      console.log("[v0] Generated recipes:", result.recipes?.length || 0)

      if (!result.recipes || result.recipes.length === 0) {
        throw new Error("No recipes were generated")
      }

      // Store the generated recipes and form data in session storage
      sessionStorage.setItem("generatedRecipes", JSON.stringify(result.recipes))
      sessionStorage.setItem("recipeFormData", JSON.stringify(formData))
      sessionStorage.setItem("sessionId", sessionId)

      setTimeout(() => {
        router.push("/results")
      }, 100)
    } catch (error) {
      console.error("[v0] Recipe generation error:", error)
      toast({
        title: "Generation Failed",
        description: "Failed to generate recipes. Please try again.",
        variant: "destructive",
      })
      // Navigate back to home if there's an error
      router.push("/")
    }
  }

  const scrollToForm = () => {
    document.getElementById("recipe-form")?.scrollIntoView({ behavior: "smooth" })
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Logout error:", error)
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      })
    }
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
            {user ? (
              <>
                <div className="flex items-center space-x-2 text-foreground">
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">{user.email}</span>
                </div>
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
                >
                  Saved Recipes
                </Button>
                <Button variant="ghost" className="text-foreground hover:bg-muted" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="text-foreground hover:bg-muted"
                  onClick={() => {
                    setAuthModalTab("login")
                    setShowAuthModal(true)
                  }}
                >
                  Login
                </Button>
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
                  onClick={() => {
                    setAuthModalTab("signup")
                    setShowAuthModal(true)
                  }}
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} defaultTab={authModalTab} />

      <section className="relative pt-24 pb-16 px-4 bg-gradient-to-br from-muted via-background to-muted">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="animate-fade-in">
            <h2 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              "What should I make
              <br />
              <span className="text-primary">for dinner?"</span>
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              We've all been there. Mom asks the eternal question, you say "I don't know," she suggests something, you
              say "no," and suddenly you're in trouble for not helping!
            </p>
          </div>

          <div className="animate-fade-in-delay-1 mb-12">
            <img
              src="/frustrated-mother-cooking.png"
              alt="Mother in kitchen looking confused at ingredients"
              className="mx-auto rounded-2xl shadow-2xl max-w-full h-auto"
            />
          </div>

          <div className="animate-fade-in-delay-2">
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Finally, a solution that makes everyone happy!
            </h3>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Just tell us what ingredients you have, and our AI will suggest delicious recipes that'll have the whole
              family asking for seconds.
            </p>
            <Button
              onClick={scrollToForm}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg font-semibold rounded-full transform hover:scale-105 transition-all duration-200 animate-bounce-gentle"
            >
              Try It Now - It's Free!
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-card">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-card-foreground mb-4">The Daily Kitchen Drama, Solved</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Every family knows this story. Let's break the cycle with smart AI that actually helps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 text-center border-2 border-destructive/20 bg-background">
              <div className="text-4xl mb-4">😤</div>
              <h3 className="text-xl font-bold text-card-foreground mb-3">The Problem</h3>
              <p className="text-muted-foreground">
                "I don't know what to cook!" leads to suggestions, rejections, and family frustration. Sound familiar?
              </p>
            </Card>

            <Card className="p-6 text-center border-2 border-secondary/20 bg-background">
              <div className="text-4xl mb-4">🤔</div>
              <h3 className="text-xl font-bold text-card-foreground mb-3">The Struggle</h3>
              <p className="text-muted-foreground">
                You have ingredients but no inspiration. Mom has ideas but gets shot down. Everyone's hungry and grumpy.
              </p>
            </Card>

            <Card className="p-6 text-center border-2 border-primary/20 bg-background">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-xl font-bold text-card-foreground mb-3">The Solution</h3>
              <p className="text-muted-foreground">
                AI-powered recipe suggestions based on what you actually have. No more guessing, no more arguments!
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">How What's Cooking? Saves Dinner Time</h2>
            <p className="text-xl text-muted-foreground">
              Smart features designed for real families with real kitchens
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center animate-slide-up">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Utensils className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Use What You Have</h3>
              <p className="text-muted-foreground">Just list your ingredients - no need to shop for special items</p>
            </div>

            <div className="text-center animate-slide-up">
              <div className="bg-secondary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">AI-Powered Magic</h3>
              <p className="text-muted-foreground">
                Smart suggestions that consider your preferences and dietary needs
              </p>
            </div>

            <div className="text-center animate-slide-up">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Time-Conscious</h3>
              <p className="text-muted-foreground">Choose quick meals or elaborate feasts based on your schedule</p>
            </div>

            <div className="text-center animate-slide-up">
              <div className="bg-secondary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Family-Friendly</h3>
              <p className="text-muted-foreground">
                Recipes that please everyone, from picky eaters to adventurous foodies
              </p>
            </div>

            <div className="text-center animate-slide-up">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Dietary Aware</h3>
              <p className="text-muted-foreground">Vegetarian, vegan, gluten-free - we've got everyone covered</p>
            </div>

            <div className="text-center animate-slide-up">
              <div className="bg-secondary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <ChefHat className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Cuisine Explorer</h3>
              <p className="text-muted-foreground">From comfort food to exotic flavors - expand your family's palate</p>
            </div>
          </div>
        </div>
      </section>

      <section id="recipe-form" className="py-16 px-4 bg-muted">
        <div className="container mx-auto max-w-2xl">
          <Card className="bg-card border-border rounded-3xl shadow-xl p-8">
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-card-foreground mb-2">What's in Your Kitchen?</h3>
                <p className="text-muted-foreground">Tell us what you have, and we'll create magic!</p>
              </div>

              {/* Ingredients Input */}
              <div className="space-y-2">
                <Label htmlFor="ingredients" className="text-card-foreground font-medium">
                  Ingredients I Have
                </Label>
                <Textarea
                  id="ingredients"
                  placeholder="List your ingredients, separated by commas or new lines (e.g., chicken, rice, broccoli, garlic)..."
                  className="bg-input border-border text-foreground placeholder-muted-foreground focus:ring-primary focus:border-primary min-h-[120px] resize-none"
                  value={formData.ingredients}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ingredients: e.target.value }))}
                />
              </div>

              {/* Cuisine Type */}
              <div className="space-y-2">
                <Label className="text-card-foreground font-medium">Cuisine Type</Label>
                <Select
                  value={formData.cuisineType}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, cuisineType: value }))}
                >
                  <SelectTrigger className="bg-input border-border text-foreground focus:ring-primary">
                    <SelectValue placeholder="Select cuisine type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="indian">Indian</SelectItem>
                    <SelectItem value="italian">Italian</SelectItem>
                    <SelectItem value="mexican">Mexican</SelectItem>
                    <SelectItem value="chinese">Chinese</SelectItem>
                    <SelectItem value="mediterranean">Mediterranean</SelectItem>
                    <SelectItem value="american">American</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Spice Level */}
              <div className="space-y-2">
                <Label className="text-card-foreground font-medium">Spice Level</Label>
                <Select
                  value={formData.spiceLevel}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, spiceLevel: value }))}
                >
                  <SelectTrigger className="bg-input border-border text-foreground focus:ring-primary">
                    <SelectValue placeholder="Select spice level" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="spicy">Spicy</SelectItem>
                    <SelectItem value="very-spicy">Very Spicy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dietary Restrictions */}
              <div className="space-y-3">
                <Label className="text-card-foreground font-medium">Dietary Restrictions (Optional)</Label>
                <div className="grid grid-cols-2 gap-4">
                  {["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free"].map((restriction) => (
                    <div key={restriction} className="flex items-center space-x-2">
                      <Checkbox
                        id={restriction}
                        checked={formData.dietaryRestrictions.includes(restriction)}
                        onCheckedChange={(checked) => handleDietaryChange(restriction, checked as boolean)}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Label htmlFor={restriction} className="text-muted-foreground text-sm">
                        {restriction}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cooking Time */}
              <div className="space-y-2">
                <Label className="text-card-foreground font-medium">Cooking Time (Optional)</Label>
                <Select
                  value={formData.cookingTime}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, cookingTime: value }))}
                >
                  <SelectTrigger className="bg-input border-border text-foreground focus:ring-primary">
                    <SelectValue placeholder="Select cooking time" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="quick">Quick (under 30 min)</SelectItem>
                    <SelectItem value="moderate">Moderate (30-60 min)</SelectItem>
                    <SelectItem value="long">Long (1+ hour)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 text-lg font-semibold rounded-xl transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
              >
                Get My Recipe Suggestions!
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Real Families, Real Results</h2>
            <p className="text-xl text-muted-foreground">
              See how What's Cooking? is transforming dinner time everywhere
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center mb-4">
                <div className="text-2xl mr-3">⭐⭐⭐⭐⭐</div>
              </div>
              <p className="text-card-foreground mb-4 italic">
                "Finally! No more dinner arguments. My kids actually get excited about the suggestions, and I don't have
                to be the bad guy anymore."
              </p>
              <p className="text-muted-foreground font-medium">- Sarah M., Mom of 3</p>
            </Card>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-center mb-4">
                <div className="text-2xl mr-3">⭐⭐⭐⭐⭐</div>
              </div>
              <p className="text-card-foreground mb-4 italic">
                "I was skeptical, but this actually works! Used random ingredients from my fridge and got an amazing
                pasta recipe. Even my picky husband loved it."
              </p>
              <p className="text-muted-foreground font-medium">- Maria L., Working Mom</p>
            </Card>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-center mb-4">
                <div className="text-2xl mr-3">⭐⭐⭐⭐⭐</div>
              </div>
              <p className="text-card-foreground mb-4 italic">
                "Game changer for our family! The AI understands our dietary restrictions perfectly, and we've
                discovered so many new favorite meals."
              </p>
              <p className="text-muted-foreground font-medium">- Jennifer K., Busy Parent</p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to End the "What's for Dinner?" Drama?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of families who've already discovered the joy of stress-free meal planning. Your kitchen
            ingredients are waiting to become something amazing!
          </p>
          <Button
            onClick={scrollToForm}
            size="lg"
            variant="secondary"
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-8 py-4 text-lg font-semibold rounded-full transform hover:scale-105 transition-all duration-200"
          >
            Start Cooking Smarter Today!
          </Button>
        </div>
      </section>

      <footer className="py-12 px-4 bg-muted border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <ChefHat className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-bold text-foreground">What's Cooking?</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Making family dinner decisions easier, one recipe at a time.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>AI Recipe Suggestions</li>
                <li>Ingredient-Based Search</li>
                <li>Dietary Restrictions</li>
                <li>Cuisine Preferences</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Recipe Feedback</li>
                <li>Community</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Cookie Policy</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-muted-foreground text-sm">© 2024 What's Cooking? Made with ❤️ for families everywhere.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
