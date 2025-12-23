export default async function handler(req, res) {
    // 1. DISABLE CACHING (Crucial for "Fresh News" button)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // 2. SETUP
    const apiKey = process.env.GEMINI_API_KEY;
    // Using the model you confirmed works
    const modelId = "gemini-2.5-flash-lite"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    // 3. PARSE INCOMING REQUEST
    let payload = req.body;
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) {}
    }
    const userInstruction = payload?.contents?.[0]?.parts?.[0]?.text || "News";

    // 4. CONSTRUCT AI REQUEST
    const aiPayload = {
        contents: [{
            parts: [{
                text: `
                You are a News API.
                ${userInstruction}
                
                CRITICAL RULES:
                1. Return ONLY a raw JSON Array.
                2. Keys must be: "title", "source", "description".
                3. Do NOT use Markdown code blocks (no \`\`\`json).
                4. Do NOT include any conversational text.
                `
            }]
        }],
        generationConfig: {
            // This forces the AI to output valid JSON, fixing the parsing error
            responseMimeType: "application/json", 
            maxOutputTokens: 600,
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

        // 5. ERROR HANDLING
        if (!response.ok) {
            console.error("❌ Google API Error:", JSON.stringify(data, null, 2));
            // Send the specific error back to the frontend so you can see it
            return res.status(500).json({ error: data.error?.message || "AI Service Unavailable" });
        }

        // 6. PARSE RESPONSE
        let finalData = [];
        try {
            // Since we used responseMimeType, content should be pure JSON
            let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
            finalData = JSON.parse(text);
        } catch (parseError) {
            console.error("❌ JSON Parse Error. Raw text:", data.candidates?.[0]?.content?.parts?.[0]?.text);
            return res.status(500).json({ error: "Failed to parse AI response" });
        }

        res.status(200).json(finalData);

    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ error: error.message });
    }
}
