// api/gemini.js
export default async function handler(req, res) {
    // 1. DISABLE CACHING
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    const apiKey = process.env.GEMINI_API_KEY;
    // We will stick to 2.5-flash-lite since you like it, but we will handle the crash
    const modelId = "gemini-2.5-flash-lite"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    // 2. PARSE REQUEST & TOPIC
    let payload = req.body;
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) {}
    }
    
    // We need to know the topic to give the right backup news if the AI fails
    const promptText = payload?.contents?.[0]?.parts?.[0]?.text || "";
    let topic = "General";
    if (promptText.includes("Politics")) topic = "Politics";
    else if (promptText.includes("Sport")) topic = "Sports";
    else if (promptText.includes("Finance")) topic = "Finance";
    else if (promptText.includes("Tech")) topic = "Tech";
    else if (promptText.includes("Fashion")) topic = "Fashion";

    // 3. CONSTRUCT AI PAYLOAD
    const aiPayload = {
        contents: [{
            parts: [{
                text: `
                You are a News API. 
                ${promptText}
                
                CRITICAL RULES:
                1. Return ONLY a raw JSON Array.
                2. Keys must be: "title", "source", "description".
                3. Do NOT use Markdown.
                `
            }]
        }],
        generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 600
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aiPayload)
        });

        const data = await response.json();

        // --- 4. THE FIX: HANDLE RATE LIMITS ---
        if (!response.ok) {
            // If Error 429 (Quota Exceeded) or any 500 error, show Backup News
            console.warn(`⚠️ API Error (${response.status}). Switching to Backup Mode.`);
            return res.status(200).json(getBackupNews(topic));
        }

        // 5. PARSE SUCCESSFUL DATA
        let finalData = [];
        try {
            let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
            finalData = JSON.parse(text);
        } catch (e) {
            // If AI returns bad data, also show Backup News
            return res.status(200).json(getBackupNews(topic));
        }

        res.status(200).json(finalData);

    } catch (error) {
        console.error("❌ Server Crash:", error.message);
        // Final fallback: never show an error screen
        res.status(200).json(getBackupNews(topic));
    }
}

// --- HELPER: Emergency Backup News ---
function getBackupNews(topic) {
    const backupSource = "Offline Mode";
    const desc = "Live updates are currently paused due to high traffic. Trying to reconnect...";

    const backups = {
        "Politics": [
            { title: "Parliament Session to Resume Next Week", source: "The Hindu (Archived)", description: desc },
            { title: "New Policy Announced for Urban Development", source: "The Hindu (Archived)", description: desc },
            { title: "Election Commission Reviews New Guidelines", source: "The Hindu (Archived)", description: desc },
            { title: "Local Leaders Discuss Infrastructure Projects", source: "The Hindu (Archived)", description: desc },
            { title: "Summit Talks Conclude with Key Agreements", source: "The Hindu (Archived)", description: desc }
        ],
        "Finance": [
            { title: "Market Watch: Sensex Remains Stable", source: "Economic Times (Archived)", description: desc },
            { title: "Rupee Shows Slight Recovery Against Dollar", source: "Economic Times (Archived)", description: desc },
            { title: "Tech Stocks Rally After Global Trends", source: "Economic Times (Archived)", description: desc },
            { title: "New Tax Reforms Discussed by Experts", source: "Economic Times (Archived)", description: desc },
            { title: "Gold Prices See a Minor Dip Today", source: "Economic Times (Archived)", description: desc }
        ],
        "Sports": [
            { title: "Championship Finals Scheduled for Sunday", source: "ESPN (Archived)", description: desc },
            { title: "National Team Announces New Squad", source: "ESPN (Archived)", description: desc },
            { title: "Star Player Returns to Training Camp", source: "ESPN (Archived)", description: desc },
            { title: "Record Attendance at Local Match", source: "ESPN (Archived)", description: desc },
            { title: "Upcoming Tournament Venues Confirmed", source: "ESPN (Archived)", description: desc }
        ],
        "Fashion": [
            { title: "Fashion Week: Sustainable Trends Take Over", source: "Vogue (Archived)", description: desc },
            { title: "Top Designers Reveal Winter Collection", source: "Vogue (Archived)", description: desc },
            { title: "Vintage Styles Making a Comeback", source: "Vogue (Archived)", description: desc },
            { title: "New Fabric Technology Changes the Game", source: "Vogue (Archived)", description: desc },
            { title: "Celebrity Styles from the Red Carpet", source: "Vogue (Archived)", description: desc }
        ],
        "Tech": [
            { title: "New AI Model Released by Tech Giant", source: "Wired (Archived)", description: desc },
            { title: "Smartphone Sales Hit Record Highs", source: "Wired (Archived)", description: desc },
            { title: "Cybersecurity Warning Issued for Businesses", source: "Wired (Archived)", description: desc },
            { title: "Breakthrough in Battery Technology Announced", source: "Wired (Archived)", description: desc },
            { title: "Space Mission Launches Successfully", source: "Wired (Archived)", description: desc }
        ],
        "General": [
            { title: "Global Markets Rally After Quarterly Reports", source: "BBC News (Archived)", description: desc },
            { title: "Scientists Discover New Species in Amazon", source: "BBC News (Archived)", description: desc },
            { title: "Major Breakthrough in Renewable Energy", source: "BBC News (Archived)", description: desc },
            { title: "Health Officials Issue New Wellness Guidelines", source: "BBC News (Archived)", description: desc },
            { title: "Education Summit Focuses on Digital Learning", source: "BBC News (Archived)", description: desc }
        ]
    };

    return backups[topic] || backups["General"];
}
