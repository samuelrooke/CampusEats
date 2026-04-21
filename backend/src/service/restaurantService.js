import { query } from '../database/db.js';

/** Get all restaurants ordered by name */
export async function getAllRestaurants() {
  return query('SELECT * FROM restaurants ORDER BY name');
}

/** Update a restaurant's name and menu URL by ID */
export async function updateRestaurant(id, name, menu_url) {
  await query('UPDATE restaurants SET name = ?, menu_url = ? WHERE id = ?', [name, menu_url, id]);
}

/** Delete a restaurant by ID */
export async function deleteRestaurant(id) {
  await query('DELETE FROM restaurants WHERE id = ?', [id]);
}