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

    // Juvenes uses Jamix
    const jamixLink = await page.evaluate(() => {
      const link = document.querySelector('a[href*="jamix.cloud"]');
      return link ? link.href : null;
    });
    if (jamixLink) await page.goto(jamixLink, { waitUntil: "networkidle2" });

    const meals = await page.evaluate(() => {
      const skip = /cookie|eväste|consent|suostumus|ravintola|lounas|rajaa|maanantai|tiistai|keskiviikko|torstai|perjantai|lauantai|sunnuntai|^\d{1,2}\.\d{1,2}\.\d{4}$/i;
      return document.body.innerText
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 4 && l.length < 80 && !skip.test(l));
    });

    const date = new Date().toISOString().slice(0, 10);
    return meals.map((title, i) => ({ id: i, title, date, source: source.name }));
  } finally {
    await browser.close();
  }
}