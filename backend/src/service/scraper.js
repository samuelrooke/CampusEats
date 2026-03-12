import puppeteer from "puppeteer";

export async function scrapeRestaurant(source) {
  const browser = await puppeteer.launch({ headless: true });
  try {

    const page = await browser.newPage();
    await page.goto(source.menuUrl, { waitUntil: "networkidle2" });

    const meals = await page.evaluate(() => {
      const rows = document.body.innerText.split("\n").filter(line => line.trim().length > 3);
      return rows.slice(0, 20).map(text => ({ title: text.trim(), tags: [] }));
    });
    return meals;

  } finally { await browser.close(); }
}