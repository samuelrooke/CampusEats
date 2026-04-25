# CampusEats

<img width="2844" height="933" alt="image" src="https://github.com/user-attachments/assets/796ad429-e023-458e-8947-6335edeba5b2" />

Web app for browsing daily lunch menus from campus restaurants in the Tampere area. Menus are scraped every 4 hours and users can leave comments on each restaurant.

## Features

- Daily menus from 10 campus restaurants (Puppeteer scraper)
- Restaurant pages with menus and comments
- Interactive campus map with restaurant locations (Leaflet)
- Favorite restaurants and dishes saved to localStorage
- Opening hours per restaurant
- Admin dashboard: manage menus, restaurants, and comments, trigger manual scrape
- JWT admin authentication with client-side rate limiting

## Tech stack

| Side | Stack |
|------|-------|
| Frontend | React 19, Vite, react-router-dom, react-leaflet |
| Backend | Node.js, Express, MySQL, Puppeteer, node-cron, jsonwebtoken |
| Infra | Docker, Docker Compose, npm workspaces |

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

## Running with Docker

```bash
cp backend/.env.example .env
# fill in .env values
docker compose up --build
```

Open [http://localhost:3001](http://localhost:3001). The backend serves the built frontend — no separate frontend server needed.

## Local development setup

**Prerequisites:** Node.js 20+, MySQL

```bash
git clone https://github.com/samuelrooke/CampusEats.git
cd CampusEats
npm install
```

Copy and fill in environment variables:

```bash
cp backend/.env.example backend/.env
```

`backend/.env`:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=campuseats
DB_CONNECTION_LIMIT=10
PORT=3001
JWT_SECRET=your_secret_key
ADMIN_USER=admin
ADMIN_PASS=your_admin_password
```

Database tables are created automatically on first startup.

```bash
npm run dev
```

Starts backend (port 3001) and frontend dev server (port 5173).

## Tests

```bash
npm test -w backend
```

22 Jest + Supertest tests covering all 14 API routes. The database and Puppeteer are mocked so no running database is needed.

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

## API routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/health` | | Health check |
| GET | `/api/menus` | | Today's menus |
| GET | `/api/comments/:restaurantId` | | Comments for a restaurant |
| POST | `/api/comments` | | Add a comment |
| POST | `/api/login` | | Admin login, returns JWT |
| POST | `/api/logout` | admin | Logout |
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
- [x] Favorites (restaurants and dishes)
- [x] Mobile layout
- [x] Docker deployment

## Course context

Developed as part of the Fullstack Development course (4A00HB49-3001).

## AI use

AI (Claude, Gemini, ChatGPT Research, Learn, Study Mode) was used in the following areas:

- **Scraper**: used as a reference when reverse-engineering undocumented restaurant APIs and figuring out site-specific HTML structures
- **Bug fixing**: used as a debugging aid for environment-specific issues that were difficult to reproduce locally
- **Docker**: consulted when learning how to containerise a Node.js app with Puppeteer and set up a multi-container environment
- **Testing**: asked how to implement test environments from earlier assignments to this project,
Used AI to add inline comments to code, making it easier to navigate and understand during development.
- **npm workspaces**: consulted when structuring the monorepo
- **Styling**: used as a reference for CSS patterns and layout ideas
- **Code clarification**: used to better understand libraries and concepts encountered during development

Architecture and design decisions (database schema, API structure) were discussed with AI, but final decisions and implementation were done by me.

## Author

[@samuelrooke](https://github.com/samuelrooke)
