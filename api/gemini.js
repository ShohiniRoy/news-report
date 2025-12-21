export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY;
    const cleanKey = apiKey ? apiKey.trim() : "";

    // 1. USE THE STABLE 2.0 FLASH MODEL (It has the best chance of working)
    // If this gives 429, we will address the "New Project" step below.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`;

    let payload = req.body;

    // Safety: Ensure payload is an object
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) {}
    }

    // 2. FORCEFULLY REMOVE CONFLICTS (The Sanitize Step)
    // This fixes the "Tool use with response mime type" error
    if (payload.tools) delete payload.tools;
    if (payload.generationConfig) delete payload.generationConfig;

    // 3. Inject Date (The safe way to get fresh news)
    const today = new Date().toDateString();
    if (payload.contents && payload.contents[0] && payload.contents[0].parts && payload.contents[0].parts[0]) {
        const originalPrompt = payload.contents[0].parts[0].text;
        payload.contents[0].parts[0].text = `Today is ${today}. ${originalPrompt}`;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        // If Google sends an error, show it
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Server crashed" });
    }
}
