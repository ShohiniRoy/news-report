export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY;
    const cleanKey = apiKey ? apiKey.trim() : "";

    // ✅ Use the model that works for you (likely 1.5-flash or 2.5-flash)
    // If 1.5-flash was giving you 404, switch this back to 'gemini-2.5-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;

    let payload = req.body;
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) {}
    }

    // Inject Date & Strict Formatting Instructions
    const today = new Date().toDateString();
    if (payload.contents && payload.contents[0]?.parts?.[0]) {
        const originalPrompt = payload.contents[0].parts[0].text;
        // We add "Return strict JSON" to the prompt to be double safe
        payload.contents[0].parts[0].text = `Today is ${today}. Return a raw JSON list. ${originalPrompt}`;
    }

    // 🛑 DELETE tools, but...
    delete payload.tools;
    
    // ✅ ADD this configuration to force strict JSON output
    payload.generationConfig = {
        responseMimeType: "application/json"
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        // --- CLEANUP (Just in case) ---
        // Even with JSON mode, we check if we need to extract the text
        try {
            const candidate = data.candidates[0];
            const part = candidate.content.parts[0];
            
            // If the model wrapped it in markdown, remove it. 
            // JSON Mode usually prevents this, but this is a safety net.
            if (part.text) {
                part.text = part.text
                    .replace(/```json/g, "")
                    .replace(/```/g, "")
                    .trim();
            }
        } catch (e) {
            console.log("Cleanup skipped", e);
        }
        // -----------------------------

        res.status(200).json(data);
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Server crashed during fetch" });
    }
}
