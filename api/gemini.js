export default async function handler(req, res) {
    // 1. Get the key safely from the server environment
    const apiKey = process.env.GEMINI_API_KEY;

    // 2. Define the model (We stick with the working 2.5 model)
    // Note: We trim the key to avoid hidden space errors
    const cleanKey = apiKey ? apiKey.trim() : "";
   const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`;

    // 3. Prepare the data to send to Google
    // We need to modify the request to add the Date and Search Tools
    let payload = req.body;

    // Safety: Ensure payload is an object (sometimes it arrives as a string)
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) {}
    }

    // A. INJECT TODAY'S DATE
    // This tells Gemini what "recent" means right now
    const today = new Date().toDateString();
    if (payload.contents && payload.contents[0] && payload.contents[0].parts && payload.contents[0].parts[0]) {
        const originalPrompt = payload.contents[0].parts[0].text;
        payload.contents[0].parts[0].text = `Today is ${today}. ${originalPrompt}`;
    }

    // B. ENABLE GOOGLE SEARCH (GROUNDING)
    // This forces Gemini to browse the web for the latest news
    payload.tools = [
        { google_search: {} }
    ];

    try {
        // 4. Forward the modified request to Google
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload) // Send our modified payload
        });

        const data = await response.json();
        
        // If Google sends an error, forward it so we can debug easily
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        // 5. Send the answer back to your website
        res.status(200).json(data);
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Failed to fetch from Gemini" });
    }
}
