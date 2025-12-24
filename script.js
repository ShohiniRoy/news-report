// script.js

// 1. Newspaper Mapping: Define which paper goes with which tab ID
const SOURCE_MAPPING = {
    "finance": { name: "The Economic Times", color: "#e63946" },
    "politics": { name: "The Hindu", color: "#457b9d" },
    "tech": { name: "TechCrunch", color: "#2a9d8f" },
    "sport": { name: "ESPN", color: "#f4a261" },
    "world": { name: "BBC News", color: "#1d3557" },
    "fashion": { name: "Vogue", color: "#d62828" },
    "jobs": { name: "LinkedIn News", color: "#0077b5" }
};

const newsType = document.getElementById("newsType");
const newsDetails = document.getElementById("newsDetails");
const newsQuery = document.getElementById("newsQuery"); // Search bar input

// 2. Load Default News (Finance) on Page Load
window.onload = function() {
    onNavItemClick('finance');
};

// 3. Handle Tab Clicks
function onNavItemClick(id) {
    // Get settings for this tab, or default to generic Google News
    const source = SOURCE_MAPPING[id] || { name: "Google News", color: "#6c757d" };
    
    // Update Header Text
    if(newsType) {
        newsType.innerHTML = `Headlines from <span style="color: ${source.color};">${source.name}</span>`;
    }

    // Call the API function
    fetchNews(id, source.name);
}

// 4. Handle Search Button Click
document.getElementById("searchBtn").addEventListener("click", function() {
    const query = newsQuery.value;
    if (!query) return;
    
    // For manual search, we default to Google News source
    newsType.innerHTML = `Search Results: <span style="color: #6c757d;">${query}</span>`;
    fetchNews(query, "Global Sources");
});

// 5. Fetch Data from Vercel Backend
async function fetchNews(category, sourceName) {
    newsDetails.innerHTML = `<div class="col-12 text-center p-5">
                                <div class="spinner-border" role="status"></div>
                                <h5 class="mt-3">Loading news from ${sourceName}...</h5>
                             </div>`;
    
    const newsDataArr = [];

    try {
        // Send POST request to your Vercel backend
        // We combine category and source into one string for the prompt
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                // We send a custom prompt structure to the backend
                promptContext: {
                    category: category,
                    source: sourceName
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Server Error: ${response.status}`);
        }

        const data = await response.json();
        displayNews(data);

    } catch (error) {
        console.error("Fetch error:", error);
        newsDetails.innerHTML = `<div class="col-12 text-center text-danger">
                                    <h5>Unable to load news.</h5>
                                    <p>Please check your internet connection or try again later.</p>
                                 </div>`;
    }
}

// 6. Render the Cards
function displayNews(articles) {
    newsDetails.innerHTML = "";

    if (!articles || articles.length === 0) {
        newsDetails.innerHTML = "<h5>No news found.</h5>";
        return;
    }

    articles.forEach(item => {
        // Fallback for missing images/descriptions
        const image = item.image || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1000&auto=format&fit=crop";
        const date = new Date().toLocaleDateString();

        const col = document.createElement('div');
        col.className = "col-sm-12 col-md-4 col-lg-3 p-2 card";

        const card = document.createElement('div');
        card.className = "p-2 shadow-sm h-100"; // Added shadow and height

        card.innerHTML = `
            <div>
                <img src="${image}" class="card-img-top" alt="news" style="height: 180px; object-fit: cover; border-radius: 5px;">
                <div class="card-body px-0">
                    <span class="badge bg-secondary mb-2">${item.source}</span>
                    <h5 class="card-title text-truncate" title="${item.title}">${item.title}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${date}</h6>
                    <p class="card-text" style="font-size: 0.9rem;">${item.description}</p>
                    <a href="${item.url}" target="_blank" class="btn btn-dark btn-sm w-100 mt-2">Read Full Article</a>
                </div>
            </div>
        `;

        col.appendChild(card);
        newsDetails.appendChild(col);
    });
}
