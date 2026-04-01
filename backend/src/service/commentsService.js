// Service for handling comments in the database
import { query } from '../database/db.js';

// Get restaurant ID by name
async function getRestaurantIdByName(restaurantName) {
    const sql = 'SELECT id FROM restaurants WHERE name = ?';
    const results = await query(sql, [restaurantName]);
    return results.length > 0 ? results[0].id : null;
}

// Get comments for a specific restaurant (by name or ID)
export async function getCommentsByRestaurant(restaurantIdentifier) {
    let restaurantId = restaurantIdentifier;
    
    // If it's a string (restaurant name), look up the ID
    if (typeof restaurantIdentifier === 'string' && isNaN(restaurantIdentifier)) {
        restaurantId = await getRestaurantIdByName(restaurantIdentifier);
        if (!restaurantId) {
            return [];
        }
    }
    
    const sql = 'SELECT * FROM comments WHERE restaurantId = ? ORDER BY timestamp DESC';
    return query(sql, [restaurantId]);
}

// Add a new comment (restaurant can be name or ID)
export async function addComment({ restaurantId, text }) {
    let finalRestaurantId = restaurantId;
    
    // If it's a string (restaurant name), look up the ID
    if (typeof restaurantId === 'string' && isNaN(restaurantId)) {
        finalRestaurantId = await getRestaurantIdByName(restaurantId);
        if (!finalRestaurantId) {
            throw new Error('Restaurant not found');
        }
    }
    
    const sql = 'INSERT INTO comments (restaurantId, text, timestamp) VALUES (?, ?, ?)';
    return query(sql, [finalRestaurantId, text, Date.now()]);
}
