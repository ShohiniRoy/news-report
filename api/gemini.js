// api/gemini.js - Updated to handle source mapping correctly
export default async function handler(req, res) {
    // 1. DISABLE CACHING
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    const apiKey = process.env.GEMINI_API_KEY;
    const modelId = "gemini-2.0-flash-lite"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    // 2. PARSE REQUEST & DETERMINE SOURCE
    let payload = req.body;
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) {}
    }
    
    const promptText = payload?.contents?.[0]?.parts?.[0]?.text || "";
    
    // Parse format: "Category|Source" or just "Category"
    const parts = promptText.split('|');
    const category = parts[0] || "";
    const explicitSource = parts[1] || "";
    
    // Define source mapping
    const sourceMap = {
        "Politics": explicitSource || "The Hindu",
        "Finance": explicitSource || "Economic Times",
        "Tech": explicitSource || "Wired",
        "Sport": explicitSource || "ESPN",
        "World": explicitSource || "BBC News",
        "Fashion": explicitSource || "Vogue",
        "Jobs": explicitSource || "LinkedIn News"
    };
    
    const newsSource = sourceMap[category] || "BBC News";
    const categoryName = category.toLowerCase();

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // 3. CONSTRUCT AI PAYLOAD WITH SOURCE-SPECIFIC PROMPT
    const aiPayload = {
        contents: [{
            parts: [{
                text: `You are a real-time news aggregator. Today's date is ${today}.

Fetch the LATEST and MOST RECENT news headlines specifically from "${newsSource}" about ${categoryName}.

CRITICAL REQUIREMENTS:
1. ALL articles MUST be from "${newsSource}" - no other sources
2. Provide REAL, CURRENT news from TODAY or the last 24-48 hours
3. Include actual headlines with specific names, places, numbers, and details
4. Each description must have concrete facts from the actual story
5. Return EXACTLY 5-8 recent articles

Return ONLY a raw JSON Array with this exact structure:
[
  {
    "title": "Actual specific headline from ${newsSource}",
    "source": "${newsSource}",
    "description": "Detailed 2-3 sentence summary with specific facts, names, and numbers from the actual article. Include key details that make this story unique and newsworthy."
  }
]

STRICT RULES:
- NO markdown code blocks or formatting
- NO generic placeholders like "New policy announced" or "Breaking news"
- Use REAL headlines from ${newsSource} with actual specifics
- Include real names of people, places, companies, or events
- Make descriptions informative with concrete details
- Every article MUST clearly be from ${newsSource}
- Return ONLY the JSON array, absolutely nothing else`
            }]
        }],
        generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 2500,
            temperature: 0.8,
            topP: 0.95
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aiPayload)
        });

        const data = await response.json();

        // 4. HANDLE RATE LIMITS OR ERRORS
        if (!response.ok) {
            console.warn(`⚠️ API Error (${response.status}). Retrying...`);
            return await retryWithSimplePrompt(url, newsSource, categoryName, today, res);
        }

        // 5. PARSE SUCCESSFUL DATA
        let finalData = [];
        try {
            let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
            
            // Clean any markdown artifacts
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            finalData = JSON.parse(text);
            
            // Validate that we got real data
            if (!Array.isArray(finalData) || finalData.length === 0) {
                throw new Error("Empty response");
            }
            
            // Ensure each article has required fields and correct source
            finalData = finalData.map(article => ({
                title: article.title || "News Update",
                source: newsSource, // Force correct source
                description: article.description || "Loading details..."
            })).slice(0, 8); // Limit to 8 articles
            
        } catch (e) {
            console.error("Parse error:", e.message);
            return await retryWithSimplePrompt(url, newsSource, categoryName, today, res);
        }

        res.status(200).json(finalData);

    } catch (error) {
        console.error("❌ Server Error:", error.message);
        // Return error message with correct source
        res.status(200).json([{
            title: "Service Temporarily Unavailable",
            source: newsSource,
            description: "We're experiencing high traffic. Please try refreshing the page in a few seconds."
        }]);
    }
}

// HELPER: Retry with a simpler, more reliable prompt
async function retryWithSimplePrompt(url, newsSource, category, today, res) {
    const simplePayload = {
        contents: [{
            parts: [{
                text: `Get 6 current ${category} news headlines from ${newsSource} for ${today}.

Use real, specific headlines with actual details. 

Return as JSON array:
[{"title": "specific headline", "source": "${newsSource}", "description": "detailed summary with facts"}]

Only JSON, no other text.`
            }]
        }],
        generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 1800,
            temperature: 0.7
        }
    };

    try {
        const retryResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(simplePayload)
        });

        const retryData = await retryResponse.json();
        
        if (retryResponse.ok && retryData.candidates?.[0]?.content?.parts?.[0]?.text) {
            let text = retryData.candidates[0].content.parts[0].text;
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            let articles = JSON.parse(text);
            
            // Ensure correct source
            articles = articles.map(a => ({
                ...a,
                source: newsSource
            }));
            
            return res.status(200).json(articles);
        }
    } catch (e) {
        console.error("Retry failed:", e.message);
    }

    // Final fallback with correct source
    return res.status(200).json([{
        title: "Unable to Load Current News",
        source: newsSource,
        description: `We're having trouble connecting to ${newsSource}. Please refresh the page or try again in a moment.`
    }]);
}
