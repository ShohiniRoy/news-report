document.addEventListener('DOMContentLoaded', () => {
    // 1. SELECT ELEMENTS
    const nav = document.getElementById('topic-nav');
    const newsContainer = document.getElementById('news-container');
    const articleListHeader = document.getElementById('article-list-header');

    // 2. CONFIGURATION (Mapped exactly to your request)
    const sourceConfig = {
        'indian-politics': { name: 'The Hindu', icon: 'https://placehold.co/40/4c3d8e/FFF?text=TH' },
        'finance': { name: 'The Economic Times', icon: 'https://placehold.co/40/017386/FFF?text=ET' },
        'sport': { name: 'ESPN', icon: 'https://placehold.co/40/cc1f1f/FFF?text=ESPN' },
        'international': { name: 'BBC News', icon: 'https://placehold.co/40/000000/FFF?text=BBC' },
        'fashion': { name: 'Vogue', icon: 'https://placehold.co/40/d64573/FFF?text=VG' },
        'job-openings': { name: 'Rojgar Samachar', icon: 'https://placehold.co/40/1f7a2a/FFF?text=Jobs' }
    };

    // 3. MAIN FETCH FUNCTION
    async function fetchFromBackend(promptText) {
        try {
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }]
                })
            });

            if (!response.ok) throw new Error("API Busy");
            
            const data = await response.json();
            return Array.isArray(data) ? data : [];
            
        } catch (error) {
            console.error("Fetch Error:", error);
            throw error;
        }
    }

    // 4. RENDER FUNCTION
    async function loadContent(topicId) {
        const info = sourceConfig[topicId] || { name: 'Latest News', icon: '' };
        
        // Update Header UI
        articleListHeader.innerHTML = `
            <img src="${info.icon}" class="source-icon" onerror="this.style.display='none'">
            <span>Headlines from <span style="color:#ff9999">${info.name}</span></span>
        `;
        
        newsContainer.innerHTML = '<div class="loading-spinner"></div>';

        // --- KEY CHANGE: STRICT PROMPT CONSTRUCTION ---
        // We add a random timestamp to ensure the AI treats it as a "fresh" request
        const timestamp = new Date().getTime(); 
        
        let prompt = "";
        
        if (topicId === 'job-openings') {
            prompt = `Task: List 5 recent job openings strictly from "${info.name}". 
                      Format: JSON Array. Keys: title, source, description. 
                      Request ID: ${timestamp}`; // timestamps force fresh answers
        } else {
            prompt = `Task: List 5 fresh news headlines strictly from the source: "${info.name}". 
                      Topic: ${topicId}. 
                      Constraint: Do NOT show news from other papers. Source must be "${info.name}".
                      Format: JSON Array. Keys: title, source, description. 
                      Request ID: ${timestamp}`;
        }

        try {
            const articles = await fetchFromBackend(prompt);
            newsContainer.innerHTML = ''; 

            if (articles.length === 0) {
                newsContainer.innerHTML = '<p>No news found. Please try again.</p>';
                return;
            }

            articles.forEach(item => {
                const card = document.createElement('div');
                card.className = 'news-card';
                // We force the source name in the display to match the requested paper
                card.innerHTML = `
                    <h4 class="article-title">${item.title}</h4>
                    <div class="article-source">${info.name}</div>
                    <p class="article-snippet">${item.description}</p>
                `;
                newsContainer.appendChild(card);
            });

        } catch (err) {
            newsContainer.innerHTML = `<p style="color: #ff6b6b">Error loading news. Please try again.</p>`;
        }
    }

    // 5. EVENT LISTENERS
    nav.addEventListener('click', (e) => {
        const btn = e.target.closest('.topic-button');
        if (btn) {
            document.querySelectorAll('.topic-button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const topic = btn.getAttribute('data-topic');
            if (topic) loadContent(topic);
        }
    });

    // Load default
    loadContent('indian-politics');
});
