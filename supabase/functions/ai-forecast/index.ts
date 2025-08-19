import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      material, 
      region, 
      timeframe, 
      currentPrice, 
      historicalData, 
      weatherData, 
      marketFactors 
    } = await req.json();

    console.log('AI Forecast request:', { material, region, timeframe });

    const prompt = `
    You are an AI construction materials price forecasting expert. Analyze the data and provide ACCURATE DAILY PRICE PREDICTIONS.

    CRITICAL: You MUST generate daily price predictions for each day in the forecast period.

    Material: ${material}
    Region: ${region} (Tamil Nadu, India)
    Forecast Period: ${timeframe} days
    Current Price: ₹${currentPrice} per unit
    
    Historical Price Data: ${JSON.stringify(historicalData)}
    Weather Forecast: ${JSON.stringify(weatherData)}
    Market Factors: ${JSON.stringify(marketFactors)}

    MANDATORY REQUIREMENTS:
    1. Generate EXACTLY ${timeframe} daily price predictions starting from tomorrow
    2. Each prediction must have: date (YYYY-MM-DD), predictedPrice (number), confidence (60-95), factors (array)
    3. Use realistic price variations based on current price of ₹${currentPrice}
    4. Consider seasonal patterns, weather impacts, and market trends
    5. Ensure price progression is logical and realistic

    Example daily prediction format:
    {
      "date": "2025-08-20",
      "predictedPrice": ${Math.round(currentPrice * (1 + (Math.random() - 0.5) * 0.1))},
      "confidence": ${Math.round(75 + Math.random() * 15)},
      "factors": ["market demand", "weather conditions"]
    }

    Format your response as a VALID JSON object:
    {
      "dailyPredictions": [
        // MUST contain ${timeframe} predictions, one for each day
      ],
      "overallTrend": "increasing|decreasing|stable",
      "averageConfidence": number,
      "keyInsights": ["insight1", "insight2"],
      "riskFactors": ["risk1", "risk2"],
      "recommendations": {
        "forBuyers": "recommendation text",
        "forSellers": "recommendation text"
      },
      "marketVolatility": "low|medium|high",
      "priceRange": {
        "min": number,
        "max": number
      }
    }

    IMPORTANT: Start generating daily predictions from tomorrow (${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}) and continue for ${timeframe} consecutive days.
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini response received');

    let aiResponse = data.candidates[0].content.parts[0].text;
    
    // Clean up the response to extract JSON
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      aiResponse = jsonMatch[0];
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
      
      // Validate that we have daily predictions
      if (!parsedResponse.dailyPredictions || !Array.isArray(parsedResponse.dailyPredictions) || parsedResponse.dailyPredictions.length === 0) {
        console.warn('AI response missing daily predictions, generating fallback');
        parsedResponse.dailyPredictions = generateFallbackPredictions(currentPrice, timeframe);
      }
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback response with proper daily predictions
      parsedResponse = {
        dailyPredictions: generateFallbackPredictions(currentPrice, timeframe),
        overallTrend: "stable",
        averageConfidence: 75,
        keyInsights: ["AI analysis temporarily unavailable", "Using fallback predictions"],
        riskFactors: ["Market volatility", "Weather conditions"],
        recommendations: {
          forBuyers: "Monitor prices closely for optimal purchase timing",
          forSellers: "Current market conditions are stable"
        },
        marketVolatility: "medium",
        priceRange: {
          min: currentPrice * 0.95,
          max: currentPrice * 1.05
        }
      };
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-forecast function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      fallbackData: {
        dailyPredictions: generateFallbackPredictions(1000, 30),
        overallTrend: "stable",
        averageConfidence: 60,
        keyInsights: ["Service temporarily unavailable"],
        riskFactors: ["Technical issues"],
        recommendations: {
          forBuyers: "Check back later for updated predictions",
          forSellers: "Use historical data for reference"
        },
        marketVolatility: "medium",
        priceRange: { min: 950, max: 1050 }
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateFallbackPredictions(basePrice: number, days: number) {
  const predictions = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    const predictedPrice = basePrice * (1 + variation);
    
    predictions.push({
      date: date.toISOString().split('T')[0],
      predictedPrice: Math.round(predictedPrice),
      confidence: Math.round(60 + Math.random() * 30), // 60-90% confidence
      factors: ["Market trends", "Regional demand"]
    });
  }
  return predictions;
}