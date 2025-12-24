// script.js - Frontend for multi-source news

// Map each tab to its specific news source
const NEWS_SOURCES = {
    politics: {
        source: "BBC News",
        prompt: "Politics"
    },
    finance: {
        source: "Bloomberg",
        prompt: "Finance"
    },
    tech: {
        source: "Wired",
        prompt: "Tech"
    },
    sport: {
        source: "ESPN",
        prompt: "Sport"
    },
    world: {
        source: "CNN",
        prompt: "World"
    },
    fashion: {
        source: "Vogue",
        prompt: "Fashion"
    },
    jobs: {
        source: "Financial Times",
        prompt: "Jobs"
    }
};

let currentCategory = 'tech';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    loadNews('tech');
});

// Setup tab click handlers
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-button');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active to clicked tab
            tab.classList.add('active');
            
            // Get category and load news
            const category = tab.dataset.category;
            currentCategory = category;
            loadNews(category);
        });
    });
}

// Load news for a specific category/source
async function loadNews(category) {
    const newsContainer = document.getElementById('news-container');
    const sourceConfig = NEWS_SOURCES[category];
    
    // Show loading state
    newsContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Fetching latest news from ${sourceConfig.source}...</p>
        </div>
    `;
    
    try {
        // Call your Gemini API
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: sourceConfig.prompt
                    }]
                }]
            })
        });
        
        const articles = await response.json();
        
        // Display the news
        displayNews(articles, sourceConfig.source);
        
    } catch (error) {
        console.error('Error loading news:', error);
        newsContainer.innerHTML = `
            <div class="error-message">
                <h3>Unable to load news</h3>
                <p>Please check your connection and try again.</p>
                <button onclick="loadNews('${category}')" class="retry-button">
                    Retry
                </button>
            </div>
        `;
    }
}

// Display news articles
function displayNews(articles, sourceName) {
    const newsContainer = document.getElementById('news-container');
    
    if (!articles || articles.length === 0) {
        newsContainer.innerHTML = `
            <div class="no-news">
                <h3>No articles available</h3>
                <p>Please try another category or refresh the page.</p>
            </div>
        `;
        return;
    }
    
    // Create HTML for each article
    const articlesHTML = articles.map(article => `
        <div class="news-card">
            <div class="news-content">
                <div class="news-source-badge">
                    ${article.source}
                </div>
                <h2 class="news-title">${article.title}</h2>
                <p class="news-description">${article.description}</p>
                ${article.url ? `
                    <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="read-more">
                        Read Full Article →
                    </a>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    newsContainer.innerHTML = articlesHTML;
}

// Optional: Auto-refresh news every 5 minutes
let refreshInterval;

function startAutoRefresh() {
    // Clear any existing interval
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    // Refresh every 5 minutes (300000ms)
    refreshInterval = setInterval(() => {
        console.log('Auto-refreshing news...');
        loadNews(currentCategory);
    }, 300000);
}

// Call this if you want auto-refresh
// startAutoRefresh();
