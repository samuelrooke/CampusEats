import express from "express";
import jwt from "jsonwebtoken";
import cors from "cors";
import cron from "node-cron"
import { scrapeRestaurant } from "./service/scraper.js";
import { initDatabase } from "./database/init.js";
import { saveMenus, getAllMenus } from "./service/menuService.js";

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
  const meals = await scrapeRestaurant();
  await saveMenus(meals, "Ravintola Rata");
  return meals.length;
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
    console.log(`Cron refresh done: ${saved} items`);
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

app.post("/api/menus/refresh", async (req, res) => {
  try {
    const saved = await refreshMenus();
    res.json({ success: true, saved });
  } catch (error) {
    res.status(500).json({ error: "Failed to refresh menus" });
  }
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
