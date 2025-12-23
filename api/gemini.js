export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY;
    const cleanKey = apiKey ? apiKey.trim() : "";

    // ✅ OPTION 1: Standard Flash (Try this first)
    let modelName = 'gemini-2.5-flash';
    
    // ⚡ OPTION 2: Use "Lite" if you still get timeouts (Uncomment next line)
    // modelName = 'gemini-2.5-flash-lite'; 

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cleanKey}`;

    let payload = req.body;
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) {}
    }

    const today = new Date().toDateString();

    // 1. FAST PROMPT (Optimized for speed)
    if (payload.contents && payload.contents[0]?.parts?.[0]) {
        const originalPrompt = payload.contents[0].parts[0].text;
        payload.contents[0].parts[0].text = `
            ${originalPrompt}
            Date: ${today}.
            Task: Return a JSON array of 5 news headlines.
            Format: [{"title": "...", "description": "...", "source": "..."}]
            Constraint: Be concise. No Markdown. Pure JSON.
        `;
    }

    // 2. CONFIG FOR SPEED
    delete payload.tools;
    payload.generationConfig = {
        maxOutputTokens: 800, // Limits length to prevent 10s timeout
        temperature: 0.7
    };

    // 3. SAFETY SETTINGS (Critical for News)
    payload.safetySettings = [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
    ];

    try {
        // Log start time for debugging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000); // 9s timeout (safety net)

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId); // Clear timeout if successful

        const data = await response.json();

        if (!response.ok) {
            console.error("API Error:", data);
            return res.status(response.status || 500).json({ 
                error: data.error?.message || "Gemini API Error" 
            });
        }

        // 4. PARSING (Robust)
        let finalData = [];
        try {
            let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            // Clean Markdown wrappers
            text = text.replace(/```json/g, "").replace(/```/g, "").trim();
            
            // Find valid JSON array
            const firstBracket = text.indexOf('[');
            const lastBracket = text.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1) {
                finalData = JSON.parse(text.substring(firstBracket, lastBracket + 1));
            } else {
                throw new Error("No array found");
            }
        } catch (e) {
            console.log("Parse failed, returning fallback");
            // Return dummy data instead of crashing
            finalData = [{ title: "News is loading...", description: "Please refresh shortly.", source: "System" }];
        }

        res.status(200).json(finalData);

    } catch (error) {
        if (error.name === 'AbortError') {
            console.error("Request Timed Out (Vercel Limit)");
            return res.status(504).json({ error: "Request timed out. Try fewer headlines." });
        }
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
