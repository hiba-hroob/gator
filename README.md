# 🐊 Gator

Gator is a TypeScript command-line RSS aggregator that turns RSS feeds into a personalized news-reading experience.

It combines RSS aggregation, search, categories, saved posts, read/unread tracking, personalized recommendations, local smart summaries, statistics, and a unified dashboard.

## ✨ Features

* 📡 RSS feed aggregation
* 👤 Multiple users with login and register support
* 📰 Browse posts from followed feeds
* 🔎 Search by title, description, and URL
* 🏷️ Feed categories
* 🔍 Search with category filtering
* ⭐ Save and unsave posts
* ✅ Mark posts as read or unread
* 🎯 Personalized `for-you` recommendations
* 🤖 Local smart article summaries
* 📊 User statistics
* 🐊 Unified dashboard
* 📰 Personalized daily digest
* 🧪 Automated tests

## 🛠️ Tech Stack

* TypeScript
* Node.js
* PostgreSQL
* Drizzle ORM
* tsx
* fast-xml-parser
* Node.js test runner

## 📋 Requirements

Before running Gator, install:

* Node.js
* npm
* PostgreSQL

## 🚀 Setup

Clone the repository:

git clone https://github.com/hiba-hroob/gator.git
cd gator

Install dependencies:


npm install


Make sure PostgreSQL is running and the `gator` database exists.

Apply database migrations:


npx drizzle-kit migrate


## 👤 Users

Register a user:


npm run start register hibah


Login:

npm run start login hibah


Show users:


npm run start users


## 📡 Feeds

Add a feed with an optional category:


npm run start addfeed "Hacker News RSS" "https://hnrss.org/newest" "programming"

List feeds:


npm run start feeds


## 🔗 Follow Feeds

Follow a feed:

npm run start follow "https://hnrss.org/newest"


Show followed feeds:


npm run start following


Unfollow a feed:

npm run start unfollow "https://hnrss.org/newest"


## 📥 Aggregate Posts

Run the feed aggregator:


npm run start agg 5s


Press `Ctrl+C` to stop the aggregator.

## 📰 Browse Posts

Browse the latest posts:


npm run start browse

Limit the number of posts:


npm run start browse 5

Browse by category:


npm run start browse programming

Browse a category with a limit:


npm run start browse programming 5


Show unread posts:


npm run start -- browse --unread


## 🔎 Search

Search posts:


npm run start search github


Search using multiple words:


npm run start search soviet collapse
 

Search inside a category:


npm run start -- search github --category programming


## ⭐ Saved Posts

Save a post by URL:


npm run start save "POST_URL"

View saved posts:


npm run start saved


Remove a saved post:


npm run start unsave "POST_URL"


## ✅ Read / Unread

Mark a post as read:


npm run start read "POST_URL"


Mark a post as unread:


npm run start unread "POST_URL"


View unread posts:


npm run start -- browse --unread


## 🎯 Personalized Recommendations

Gator uses saved content to learn simple user interests and rank unread posts.

Run:


npm run start for-you


Recommendations consider:

* saved categories
* saved feeds
* article recency

Already-saved posts are excluded from recommendations.

## 🤖 Smart Summaries

Gator provides a local, zero-cost summarization system.

It attempts to fetch the original article, extract its main content, and select important sentences.

Run:


npm run start summarize "POST_URL"


For unsupported video and social links, Gator reports that reliable article text is unavailable instead of inventing a summary.

## 📊 Statistics

View user statistics:


npm run start stats


Example:

🐊 Gator Stats

Feeds followed: 2
Total posts: 20
Unread posts: 20
Saved posts: 2

Categories:
* programming: 20


## 🐊 Dashboard

View a combined overview:


npm run start dashboard

The dashboard displays:

* user statistics
* categories
* personalized recommendations
* local smart summaries

## 📰 Daily Digest

Generate a personalized digest:


npm run start digest


Limit the number of recommendations:


npm run start digest 3

The digest combines personalized recommendations with local smart summaries.

## 🧪 Testing

Run the automated tests:


npm test


Run TypeScript type checking:

npx tsc --noEmit


The current test suite covers:

* search with category filtering
* save and unsave behavior
* read and unread state changes
* video/social summary handling
* summary fallback behavior

## 🗄️ Database

Gator uses PostgreSQL with Drizzle ORM.

The database contains tables for:

* users
* feeds
* feed follows
* posts
* saved posts
* post reads

Database migrations are stored in:


src/lib/db/migrations


Generate a new migration after changing the schema:

npx drizzle-kit generate


Apply migrations:

npx drizzle-kit migrate


## 🧭 Demo Flow

A simple demonstration of Gator:


# Register
npm run start register hibah

# Add a categorized RSS feed
npm run start addfeed "Hacker News RSS" "https://hnrss.org/newest" "programming"

# Aggregate posts
npm run start agg 5s

# Browse posts
npm run start browse

# Search
npm run start search github

# Search with a category
npm run start -- search github --category programming

# Save a post
npm run start save "POST_URL"

# Mark it as read
npm run start read "POST_URL"

# View personalized recommendations
npm run start for-you

# Generate a digest
npm run start digest

# View the complete dashboard
npm run start dashboard

## 🎯 Project Goal

Gator started as a command-line RSS aggregator and has evolved into a personal news assistant.

The project turns a large stream of RSS content into a more useful workflow:


RSS Feeds
   ↓
Posts
   ↓
Search + Categories
   ↓
Saved + Read/Unread
   ↓
Personalized Recommendations
   ↓
Local Smart Summaries
   ↓
Daily Digest + Dashboard


## 📌 Current Status

Gator is developed in TypeScript with PostgreSQL and Drizzle ORM.

The project includes automated tests and TypeScript type checking for its main functionality.
