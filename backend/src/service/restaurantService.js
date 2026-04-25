import { query } from '../database/db.js';

export async function getAllRestaurants() {
  return query('SELECT * FROM restaurants ORDER BY name');
}

export async function updateRestaurant(id, name, menu_url) {
  await query('UPDATE restaurants SET name = ?, menu_url = ? WHERE id = ?', [name, menu_url, id]);
}

export async function deleteRestaurant(id) {
  await query('DELETE FROM restaurants WHERE id = ?', [id]);
}