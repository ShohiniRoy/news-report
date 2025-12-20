const nav = document.getElementById('topic-nav');
const headlinesSection = document.getElementById('headlines-section');
const newsContainer = document.getElementById('news-container');
const articleListHeader = document.getElementById('article-list-header');

// This is the Gemini API key.
const apiKey = "AIzaSyDN5iDCmC-8vB-r4iFb7CtPyGv5pAAXx_U";
const textApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

// Helper function to handle fetch calls with exponential backoff
async function fetchWithExponentialBackoff(apiUrl, payload, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                return await response.json();
            } else if (response.status === 429 && i < retries - 1) {
                // If API call fails with a 429 error, wait and try again
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            } else {
                throw new Error(`API error! Status: ${response.status}`);
            }
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
}

async function fetchNewsWithGemini(topic) {
    const sourceMapping = {
        'indian-politics': ["The Hindu"],
        'international': ["BBC News"],
        'sports': ["ESPN"],
        'technology': ["Wired", "The Wall Street Journal"],
        'finance': ["The Economic Times", "The Wall Street Journal"],
        'fashion': ["Vogue"]
    };

    const specificSources = sourceMapping[topic];
    const sourcesPrompt = ` from the following sources: ${specificSources.join(', ')}`;
    
    // Updated prompt for a more universally friendly tone and content style
    const prompt = `Give me a list of 5 recent news articles on "${topic}"${sourcesPrompt}. For each article, give me a concise and engaging title, the source name, and a one-sentence summary. No URLs. Format it as a JSON array with objects, using keys: "title", "source", and "description".`;

    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = {
        contents: chatHistory,
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        "title": { "type": "STRING" },
                        "source": { "type": "STRING" },
                        "description": { "type": "STRING" }
                    },
                    "propertyOrdering": ["title", "source", "description"]
                }
            }
        }
    };

    const result = await fetchWithExponentialBackoff(textApiUrl, payload);
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error("Invalid response from Gemini API.");
    }
    return JSON.parse(text);
}

async function fetchJobsWithGemini() {
    // Updated prompt for job listings in a more informal tone but without being too Gen Z-specific
    const prompt = `Give me a list of 5 recent job openings from both government (specifically mentioning 'Rojgar Samachar' as a source) and well-known companies. For each, give me the job title, the company/government body name, and a one-sentence description. No URLs. Format the response as a JSON array of objects with keys "title", "company", and "description".`;
    
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = {
        contents: chatHistory,
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        "title": { "type": "STRING" },
                        "company": { "type": "STRING" },
                        "description": { "type": "STRING" }
                    },
                    "propertyOrdering": ["title", "company", "description"]
                }
            }
        }
    };

    const result = await fetchWithExponentialBackoff(textApiUrl, payload);
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error("Invalid response from Gemini API.");
    }
    return JSON.parse(text);
}


const sourceIcons = {
    // These are now simple initial-based placeholders
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
    if (sourceInfo) {
        articleListHeader.innerHTML = `
            <div class="header-with-icon">
                <img src="${sourceInfo.icon}" alt="${sourceInfo.name} Icon" class="source-icon">
                Headlines from ${sourceInfo.name}
            </div>`;
    } else {
        articleListHeader.textContent = 'Headlines';
    }
    
    newsContainer.innerHTML = `<div class="loading-spinner show"></div>`;
    try {
        const articles = await fetchNewsWithGemini(topic);
        newsContainer.innerHTML = ''; // Clear spinner
        if (articles && articles.length >= 5) {
            // Loop through articles and create the HTML structure
            articles.forEach(article => {
                const articleHtml = `
                    <div class="news-article">
                        <div class="article-content">
                            <h4 class="article-title">${article.title}</h4>
                            <p class="article-source">${article.source}</p>
                            <p class="article-snippet">${article.description}</p>
                        </div>
                    </div>
                `;
                const articleElement = document.createElement('div');
                articleElement.innerHTML = articleHtml;
                newsContainer.appendChild(articleElement);
            });
        } else {
            newsContainer.innerHTML = `<p class="text-red-500">Not enough headlines found for this topic.</p>`;
        }
    } catch (error) {
        console.error("Error fetching news:", error);
        newsContainer.innerHTML = `<p class="text-red-500">An error occurred while fetching news: ${error.message}</p>`;
    }
}

async function renderJobs() {
    headlinesSection.style.display = 'block';
    const sourceInfo = sourceIcons['job-openings'];
    if (sourceInfo) {
        articleListHeader.innerHTML = `
            <div class="header-with-icon">
                <img src="${sourceInfo.icon}" alt="${sourceInfo.name} Icon" class="source-icon">
                Job Openings from ${sourceInfo.name}
            </div>`;
    } else {
        articleListHeader.textContent = 'Job Openings';
    }

    newsContainer.innerHTML = `<div class="loading-spinner show"></div>`;
    try {
        const jobs = await fetchJobsWithGemini();
        newsContainer.innerHTML = ''; // Clear spinner
        if (jobs && jobs.length >= 5) {
            jobs.forEach(job => {
                const jobHtml = `
                    <div class="news-article">
                        <div class="article-content">
                            <h4 class="article-title">${job.title}</h4>
                            <p class="article-source">${job.company}</p>
                            <p class="article-snippet">${job.description}</p>
                        </div>
                    </div>
                `;
                const jobElement = document.createElement('div');
                jobElement.innerHTML = jobHtml;
                newsContainer.appendChild(jobElement);
            });
        } else {
            newsContainer.innerHTML = `<p class="text-red-500">Not enough job openings found.</p>`;
        }
    } catch (error) {
        console.error("Error fetching jobs:", error);
        newsContainer.innerHTML = `<p class="text-red-500">An error occurred while fetching job openings: ${error.message}</p>`;
    }
}


// Event listener for navigation buttons
nav.addEventListener('click', (event) => {
    if (event.target.tagName === 'BUTTON') {
        const buttons = nav.querySelectorAll('.topic-button');
        buttons.forEach(button => button.classList.remove('active'));
        
        event.target.classList.add('active');

        const topic = event.target.getAttribute('data-topic');
        if (topic === 'job-openings') {
            renderJobs();
        } else {
            renderHeadlines(topic);
        }
    }
});
