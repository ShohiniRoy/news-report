export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY;
    const cleanKey = apiKey ? apiKey.trim() : "";

    // ✅ CORRECT MODEL: gemini-2.5-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;

    let payload = req.body;
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) {}
    }

    const today = new Date().toDateString();
    
    // 1. SIMPLIFIED PROMPT
    if (payload.contents && payload.contents[0]?.parts?.[0]) {
        const originalPrompt = payload.contents[0].parts[0].text;
        payload.contents[0].parts[0].text = `
            Today is ${today}. 
            ${originalPrompt}
            
            STRICT INSTRUCTION:
            Return a valid JSON array of objects.
            Each object must have: "title", "description", "source".
            Do not use Markdown code blocks. Just the raw JSON array.
        `;
    }

    // 2. CLEAR CONFIG
    delete payload.tools;
    delete payload.generationConfig;

    // 3. CRITICAL: LOOSEN SAFETY FILTERS
    // This prevents the "Invalid Response" error for news topics.
    payload.safetySettings = [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
    ];

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API Error Detail:", JSON.stringify(data, null, 2));
            return res.status(response.status).json({ error: data.error?.message || "API Error" });
        }

        // 4. ROBUST PARSING (Text Mode)
        // We manually find the JSON array in the text. This is safer than Schema mode for News.
        let finalData = [];
        try {
            let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            
            // Clean up Markdown if it still appears
            text = text.replace(/```json/g, "").replace(/```/g, "").trim();

            // Find the start and end of the JSON array
            const firstBracket = text.indexOf('[');
            const lastBracket = text.lastIndexOf(']');
            
            if (firstBracket !== -1 && lastBracket !== -1) {
                text = text.substring(firstBracket, lastBracket + 1);
                finalData = JSON.parse(text);
            } else {
                throw new Error("No JSON array found in response");
            }
            
        } catch (parseError) {
            console.error("Parsing Failed. Raw text was:", data.candidates?.[0]?.content?.parts?.[0]?.text);
            finalData = [
                { title: "News System Update", description: "Please refresh the page.", source: "System" }
            ];
        }

        res.status(200).json(finalData);

    } catch (error) {
        console.error("Server Crash:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
