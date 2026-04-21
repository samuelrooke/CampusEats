/** Restaurant configs with name, URL, and scraper type */
export const RESTAURANTS = [
  { name: "Campusravita", menuUrl: "https://www.campusravita.fi/", type: "juvenes" },
  { name: "Frenckell ja Piha", menuUrl: "https://www.juvenes.fi/frenckell/", type: "juvenes" },
  { name: "Arvo", menuUrl: "https://www.juvenes.fi/arvo/", type: "juvenes" },
  { name: "Sodexo Linna", menuUrl: "https://www.sodexo.fi/ravintolat/ravintola-linna", type: "sodexo" },
  { name: "Ravintola Rata", menuUrl: "https://juvenes.fi/rata/", type: "juvenes" },
  { name: "Finn Medi", menuUrl: "https://pikante.fi/lounaslistat-tays-kampus/", type: "pikante" },
  { name: "Sodexo Hertsi", menuUrl: "https://www.sodexo.fi/ravintolat/ravintola-hertsi", type: "sodexo" },
  { name: "Tori Mediapolis", menuUrl: "https://ravintolapalvelut.iss.fi/tori-mediapolis/", type: "juvenes" },
  { name: "Food&Co Minerva", menuUrl: "https://www.compass-group.fi/ravintolat-ja-ruokalistat/foodco/kaupungit/tampere/minerva/", type: "compass" },
  { name: "Food&Co Reaktori", menuUrl: "https://www.compass-group.fi/ravintolat-ja-ruokalistat/foodco/kaupungit/tampere/reaktori/", type: "compass" }
];
import puppeteer from "puppeteer";

/** Scrape Juvenes restaurants - uses Jamix API with DOM fallback */
async function scrapeJuvenes(restaurant) {
  // Special case for Campusravita - use direct Jamix API with hardcoded ID
  if (restaurant.name === "Campusravita") {
    const restaurantId = 97603;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const jamixApiUrl = `https://fi.jamix.cloud/apps/menuservice/rest/haku/menu/${restaurantId}/1?lang=fi&date=${today}&date2=${today}`;
    
    try {
      const response = await fetch(jamixApiUrl);
      const json = await response.json();
      
      if (json && json[0]?.menuTypes?.[0]?.menus?.[0]?.days?.[0]?.mealOptions) {
        const mealOptions = json[0].menuTypes[0].menus[0].days[0].mealOptions;
        const meals = [];
        
        mealOptions.forEach(option => {
          if (option.menuItems) {
            option.menuItems.forEach(item => {
              meals.push(item.name);
            });
          }
        });
        
        if (meals.length > 0) {
          const date = new Date().toISOString().slice(0, 10);
          return meals.map((title, i) => ({ id: i, title, date, source: restaurant.name }));
        }
      }
    } catch (error) {
      console.log(`[${restaurant.name}] Error fetching from Jamix API: ${error.message}`);
    }
  }

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(restaurant.menuUrl, { waitUntil: "networkidle2" });

    // Extract the Jamix restaurant ID from the jamix link
    const jamixInfo = await page.evaluate(() => {
      // Try different jamix link selectors
      let link = document.querySelector('a[href*="jamix.cloud"]');
      if (!link) {
        link = document.querySelector('a[href*="jamix"]');
      }
      if (!link) {
        // Check for any link with anro parameter
        const allLinks = Array.from(document.querySelectorAll('a[href*="anro"]'));
        if (allLinks.length > 0) link = allLinks[0];
      }
      
      if (!link) return null;
      
      const href = link.href;
      const anroMatch = href.match(/[?&]anro=(\d+)/);
      const restaurantId = anroMatch ? anroMatch[1] : null;
      
      return { restaurantId, jamixLink: href };
    });

    // If we found a jamix ID, use the direct API approach
    if (jamixInfo?.restaurantId) {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const jamixApiUrl = `https://fi.jamix.cloud/apps/menuservice/rest/haku/menu/${jamixInfo.restaurantId}/1?lang=fi&date=${today}&date2=${today}`;
      
      try {
        const response = await fetch(jamixApiUrl);
        const json = await response.json();
        
        // Check if response has the expected nested structure
        if (json && json[0]?.menuTypes?.[0]?.menus?.[0]?.days?.[0]?.mealOptions) {
          const mealOptions = json[0].menuTypes[0].menus[0].days[0].mealOptions;
          const meals = [];
          
          mealOptions.forEach(option => {
            if (option.menuItems) {
              option.menuItems.forEach(item => {
                meals.push(item.name);
              });
            }
          });
          
          if (meals.length > 0) {
            const date = new Date().toISOString().slice(0, 10);
            return meals.map((title, i) => ({ id: i, title, date, source: restaurant.name }));
          }
        }
      } catch (error) {
        console.log(`[${restaurant.name}] Error fetching from Jamix API: ${error.message}`);
      }
    } else {
      console.log(`[${restaurant.name}] No jamix restaurant ID found, trying fallback extraction`);
    }

    // Fallback: try to extract meals from the initial page (jamix widget embedded)
    let meals = await page.evaluate(() => {
      const jamixSelectors = [
        { selector: 'span.jamix-menu-item-name', attr: 'textContent' }
      ];

      for (const {selector, attr} of jamixSelectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          return elements
            .map(el => el[attr].trim().replace(/\s+/g, " "))
            .filter(text => text.length > 2);
        }
      }
      return null;
    });

    // If we got meals from fallback, use them
    if (meals && meals.length > 0) {
      const uniqueMeals = [...new Set(meals)];
      const date = new Date().toISOString().slice(0, 10);
      return uniqueMeals.map((title, i) => ({ id: i, title, date, source: restaurant.name }));
    }

    // Final fallback: try other menu structures
    const finalMeals = await page.evaluate(() => {
      // Try modern Juvenes structure with multiline buttons
      const multilineButtons = Array.from(document.querySelectorAll('.v-button-multiline'));
      if (multilineButtons.length > 0) {
        const mealNames = [];
        multilineButtons.forEach(button => {
          const itemNames = Array.from(button.querySelectorAll('.item-name'))
            .map(el => el.textContent.trim())
            .filter(text => text.length > 2);
          if (itemNames.length === 0) {
            const captionText = button.querySelector('.multiline-button-caption-text');
            if (captionText) {
              const mealName = captionText.textContent.trim().split('\n')[0].trim();
              if (mealName.length > 2) {
                itemNames.push(mealName);
              }
            }
          }
          mealNames.push(...itemNames);
        });
        if (mealNames.length > 0) {
          return [...new Set(mealNames)];
        }
      }

      // Try alternative menu structures
      const alternativeSelectors = [
        { selector: '.menu-item--name-container > span', attr: 'textContent' },
        { selector: '.meal-name', attr: 'textContent' },
        { selector: 'li.menu-single-item', attr: 'textContent' },
        { selector: '.menu-item-name', attr: 'textContent' }
      ];

      for (const {selector, attr} of alternativeSelectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          return elements
            .map(el => el[attr].trim().replace(/\s+/g, " "))
            .filter(text => text.length > 2);
        }
      }

      // Fallback for iss-style pages
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

    const uniqueMeals = [...new Set(finalMeals)];

    if (uniqueMeals.length === 0) {
      console.log(`[${restaurant.name}] WARNING: No meals extracted. URL: ${restaurant.menuUrl}`);
    }

    const date = new Date().toISOString().slice(0, 10);
    return uniqueMeals.map((title, i) => ({ id: i, title, date, source: restaurant.name }));
  } finally {
    await browser.close();
  }
}

/** Scrape Sodexo restaurants - tab-based interface with today's meals */
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

/** Scrape Compass/Food&Co restaurants - consistent CSS selector approach */
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

/** Scrape Pikante restaurants - first restaurant only, filters allergen codes */
async function scrapePikante(restaurant) {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(restaurant.menuUrl, { waitUntil: "networkidle2" });
    
    const meals = await page.evaluate(() => {
      // Get only the first restaurant section (first div.paiva)
      const firstRestaurant = document.querySelector('div.paiva');
      if (!firstRestaurant) return [];
      
      return Array.from(firstRestaurant.querySelectorAll('span.meal'))
        .map(el => el.textContent.trim())
        // Filter out prices, asterisks, and allergen-only entries
        .filter(text => {
          if (text.length < 3) return false;
          if (text.includes('€') || text.includes('Ôé¼')) return false;
          if (text.match(/^\*+(\s*\*+)*$/)) return false; // Only asterisks
          if (text.match(/^[A-Z,\s]+$/) && text.length < 10) return false; // Only allergen codes
          if (text.match(/^\d+\./)) return false; // Numbered items
          return true;
        })
        // Remove allergen codes from end of meal name (e.g., "Kasvis A, L, V" -> "Kasvis")
        .map(text => text.replace(/\s+[A-Z*,\s]+$/, '').trim())
        .filter(text => text.length > 2);
    });

    const uniqueMeals = [...new Set(meals)];

    if (uniqueMeals.length === 0) {
      console.log(`[${restaurant.name}] WARNING: No meals extracted. URL: ${restaurant.menuUrl}`);
    }

    const date = new Date().toISOString().slice(0, 10);
    return uniqueMeals.map((title, i) => ({ id: i, title, date, source: restaurant.name }));
  } finally {
    await browser.close();
  }
}

/** Route restaurant to appropriate scraper based on type */
export async function scrapeRestaurant(restaurant) {
  switch (restaurant.type) {
    case "juvenes":
      return await scrapeJuvenes(restaurant);
    case "sodexo":
      return await scrapeSodexo(restaurant);
    case "compass":
      return await scrapeCompass(restaurant);
    case "pikante":
      return await scrapePikante(restaurant);
    default:
      throw new Error("Unknown restaurant type: " + restaurant.type);
  }
}