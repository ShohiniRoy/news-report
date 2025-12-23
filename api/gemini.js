export default async function handler(req, res) {
    // 1. DEBUG: Print the key status to Vercel Logs
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ CRITICAL: No API Key found in environment variables!");
        return res.status(500).json({ error: "Server Configuration Error: Missing Key" });
    }
    console.log(`✅ Using Key: ${apiKey.substring(0, 5)}...`);

    // 2. MODEL: Use the specialized "Lite" model for speed
    // This model is the only one fast enough for Vercel Free Tier (10s limit)
    const modelId = "gemini-2.5-flash-lite"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    try {
        // 3. PROMPT: Keep it ridiculously simple to test connection
        const payload = {
            contents: [{ parts: [{ text: "Write 3 short news headlines about Tech." }] }],
            generationConfig: {
                maxOutputTokens: 200, // Very short limit to force speed
                temperature: 0.7
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // 4. ERROR HANDLING: Capture Google's exact error message
        if (!response.ok) {
            console.error("❌ Google API Error:", JSON.stringify(data, null, 2));
            return res.status(response.status).json({ 
                error: data.error?.message || `Google API Error (${response.status})`
            });
        }

        // 5. SUCCESS: Just extract the text safely
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No text returned";
        
        // Return a dummy list so your frontend doesn't crash
        const safeData = [
            { title: "Connection Successful", description: text, source: "System Check" }
        ];

        console.log("✅ Success! Sending data...");
        res.status(200).json(safeData);

    } catch (error) {
        console.error("❌ Server Crash:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
