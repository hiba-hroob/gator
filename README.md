# 🐊 Gator

**Gator** is a full-stack RSS and news aggregation web application that turns RSS feeds into a personalized news-reading experience.

It combines RSS aggregation, search, categories, saved posts, read/unread tracking, personalized recommendations, smart article summaries, statistics, and a unified dashboard.

## 🌐 Live Demo

**Gator is deployed and available online:**

https://gator-kq62.onrender.com/

> Gator is deployed using Render. The free instance may spin down after inactivity, so the first request after a period of inactivity may take longer to respond.

## ✨ Features

* 📡 RSS feed aggregation
* 👤 User registration and login
* 📰 Browse posts from followed feeds
* 🔎 Search by title, description, and URL
* 🏷️ Feed categories
* 🎯 Search with category filtering
* ⭐ Save and unsave posts
* ✅ Mark posts as read or unread
* 🎯 Personalized recommendations
* 🤖 Smart article summaries
* 📊 User statistics
* 🐊 Unified dashboard
* 📰 Personalized daily digest
* 📱 Responsive web interface
* 🧪 Automated tests
* 🔐 Session-based authentication

## 🛠️ Tech Stack

### Frontend

* **React**
* **TypeScript**
* **Vite**
* **HTML / CSS**

### Backend

* **Node.js**
* **Express**
* **TypeScript**

### Database

* **PostgreSQL**
* **Drizzle ORM**

### Other Tools

* **tsx**
* **fast-xml-parser**
* **Node.js Test Runner**
* **Git & GitHub**
* **Render**
* **Neon PostgreSQL**

## 📁 Project Structure

```text
gator/
├── src/
│   ├── lib/
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   ├── queries/
│   │   │   ├── index.ts
│   │   │   └── schema.ts
│   │   ├── story-radar.ts
│   │   └── ...
│   ├── ai.ts
│   ├── config.ts
│   ├── index.ts
│   ├── rss.ts
│   └── server.ts
├── web/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── tests/
│   ├── gator.integration.test.ts
│   ├── smart-summary.test.ts
│   └── story-radar.test.ts
├── drizzle.config.ts
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

## 🌐 Web Application

The Gator frontend provides a centralized interface for managing and reading RSS content.

Users can:

* Register and log in
* Browse their feeds and posts
* Search for articles
* Filter posts by category
* Save interesting articles
* Mark articles as read or unread
* Explore personalized recommendations
* Generate smart summaries
* View statistics
* Use the unified dashboard
* Generate a personalized daily digest

## 📚 API

The backend is powered by **Express** and exposes REST endpoints under `/api`.

### Health Check

```http
GET /api/health
```

Example response:

```json
{
  "ok": true,
  "message": "Gator API is running"
}
```

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
```

### Posts

```http
GET /api/posts
GET /api/saved
GET /api/posts/summary
```

### Stories

```http
GET /api/stories
POST /api/stories/brief
```

The frontend communicates with the backend through the same application domain using `/api/...` routes.

## 🧠 Personalization

Gator uses saved content and user activity to generate personalized recommendations.

Recommendations consider:

* Saved categories
* Saved feeds
* Article recency
* User reading activity

Already-saved posts are excluded from recommendations.

## 🤖 Smart Summaries

Gator provides a local smart summarization system.

It attempts to:

1. Fetch the original article
2. Extract useful article content
3. Select important sentences
4. Present a concise summary

For unsupported video and social links, Gator reports that reliable article text is unavailable instead of inventing a summary.

## 📰 Daily Digest

Gator can generate a personalized daily digest based on the user's interests and available content.

The digest combines:

* Personalized recommendations
* Smart article summaries
* Recent content

## 📊 Dashboard

The unified dashboard brings the main features together in one place.

It includes:

* User statistics
* Feed and post information
* Categories
* Personalized recommendations
* Saved content
* Smart summaries
* Reading activity

## 🗄️ Database

Gator uses **PostgreSQL** with **Drizzle ORM**.

The database contains tables for:

* Users
* Feeds
* Feed follows
* Posts
* Saved posts
* Post reads
* Sessions

Database migrations are stored in:

```text
src/lib/db/migrations
```

Database connection is configured through the `DATABASE_URL` environment variable.

## 🧪 Testing

The project uses the Node.js built-in test runner.

Run the test suite with:

```bash
npm test
```

Run TypeScript type checking with:

```bash
npx tsc --noEmit
```

The test suite covers:

* Search with category filtering
* Save and unsave behavior
* Read and unread state changes
* Video and social link handling
* Summary fallback behavior
* Story clustering
* Related and unrelated story detection

## 🚀 Deployment

Gator is deployed as a web application using **Render** with a **Neon PostgreSQL** database.

The application consists of:

```text
React + Vite
      ↓
Express + TypeScript
      ↓
Drizzle ORM
      ↓
PostgreSQL
```

### Build Process

The deployment builds the React frontend and applies the database migrations before starting the Express server.

The frontend production files are generated in:

```text
web/dist
```

The Express server then serves the frontend together with the `/api` routes.

## 💻 Local Development

Although Gator is available online, it can also be run locally for development.

### Clone the repository

```bash
git clone git@github.com:hiba-hroob/gator.git
cd gator
```

### Install backend dependencies

```bash
npm install
```

### Install frontend dependencies

```bash
cd web
npm install
cd ..
```

### Configure the database

Set the `DATABASE_URL` environment variable to a PostgreSQL database.

Example:

```text
DATABASE_URL=postgresql://username:password@host/database
```

### Apply migrations

```bash
npx drizzle-kit migrate
```

### Build the frontend

```bash
npm --prefix web run build
```

### Start the backend

```bash
npx tsx src/server.ts
```

The application will be available at:

```text
http://127.0.0.1:3000
```

## 🎥 Demo Video

Watch Gator in action:

https://youtu.be/wB7XnETRX8E

## 🎯 Project Goal

Gator started as a command-line RSS aggregator and evolved into a personalized web-based news assistant.

The project transforms a large stream of RSS content into a more useful workflow:

```text
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
Smart Summaries
    ↓
Daily Digest + Dashboard
```

## 📌 Project Status

Gator is a **fully functional full-stack web application** built with:

* ✅ React frontend
* ✅ Express backend
* ✅ REST API
* ✅ PostgreSQL database
* ✅ Drizzle ORM
* ✅ User authentication
* ✅ RSS aggregation
* ✅ Search and category filtering
* ✅ Saved and read/unread posts
* ✅ Personalized recommendations
* ✅ Smart summaries
* ✅ Dashboard and statistics
* ✅ Automated tests
* ✅ TypeScript type checking
* ✅ Cloud deployment

## 👩‍💻 Author

**Hiba Hroob**
