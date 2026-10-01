# 🐊 Gator — Personal News Assistant

Gator is an **AI-powered personal news assistant** that helps users collect, discover, understand, and compare news from multiple sources in one place.

Instead of simply showing a stream of links, Gator adds an intelligent layer on top of the news feed. It provides **AI-generated article summaries**, detects **stories covered by multiple sources**, and allows users to **compare different sources covering the same event**.

The goal is to make reading news faster, clearer, and more organized while helping users understand how different sources describe the same story.



## 🎯 The Problem

People who follow multiple news sources often face several problems:

* News is scattered across many websites and feeds.
* The same story appears repeatedly with different headlines.
* Reading several full articles to understand one event takes time.
* It can be difficult to compare how different sources present the same story.
* Important articles can be lost in a large feed.
* Users need a simple way to save articles and manage their reading progress.

Gator was designed to solve these problems in one unified interface.



## 💡 The Solution

Gator combines traditional feed aggregation with intelligent features.

The application collects news from followed feeds and organizes them into a personalized dashboard. On top of that, users can use AI to summarize articles, discover stories covered by multiple sources, and compare selected sources.

The main idea is:

> **Gator doesn't just collect news — it helps you understand it.**



# 🚀 Main Features

## 📰 News Aggregation

Gator collects posts from RSS and news feeds and displays them in a single personal feed.

The application can combine content from sources such as:

* BBC World News
* Ars Technica
* The Guardian Technology
* Hacker News RSS
* GitHub Blog

This makes it possible to access different types of news without visiting every website separately.



## 🎯 Personalized Feed

After logging in, each user receives a personal dashboard.

The dashboard includes:

* Total number of posts
* Unread posts
* Saved posts
* Followed feeds
* Personalized recommendations
* Story Radar
* Topic/category statistics

The recommendation system uses the user's activity and interests to surface relevant content.



## 🔎 Search

Users can search through the available news articles.

Search can be used to find stories by keywords and can also work with category filtering.

This helps users quickly locate specific topics instead of manually browsing the entire feed.



## 🤖 AI Smart Summary

One of Gator's main AI features is **Smart Summary**.

A user can open an article and press:

`🤖 Summary`

Gator then generates an AI-based summary of the article.

This is useful when:

* The article is long.
* The user only needs the main points.
* The user wants to quickly decide whether the article is worth reading.

The summary is displayed inside a dedicated modal so the user can read it without leaving the application.



# 🧠 Story Radar

Story Radar is designed to detect when **different sources are reporting the same story**.

For example, the same event may appear on:

* Ars Technica
* The Guardian
* BBC

Instead of showing these articles as completely unrelated items, Gator can group them into a single story.

The Story Radar interface displays:

* Story title
* Number of sources
* Number of feeds
* Related categories
* Individual source links

This gives the user a higher-level view of the news landscape.



# 🔗 Compare Sources

Gator allows users to manually select two articles and compare them.

The workflow is:

1. Open `Latest`, `Search`, or another article list.
2. Select one source.
3. Select a second source.
4. Press `🧠 Compare Sources`.

Gator then analyzes the selected articles.

The system also validates whether the selected sources appear to cover the **same story**.

If they are unrelated, the comparison is rejected instead of producing a misleading result.

This makes the comparison feature more reliable.



# 📋 Story Brief

The Story Brief is one of Gator's main intelligent features.

It combines information from multiple sources into a structured view containing:

### KEY TAKEAWAYS

Important points extracted from the selected coverage.

### QUICK COMPARISON

A short explanation of what each source focuses on.

For example:


🌐 arstechnica.com
Focuses on the business and technology implications.

🌐 theguardian.com
Focuses more strongly on the reported risks and public discussion.


### SOURCE PERSPECTIVES

Each source is shown separately with:

* Source label
* Category
* Real source hostname
* Feed name
* Article title
* AI-generated summary
* Link to the original article

This preserves the original sources instead of hiding them behind one combined summary.



# ⭐ Save / Unsave

Users can save articles for later.

The button works as a toggle:


⭐ Save
   ↓
✅ Saved
   ↓
⭐ Save


When an article is already saved, pressing the same button removes it from the saved list.

Saved articles are available through the `Saved` section of the application.

The application keeps the saved state synchronized with the server.


# 📖 Read / Unread

Gator also supports reading-state management.

A user can mark an article as read or unread directly from the interface.

The button behaves as a toggle:


✓ Read
   ↓
↩ Unread
   ↓
✓ Read


The `Unread` section shows only articles that have not been marked as read.

When a user marks an article as read from the Unread page, the article is removed from that list automatically.



# 🔐 Authentication

Gator includes user authentication with:

* User registration
* User login
* Session-based authentication
* Logout
* User-specific saved posts
* User-specific reading state
* User-specific dashboard information

This allows the application to behave as a personal news assistant rather than a shared news board.


# 🗂️ Topics and Categories

Gator organizes content into categories such as:

* Programming
* Technology
* World

The dashboard also displays category statistics so users can see what topics appear most often in their feed.


# 🏗️ How Gator Works

At a high level, the application follows this flow:


News Feeds
   ↓
Feed Aggregation
   ↓
Post Storage
   ↓
User Dashboard
   ↓
Search / Recommendations
   ↓
Story Radar
   ↓
AI Summaries
   ↓
Source Comparison
   ↓
Story Brief




# 🧩 System Architecture

Gator is divided into several main layers.

## Frontend

The frontend is built with:

* React
* TypeScript
* Vite
* CSS

The frontend provides:

* Authentication UI
* Dashboard
* Search
* Post cards
* Save/Unsave controls
* Read/Unread controls
* Story Radar
* Compare Sources
* Story Brief
* AI Summary modals



## Backend

The backend is implemented with:

* Node.js
* TypeScript
* Express

The server provides APIs for:

* Authentication
* Dashboard data
* Posts
* Search
* Saved posts
* Read/unread state
* AI summaries
* Story Radar
* Story Brief
* Source comparison

The backend runs separately from the frontend so the application can keep business logic and data operations outside the browser.



## Database

Gator uses PostgreSQL for persistent storage.

The database stores information such as:

* Users
* Feeds
* Feed follows
* Posts
* Saved posts
* Reading state
* Sessions

The database layer uses Drizzle ORM for querying and managing the application data.



# 🧠 AI Layer

The AI layer is used for the parts of Gator that require natural-language understanding.

The main AI-powered workflows are:

### Article summarization

An article is processed and converted into a concise summary.

### Story Brief generation

Multiple articles covering the same story are analyzed together to produce:

* Key takeaways
* Quick source comparison
* Individual source perspectives

The AI functionality is combined with deterministic application logic so that user actions, authentication, saving, reading state, and source selection remain controlled by the application.



# 🛡️ Same-Story Validation

A major part of the comparison workflow is validating whether two selected articles actually belong to the same story.

This prevents the system from comparing unrelated articles and generating an artificial comparison.

The validation is especially important because two articles may come from different categories, publishers, or writing styles while still covering the same event.

Gator therefore treats **story matching** as a separate step before generating a multi-source brief.



# 🧪 Testing

Gator includes automated tests covering important parts of the system.

The current test suite contains **8 tests**, including:

* Search category filtering
* Save and unsave behavior
* Read and unread behavior
* Video links not being treated as articles
* Summary fallback to RSS description
* Clustering the same story across different sources
* Preventing unrelated stories from being clustered
* Preventing multiple posts from the same source from being treated as a multi-source story

The latest verified result is:


8 tests
8 passed
0 failed


This provides automated coverage for both standard application behavior and the Story Radar functionality.



# 💻 Running the Project Locally

## Backend

Start the Gator server with:


cd ~/gator
npx tsx src/server.ts


The backend runs on:


http://localhost:3000




## Frontend

Open another terminal and run:


cd ~/gator/web
npm run dev


The frontend is available at:


http://localhost:5173




# 🗄️ Database

Gator uses a local PostgreSQL database named:


gator


The development configuration connects through the local PostgreSQL instance used by the project.


# 🧪 Running Tests

From the project root:


cd ~/gator
npm test



# 🏗️ Building the Frontend

To create a production build of the web interface:


cd ~/gator/web
npm run build



# 🌐 Example User Flow

A typical Gator session looks like this:


1. User logs in
        ↓
2. Gator loads the personal dashboard
        ↓
3. News is collected from followed feeds
        ↓
4. User browses recommended or latest articles
        ↓
5. User can save an article
        ↓
6. User can mark the article as read/unread
        ↓
7. User can request an AI summary
        ↓
8. Story Radar detects related coverage
        ↓
9. User selects two sources
        ↓
10. Gator validates that they cover the same story
        ↓
11. Story Brief is generated
        ↓
12. User sees key takeaways and source perspectives




# 🌟 Why Gator Is Different

Traditional RSS readers mainly answer:

> **"What is new?"**

Gator tries to answer additional questions:

> **"What matters?"**

> **"What is the same story across different sources?"**

> **"How do these sources present it?"**

> **"Can I understand the main points quickly?"**

This is what turns Gator from a simple feed reader into an **AI-assisted personal news assistant**.



# 🎯 Project Goal

The goal of Gator is not to replace journalism or original reporting.

Instead, it acts as a layer between the user and a growing amount of online information.

Gator helps users:

* Discover relevant news
* Reduce information overload
* Summarize long articles
* Identify repeated coverage of the same story
* Compare sources
* Organize saved articles
* Manage reading progress


# 🏆 Project Highlights

The current implementation includes:


🐊 Personal News Dashboard
📰 Multi-source RSS Aggregation
🎯 Personalized Recommendations
🔎 Search
🤖 AI Smart Summary
🧠 Story Radar
🔗 Compare Sources
📋 Story Brief
⚡ Quick Comparison
📚 Full Source Perspectives
⭐ Save / Unsave
📖 Read / Unread
🔐 Authentication
🗂️ Categories
🧪 Automated Tests




# 📌 Current Project Status

Gator is currently in a stable development state with:


✅ Working frontend
✅ Working backend
✅ PostgreSQL persistence
✅ Authentication
✅ AI features
✅ Story Radar
✅ Source comparison
✅ Save / Unsave
✅ Read / Unread
✅ Automated test coverage
✅ Production frontend build
✅ GitHub version control



# 🐊 Final Vision

Gator is built around a simple idea:

> **News should be easier to understand, not just easier to collect.**

By combining aggregation, personalization, AI summarization, story clustering, and multi-source comparison, Gator aims to give users a clearer way to navigate the modern news environment.
