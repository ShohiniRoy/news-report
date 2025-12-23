const nav = document.getElementById('topic-nav');
const headlinesSection = document.getElementById('headlines-section');
const newsContainer = document.getElementById('news-container');
const articleListHeader = document.getElementById('article-list-header');

// 1. FIXED FETCH FUNCTION
// This now expects a simple Array from your backend, not the complex Google object.
async function fetchNewsWithGemini(topic) {
    const textApiUrl = '/api/gemini'; 

    // We keep your source logic, it's good.
    const sourceMapping = {
        'indian-politics': ["The Hindu"],
        'international': ["BBC News"],
        'sports': ["ESPN"],
        'technology': ["Wired", "The Wall Street Journal"],
        'finance': ["The Economic Times", "The Wall Street Journal"],
        'fashion': ["Vogue"]
    };

    const specificSources = sourceMapping[topic] || [];
    const sourcesPrompt = specificSources.length > 0 ? ` from: ${specificSources.join(', ')}` : "";
    
    // Simplified prompt for the Lite model
    const prompt = `Topic: "${topic}"${sourcesPrompt}. Task: List 5 news headlines. Format: JSON Array. Keys: title, source, description.`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }]
        // Note: We removed the strict schema here because the backend handles it now.
    };

    try {
        const response = await fetch(textApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Server Error");
        }

        const data = await response.json();

        // CRITICAL FIX: The backend now sends the array directly!
        if (Array.isArray(data)) {
            return data;
        } else {
            console.error("Unexpected data:", data);
            return []; // Return empty list instead of crashing
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        throw error;
    }
}

// 2. FIXED JOBS FUNCTION
async function fetchJobsWithGemini() {
    const textApiUrl = '/api/gemini'; 

    const prompt = `Task: List 5 recent job openings (Govt 'Rojgar Samachar' + Private). Format: JSON Array. Keys: title, company, description.`;
    
    const payload = {
        contents: [{ parts: [{ text: prompt }] }]
    };

    try {
        const response = await fetch(textApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Server Error");
        }

        const data = await response.json();

        // CRITICAL FIX: Check for array directly
        if (Array.isArray(data)) {
            return data;
        } else {
            return []; 
        }
    } catch (error) {
        console.error("Fetch Jobs Error:", error);
        throw error;
    }
}

// --- The rest of your UI logic remains mostly the same ---

const sourceIcons = {
    'indian-politics': { name: 'The Hindu', icon: 'https://placehold.co/40x40/4c3d8e/ffffff?text=TH' },
    'international': { name: 'BBC News', icon: 'https://placehold.co/40x40/000000/ffffff?text=BBC' },
    'sports': { name: 'ESPN', icon: 'https://placehold.co/40x40/cc1f1f/ffffff?text=E' },
    'technology': { name: 'Wired & WSJ', icon: 'https://placehold.co/40x40/333333/ffffff?text=W' },
    'finance': { name: 'The Economic Times & WSJ', icon: 'https://placehold.co/40x40/017386/ffffff?text=F' },
    'fashion': { name: 'Vogue', icon: 'https://placehold.co/40x40/d64573/ffffff?text=V' },
    'job-openings': { name: 'Rojgar Samachar', icon: 'https://placehold.co/40x40/1f7a2a/ffffff?text=RJ' }
};

async function renderHeadlines(topic) {
    headlinesSection.style.display = 'block';
    const sourceInfo = sourceIcons[topic];
    
    // Update Header
    if (sourceInfo) {
        articleListHeader.innerHTML = `
            <div class="header-with-icon" style="display:flex; align-items:center; gap:10px;">
                <img src="${sourceInfo.icon}" alt="${sourceInfo.name}" class="source-icon" style="border-radius:50%;">
                Headlines from ${sourceInfo.name}
            </div>`;
    } else {
        articleListHeader.textContent = 'Headlines';
    }
    
    // Show Loading
    newsContainer.innerHTML = `<div class="loading-spinner show" style="text-align:center; padding:20px;">Loading news...</div>`;

    try {
        // Fetch Data
        const articles = await fetchNewsWithGemini(topic);
        
        // Clear Loading
        newsContainer.innerHTML = ''; 

        if (articles && articles.length > 0) {
            articles.forEach(article => {
                const articleElement = document.createElement('div');
                articleElement.className = 'news-article'; // Ensure you have CSS for this class
                articleElement.innerHTML = `
                    <div class="article-content" style="margin-bottom: 20px; padding: 15px; background: #2a0a18; border-radius: 8px;">
                        <h4 class="article-title" style="color: #fff; margin: 0 0 5px 0;">${article.title}</h4>
                        <p class="article-source" style="color: #bbb; font-size: 0.9em; margin: 0 0 10px 0;">${article.source}</p>
                        <p class="article-snippet" style="color: #ddd;">${article.description}</p>
                    </div>
                `;
                newsContainer.appendChild(articleElement);
            });
        } else {
            newsContainer.innerHTML = `<p style="color:white;">No headlines found. Please try again.</p>`;
        }
    } catch (error) {
        newsContainer.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

async function renderJobs() {
    headlinesSection.style.display = 'block';
    const sourceInfo = sourceIcons['job-openings'];
    
    if (sourceInfo) {
        articleListHeader.innerHTML = `
            <div class="header-with-icon" style="display:flex; align-items:center; gap:10px;">
                <img src="${sourceInfo.icon}" alt="${sourceInfo.name}" class="source-icon" style="border-radius:50%;">
                Job Openings from ${sourceInfo.name}
            </div>`;
    } else {
        articleListHeader.textContent = 'Job Openings';
    }

    newsContainer.innerHTML = `<div class="loading-spinner show" style="text-align:center; padding:20px;">Finding jobs...</div>`;

    try {
        const jobs = await fetchJobsWithGemini();
        newsContainer.innerHTML = ''; 

        if (jobs && jobs.length > 0) {
            jobs.forEach(job => {
                const jobElement = document.createElement('div');
                jobElement.className = 'news-article';
                jobElement.innerHTML = `
                    <div class="article-content" style="margin-bottom: 20px; padding: 15px; background: #2a0a18; border-radius: 8px;">
                        <h4 class="article-title" style="color: #fff; margin: 0 0 5px 0;">${job.title}</h4>
                        <p class="article-source" style="color: #bbb; font-size: 0.9em; margin: 0 0 10px 0;">${job.company}</p>
                        <p class="article-snippet" style="color: #ddd;">${job.description}</p>
                    </div>
                `;
                newsContainer.appendChild(jobElement);
            });
        } else {
            newsContainer.innerHTML = `<p style="color:white;">No jobs found at this moment.</p>`;
        }
    } catch (error) {
        newsContainer.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

// Event Listener
nav.addEventListener('click', (event) => {
    // Handle both button clicks and clicks on icons inside buttons
    const button = event.target.closest('button'); 
    
    if (button) {
        const buttons = nav.querySelectorAll('.topic-button');
        buttons.forEach(btn => btn.classList.remove('active'));
        
        button.classList.add('active');

        const topic = button.getAttribute('data-topic');
        if (topic === 'job-openings') {
            renderJobs();
        } else {
            renderHeadlines(topic);
        }
    }
});
