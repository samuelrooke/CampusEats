import puppeteer from "puppeteer";

const DEFAULT_SOURCE = {
  name: "Ravintola Rata",
  menuUrl: "https://juvenes.fi/rata/",
};

/**
 * Scrapes menu items from a Juvenes restaurant via Jamix
 * @param {Object} [source] - Restaurant with name and menuUrl
 * @returns {Promise<Object[]>} Menu items with id, title, date, source
 */

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
    console.log("Jamix link found:", jamixLink);

    if (jamixLink) {
      await page.goto(jamixLink, { waitUntil: "networkidle2" });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await page.waitForFunction(
        () => {
          const body = document.body;
          if (!body) return false;
          const text = (body.innerText || body.textContent || "").trim();
          return text.length > 100;
        },
        { timeout: 15000 }
      ).catch(() => null);
    }

    const meals = await page.evaluate(() => {
      const text = (document.body?.innerText || document.body?.textContent || "");
      const skip = /cookie|eväste|consent|suostumus|ravintola|lounas|rajaa|maanantai|tiistai|keskiviikko|torstai|perjantai|lauantai|sunnuntai|^\d{1,2}\.\d{1,2}\.\d{4}$/i;
      return text
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 4 && l.length < 80 && !skip.test(l));
    });

    const uniqueMeals = [...new Set(meals)];
    console.log("Scraped items:", uniqueMeals.length);
    const date = new Date().toISOString().slice(0, 10);
    return uniqueMeals.map((title, i) => ({ id: i, title, date, source: source.name }));
  } finally {
    await browser.close();
  }
}