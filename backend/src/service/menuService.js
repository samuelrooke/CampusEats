import { query } from '../database/db.js';

export async function saveMenus(menus, restaurantName) {
  let restaurant = await query('SELECT id FROM restaurants WHERE name = ?', [restaurantName]);
  if (restaurant.length === 0) {
    await query('INSERT INTO restaurants (name) VALUES (?)', [restaurantName]);
    restaurant = await query('SELECT id FROM restaurants WHERE name = ?', [restaurantName]);
  }
  const restaurantId = restaurant[0].id;
  const today = new Date().toISOString().slice(0, 10);
  await query('DELETE FROM menu_items WHERE restaurant_id = ? AND date = ?', [restaurantId, today]);
  for (const menu of menus) {
    await query('INSERT INTO menu_items (title, date, restaurant_id) VALUES (?, ?, ?)', [menu.title, menu.date, restaurantId]);
  }
}

export async function getAllMenus() {
  return await query(`
    SELECT m.id, m.title, m.date, r.name as restaurant
    FROM menu_items m
    JOIN restaurants r ON m.restaurant_id = r.id
    WHERE m.date = CURDATE()
    ORDER BY r.name, m.id
  `);
}

export async function deleteMenu(id) {
  await query('DELETE FROM menu_items WHERE id = ?', [id]);
}