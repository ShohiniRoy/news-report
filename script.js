// script.js - Fixed version with correct source mapping per tab

// Map each tab to its specific news source
const NEWS_SOURCES = {
    politics: {
        source: "The Hindu",
        prompt: "Politics",
        displayName: "The Hindu"
    },
    finance: {
        source: "Economic Times",
        prompt: "Finance",
        displayName: "Economic Times"
    },
    tech: {
        source: "Wired",
        prompt: "Tech",
        displayName: "Wired"
    },
    sport: {
        source: "ESPN",
        prompt: "Sport",
        displayName: "ESPN"
    },
    world: {
        source: "BBC News",
        prompt: "World",
        displayName: "BBC News"
    },
    fashion: {
        source: "Vogue",
        prompt: "Fashion",
        displayName: "Vogue"
    },
    jobs: {
        source: "LinkedIn News",
        prompt: "Jobs",
        displayName: "LinkedIn News"
    }
};

let currentCategory = 'politics';
let currentSource = NEWS_SOURCES.politics.displayName;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    updateHeaderSource(currentSource);
    loadNews('politics');
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
            currentSource = NEWS_SOURCES[category].displayName;
            
            // Update the header to show current source
            updateHeaderSource(currentSource);
            
            // Load news
            loadNews(category);
        });
    });
}

// Update the header to show which source we're viewing
function updateHeaderSource(sourceName) {
    const headerElement = document.querySelector('.logo h1 .highlight');
    if (headerElement) {
        headerElement.textContent = sourceName;
    }
}

// Load news for a specific category/source
async function loadNews(category) {
    const newsContainer = document.getElementById('news-container');
    const sourceConfig = NEWS_SOURCES[category];
    
    // Show loading state
    newsContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Fetching latest news from ${sourceConfig.displayName}...</p>
        </div>
    `;
    
    try {
        // Call your Gemini API with the specific source
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${sourceConfig.prompt}|${sourceConfig.source}`
                    }]
                }]
            })
        });
        
        const articles = await response.json();
        
        // Display the news
        displayNews(articles, sourceConfig.displayName);
        
    } catch (error) {
        console.error('Error loading news:', error);
        newsContainer.innerHTML = `
            <div class="error-message">
                <h3>Unable to load news from ${sourceConfig.displayName}</h3>
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
                <h3>No articles available from ${sourceName}</h3>
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
                    ${article.source || sourceName}
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

// Optional: Add refresh button
function addRefreshButton() {
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'refresh-button';
    refreshBtn.innerHTML = '🔄 Refresh';
    refreshBtn.onclick = () => loadNews(currentCategory);
    
    const container = document.querySelector('.container');
    if (container && !document.querySelector('.refresh-button')) {
        container.insertBefore(refreshBtn, document.getElementById('news-container'));
    }
}
