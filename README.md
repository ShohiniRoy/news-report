# 📰 Daily Brief: AI-Powered News Aggregator

A dynamic, responsive web application that uses Artificial Intelligence to curate, format, and deliver real-time global news headlines. 

### 🔴 **Live Demo: [View the Working Project Here](https://news-report-final.vercel.app/)**

---

## 📖 About the Project
Daily Brief moves beyond traditional static RSS feeds by leveraging the **Google Gemini API** to generate live news updates on the fly. Built with a serverless backend and a Vanilla JavaScript frontend, the application dynamically prompts the AI to act as specific, trusted news publishers depending on the user's selected category.

## ✨ Key Features
- AI Integration & Source Curation:
  Prompts the Gemini API to fetch and emulate specific publications for each section (e.g., targeting *The Hindu* for Politics, *Economic Times* for Finance, and *BBC* for World News).
- Robust Data Handling:
  Custom JavaScript logic sanitizes and parses unpredictable LLM Markdown text into strict, reliable JSON arrays for frontend rendering.
- Modern Interface:
  A fully responsive, stylized dark-mode UI built with HTML5 and CSS3, featuring interactive hover states and built-in loading animations.
- Secure Backend:
  Implements a Node.js serverless backend via Vercel to securely proxy external API requests and protect sensitive Gemini API keys.

## 🛠️ Tech Stack
* Frontend: HTML5, CSS3, Vanilla JavaScript (ES6+)
* Backend: Node.js, Vercel Serverless Functions (`/api`)
* AI / Third-Party: Google Gemini API
* Deployment: Git, GitHub, Vercel

## 🚀 Running Locally 
If you wish to clone and run this project locally, you will need to add your own API key.
1. Clone the repository: `git clone https://github.com/ShohiniRoy/news-report.git`
2. Create a `.env` file in the root directory and add your Gemini API key: `GEMINI_API_KEY=your_api_key_here`
3. Use the Vercel CLI to run the local development server: `vercel dev`
