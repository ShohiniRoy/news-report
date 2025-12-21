export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY;
    const cleanKey = apiKey ? apiKey.trim() : "";

    // AFTER ENABLING THE API, THIS MODEL WILL WORK
    // It allows 1,500 requests per day (vs 20 for the other one)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`;

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

    // Sanitize (Remove tools/config to prevent conflicts)
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

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Server crashed" });
    }
}
