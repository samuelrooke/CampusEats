import express from "express";
import jwt from "jsonwebtoken";
import cors from "cors";
import cron from "node-cron"
import { scrapeRestaurant, RESTAURANTS } from "./service/scraper.js";
import { initDatabase } from "./database/init.js";
import { query } from "./database/db.js";
import { saveMenus, getAllMenus } from "./service/menuService.js";
import { getCommentsByRestaurant, addComment } from "./service/commentsService.js";

/**
 * @fileoverview CampusEats backend API server
 * @module backend/index
 */

const app = express();

await initDatabase();
const port = process.env.PORT || 3001;
app.use(express.json());
app.use(cors());

async function refreshMenus() {
  let totalSaved = 0;
  for (const restaurant of RESTAURANTS) {
    try {
      console.log("[refreshing] scraping " + restaurant.name + "...");
      const meals = await scrapeRestaurant(restaurant);
      if (meals.length > 0) {
        await saveMenus(meals, restaurant.name);
        totalSaved += meals.length;
        console.log("[refresh] saved " + meals.length + " meals for " + restaurant.name);
      } else {
        console.warn("[refresh] no meals found for " + restaurant.name);
      }
    } catch (err) {
      console.error("[refresh] error scraping " + restaurant.name + ":", err.message);
    }
  }
  return totalSaved;
}

async function getOrRefreshMenus() {
  const menus = await getAllMenus();
  if (menus.length > 0) return menus;

  await refreshMenus();
  return await getAllMenus();
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
    console.log("Cron refresh done: " + saved + " items");
  } catch (error) {
    console.error("Cron refresh failed", error);
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/menus", async (req, res) => {
  try {
    const menus = await getOrRefreshMenus();
    res.json(menus);
  } catch (error) {
    res.status(500).json({ error: "Failed to load menus" });
  }
});

app.post("/api/login", async (req, res) => {
  console.log("Login endpoint hit", req.body);
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    const token = jwt.sign({ username, admin: true }, process.env.JWT_SECRET, { //Json Web Token
      expiresIn: "1h",
    });
    res.json({ token });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }  
})

// Get comments for a restaurant
app.get("/api/comments/:restaurantId", async (req, res) => {
  try {
    const restaurantId = req.params.restaurantId;
    const comments = await getCommentsByRestaurant(restaurantId);
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// Add a new comment
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

// Delete a comment (admin only)
app.delete("/api/comments/:id", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const sql = "DELETE FROM comments WHERE id = ?";
    await query(sql, [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// Get all comments (admin only)
app.get("/api/admin/comments", verifyAdminToken, async (req, res) => {
  try {
    const sql = "SELECT c.*, r.name as restaurantName FROM comments c LEFT JOIN restaurants r ON c.restaurantId = r.id ORDER BY c.timestamp DESC";
    const comments = await query(sql);
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// Get all restaurants (admin only)
app.get("/api/admin/restaurants", verifyAdminToken, async (req, res) => {
  try {
    const sql = "SELECT * FROM restaurants ORDER BY name";
    const restaurants = await query(sql);
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch restaurants" });
  }
});

// Update a restaurant (admin only)
app.put("/api/restaurants/:id", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, menu_url } = req.body;
    const sql = "UPDATE restaurants SET name = ?, menu_url = ? WHERE id = ?";
    await query(sql, [name, menu_url, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update restaurant" });
  }
});

// Delete a restaurant (admin only)
app.delete("/api/restaurants/:id", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const sql = "DELETE FROM restaurants WHERE id = ?";
    await query(sql, [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete restaurant" });
  }
});

// Delete a menu item (admin only)
app.delete("/api/menus/:id", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const sql = "DELETE FROM menu_items WHERE id = ?";
    await query(sql, [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete menu" });
  }
});

app.post("/api/menus/refresh", async (req, res) => {
  try {
    const saved = await refreshMenus();
    res.json({ success: true, saved });
  } catch (error) {
    res.status(500).json({ error: "Failed to refresh menus" });
  }
});

app.listen(port, () => {
  console.log("Backend running on port " + port);
});
