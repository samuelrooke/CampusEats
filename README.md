# CampusEats

![campuseats](image-1.png)

Web app for browsing daily lunch menus from campus restaurants in the Tampere area. Menus are scraped automatically every 4 hours and users can leave comments on each restaurant.

## Features

- Daily menus scraped from 10 campus restaurants using Puppeteer
- Restaurant pages with menu listing and user comments
- Interactive campus map with restaurant locations (Leaflet)
- Opening hours displayed per restaurant
- Admin dashboard — manage menus, restaurants, and comments, trigger manual scrape
- JWT-based admin authentication

## Tech stack

| Side | Stack |
|------|-------|
| Frontend | React 19, Vite, Tailwind CSS, react-router-dom, react-leaflet |
| Backend | Node.js, Express, MySQL, Puppeteer, node-cron, jsonwebtoken |

## Project structure

```
CampusEats/
├── backend/
│   └── src/
│       ├── database/       # db connection and table init
│       └── service/        # scraper, menu, comments, restaurant logic
└── frontend/CampusEats/
    └── src/                # React components and styles
```

## Setup

### Prerequisites

- Node.js 18+
- MySQL server running locally

### 1. Clone and install

```bash
git clone https://github.com/samuelrooke/CampusEats.git
cd CampusEats
npm install --prefix backend
npm install --prefix frontend/CampusEats
```

### 2. Configure environment variables

Copy the example and fill in your values:

```bash
cp backend/.env.example backend/.env
```

`backend/.env`:

```
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=campuseats
DB_CONNECTION_LIMIT=10
PORT=3001
JWT_SECRET=your_secret_key
ADMIN_USER=admin
ADMIN_PASS=your_admin_password
```

The database tables are created automatically on first startup.

### 3. Run

```bash
npm start
```

This starts both the backend (port 3001) and frontend (port 5173) concurrently.

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Supported restaurants

| Restaurant | Scraper type |
|------------|-------------|
| Campusravita | Juvenes / Jamix API |
| Frenckell ja Piha | Juvenes / Jamix API |
| Arvo | Juvenes / Jamix API |
| Sodexo Linna | Sodexo |
| Ravintola Rata | Juvenes / Jamix API |
| Finn Medi | Pikante |
| Sodexo Hertsi | Sodexo |
| Tori Mediapolis | Juvenes / ISS |
| Food&Co Minerva | Compass |
| Food&Co Reaktori | Compass |

Menus refresh automatically every 4 hours via cron, or manually from the admin dashboard.

## API routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/health` | — | Health check |
| GET | `/api/menus` | — | Today's menus |
| GET | `/api/comments/:restaurantId` | — | Comments for a restaurant |
| POST | `/api/comments` | — | Add a comment |
| POST | `/api/login` | — | Admin login, returns JWT |
| GET | `/api/admin/comments` | admin | All comments |
| DELETE | `/api/comments/:id` | admin | Delete a comment |
| GET | `/api/admin/restaurants` | admin | All restaurants |
| PUT | `/api/restaurants/:id` | admin | Update a restaurant |
| DELETE | `/api/restaurants/:id` | admin | Delete a restaurant |
| DELETE | `/api/menus/:id` | admin | Delete a menu item |
| POST | `/api/menus/refresh` | admin | Trigger manual scrape |

## Roadmap

- [x] Daily menu scraping (10 restaurants)
- [x] Interactive campus map
- [x] User comments per restaurant
- [x] Admin dashboard with CRUD and manual refresh
- [x] JWT admin authentication
- [ ] Mobile layout
- [ ] Multi-language support
- [ ] Docker deployment
- [x] Better UI/UX

## Course context

Developed as part of the Fullstack Development course (4A00HB49-3001).

## AI use

AI (Claude, Gemini, Chatgpt study mode) was used in the following areas:

- **Scraper**: identifying Jamix API endpoints, selectors for Sodexo/Compass/Pikante pages, and keyword filtering logic
- **Bug fixing**: diagnosing and fixing the database driver mismatch (mysql to mysql2), column name mismatches in SQL queries, and timestamp type errors in the comments table
- **Styling**: parts of the CSS and Tailwind theme configuration were generated with AI assistance
- **Code clarification**: explaining and reviewing code during development

AI was also consulted for ideas on architecture and design decisions, such as database schema and API structure. Final decisions and coding implementation were done by me.

## Author

[@samuelrooke](https://github.com/samuelrooke)
