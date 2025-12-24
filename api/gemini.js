// api/gemini.js
export default async function handler(req, res) {
    // 1. Security & Config
    // Ensure you have named your variable "GEMINI_API_KEY" in Vercel Project Settings
    const apiKey = process.env.GEMINI_API_KEY; 
    
    // Prevent browser caching so news is always fresh
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 2. Parse Frontend Data
        const { promptContext } = req.body;
        const category = promptContext?.category || "General";
        const source = promptContext?.source || "Google News";
        const today = new Date().toDateString();

        // 3. Construct the AI Prompt
        const aiPrompt = `
        Act as a news API. 
        Task: Fetch 6 current, real news headlines specifically from the source "${source}" related to "${category}".
        Date: ${today}.
        
        Strict Output Rules:
        1. Return ONLY a valid JSON array. No Markdown (no \`\`\`json).
        2. Ensure every article object has these keys: "title", "description", "url", "source", "image".
        3. For "url", generate a Google Search link for the headline if the real link is unavailable.
        4. For "image", use a generic placeholder URL if unavailable.
        
        Example Output Format:
        [{"title": "Headline Here", "description": "Short summary...", "source": "${source}", "url": "https://google.com", "image": "https://via.placeholder.com/300"}]
        `;

        // 4. Call Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: aiPrompt }] }]
            })
        });

        const data = await response.json();

        // 5. Clean & Parse Response
        let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        
        // Remove markdown fencing if Gemini adds it
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

        const articles = JSON.parse(rawText);

        res.status(200).json(articles);

    } catch (error) {
        console.error("Backend Error:", error);
        // Return fallback data so the UI doesn't break
        res.status(500).json([
            {
                title: "System Update",
                description: "We are currently updating our news sources. Please try again in a moment.",
                source: "System",
                url: "#",
                image: "https://via.placeholder.com/300"
            }
        ]);
    }
}
