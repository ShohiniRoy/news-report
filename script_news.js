/* --- CONFIGURATION --- */
const API_KEY = 'YOUR API KEY'; 
const GEMINI_API_KEY = 'YOUR API KEY'; 

const newsApiMap = {
    politics: 'general', finance: 'business', tech: 'technology',
    sport: 'sports', world: 'general', fashion: 'entertainment', jobs: 'science'
};

const rssConfig = {
    politics: { url: "https://feeds.feedburner.com/ndtvnews-top-stories", name: "NDTV News" },
    finance: { url: "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms", name: "TOI Business" },
    tech: { url: "https://www.wired.com/feed/category/gear/latest/rss", name: "Wired Tech" },
    sport: { url: "https://www.espn.com/espn/rss/news", name: "ESPN" },
    world: { url: "http://feeds.bbci.co.uk/news/world/rss.xml", name: "BBC News" },
    fashion: { url: "https://www.vogue.com/feed/rss", name: "Vogue" },
    jobs: { url: "https://zeenews.india.com/rss/jobs.xml", name: "Zee Jobs" }
};

const PROXY_URL = "https://api.rss2json.com/v1/api.json?rss_url=";

/* --- FILTER CONFIGURATION --- */
const BANNED_KEYWORDS = ['promo', 'deal', 'coupon', 'discount', 'save up to', 'off with code', 'special offer', 'giveaway'];

// DOM Elements
const navContainer = document.getElementById('nav-container');
const newsGrid = document.getElementById('news-grid');
const sourceNameEl = document.getElementById('source-name');
const sourceLogoEl = document.getElementById('source-logo'); 
const searchInput = document.getElementById('search-input');

let currentArticles = [];

/* --- INIT --- */
function init() {
    if(sourceLogoEl) sourceLogoEl.style.display = 'none';
    generateNav();
    loadCategory('politics');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) searchTopic(query);
            }
        });
    }
}

/* --- FILTER LOGIC --- */
function isCleanArticle(item) {
    const title = item.title.toLowerCase();
    const desc = (item.description || "").toLowerCase();
    const content = `${title} ${desc}`;
    return !BANNED_KEYWORDS.some(word => content.includes(word));
}

/* --- NAV --- */
function generateNav() {
    if(!navContainer) return;
    navContainer.innerHTML = '';
    const tabs = [
        { id: 'politics', label: 'Politics', icon: '🏛️' },
        { id: 'finance', label: 'Finance', icon: '📈' },
        { id: 'tech', label: 'Tech', icon: '💻' },
        { id: 'sport', label: 'Sport', icon: '⚽' },
        { id: 'world', label: 'World', icon: '🌍' },
        { id: 'fashion', label: 'Fashion', icon: '👗' },
        { id: 'jobs', label: 'Jobs', icon: '💼' }
    ];

    tabs.forEach(tab => {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.innerHTML = `${tab.icon} ${tab.label}`;
        btn.id = `btn-${tab.id}`;
        btn.onclick = () => loadCategory(tab.id);
        navContainer.appendChild(btn);
    });
}

/* --- LOAD CATEGORY --- */
async function loadCategory(catId) {
    if(searchInput) searchInput.value = '';
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-${catId}`);
    if(activeBtn) activeBtn.classList.add('active');
    
    if(sourceNameEl) sourceNameEl.textContent = catId.charAt(0).toUpperCase() + catId.slice(1);
    newsGrid.innerHTML = `<div class="loader">Fetching headlines...</div>`;

    try {
        await fetchNewsAPI_Category(catId);
    } catch (error) {
        console.warn("NewsAPI failed. Switching to RSS Backup.");
        await fetchRSS(rssConfig[catId].url, rssConfig[catId].name);
    }
}

/* --- SEARCH TOPIC --- */
async function searchTopic(query) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if(sourceNameEl) sourceNameEl.textContent = `Search: "${query}"`;
    newsGrid.innerHTML = `<div class="loader">Searching global news for "${query}"...</div>`;

    try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&apiKey=${API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === 'ok') {
            processNewsAPIData(data.articles);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        const googleRssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
        await fetchRSS(googleRssUrl, null);
    }
}

/* --- ENGINES --- */
async function fetchNewsAPI_Category(catId) {
    const category = newsApiMap[catId];
    const url = `https://newsapi.org/v2/top-headlines?country=in&category=${category}&apiKey=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'ok') processNewsAPIData(data.articles);
    else throw new Error(data.message);
}

function processNewsAPIData(articles) {
    currentArticles = articles
        .map(a => ({
            title: a.title,
            source: a.source.name,
            pubDate: a.publishedAt,
            description: a.description,
            link: a.url,
            id: a.url
        }))
        .filter(isCleanArticle);
    
    renderCards(currentArticles.slice(0, 10));
}

async function fetchRSS(rssUrl, fixedSourceName) {
    const url = PROXY_URL + encodeURIComponent(rssUrl);
    try {
        const res = await fetch(url);
        const data = await res.json();
        
        if(data.status === 'ok') {
            currentArticles = data.items
                .map(item => {
                    let cleanTitle = item.title;
                    let finalSource = fixedSourceName || "News"; 
                    if (!fixedSourceName && item.title.includes(" - ")) {
                        const parts = item.title.split(" - ");
                        finalSource = parts.pop(); 
                        cleanTitle = parts.join(" - ");
                    }
                    return {
                        title: cleanTitle,
                        source: finalSource,
                        pubDate: item.pubDate,
                        description: item.description,
                        link: item.link,
                        id: item.link
                    };
                })
                .filter(isCleanArticle);
            
            renderCards(currentArticles.slice(0, 10));
        } else {
            newsGrid.innerHTML = `<div class="loader">No results found.</div>`;
        }
    } catch (e) {
        newsGrid.innerHTML = `<div class="loader">Feed unavailable.</div>`;
    }
}

/* --- RENDER --- */
function renderCards(items) {
    newsGrid.innerHTML = "";

    if(items.length === 0) {
        newsGrid.innerHTML = `<div class="loader">No non-promotional stories found.</div>`;
        return;
    }

    items.forEach(item => {
        if (item.title === "[Removed]") return; 
        const date = new Date(item.pubDate).toLocaleDateString();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = item.description;
        const cleanDesc = (tempDiv.textContent || "").substring(0, 160) + "...";

        const card = document.createElement('div');
        card.className = 'news-card';
        card.innerHTML = `
            <div class="card-header-row">
                <div class="card-title">${item.title}</div>
            </div>
            <div class="card-meta">${item.source} • ${date}</div>
            <div class="card-desc">${cleanDesc}</div>
            <a href="${item.link}" target="_blank" class="card-link">Read Full Story →</a>
        `;
        newsGrid.appendChild(card);
    });
}

init();
