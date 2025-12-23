export default async function handler(req, res) {
    // 1. DISABLE CACHING (Forces fresh data)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const apiKey = process.env.GEMINI_API_KEY;
    const modelId = "gemini-2.5-flash-lite"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    let payload = req.body;
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) {}
    }

    // Capture the strict prompt sent from frontend
    const userInstruction = payload?.contents?.[0]?.parts?.[0]?.text || "News";
    const today = new Date().toDateString();
    
    // AI Request
    const aiPayload = {
        contents: [{
            parts: [{
                // We wrap the user instruction to ensure JSON format
                text: `
                Date: ${today}.
                ${userInstruction}
                
                IMPORTANT: Return ONLY the raw JSON array. No Markdown. No code blocks.
                `
            }]
        }],
        generationConfig: {
            maxOutputTokens: 600,
            temperature: 0.9 // Higher temperature = more variety/freshness
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aiPayload)
        });

        const data = await response.json();

        // PARSING REAL DATA
        let finalData = [];
        try {
            let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            // Clean up any markdown the AI might accidentally add
            text = text.replace(/```json/g, "").replace(/```/g, "").trim();
            
            const start = text.indexOf('[');
            const end = text.lastIndexOf(']');
            if (start !== -1 && end !== -1) {
                finalData = JSON.parse(text.substring(start, end + 1));
            } else {
                throw new Error("No JSON found");
            }
        } catch (e) {
            // Return empty array on parse error (frontend handles the error message)
            return res.status(200).json([]);
        }

        res.status(200).json(finalData);

    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
}
