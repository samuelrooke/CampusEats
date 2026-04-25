import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import jwt from "jsonwebtoken";
import cors from "cors";
import cron from "node-cron";
import puppeteer from "puppeteer";
import { scrapeRestaurant, RESTAURANTS } from "./service/scraper.js";
import { initDatabase } from "./database/init.js";
import { query } from "./database/db.js";
import { saveMenus, getAllMenus, deleteMenu } from "./service/menuService.js";
import { getCommentsByRestaurant, addComment, deleteComment, getAllComments } from "./service/commentsService.js";
import { getAllRestaurants, updateRestaurant, deleteRestaurant } from "./service/restaurantService.js";

const app = express();

const port = process.env.PORT || 3001;
app.use(express.json());
app.use(cors());

async function refreshMenus() {
  console.log(`[refresh] Starting scrape for ${RESTAURANTS.length} restaurants.`);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const results = await Promise.allSettled(
      RESTAURANTS.map(async (restaurant) => {
        const meals = await scrapeRestaurant(restaurant, browser);
        if (meals.length > 0) {
          await saveMenus(meals, restaurant.name);
          console.log(`[refresh] Saved ${meals.length} meals for ${restaurant.name}`);
          return meals.length;
        }
        return 0;
      })
    );

    const totalSaved = results
      .filter(r => r.status === "fulfilled")
      .reduce((sum, r) => sum + r.value, 0);

    results
      .filter(r => r.status === "rejected")
      .forEach(r => console.error(`[refresh] Scrape failed:`, r.reason));

    console.log(`[refresh] Finished. Total meals saved: ${totalSaved}`);
    return totalSaved;
  } finally {
    await browser.close();
  }
}

function verifyAdminToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.admin) return res.status(403).json({ error: "Forbidden" });
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

cron.schedule("0 */4 * * *", async () => {
  try {
    const saved = await refreshMenus();
    console.log(`[cron] Refresh done: ${saved} items saved`);
  } catch (error) {
    console.error("[cron] Refresh failed:", error);
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/menus", async (req, res) => {
  try {
    res.json(await getAllMenus());
  } catch (error) {
    res.status(500).json({ error: "Failed to load menus" });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Invalid credentials" });
  }
  const trimmedUsername = username.trim();
  if (trimmedUsername.length === 0 || password.length === 0) {
    return res.status(400).json({ error: "Invalid credentials" });
  }
  if (trimmedUsername === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    const token = jwt.sign({ username: trimmedUsername, admin: true }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ token });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.post("/api/logout", verifyAdminToken, (req, res) => {
  res.json({ success: true });
});

app.get("/api/comments/:restaurantId", async (req, res) => {
  try {
    res.json(await getCommentsByRestaurant(req.params.restaurantId));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

app.post("/api/comments", async (req, res) => {
  try {
    const { restaurantId, text } = req.body;
    if (!restaurantId || !text) {
      return res.status(400).json({ error: "Missing restaurantId or text" });
    }
    await addComment({ restaurantId, text });
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to add comment" });
  }
});

app.delete("/api/comments/:id", verifyAdminToken, async (req, res) => {
  try {
    await deleteComment(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

app.get("/api/admin/comments", verifyAdminToken, async (req, res) => {
  try {
    res.json(await getAllComments());
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

app.get("/api/admin/restaurants", verifyAdminToken, async (req, res) => {
  try {
    res.json(await getAllRestaurants());
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch restaurants" });
  }
});

app.put("/api/restaurants/:id", verifyAdminToken, async (req, res) => {
  try {
    const { name, menu_url } = req.body;
    await updateRestaurant(req.params.id, name, menu_url);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update restaurant" });
  }
});

app.delete("/api/restaurants/:id", verifyAdminToken, async (req, res) => {
  try {
    await deleteRestaurant(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete restaurant" });
  }
});

app.delete("/api/menus/:id", verifyAdminToken, async (req, res) => {
  try {
    await deleteMenu(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete menu item" });
  }
});

app.post("/api/menus/refresh", verifyAdminToken, async (req, res) => {
  try {
    const saved = await refreshMenus();
    res.json({ success: true, saved });
  } catch (error) {
    res.status(500).json({ error: "Failed to refresh menus" });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(express.static(join(__dirname, "../public")));
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "../public", "index.html"));
});

if (process.env.NODE_ENV !== "test") {
  await initDatabase();
  app.listen(port, () => {
    console.log(`[server] Running on port ${port}`);
  });
  const existing = await getAllMenus();
  if (existing.length === 0) {
    console.log("[startup] No menus found, running initial scrape...");
    refreshMenus().catch(err => console.error("[startup] Initial scrape failed:", err));
  }
}

export default app;
