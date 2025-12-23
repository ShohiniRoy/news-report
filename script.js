// --- 1. FETCH FUNCTION (Connects to your Lite Backend) ---
async function fetchNewsWithGemini(topic) {
    const textApiUrl = '/api/gemini'; 

    const sourceMapping = {
        'indian-politics': ["The Hindu"],
        'finance': ["The Economic Times", "Mint"],
        'tech': ["Wired", "TechCrunch"],
        'sport': ["ESPN", "Cricbuzz"],
        'international': ["BBC", "Reuters"],
        'fashion': ["Vogue"]
    };

    const sources = sourceMapping[topic] || [];
    const sourceText = sources.length ? ` from ${sources.join(', ')}` : "";
    
    // Simple prompt for the Lite model
    const prompt = `Topic: ${topic}${sourceText}. Task: List 5 distinct news headlines. Format: JSON Array. Keys: title, source, description.`;

    try {
        const response = await fetch(textApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) throw new Error("API Busy");
        const data = await response.json();

        // Safety: ensure we return an array
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error(e);
        return []; // Return empty list on error (prevents crash)
    }
}

// --- 2. RENDER FUNCTION (Creates the beautiful cards) ---
async function renderHeadlines(topic) {
    const headlinesSection = document.getElementById('headlines-section');
    const newsContainer = document.getElementById('news-container');
    const articleListHeader = document.getElementById('article-list-header');

    // 1. Setup UI
    headlinesSection.style.display = 'block';
    const sourceNames = {
        'indian-politics': 'The Hindu',
        'finance': 'The Economic Times',
        'tech': 'Tech Sources',
        'sport': 'Sports News',
        'international': 'World News',
        'fashion': 'Vogue'
    };
    
    // Set Header Text
    articleListHeader.innerHTML = `Headlines from <span style="color:#ff8c8c">${sourceNames[topic] || 'News'}</span>`;
    
    // Show Loader
    newsContainer.innerHTML = `<div class="loading-spinner"></div>`;

    // 2. Fetch Data
    const articles = await fetchNewsWithGemini(topic);

    // 3. Clear Loader
    newsContainer.innerHTML = '';

    // 4. Render Cards
    if (articles.length > 0) {
        articles.forEach(article => {
            const card = document.createElement('div');
            card.className = 'news-card'; // Uses the new CSS class
            
            card.innerHTML = `
                <h4 class="article-title">${article.title}</h4>
                <div class="article-source">${article.source || "News Source"}</div>
                <p class="article-snippet">${article.description}</p>
            `;
            
            newsContainer.appendChild(card);
        });
    } else {
        newsContainer.innerHTML = `<p style="color: #ccc; text-align: center;">No news found. Please try again.</p>`;
    }
}
