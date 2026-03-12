import puppeteer from "puppeteer";

const DEFAULT_SOURCE = {
  name: "Ravintola Rata",
  menuUrl: "https://juvenes.fi/rata/",
};

export async function scrapeRestaurant(source = DEFAULT_SOURCE) {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(source.menuUrl, { waitUntil: "networkidle2" });

    const meals = await page.evaluate(() => {
      const skip = /cookie|eväste|consent|suostumus/i;
      const lines = document.body.innerText.split("\n");
      return lines
        .filter(l => l.trim().length > 3 && !skip.test(l))
        .slice(0, 20);
    });

    const date = new Date().toISOString().slice(0, 10);
    return meals.map((title, i) => ({
      id: i,
      title: title.trim(),
      date,
      source: source.name,
    }));
  } finally {
    await browser.close();
  }
}