/** Restaurant configs with name, URL, and scraper type. */
export const RESTAURANTS = [
  { name: "Campusravita",     menuUrl: "https://www.campusravita.fi/",                                                                                          type: "juvenes" },
  { name: "Frenckell ja Piha",menuUrl: "https://www.juvenes.fi/frenckell/",                                                                                     type: "juvenes" },
  { name: "Arvo",             menuUrl: "https://www.juvenes.fi/arvo/",                                                                                          type: "juvenes" },
  { name: "Sodexo Linna",     menuUrl: "https://www.sodexo.fi/ravintolat/ravintola-linna",                                                                      type: "sodexo"  },
  { name: "Ravintola Rata",   menuUrl: "https://juvenes.fi/rata/",                                                                                              type: "juvenes" },
  { name: "Finn Medi",        menuUrl: "https://pikante.fi/lounaslistat-tays-kampus/",                                                                          type: "pikante" },
  { name: "Sodexo Hertsi",    menuUrl: "https://www.sodexo.fi/ravintolat/ravintola-hertsi",                                                                     type: "sodexo"  },
  { name: "Tori Mediapolis",  menuUrl: "https://ravintolapalvelut.iss.fi/tori-mediapolis/",                                                                     type: "juvenes" },
  { name: "Food&Co Minerva",  menuUrl: "https://www.compass-group.fi/ravintolat-ja-ruokalistat/foodco/kaupungit/tampere/minerva/",                              type: "compass" },
  { name: "Food&Co Reaktori", menuUrl: "https://www.compass-group.fi/ravintolat-ja-ruokalistat/foodco/kaupungit/tampere/reaktori/",                             type: "compass" },
];

/**
 * Call the Jamix menu API directly and return an array of meal name strings.
 * @param {number} restaurantId - Jamix restaurant ID
 * @param {string} name - Restaurant name used for logging
 * @returns {Promise<string[]|null>}
 */
async function fetchJamixApi(restaurantId, name) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const url = `https://fi.jamix.cloud/apps/menuservice/rest/haku/menu/${restaurantId}/1?lang=fi&date=${today}&date2=${today}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    const mealOptions = json[0]?.menuTypes?.[0]?.menus?.[0]?.days?.[0]?.mealOptions;
    if (!mealOptions) return null;
    return mealOptions.flatMap(o => o.menuItems?.map(i => i.name) ?? []);
  } catch (err) {
    console.log(`[${name}] Jamix API error: ${err.message}`);
    return null;
  }
}

/**
 * Format a string array into the standard menu item shape.
 * @param {string[]} meals
 * @param {string} restaurantName
 */
function toMenuItems(meals, restaurantName) {
  const date = new Date().toISOString().slice(0, 10);
  return [...new Set(meals)].map((title, i) => ({ id: i, title, date, source: restaurantName }));
}

/**
 * Scrape Juvenes restaurants - uses Jamix API with DOM fallback.
 * @param {object} restaurant
 * @param {import('puppeteer').Browser} browser
 */
async function scrapeJuvenes(restaurant, browser) {
  // Campusravita has a hardcoded Jamix ID — skip the browser entirely
  if (restaurant.name === "Campusravita") {
    const meals = await fetchJamixApi(97603, restaurant.name);
    if (meals?.length) return toMenuItems(meals, restaurant.name);
  }

  const page = await browser.newPage();
  try {
    await page.goto(restaurant.menuUrl, { waitUntil: "load", timeout: 60000 });

    try {
      await page.click('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {}

    const jamixInfo = await page.evaluate(() => {
      const link =
        document.querySelector('a[href*="jamix.cloud"]') ??
        document.querySelector('a[href*="jamix"]') ??
        Array.from(document.querySelectorAll('a[href*="anro"]'))[0] ??
        null;
      if (!link) return null;
      const restaurantId = link.href.match(/[?&]anro=(\d+)/)?.[1] ?? null;
      return { restaurantId };
    });

    if (jamixInfo?.restaurantId) {
      const meals = await fetchJamixApi(jamixInfo.restaurantId, restaurant.name);
      if (meals?.length) return toMenuItems(meals, restaurant.name);
    } else {
      console.log(`[${restaurant.name}] No Jamix ID found, trying DOM fallback`);
    }

    const meals = await page.evaluate(() => {
      const selectors = [
        'span.jamix-menu-item-name',
        '.menu-item--name-container > span',
        '.meal-name',
        'li.menu-single-item',
        '.menu-item-name',
      ];

      for (const sel of selectors) {
        const els = Array.from(document.querySelectorAll(sel));
        if (els.length) {
          return els.map(el => el.textContent.trim().replace(/\s+/g, ' ')).filter(t => t.length > 2);
        }
      }

      // Multiline button fallback (older Juvenes UI)
      const buttons = Array.from(document.querySelectorAll('.v-button-multiline'));
      if (buttons.length) {
        const names = buttons.flatMap(btn => {
          const items = Array.from(btn.querySelectorAll('.item-name'))
            .map(el => el.textContent.trim()).filter(t => t.length > 2);
          if (items.length) return items;
          const caption = btn.querySelector('.multiline-button-caption-text')?.textContent.trim().split('\n')[0].trim();
          return caption?.length > 2 ? [caption] : [];
        });
        if (names.length) return [...new Set(names)];
      }

      // ISS-style fallback
      const containers = Array.from(document.querySelectorAll('.menu_item_container'));
      if (containers.length) {
        return containers.map(c =>
          Array.from(c.querySelectorAll('span.menu_item_name.combined'))
            .map(s => s.textContent.trim()).join(' ').replace(/,\s*$/, '').trim()
        ).filter(t => t.length > 4 && t.length < 200);
      }

      return [];
    });

    if (!meals.length) {
      console.log(`[${restaurant.name}] WARNING: No meals extracted. URL: ${restaurant.menuUrl}`);
    }

    return toMenuItems(meals, restaurant.name);
  } finally {
    await page.close();
  }
}

/**
 * Scrape Sodexo restaurants - tab-based interface with today's meals.
 * @param {object} restaurant
 * @param {import('puppeteer').Browser} browser
 */
async function scrapeSodexo(restaurant, browser) {
  const page = await browser.newPage();
  try {
    await page.goto(restaurant.menuUrl, { waitUntil: "load", timeout: 60000 });

    try {
      await page.click('button#onetrust-accept-btn-handler');
      await new Promise(resolve => setTimeout(resolve, 500));
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
      return mealRows.map(row => ({
        type:   row.querySelector('.meal-type')?.textContent.trim() || '',
        name:   row.querySelector('.meal-name')?.textContent.trim() || '',
        prices: Array.from(row.querySelectorAll('.mealprices p')).map(p => p.textContent.trim()).filter(Boolean),
        diets:  Array.from(row.querySelectorAll('.mealdietcodes span')).map(s => s.textContent.trim()).filter(Boolean),
      }));
    });

    const date = new Date().toISOString().slice(0, 10);
    return meals.map((meal, i) => ({
      id: i, title: meal.name, type: meal.type,
      prices: meal.prices, diets: meal.diets,
      date, source: restaurant.name,
    }));
  } finally {
    await page.close();
  }
}

/**
 * Scrape Compass/Food&Co restaurants - consistent CSS selector approach.
 * @param {object} restaurant
 * @param {import('puppeteer').Browser} browser
 */
async function scrapeCompass(restaurant, browser) {
  const page = await browser.newPage();
  try {
    await page.goto(restaurant.menuUrl, { waitUntil: "load", timeout: 60000 });

    try {
      await page.click('.coi-consent-banner__agree-button');
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (e) {}

    const meals = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.meal-item--name-container > span.compass-text[font-weight-strong]'))
        .map(el => el.textContent.trim()).filter(Boolean)
    );
    if (!meals.length) {
      console.log(`[${restaurant.name}] WARNING: No meals extracted. URL: ${restaurant.menuUrl}`);
    }
    return toMenuItems(meals, restaurant.name);
  } finally {
    await page.close();
  }
}

/**
 * Scrape Pikante restaurants - first day section only, filters allergen codes.
 * @param {object} restaurant
 * @param {import('puppeteer').Browser} browser
 */
async function scrapePikante(restaurant, browser) {
  const page = await browser.newPage();
  try {
    await page.goto(restaurant.menuUrl, { waitUntil: "load", timeout: 60000 });

    const meals = await page.evaluate(() => {
      const firstSection = document.querySelector('div.paiva');
      if (!firstSection) return [];

      return Array.from(firstSection.querySelectorAll('span.meal'))
        .map(el => el.textContent.trim())
        .filter(text => {
          if (text.length < 3) return false;
          if (text.includes('€') || text.includes('Ôé¼')) return false;
          if (text.match(/^\*+(\s*\*+)*$/)) return false;
          if (text.match(/^[A-Z,\s]+$/) && text.length < 10) return false;
          if (text.match(/^\d+\./)) return false;
          return true;
        })
        .map(text => text.replace(/\s+[A-Z*,\s]+$/, '').trim())
        .filter(text => text.length > 2);
    });

    if (!meals.length) {
      console.log(`[${restaurant.name}] WARNING: No meals extracted. URL: ${restaurant.menuUrl}`);
    }

    return toMenuItems(meals, restaurant.name);
  } finally {
    await page.close();
  }
}

/**
 * Route a restaurant to the appropriate scraper using a shared Puppeteer browser.
 * @param {object} restaurant
 * @param {import('puppeteer').Browser} browser
 */
export async function scrapeRestaurant(restaurant, browser) {
  switch (restaurant.type) {
    case "juvenes": return await scrapeJuvenes(restaurant, browser);
    case "sodexo":  return await scrapeSodexo(restaurant, browser);
    case "compass": return await scrapeCompass(restaurant, browser);
    case "pikante": return await scrapePikante(restaurant, browser);
    default: throw new Error("Unknown restaurant type: " + restaurant.type);
  }
}
