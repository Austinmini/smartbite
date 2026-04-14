# Recipe Enrichment Strategy — Claude Prompt Upgrade

## Current State (Barebone)
Recipe object currently captures:
- title, readyInMinutes, servings
- ingredients (4-6 items)
- instructions (2-4 steps)
- nutrition (basic: calories, protein, carbs, fat)
- tags, imageUrl

**Problem:** Feels like a recipe stub, not a complete cooking guide.

---

## Proposed Enrichments (No Extra APIs)

### 1. **Flavor Profile & Culinary Notes**
Add to each recipe:
```typescript
flavorProfile?: string  // "Savory, umami-rich with fresh citrus notes"
cuisineOrigin?: string  // "Thai street food inspired"
difficulty?: 'easy' | 'medium' | 'challenging'
```

**Why:** Helps users understand the eating experience before cooking. Makes recipes feel intentional, not random.

### 2. **Cooking Tips & Techniques**
```typescript
cookingTips?: string[]  // ["Slice vegetables uniformly for even cooking", "Toast spices before adding liquid for deeper flavor"]
techniques?: string[]   // ["stir-fry", "pan-sear", "simmer"]
```

**Why:** Educational. Shows skill progression. Makes users feel like they're learning, not just following steps.

### 3. **Ingredient Substitutions & Variations**
```typescript
substitutions?: Array<{
  ingredient: string
  substitutes: string[]
}>
// Example: { ingredient: "tofu", substitutes: ["tempeh", "chickpeas", "paneer"] }
```

**Why:** Addresses common questions ("I don't have this"). Increases confidence. Ties to user's pantry.

### 4. **Equipment & Prep Info**
```typescript
equipmentNeeded?: string[]  // ["cast iron skillet", "immersion blender"]
prepTime?: number           // minutes for mise en place
canMakeAhead?: string       // "Prepare sauce up to 2 days ahead"
storageInfo?: string        // "Keeps 3 days in fridge, freezes up to 1 month"
```

**Why:** Removes friction. Helps users plan prep. Enables meal-prep workflows.

### 5. **Health & Nutritional Context**
```typescript
nutritionContext?: string   // "High in fiber and plant-based protein"
healthBenefits?: string[]   // ["Supports digestion", "Anti-inflammatory ingredients"]
allergenWarnings?: string[] // ["Contains sesame", "May contain tree nuts from equipment"]
```

**Why:** Ties to their dietary goals. Builds confidence in the plan.

### 6. **Pairing Suggestions**
```typescript
mealPairings?: {
  side?: string[]           // ["Steamed jasmine rice", "Cucumber salad"]
  beverage?: string[]       // ["Crisp white wine", "Sparkling water with lime"]
  appetizer?: string        // For dinner context
}
```

**Why:** Elevates the experience. Shows this is a complete meal, not just a recipe.

### 7. **Quick Context**
```typescript
dishType?: string           // "Stir-fry", "Slow-cooker braise", "Raw salad"
yieldDescription?: string   // "Serves 4 generously, with leftovers for lunch"
```

---

## Updated MealRecipe Interface

```typescript
export interface MealRecipe {
  // Existing
  id: string
  title: string
  readyInMinutes: number
  servings: number
  ingredients: { name: string; amount: number; unit: string }[]
  instructions: { step: number; text: string }[]
  nutrition: { calories: number; protein: number; carbs: number; fat: number }
  tags: string[]
  imageUrl: string | null

  // New enrichments
  flavorProfile?: string           // "Spicy, aromatic, slightly tangy"
  cuisineOrigin?: string           // "Thai street food"
  difficulty?: 'easy' | 'medium' | 'challenging'
  
  // Cooking guidance
  cookingTips?: string[]           // ["Toast spices first", "Don't overcrowd the pan"]
  techniques?: string[]            // ["pan-fry", "simmer"]
  dishType?: string                // "Stir-fry", "Salad", "Braise"
  
  // Practical help
  equipmentNeeded?: string[]       // ["Wok or large skillet", "Instant-read thermometer"]
  prepTime?: number                // minutes for mise en place
  canMakeAhead?: string            // "Prep sauce up to 2 days ahead"
  storageInfo?: string             // "Keeps 3 days refrigerated"
  
  // Substitutions
  substitutions?: Array<{
    ingredient: string
    substitutes: string[]
  }>
  
  // Health context
  nutritionContext?: string        // "High protein, low carb"
  healthBenefits?: string[]        // ["Supports immune function", "Rich in antioxidants"]
  allergenWarnings?: string[]      // ["Contains shellfish", "May contain traces of peanuts"]
  
  // Pairing suggestions
  mealPairings?: {
    side?: string[]                // ["Jasmine rice", "Quinoa"]
    beverage?: string[]            // ["White wine", "Green tea"]
    appetizer?: string             // "Miso soup" (optional, for dinner)
  }
  
  // Context
  yieldDescription?: string        // "Serves 4 generously with lunch leftovers"
  source?: 'ai_generated' | 'community' | 'imported'
}
```

---

## Enhanced Prompt (Draft)

Replace the current prompt with:

```typescript
const prompt = `You are an expert culinary instructor and nutritionist creating personalized meal plans.

CONTEXT:
- Weekly food budget: $${weekBudget}
- Dietary goals: ${profile.dietaryGoals.join(', ') || 'balanced'}
- Allergies/restrictions: ${profile.allergies.join(', ') || 'none'}
- Preferred cuisines: ${profile.cuisinePrefs.join(', ') || 'any'}
- Max cooking time: ${profile.cookingTimeMax} min per meal
- Servings: ${profile.servings}
${favouritesContext}

REQUIREMENTS:
Generate a 7-day meal plan (7 days, 3 meals/day = 21 recipes total).
Each recipe should be complete, inspiring, and teach cooking skills.

For EACH recipe, provide rich details:

FLAVOR & EXPERIENCE:
- flavorProfile: Describe taste in 1 sentence (e.g., "Bright, spicy, umami-rich")
- cuisineOrigin: Cultural/regional inspiration
- difficulty: "easy" | "medium" | "challenging"
- dishType: Category (e.g., "Pan-seared", "Slow braise", "Raw salad")

COOKING MASTERY:
- cookingTips: 2-3 professional tips (heat control, timing, technique)
- techniques: List cooking methods used (["pan-sear", "simmer"])
- equipmentNeeded: Required tools (["cast iron skillet", "whisk"])

PRACTICAL HELP:
- prepTime: Minutes to prep ingredients before cooking starts
- canMakeAhead: What can be prepared 1-2 days in advance
- storageInfo: How long it keeps and best storage method
- substitutions: For 2-3 key ingredients, offer alternatives

NUTRITIONAL CONTEXT:
- nutritionContext: Tie to dietary goals (e.g., "High-protein, low-carb")
- healthBenefits: 2-3 specific health benefits
- allergenWarnings: Any potential allergen concerns

ELEVATION:
- mealPairings.side: 2 suggested side dishes
- mealPairings.beverage: 2 beverage suggestions
- yieldDescription: Be specific (e.g., "Serves 4 with lunch leftovers")

RECIPE STRUCTURE:
- title: Evocative, descriptive name
- ingredients: 6-8 items (richer than before)
- instructions: 4-6 clear steps with techniques
- readyInMinutes: Realistic total time
- estCostPerServing: Budget-conscious
- tags: ["quick", "one-pan", "make-ahead", "high-protein", etc]
- nutrition: Accurate breakdown

Respond ONLY with valid JSON matching this exact shape:
{
  "totalEstCost": number,
  "days": [
    {
      "dayOfWeek": 0,
      "meals": [
        {
          "mealType": "BREAKFAST" | "LUNCH" | "DINNER",
          "title": string,
          "flavorProfile": string,
          "cuisineOrigin": string,
          "difficulty": "easy" | "medium" | "challenging",
          "dishType": string,
          "estCostPerServing": number,
          "readyInMinutes": number,
          "prepTime": number,
          "yieldDescription": string,
          "tags": string[],
          "ingredients": [{ "name": string, "amount": number, "unit": string }],
          "instructions": [{ "step": number, "text": string }],
          "cookingTips": [string],
          "techniques": [string],
          "equipmentNeeded": [string],
          "canMakeAhead": string,
          "storageInfo": string,
          "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number },
          "nutritionContext": string,
          "healthBenefits": [string],
          "allergenWarnings": [string],
          "substitutions": [
            { "ingredient": string, "substitutes": [string] }
          ],
          "mealPairings": {
            "side": [string],
            "beverage": [string]
          }
        }
      ]
    }
  ]
}`
```

---

## Mobile UI Display Examples

### Before (Barebone)
```
🍝 Pasta with Tomato Sauce

Ready in 20 min | 4 servings
~$2.50 per serving

Ingredients
• Pasta - 1 lb
• Tomato - 3 medium
• Garlic - 3 cloves
• Olive oil - 3 tbsp
• Salt - to taste

Instructions
1. Boil pasta
2. Make sauce
3. Combine
4. Serve
```

### After (Enriched)
```
🍝 Rustic Pasta al Pomodoro — Fresh Tomato Sauce

Flavor: 🌶️ Fresh, bright, herbaceous with garlic warmth
Origin: Italian Tuscan | Difficulty: Easy

Ready in 20 min | Prep: 10 min
Serves 4 generously with light appetizer pairing

💰 ~$2.50 per serving
🔥 Pan-searing + Simmering

🥘 Ingredients
• Pasta (spaghetti/linguine) - 1 lb
• Fresh ripe tomatoes - 4 medium (or 1 can San Marzano)
• Garlic cloves - 3 (minced)
• Extra virgin olive oil - 3 tbsp
• Fresh basil - 1/2 bunch
• Sea salt & black pepper

⚡ Cooking Tips
✓ Use ripe summer tomatoes for best flavor
✓ Don't overcook pasta — aim for al dente
✓ Heat tomatoes gently to preserve fresh taste

📋 Instructions
1. **Prep (10 min):** Quarter tomatoes, mince garlic. Bring large pot of salted water to boil.
2. **Sauce (8 min):** Heat olive oil on medium. Add garlic, sauté 1 min until fragrant. Add tomatoes with pinch of salt. Simmer gently 6-7 min, just until tomatoes soften.
3. **Pasta (10 min):** Meanwhile, cook pasta 9-11 min until al dente. Reserve 1 cup pasta water.
4. **Combine (2 min):** Drain pasta, add to sauce with 1/4 cup pasta water. Toss gently. Tear fresh basil on top.

🔄 Can Make Ahead
• Sauce keeps 3 days refrigerated
• Prepare tomatoes & garlic morning-of
• Don't cook pasta until serving

🌿 Swaps & Substitutions
• No fresh tomatoes? → 1 can San Marzano tomatoes
• No basil? → Parsley or oregano
• Can't do pasta? → Use zucchini noodles (reduces carbs)

📊 Nutrition per serving
Calories: 420 | Protein: 15g | Carbs: 72g | Fat: 8g
💚 High in: Lycopene (heart health), Vitamin C (immune support)
⚠️ Contains: Gluten (pasta)

🍷 Pairings
Sides: Arugula salad with lemon, Crusty bread with herbs
Beverage: Crisp Italian white wine, Sparkling water with lemon

✨ Why this recipe: Perfect weeknight dinner, teaches sauce technique, naturally budget-friendly

---
```

---

## Implementation Checklist

- [ ] Update MealRecipe interface with new fields
- [ ] Update GeneratedMeal service type with new fields
- [ ] Upgrade the prompt in mealPlanService.ts
- [ ] Update saveMealPlan() to capture all new fields
- [ ] Update mobile recipe detail screen to display:
  - [ ] Flavor profile badge at top
  - [ ] Difficulty level indicator
  - [ ] Cooking tips collapsible section
  - [ ] Equipment callout
  - [ ] Preparation timeline
  - [ ] Storage/make-ahead info
  - [ ] Substitutions as expandable section
  - [ ] Health context alongside nutrition
  - [ ] Pairing suggestions at bottom
- [ ] Test prompt quality (iterate if needed)
- [ ] Add "More like this" based on flavor profile

---

## Why This Works

✅ **No new dependencies** — Leverages existing Claude API
✅ **Scales instantly** — All 21 recipes in plan get enriched simultaneously
✅ **Educational** — Users learn techniques and cooking confidence
✅ **Practical** — Prep tips, substitutions, storage address real pain points
✅ **Aspirational** — Flavor profiles, pairings, health benefits build engagement
✅ **Tied to goals** — Nutrition context + health benefits connect to user's why
✅ **Cost-neutral** — Same or slightly higher token usage, still cheaper than APIs

---

## Token Impact

Current prompt output: ~350 tokens per recipe × 21 = ~7,350 tokens per plan
Enhanced prompt output: ~500 tokens per recipe × 21 = ~10,500 tokens per plan

Difference: +3,150 tokens (~$0.02-0.03 per plan)

Cost vs. Spoonacular API: ~$0.10/request × 21 recipes = $2.10/plan
This approach: +$0.03 per plan ← **Clear winner**

---

## Next Steps

1. Update TypeScript types
2. Enhance prompt with examples above
3. Update the mobile UI recipe detail screen
4. Test with real users
5. Iterate on prompt based on output quality
