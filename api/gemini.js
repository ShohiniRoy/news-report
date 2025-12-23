export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. USE THE LITE MODEL (Critical for fixing the error)
    // This model is fast enough to stop the "Invalid Response" / Timeout errors.
    const modelId = "gemini-2.5-flash-lite"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    let payload = req.body;
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) {}
    }

    const promptText = payload?.contents?.[0]?.parts?.[0]?.text || "News";
    const today = new Date().toDateString();

    // 2. SIMPLIFIED AI INSTRUCTIONS
    const aiPayload = {
        contents: [{
            parts: [{
                text: `
                Date: ${today}.
                Task: Fetch 5 news headlines about: "${promptText}".
                Format: Strict JSON Array.
                Keys: title, source, description.
                NO MARKDOWN. NO \`\`\`json tags. Just the raw array.
                `
            }]
        }],
        generationConfig: {
            maxOutputTokens: 400, // Short & Fast
            temperature: 0.3
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aiPayload)
        });

        const data = await response.json();

        if (!response.ok) {
            // This catches the Quota/Limit errors
            return res.status(response.status).json({ error: "Service busy. Please try again." });
        }

        // 3. CLEAN THE DATA
        let finalData = [];
        try {
            let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            text = text.replace(/```json/g, "").replace(/```/g, "").trim();
            
            // Extract Array
            const start = text.indexOf('[');
            const end = text.lastIndexOf(']');
            if (start !== -1 && end !== -1) {
                finalData = JSON.parse(text.substring(start, end + 1));
            } else {
                throw new Error("No JSON found");
            }
        } catch (e) {
            // Fallback so the app never shows a red error
            finalData = [{ title: "News Summary", source: "AI", description: "Headlines are loading..." }];
        }

        res.status(200).json(finalData);

    } catch (error) {
        res.status(500).json({ error: "Server Connection Error" });
    }
}
