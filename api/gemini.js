export default async function handler(req, res) {
    // 1. DISABLE CACHING
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const apiKey = process.env.GEMINI_API_KEY;
    const modelId = "gemini-2.5-flash-lite"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    let payload = req.body;
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) {}
    }

    const promptText = payload?.contents?.[0]?.parts?.[0]?.text || "News";
    const today = new Date().toDateString();
    
    // ✅ FIX: FORCE INDIAN STANDARD TIME (IST)
    const timeNow = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });

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
            maxOutputTokens: 400,
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

        // 2. BACKUP MODE
        if (!response.ok) {
            console.warn("⚠️ Google API Busy. Sending Backup.");
            
            const backupNews = [
                { 
                    title: "⚠️ Live News Paused (Google Limit)", 
                    source: "System Alert", 
                    description: `You are refreshing too fast. Last attempt: ${timeNow} IST. Please wait 60s.` 
                },
                { 
                    title: "Market Watch: Global Stocks Steady", 
                    source: "Archive", 
                    description: "Major indices show resilience amidst shifting economic policies." 
                },
                { 
                    title: "Tech Innovation Summit Announced", 
                    source: "Archive", 
                    description: "Leading tech giants gather to discuss the future of AI and privacy." 
                },
                { 
                    title: "Sports Update: Championship Finals Set", 
                    source: "Archive", 
                    description: "Top teams qualify for the upcoming international tournament." 
                },
                { 
                    title: "New Climate Policy Ratified", 
                    source: "Archive", 
                    description: "Nations agree on ambitious new targets for carbon reduction." 
                }
            ];
            
            return res.status(200).json(backupNews);
        }

        // 3. PARSING
        let finalData = [];
        try {
            let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            text = text.replace(/```json/g, "").replace(/```/g, "").trim();
            
            const start = text.indexOf('[');
            const end = text.lastIndexOf(']');
            if (start !== -1 && end !== -1) {
                finalData = JSON.parse(text.substring(start, end + 1));
            } else {
                throw new Error("No JSON found");
            }
        } catch (e) {
            finalData = [{ title: "News Loading...", source: "System", description: "Please wait a moment." }];
        }

        res.status(200).json(finalData);

    } catch (error) {
        res.status(200).json([]);
    }
}
