// api/gemini.js
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
    
    // Extract the news source from the prompt
    let newsSource = "BBC News";
    let category = "general";
    
    if (promptText.includes("Politics")) {
        newsSource = "BBC News";
        category = "politics";
    } else if (promptText.includes("Sport")) {
        newsSource = "ESPN";
        category = "sports";
    } else if (promptText.includes("Finance")) {
        newsSource = "Bloomberg";
        category = "finance";
    } else if (promptText.includes("Tech")) {
        newsSource = "Wired";
        category = "technology";
    } else if (promptText.includes("Fashion")) {
        newsSource = "Vogue";
        category = "fashion";
    } else if (promptText.includes("World")) {
        newsSource = "CNN";
        category = "world news";
    } else if (promptText.includes("Jobs")) {
        newsSource = "Financial Times";
        category = "business and jobs";
    }

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // 3. CONSTRUCT AI PAYLOAD WITH ENHANCED PROMPT
    const aiPayload = {
        contents: [{
            parts: [{
                text: `You are a real-time news aggregator. Today's date is ${today}.

Fetch the LATEST and MOST RECENT news headlines from ${newsSource} about ${category}.

IMPORTANT INSTRUCTIONS:
1. Provide REAL, CURRENT news from ${newsSource} - not generic or placeholder content
2. Each article must be from TODAY or the last 24-48 hours
3. Include actual, specific details from real news stories
4. Return EXACTLY 5-7 recent articles

Return ONLY a raw JSON Array with this structure:
[
  {
    "title": "Specific, real headline from ${newsSource}",
    "source": "${newsSource} (ARCHIVED)",
    "description": "Detailed 2-3 sentence summary with specific facts and details from the actual article"
  }
]

Rules:
- NO markdown code blocks
- NO generic placeholders like "New policy announced" 
- Use REAL headlines with specific names, places, numbers
- Include actual details from current events
- Make descriptions informative and specific
- Return ONLY the JSON array, nothing else`
            }]
        }],
        generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 2000,
            temperature: 0.7
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
            console.warn(`⚠️ API Error (${response.status}). Retrying with simpler prompt...`);
            
            // Retry with a simpler, more direct prompt
            return await retryWithSimplePrompt(url, newsSource, category, today, res);
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
                throw new Error("Empty or invalid response");
            }
            
            // Ensure each article has required fields
            finalData = finalData.map(article => ({
                title: article.title || "News Update",
                source: article.source || newsSource,
                description: article.description || "Live updates are being fetched..."
            }));
            
        } catch (e) {
            console.error("Parse error:", e.message);
            // If parsing fails, retry with simpler prompt
            return await retryWithSimplePrompt(url, newsSource, category, today, res);
        }

        res.status(200).json(finalData);

    } catch (error) {
        console.error("❌ Server Error:", error.message);
        // Last resort: return a message asking to retry
        res.status(200).json([{
            title: "Unable to Load Current News",
            source: newsSource,
            description: "We're having trouble fetching the latest news. Please refresh the page or try again in a moment."
        }]);
    }
}

// HELPER: Retry with a simpler, more reliable prompt
async function retryWithSimplePrompt(url, newsSource, category, today, res) {
    const simplePayload = {
        contents: [{
            parts: [{
                text: `List 5 current ${category} news headlines from ${newsSource} for ${today}. 

Format as JSON array:
[{"title": "headline", "source": "${newsSource} (ARCHIVED)", "description": "summary"}]

Be specific and use real current events. Return only JSON.`
            }]
        }],
        generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 1500,
            temperature: 0.5
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
            
            const articles = JSON.parse(text);
            return res.status(200).json(articles);
        }
    } catch (e) {
        console.error("Retry failed:", e.message);
    }

    // If everything fails, return a helpful message
    return res.status(200).json([{
        title: "Service Temporarily Unavailable",
        source: newsSource,
        description: "We're experiencing high traffic. Please try refreshing the page in a few seconds."
    }]);
}
