import puppeteer from "puppeteer";

export async function scrapeRestaurant(source) {
  const browser = await puppeteer.launch({ headless: true });
  try {

    const page = await browser.newPage();
    await page.goto(source.menuUrl, { waitUntil: "networkidle2" });

    const meals = await page.evaluate(() => []);
    return meals;
    
  } finally { await browser.close(); }
}