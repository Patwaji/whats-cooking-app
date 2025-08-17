-- Create recipes table to store AI-generated recipes
CREATE TABLE IF NOT EXISTS recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cuisine_type VARCHAR(100),
  spice_level VARCHAR(50),
  dietary_restrictions TEXT[],
  cooking_time INTEGER, -- in minutes
  difficulty VARCHAR(50),
  servings INTEGER,
  ingredients JSONB NOT NULL, -- Array of ingredient objects
  instructions JSONB NOT NULL, -- Array of instruction steps
  nutrition_info JSONB, -- Optional nutrition information
  tags TEXT[], -- Array of tags
  image_url TEXT, -- URL to generated recipe image
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_saved_recipes table for tracking saved recipes
CREATE TABLE IF NOT EXISTS user_saved_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

-- Create recipe_generations table to track generation requests
CREATE TABLE IF NOT EXISTS recipe_generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id VARCHAR(255), -- For anonymous users
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ingredients TEXT[],
  cuisine_type VARCHAR(100),
  spice_level VARCHAR(50),
  dietary_restrictions TEXT[],
  cooking_time INTEGER,
  generated_recipe_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine_type ON recipes(cuisine_type);
CREATE INDEX IF NOT EXISTS idx_recipes_spice_level ON recipes(spice_level);
CREATE INDEX IF NOT EXISTS idx_recipes_cooking_time ON recipes(cooking_time);
CREATE INDEX IF NOT EXISTS idx_user_saved_recipes_user_id ON user_saved_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_generations_session_id ON recipe_generations(session_id);
CREATE INDEX IF NOT EXISTS idx_recipe_generations_user_id ON recipe_generations(user_id);

-- Add RLS policies
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_saved_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_generations ENABLE ROW LEVEL SECURITY;

-- Recipes are publicly readable
CREATE POLICY "Recipes are publicly readable" ON recipes
  FOR SELECT USING (true);

-- Users can only see their own saved recipes
CREATE POLICY "Users can view their own saved recipes" ON user_saved_recipes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save recipes" ON user_saved_recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave recipes" ON user_saved_recipes
  FOR DELETE USING (auth.uid() = user_id);

-- Users can view their own recipe generations
CREATE POLICY "Users can view their own generations" ON recipe_generations
  FOR SELECT USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Anyone can create recipe generations" ON recipe_generations
  FOR INSERT WITH CHECK (true);
