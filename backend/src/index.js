import express from "express";
import { scrapeRestaurant } from "./service/scraper.js";

const app = express();
const port = process.env.PORT || 3001;

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/menus", async (req, res) => {
  const meals = await scrapeRestaurant();
  res.json(meals);
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
