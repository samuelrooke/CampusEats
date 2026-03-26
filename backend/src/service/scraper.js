import puppeteer from "puppeteer";

async function scrapeJuvenes(restaurant) {
  // start browser headless
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();

    // open restaurant page
    await page.goto(restaurant.menuUrl, { waitUntil: "networkidle2" });

    // grab jamix link from juvenes page
    const jamixLink = await page.evaluate(() => {
      const link = document.querySelector('a[href*="jamix.cloud"]');
      return link ? link.href : null;
    });

    // open jamix and wait for content to show up
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
        { timeout: 15000 } // timeout long because service is slow
      ).catch(() => null);
    }

    // read text and filter obvious junk rows
    const meals = await page.evaluate(() => {
      const text = (document.body?.innerText || document.body?.textContent || "");

      const isNoise = (line) => {
        const lower = line.toLowerCase();
        if (
          !lower ||
          lower.includes("cookie") ||
          lower.includes("eväste") ||
          lower.includes("consent") ||
          lower.includes("suostumus") ||
          lower.includes("ravintola rata") ||
          lower.includes("rajaa ruokavalio") ||
          lower.includes("näytä viikko") ||
          lower.includes("ruokavaliot") ||
          lower.includes("suomienglishsvenska") ||
          lower.includes("maanantai") ||
          lower.includes("tiistai") ||
          lower.includes("keskiviikko") ||
          lower.includes("torstai") ||
          lower.includes("perjantai") ||
          lower.includes("lauantai") ||
          lower.includes("sunnuntai") ||
          lower === "leipäateria" ||
          lower === "dessert" ||
          lower.startsWith("cozy") ||
          lower.startsWith("roots vegan") ||
          lower.startsWith("g =") ||
          lower.startsWith("l =") ||
          lower.startsWith("m =") ||
          lower.startsWith("mu =") ||
          lower.startsWith("veg =") ||
          lower.startsWith("* =") ||
          lower.startsWith("sis.luomua =")
        ) {
          return true;
        }

        return /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(lower);
      };

      return text
        .split("\n")
        .map((line) => line.trim().replace(/\s+/g, " "))
        .filter((line) => line.length > 4 && line.length < 140 && !isNoise(line));
    });

    // drop duplicates
    const uniqueMeals = [...new Set(meals)];

    const date = new Date().toISOString().slice(0, 10);
    return uniqueMeals.map((title, i) => ({ id: i, title, date, source: restaurant.name }));
  } finally {
    // close browser
    await browser.close();
  }
}

async function scrapeSodexo(restaurant) {
  // TODO: Implement Sodexo scraping logic
  return [];
}

async function scrapeCompass(restaurant) {
  // TODO: Implement Compass scraping logic
  return [];
}

export async function scrapeRestaurant(restaurant) {
  switch (restaurant.type) {
    case "juvenes":
      return await scrapeJuvenes(restaurant);
    case "sodexo":
      return await scrapeSodexo(restaurant);
    case "compass":
      return await scrapeCompass(restaurant);
    default:
      throw new Error(`Unknown restaurant type: ${restaurant.type}`);
  }
}