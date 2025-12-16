import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

import db from './database.js';
import { autocompleteMedia, isAIConfigured } from './services/gemini.js';
import { findCoverUrl, getPlaceholderCover } from './services/covers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure data directory exists
const dataDir = join(__dirname, '..', 'data');
if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend build
const frontendPath = join(__dirname, '..', 'frontend', 'dist');
if (existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
}

// ============== USERS ==============

// Get all users
app.get('/api/users', (req, res) => {
    try {
        const users = db.prepare('SELECT * FROM users ORDER BY name').all();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create user (name only, no password)
app.post('/api/users', (req, res) => {
    try {
        const { name, avatar_color } = req.body;
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const stmt = db.prepare('INSERT INTO users (name, avatar_color) VALUES (?, ?)');
        const result = stmt.run(name.trim(), avatar_color || '#6366f1');

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(user);
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'User already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
    try {
        const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============== ITEMS ==============

// Get all items with optional filters
app.get('/api/items', (req, res) => {
    try {
        const { type, user_id, status, search, limit = 100, offset = 0 } = req.query;

        let query = `
      SELECT DISTINCT i.*, 
        (SELECT AVG(rating) FROM reviews WHERE item_id = i.id AND rating IS NOT NULL) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE item_id = i.id) as review_count
      FROM items i
      LEFT JOIN reviews r ON i.id = r.item_id
      WHERE 1=1
    `;
        const params = [];

        if (type) {
            query += ' AND i.type = ?';
            params.push(type);
        }

        if (user_id && status) {
            query += ' AND r.user_id = ? AND r.status = ?';
            params.push(user_id, status);
        } else if (user_id) {
            query += ' AND (r.user_id = ? OR i.created_by = ?)';
            params.push(user_id, user_id);
        }

        if (search) {
            query += ' AND (i.title LIKE ? OR i.creator LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const items = db.prepare(query).all(...params);
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single item with all reviews
app.get('/api/items/:id', (req, res) => {
    try {
        const item = db.prepare(`
      SELECT i.*, 
        (SELECT AVG(rating) FROM reviews WHERE item_id = i.id AND rating IS NOT NULL) as avg_rating
      FROM items i WHERE i.id = ?
    `).get(req.params.id);

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const reviews = db.prepare(`
      SELECT r.*, u.name as user_name, u.avatar_color
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.item_id = ?
      ORDER BY r.updated_at DESC
    `).all(req.params.id);

        res.json({ ...item, reviews });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create item
app.post('/api/items', (req, res) => {
    try {
        const { type, title, year, creator, genre, synopsis, cover_url, created_by } = req.body;

        if (!type || !title) {
            return res.status(400).json({ error: 'Type and title are required' });
        }

        const stmt = db.prepare(`
      INSERT INTO items (type, title, year, creator, genre, synopsis, cover_url, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

        const result = stmt.run(type, title.trim(), year, creator, genre, synopsis, cover_url, created_by);
        const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json(item);
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            // Item already exists, return the existing one
            const existing = db.prepare('SELECT * FROM items WHERE type = ? AND title = ? AND year = ?')
                .get(req.body.type, req.body.title, req.body.year);
            if (existing) {
                return res.json(existing);
            }
        }
        res.status(500).json({ error: error.message });
    }
});

// Update item
app.put('/api/items/:id', (req, res) => {
    try {
        const { title, year, creator, genre, synopsis, cover_url } = req.body;

        const stmt = db.prepare(`
      UPDATE items SET title = ?, year = ?, creator = ?, genre = ?, synopsis = ?, cover_url = ?
      WHERE id = ?
    `);

        const result = stmt.run(title, year, creator, genre, synopsis, cover_url, req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete item
app.delete('/api/items/:id', (req, res) => {
    try {
        const result = db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============== REVIEWS ==============

// Add or update review
app.post('/api/items/:id/reviews', (req, res) => {
    try {
        const { user_id, rating, status, review_text } = req.body;
        const item_id = req.params.id;

        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }

        // Check if item exists
        const item = db.prepare('SELECT id FROM items WHERE id = ?').get(item_id);
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Upsert review
        const stmt = db.prepare(`
      INSERT INTO reviews (item_id, user_id, rating, status, review_text, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(item_id, user_id) DO UPDATE SET
        rating = excluded.rating,
        status = excluded.status,
        review_text = excluded.review_text,
        updated_at = CURRENT_TIMESTAMP
    `);

        stmt.run(item_id, user_id, rating, status || 'pending', review_text);

        const review = db.prepare(`
      SELECT r.*, u.name as user_name, u.avatar_color
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.item_id = ? AND r.user_id = ?
    `).get(item_id, user_id);

        res.json(review);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete my review
app.delete('/api/items/:id/reviews', (req, res) => {
    try {
        const { user_id } = req.body;
        const result = db.prepare('DELETE FROM reviews WHERE item_id = ? AND user_id = ?')
            .run(req.params.id, user_id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============== LISTS ==============

// Get user lists
app.get('/api/lists', (req, res) => {
    try {
        const { user_id } = req.query;

        let query = `
      SELECT l.*, 
        (SELECT COUNT(*) FROM list_items WHERE list_id = l.id) as item_count,
        u.name as user_name
      FROM lists l
      JOIN users u ON l.user_id = u.id
    `;
        const params = [];

        if (user_id) {
            query += ' WHERE l.user_id = ? OR l.is_public = 1';
            params.push(user_id);
        } else {
            query += ' WHERE l.is_public = 1';
        }

        query += ' ORDER BY l.created_at DESC';

        const lists = db.prepare(query).all(...params);
        res.json(lists);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get list with items
app.get('/api/lists/:id', (req, res) => {
    try {
        const list = db.prepare(`
      SELECT l.*, u.name as user_name
      FROM lists l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ?
    `).get(req.params.id);

        if (!list) {
            return res.status(404).json({ error: 'List not found' });
        }

        const items = db.prepare(`
      SELECT i.*, li.added_at
      FROM items i
      JOIN list_items li ON i.id = li.item_id
      WHERE li.list_id = ?
      ORDER BY li.added_at DESC
    `).all(req.params.id);

        res.json({ ...list, items });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create list
app.post('/api/lists', (req, res) => {
    try {
        const { user_id, name, description, is_public } = req.body;

        if (!user_id || !name) {
            return res.status(400).json({ error: 'user_id and name are required' });
        }

        const stmt = db.prepare('INSERT INTO lists (user_id, name, description, is_public) VALUES (?, ?, ?, ?)');
        const result = stmt.run(user_id, name.trim(), description, is_public !== false ? 1 : 0);

        const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(list);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update list
app.put('/api/lists/:id', (req, res) => {
    try {
        const { name, description, is_public } = req.body;

        const stmt = db.prepare('UPDATE lists SET name = ?, description = ?, is_public = ? WHERE id = ?');
        const result = stmt.run(name, description, is_public ? 1 : 0, req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'List not found' });
        }

        const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id);
        res.json(list);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete list
app.delete('/api/lists/:id', (req, res) => {
    try {
        const result = db.prepare('DELETE FROM lists WHERE id = ?').run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'List not found' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add item to list
app.post('/api/lists/:id/items', (req, res) => {
    try {
        const { item_id } = req.body;

        const stmt = db.prepare('INSERT OR IGNORE INTO list_items (list_id, item_id) VALUES (?, ?)');
        stmt.run(req.params.id, item_id);

        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove item from list
app.delete('/api/lists/:id/items/:itemId', (req, res) => {
    try {
        const result = db.prepare('DELETE FROM list_items WHERE list_id = ? AND item_id = ?')
            .run(req.params.id, req.params.itemId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Item not in list' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============== AI ENDPOINTS ==============

// Autocomplete media info
app.post('/api/ai/autocomplete', async (req, res) => {
    try {
        const { query, type } = req.body;

        if (!query || !type) {
            return res.status(400).json({ error: 'Query and type are required' });
        }

        if (!isAIConfigured()) {
            return res.status(503).json({ error: 'AI service not configured' });
        }

        const data = await autocompleteMedia(query, type);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Find cover URL
app.get('/api/ai/cover', async (req, res) => {
    try {
        const { title, type, year, creator } = req.query;

        if (!title || !type) {
            return res.status(400).json({ error: 'Title and type are required' });
        }

        const coverUrl = await findCoverUrl(title, type, year, creator);
        res.json({ cover_url: coverUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AI status
app.get('/api/ai/status', (req, res) => {
    res.json({ configured: isAIConfigured() });
});

// ============== STATS ==============

app.get('/api/stats', (req, res) => {
    try {
        const { user_id } = req.query;

        const totalItems = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

        const itemsByType = db.prepare(`
      SELECT type, COUNT(*) as count FROM items GROUP BY type ORDER BY count DESC
    `).all();

        let userStats = null;
        if (user_id) {
            userStats = {
                reviewed: db.prepare('SELECT COUNT(*) as count FROM reviews WHERE user_id = ?').get(user_id).count,
                completed: db.prepare('SELECT COUNT(*) as count FROM reviews WHERE user_id = ? AND status = ?').get(user_id, 'completed').count,
                avgRating: db.prepare('SELECT AVG(rating) as avg FROM reviews WHERE user_id = ? AND rating IS NOT NULL').get(user_id).avg
            };
        }

        res.json({
            totalItems,
            totalUsers,
            itemsByType,
            userStats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============== HEALTH ==============

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============== SPA FALLBACK ==============

app.get('*', (req, res) => {
    const indexPath = join(frontendPath, 'index.html');
    if (existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({ error: 'Frontend not built. Run: cd frontend && npm run build' });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`VaroLogs API running on http://0.0.0.0:${PORT}`);
    console.log(`AI Status: ${isAIConfigured() ? 'Configured' : 'Not configured (set GEMINI_API_KEY)'}`);
});
