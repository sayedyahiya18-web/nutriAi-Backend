const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Generic Chat Endpoint
router.post('/', async (req, res) => {
  const { query, product, profile } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ message: 'Gemini API key not configured' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      You are NutriScan AI assistant. Your goal is to provide simple, actionable health advice based on food products.
      
      User Profile: ${JSON.stringify(profile)}
      Product: ${product ? product.product_name : 'No product scanned yet'}
      Ingredients: ${product ? product.ingredients : 'N/A'}
      Nutrition (per 100g): ${product ? JSON.stringify(product.nutriments) : 'N/A'}
      
      User Question: ${query}
      
      Keep the response concise, friendly, and focused on the user's specific health goals if provided.
      Avoid medical jargon. Use bullet points for clarity.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'AI failed to respond', error: error.message });
  }
});

// Diet Plan Endpoint
router.post('/diet-plan', async (req, res) => {
  const { profile } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ message: 'Gemini API key not configured' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      Generate a 1-day personalized diet plan based on:
      Diet Type: ${profile.dietType}
      Protein Goal: ${profile.proteinGoal}g
      Routine: ${profile.routine}
      Allergies: ${profile.allergies.join(', ')}
      Conditions: ${profile.conditions.join(', ')}

      Return JSON format ONLY: 
      {
        "dailyCalories": number,
        "proteinTarget": number,
        "meals": [
          { "type": "Breakfast" | "Lunch" | "Snack" | "Dinner", "name": string, "time": string, "calories": number }
        ],
        "tips": string[]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanedJson = jsonMatch ? jsonMatch[0] : text;
    res.json(JSON.parse(cleanedJson));
  } catch (error) {
    console.error('Diet plan error:', error);
    res.status(500).json({ message: 'Failed to generate diet plan' });
  }
});

// Health Insight Endpoint (The one called after scanning)
router.post('/insight', async (req, res) => {
  const { product, profile } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ message: 'Gemini API key not configured' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      Analyze this food product:
      Product: ${product.name}
      Ingredients: ${product.ingredients}
      Nutrition (per 100g): ${JSON.stringify(product.nutrition)}
      User Profile: ${JSON.stringify(profile)}
      
      Return JSON format ONLY: 
      { 
        "isSafe": boolean, 
        "warning": string | null, 
        "recommendation": string, 
        "score": number,
        "realityCheck": {
          "sugarTeaspoons": number,
          "exerciseToBurn": { "activity": string, "minutes": number }
        },
        "smartSwap": {
          "productName": string,
          "reason": string
        },
        "ingredientInsights": [
          { "ingredient": string, "explanation": string }
        ],
        "voiceSummary": string
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanedJson = jsonMatch ? jsonMatch[0] : text;
    res.json(JSON.parse(cleanedJson));
  } catch (error) {
    console.error('Insight error:', error);
    res.status(500).json({ message: 'Failed to generate insight' });
  }
});

module.exports = router;

