export default async function handler(req, res) {
    // 1. Get the key safely from the server environment
    const apiKey = process.env.GEMINI_API_KEY;

    // 2. Define the model (Must match your working model!)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
        // 3. Forward the request to Google
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body) // Pass the prompt from your frontend
        });

        const data = await response.json();
        
        // 4. Send the answer back to your website
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch from Gemini" });
    }
}
