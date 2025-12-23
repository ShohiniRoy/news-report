document.addEventListener('DOMContentLoaded', () => {
    // 1. SELECT ELEMENTS
    const nav = document.getElementById('topic-nav');
    const newsContainer = document.getElementById('news-container');
    const articleListHeader = document.getElementById('article-list-header');

    // 2. CONFIGURATION (Icons & Sources)
    const sourceConfig = {
        'indian-politics': { name: 'The Hindu', icon: 'https://placehold.co/40/4c3d8e/FFF?text=TH' },
        'international': { name: 'BBC News', icon: 'https://placehold.co/40/000000/FFF?text=BBC' },
        'sport': { name: 'ESPN', icon: 'https://placehold.co/40/cc1f1f/FFF?text=SP' },
        'tech': { name: 'Wired', icon: 'https://placehold.co/40/333333/FFF?text=TC' },
        'finance': { name: 'Economic Times', icon: 'https://placehold.co/40/017386/FFF?text=ET' },
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
            
            // Critical Check: Is it an array?
            return Array.isArray(data) ? data : [];
            
        } catch (error) {
            console.error("Fetch Error:", error);
            throw error;
        }
    }

    // 4. RENDER FUNCTION
    async function loadContent(topicId) {
        // UI Updates
        const info = sourceConfig[topicId] || { name: 'Latest News', icon: '' };
        
        articleListHeader.innerHTML = `
            <img src="${info.icon}" class="source-icon" onerror="this.style.display='none'">
            <span>Headlines from <span style="color:#ff9999">${info.name}</span></span>
        `;
        
        newsContainer.innerHTML = '<div class="loading-spinner"></div>';

        // Prepare Prompt
        let prompt = "";
        if (topicId === 'job-openings') {
            prompt = `Task: List 5 recent job openings (Govt & Private). Format: JSON Array. Keys: title, source, description.`;
        } else {
            prompt = `Topic: ${topicId}. Source preferred: ${info.name}. Task: List 5 news headlines. Format: JSON Array. Keys: title, source, description.`;
        }

        try {
            const articles = await fetchFromBackend(prompt);
            newsContainer.innerHTML = ''; // Clear loader

            if (articles.length === 0) {
                newsContainer.innerHTML = '<p>No news found. Please try again.</p>';
                return;
            }

            // Create Cards
            articles.forEach(item => {
                const card = document.createElement('div');
                card.className = 'news-card';
                card.innerHTML = `
                    <h4 class="article-title">${item.title}</h4>
                    <div class="article-source">${item.source || info.name}</div>
                    <p class="article-snippet">${item.description}</p>
                `;
                newsContainer.appendChild(card);
            });

        } catch (err) {
            newsContainer.innerHTML = `<p style="color: #ff6b6b">Error loading news. Please try again.</p>`;
        }
    }

    // 5. EVENT LISTENER (Fixing the buttons)
    nav.addEventListener('click', (e) => {
        // Find the closest button (in case they clicked an icon inside)
        const btn = e.target.closest('.topic-button');
        
        if (btn) {
            // Remove active class from all
            document.querySelectorAll('.topic-button').forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');
            
            // Load Data
            const topic = btn.getAttribute('data-topic');
            if (topic) loadContent(topic);
        }
    });

    // Load default topic on start
    loadContent('indian-politics');
});
