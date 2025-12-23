export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. MODEL CONFIGURATION
    // We use the "Lite" model because it is the only one fast enough for Vercel Free Tier.
    const modelId = "gemini-2.5-flash-lite"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    // 2. PARSE INCOMING REQUEST
    // This captures the text from your button click (e.g., "Topic: indian-politics...")
    let payload = req.body;
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) {}
    }

    // Extract the prompt correctly
    const incomingPrompt = payload?.contents?.[0]?.parts?.[0]?.text || "News headlines";
    const today = new Date().toDateString();

    // 3. CONSTRUCT THE AI PAYLOAD
    const aiPayload = {
        contents: [{
            parts: [{
                text: `
                Current Date: ${today}.
                User Request: ${incomingPrompt}
                
                STRICT INSTRUCTIONS:
                1. Act as a news aggregator. Find 5 real, recent news headlines relevant to the topic.
                2. Return valid JSON only. No Markdown formatting (no \`\`\`json).
                3. Structure: An array of objects.
                4. Keys per object: "title", "source" (e.g. The Hindu, BBC), "description" (1 short sentence).
                `
            }]
        }],
        generationConfig: {
            maxOutputTokens: 600, // Keep it short for speed
            temperature: 0.3      // Low temperature = more factual/focused
        },
        safetySettings: [
            // Allow standard news content (politics, crime, etc.) without blocking
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
        ]
    };

    try {
        // 4. CALL GOOGLE API
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aiPayload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini Error:", data);
            return res.status(response.status).json({ error: "News service is busy. Please retry." });
        }

        // 5. PARSE RESPONSE (Text -> JSON)
        // We manually extract JSON to prevent crashes if the AI adds extra text
        let finalData = [];
        try {
            let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            
            // Clean up any Markdown the AI might have added
            text = text.replace(/```json/g, "").replace(/```/g, "").trim();
            
            // Extract the Array part [ ... ]
            const start = text.indexOf('[');
            const end = text.lastIndexOf(']');
            
            if (start !== -1 && end !== -1) {
                finalData = JSON.parse(text.substring(start, end + 1));
            } else {
                throw new Error("No JSON found");
            }
        } catch (parseError) {
            console.error("Parsing Failed:", parseError);
            // Fallback so the app doesn't look broken
            finalData = [
                { title: "News Update", source: "System", description: "Could not format news data. Please refresh." }
            ];
        }

        // 6. SEND TO FRONTEND
        res.status(200).json(finalData);

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
