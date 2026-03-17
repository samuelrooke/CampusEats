import express from "express";
import cors from "cors";
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

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/menus", async (req, res) => {
  const menus = await getAllMenus();
  res.json(menus);
});

app.post("/api/menus/refresh", async (req, res) => {
  const meals = await scrapeRestaurant();
  await saveMenus(meals, "Ravintola Rata");
  res.json({ success: true, saved: meals.length });
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
