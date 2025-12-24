// api/gemini.js
export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
        // 1. Get the combined string "category|source"
        const incomingText = req.body.contents[0].parts[0].text;
        
        // 2. Split it apart
        const [category, source] = incomingText.split('|');
        
        // 3. Create the prompt
        // We strictly tell Gemini to look for news from the specific 'source'
        const prompt = `You are a news aggregator. 
        Task: Find 6 distinct, real news headlines specifically from the newspaper "${source}" regarding "${category}".
        Date: ${new Date().toDateString()}.
        
        Format: Return ONLY a raw JSON array (no markdown).
        Structure: [{"title": "Headline", "description": "Summary", "source": "${source}", "url": "google.com"}]`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        // 4. Clean the response (remove ```json if present)
        let rawText = data.candidates[0].content.parts[0].text;
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const articles = JSON.parse(rawText);

        res.status(200).json(articles);

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json([]);
    }
}
