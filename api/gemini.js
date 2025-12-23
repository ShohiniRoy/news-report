export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY;
    const cleanKey = apiKey ? apiKey.trim() : "";

    // Keep using the model that is working for you (likely 1.5-flash or 2.0-flash-exp)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;

    let payload = req.body;
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) {}
    }

    // Inject Date
    const today = new Date().toDateString();
    if (payload.contents && payload.contents[0] && payload.contents[0].parts && payload.contents[0].parts[0]) {
        const originalPrompt = payload.contents[0].parts[0].text;
        payload.contents[0].parts[0].text = `Today is ${today}. ${originalPrompt}`;
    }

    delete payload.tools; 
    delete payload.generationConfig;

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

        // --- 🟢 NEW FIX: CLEAN THE AI RESPONSE ---
        try {
            // Find the text inside the response
            const candidate = data.candidates[0];
            const part = candidate.content.parts[0];
            
            // Remove markdown code blocks (```json ... ```)
            if (part.text) {
                part.text = part.text.replace(/```json/g, "").replace(/```/g, "").trim();
            }
        } catch (cleanupError) {
            // If the structure is different, ignore and send raw data
            console.log("Cleanup skipped:", cleanupError);
        }
        // -----------------------------------------

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Server crashed" });
    }
}
