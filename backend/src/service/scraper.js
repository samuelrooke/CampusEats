export const RESTAURANTS = [
  { name: "Campusravita", menuUrl: "https://www.campusravita.fi/ruokalistat/", type: "juvenes" },
  { name: "Frenckell ja Piha", menuUrl: "https://www.juvenes.fi/frenckell/", type: "juvenes" },
  { name: "Arvo", menuUrl: "https://www.juvenes.fi/arvo/", type: "juvenes" },
  { name: "Sodexo Linna", menuUrl: "https://www.sodexo.fi/ravintolat/ravintola-linna", type: "sodexo" },
  { name: "Ravintola Rata", menuUrl: "https://juvenes.fi/rata/", type: "juvenes" },
  { name: "Finn Medi", menuUrl: "https://www.juvenes.fi/finnmedi/", type: "juvenes" },
  { name: "Sodexo Hertsi", menuUrl: "https://www.sodexo.fi/ravintolat/ravintola-hertsi", type: "sodexo" },
  { name: "Tori", menuUrl: "https://www.juvenes.fi/tori/", type: "juvenes" },
  { name: "Mediapolis", menuUrl: "https://www.juvenes.fi/mediapolis/", type: "juvenes" },
  { name: "Food&Co Minerva", menuUrl: "https://www.compass-group.fi/ravintolat-ja-ruokalistat/foodco/kaupungit/tampere/minerva/", type: "compass" },
  { name: "Food&Co Reaktori", menuUrl: "https://www.compass-group.fi/ravintolat-ja-ruokalistat/foodco/kaupungit/tampere/reaktori/", type: "compass" }
];
import puppeteer from "puppeteer";

async function scrapeJuvenes(restaurant) {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(restaurant.menuUrl, { waitUntil: "networkidle2" });

    // extract jamix link from juvenes page
    const jamixLink = await page.evaluate(() => {
      const link = document.querySelector('a[href*="jamix.cloud"]');
      return link ? link.href : null;
    });

    // navigate to jamix and wait for content
    if (jamixLink) {
      await page.goto(jamixLink, { waitUntil: "networkidle2" });
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.waitForFunction(
        () => {
          const body = document.body;
          if (!body) return false;
          const text = (body.innerText || body.textContent || "").trim();
          return text.length > 100;
        },
        { timeout: 8000 }
      ).catch(() => null);
    }

    const meals = await page.evaluate(() => {
      const selectors = [
        'li.menu-single-item',
        '.menu-item-name'
      ];

      let mealElements = [];
      for (const selector of selectors) {
        mealElements = Array.from(document.querySelectorAll(selector));
        if (mealElements.length > 0) break;
      }

      if (mealElements.length > 0) {
        return mealElements.map(el => el.textContent.trim().replace(/\s+/g, " ")).filter(text => text.length > 3);
      }
      
      // fallback for iss-style pages
      const containers = Array.from(document.querySelectorAll('.menu_item_container'));
      if (containers.length > 0) {
        const issItems = containers.map(container => {
          const nameSpans = Array.from(container.querySelectorAll('span.menu_item_name.combined'));
          const names = nameSpans.map(span => span.textContent.trim()).filter(text => text);
          return names.join(' ').replace(/,\s*$/, '').trim();
        }).filter(text => text && text.length > 4 && text.length < 200);
        
        if (issItems.length > 0) {
          return issItems;
        }
      }

      return [];
    });

    const uniqueMeals = [...new Set(meals)];

    const date = new Date().toISOString().slice(0, 10);
    return uniqueMeals.map((title, i) => ({ id: i, title, date, source: restaurant.name }));
  } finally {
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
      let mealRows = [];
      if (todayTab) {
        const tabId = todayTab.getAttribute('href');
        const todayPanel = document.querySelector(tabId);
        if (todayPanel && todayPanel.getAttribute('aria-hidden') !== 'true' && todayPanel.style.display !== 'none') {
          mealRows = Array.from(todayPanel.querySelectorAll('.mealrow'));
        }
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
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(restaurant.menuUrl, { waitUntil: "networkidle2" });
    const meals = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.meal-item--name-container > span.compass-text[font-weight-strong]'))
        .map(item => item.textContent.trim()).filter(Boolean);
    });
    const date = new Date().toISOString().slice(0, 10);
    return meals.map((title, i) => ({ id: i, title, date, source: restaurant.name }));
  } finally {
    await browser.close();
  }
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