import { query } from '../database/db.js';

async function getRestaurantIdByName(restaurantName) {
  const results = await query('SELECT id FROM restaurants WHERE name = ?', [restaurantName]);
  return results.length > 0 ? results[0].id : null;
}

export async function getCommentsByRestaurant(restaurantIdentifier) {
  let restaurantId = restaurantIdentifier;
  if (typeof restaurantIdentifier === 'string' && isNaN(restaurantIdentifier)) {
    restaurantId = await getRestaurantIdByName(restaurantIdentifier);
    if (!restaurantId) return [];
  }
  return query('SELECT * FROM comments WHERE restaurantId = ? ORDER BY timestamp DESC', [restaurantId]);
}

export async function addComment({ restaurantId, text }) {
  let finalRestaurantId = restaurantId;
  if (typeof restaurantId === 'string' && isNaN(restaurantId)) {
    finalRestaurantId = await getRestaurantIdByName(restaurantId);
    if (!finalRestaurantId) throw new Error(`Restaurant not found: ${restaurantId}`);
  }
  await query('INSERT INTO comments (restaurantId, text, timestamp) VALUES (?, ?, ?)', [finalRestaurantId, text, Date.now()]);
}

export async function deleteComment(id) {
  await query('DELETE FROM comments WHERE id = ?', [id]);
}

export async function getAllComments() {
  return query(`
    SELECT c.*, r.name as restaurantName
    FROM comments c
    LEFT JOIN restaurants r ON c.restaurantId = r.id
    ORDER BY c.timestamp DESC
  `);
}