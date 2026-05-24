export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      recipes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          prep_time: number | null;
          cook_time: number | null;
          servings: number | null;
          instructions: string | null;
          image_url: string | null;
          source_url: string | null;
          is_favorite: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["recipes"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["recipes"]["Insert"]>;
      };
      ingredients: {
        Row: {
          id: string;
          recipe_id: string;
          name: string;
          quantity: string | null;
          unit: string | null;
          sort_order: number;
        };
        Insert: Omit<Database["public"]["Tables"]["ingredients"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["ingredients"]["Insert"]>;
      };
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tags"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["tags"]["Insert"]>;
      };
      recipe_tags: {
        Row: {
          recipe_id: string;
          tag_id: string;
        };
        Insert: Database["public"]["Tables"]["recipe_tags"]["Row"];
        Update: Partial<Database["public"]["Tables"]["recipe_tags"]["Row"]>;
      };
      meal_plan: {
        Row: {
          id: string;
          user_id: string;
          recipe_id: string;
          date: string; // YYYY-MM-DD
          meal_time: "breakfast" | "lunch" | "dinner";
          color: "green" | "orange" | "blue";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["meal_plan"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["meal_plan"]["Insert"]>;
      };
    };
  };
}

export type Recipe = Database["public"]["Tables"]["recipes"]["Row"];
export type Ingredient = Database["public"]["Tables"]["ingredients"]["Row"];
export type Tag = Database["public"]["Tables"]["tags"]["Row"];

export type RecipeWithDetails = Recipe & {
  ingredients: Ingredient[];
  tags: Tag[];
};

export type MealTime = "breakfast" | "lunch" | "dinner";
export type MealPlan = Database["public"]["Tables"]["meal_plan"]["Row"];
export type MealPlanWithRecipe = MealPlan & {
  recipes: { id: string; name: string } | null;
};

export interface ExtractedRecipe {
  name: string;
  description: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  instructions: string | null;
  ingredients: Array<{
    quantity: string | null;
    unit: string | null;
    name: string;
  }>;
  confidence?: "high" | "medium" | "low";
  error?: string;
}
