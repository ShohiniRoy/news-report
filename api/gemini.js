export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY;
    const cleanKey = apiKey ? apiKey.trim() : "";

    // ✅ CORRECT MODEL: Using Gemini 2.5 Flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;

    let payload = req.body;
    
    // Safety check: ensure payload is an object
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) {}
    }

    // 1. Inject Date & Prompt Logic
    const today = new Date().toDateString();
    if (payload.contents && payload.contents[0]?.parts?.[0]) {
        const originalPrompt = payload.contents[0].parts[0].text;
        payload.contents[0].parts[0].text = `
            Today is ${today}. 
            ${originalPrompt}
            RETURN ONLY JSON. Do not use Markdown.
        `;
    }

    // 2. Remove conflicting configs
    delete payload.tools;
    delete payload.generationConfig;

    // 3. FORCE STRICT JSON STRUCTURE (Critical for Gemini 2.5)
    // This tells the AI exactly what fields to return, preventing syntax errors.
    payload.generationConfig = {
        responseMimeType: "application/json",
        responseSchema: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    title: { type: "STRING" },
                    description: { type: "STRING" },
                    source: { type: "STRING" }
                }
            }
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API Error:", data);
            return res.status(response.status).json(data);
        }

        // 4. PARSE & VALIDATE ON SERVER
        let finalData = [];
        try {
            // Gemini 2.5 Structured Output usually puts the JSON directly in the text
            const candidateText = data.candidates[0].content.parts[0].text;
            finalData = JSON.parse(candidateText);
        } catch (parseError) {
            console.error("JSON Parse Failed:", parseError);
            finalData = [{ title: "News Unavailable", description: "Could not parse news data.", source: "System" }];
        }

        res.status(200).json(finalData);

    } catch (error) {
        console.error("Server Execution Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
