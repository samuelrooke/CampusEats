// Service for handling comments in the database
import { query } from '../database/db.js';

// Get comments for a specific restaurant
export async function getCommentsByRestaurant(restaurantId) {
    const sql = 'SELECT * FROM comments WHERE restaurantId = ? ORDER BY timestamp DESC';
    return query(sql, [restaurantId]);
}

// Add a new comment
export async function addComment({ restaurantId, text }) {
    const sql = 'INSERT INTO comments (restaurantId, text, timestamp) VALUES (?, ?, ?)';
    return query(sql, [restaurantId, text, Date.now()]);
}
