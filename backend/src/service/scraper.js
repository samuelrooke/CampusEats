export const RESTAURANTS = [
  { name: "Campusravita", menuUrl: "https://www.campusravita.fi/ruokalistat/", type: "campusravita" },
  { name: "Frenckell ja Piha", menuUrl: "https://www.juvenes.fi/frenckell/", type: "juvenes" },
  { name: "Arvo", menuUrl: "https://www.juvenes.fi/arvo/", type: "juvenes" },
  { name: "Sodexo Linna", menuUrl: "https://www.sodexo.fi/ravintolat/ravintola-linna", type: "sodexo" },
  { name: "Ravintola Rata", menuUrl: "https://juvenes.fi/rata/", type: "juvenes" },
  { name: "Finn Medi", menuUrl: "https://www.juvenes.fi/finnmedi/", type: "juvenes" },
  { name: "Sodexo Hertsi", menuUrl: "https://www.sodexo.fi/ravintolat/ravintola-hertsi", type: "sodexo" },
  { name: "Tori", menuUrl: "https://www.juvenes.fi/tori/", type: "juvenes" },
  { name: "Mediapolis", menuUrl: "https://www.juvenes.fi/mediapolis/", type: "juvenes" },
  { name: "Compass Minerva", menuUrl: "https://www.compass-group.fi/ravintolat-ja-ruokalistat/foodco/kaupungit/tampere/minerva/", type: "compass" },
  { name: "Compass Reaktori", menuUrl: "https://www.compass-group.fi/ravintolat-ja-ruokalistat/foodco/kaupungit/tampere/reaktori/", type: "compass" }
];
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
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(restaurant.menuUrl, { waitUntil: "networkidle2" });

    // accept cookie
    try {
      await page.click('button#onetrust-accept-btn-handler');
      await page.waitForTimeout(500);
    } catch (e) {}


    const meals = await page.evaluate(() => {

      const tabLinks = Array.from(document.querySelectorAll('.meal-date-tabs .ui-tabs-anchor'));
      const todayTab = tabLinks.find(a => a.textContent.trim().toLowerCase() === 'tänään');
      let tabId = null;
      if (todayTab) {
        tabId = todayTab.getAttribute('href'); //#tabs-3
      }
      let mealRows = [];
      if (tabId) {
        const todayPanel = document.querySelector(tabId);
        if (todayPanel && todayPanel.getAttribute('aria-hidden') !== 'true' && todayPanel.style.display !== 'none') {
          mealRows = Array.from(todayPanel.querySelectorAll('.mealrow'));
        }
      }

      if (!mealRows.length) {
        const visiblePanel = Array.from(document.querySelectorAll('.ui-tabs-panel')).find(div => div.style.display !== 'none' && div.getAttribute('aria-hidden') !== 'true');
        if (visiblePanel) {
          mealRows = Array.from(visiblePanel.querySelectorAll('.mealrow'));
        }
      }

      if (!mealRows.length) {
        mealRows = Array.from(document.querySelectorAll('.mealrow'));
      }
      return mealRows.map(row => {
        const type = row.querySelector('.meal-type')?.textContent.trim() || '';
        const name = row.querySelector('.meal-name')?.textContent.trim() || '';
        const prices = Array.from(row.querySelectorAll('.mealprices p')).map(p => p.textContent.trim()).filter(Boolean);
        const diets = Array.from(row.querySelectorAll('.mealdietcodes span')).map(span => span.textContent.trim()).filter(Boolean);
        return { type, name, prices, diets };
      });
    });

    const date = new Date().toISOString().slice(0, 10);
    return meals.map((meal, i) => ({
      id: i,
      title: meal.name,
      type: meal.type,
      prices: meal.prices,
      diets: meal.diets,
      date,
      source: restaurant.name
    }));
  } finally {
    await browser.close();
  }
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
      throw new Error("Unknown restaurant type: " + restaurant.type);
  }
}