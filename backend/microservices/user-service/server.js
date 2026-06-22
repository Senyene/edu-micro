const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3001;
const dbPath = path.join(__dirname, 'users.db');
const db = new Database(dbPath, { verbose: console.log });

function initializeDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'student',
            avatar_url TEXT,
            bio TEXT,
            phone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME,
            is_active BOOLEAN DEFAULT 1,
            notification_prefs TEXT DEFAULT '{"email":true,"push":false}'
        );
        CREATE TABLE IF NOT EXISTS user_profiles (
            user_id INTEGER PRIMARY KEY,
            department TEXT,
            grade_level TEXT,
            subjects TEXT,
            learning_style TEXT,
            timezone TEXT DEFAULT 'UTC',
            language TEXT DEFAULT 'en',
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);
}
initializeDatabase();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

function hashPassword(password) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(password).digest('hex');
}
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function createResponse(success, data = null, message = '', error = null) {
    return { success, timestamp: new Date().toISOString(), data, message, error };
}

app.get('/api/users', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const total = db.prepare('SELECT COUNT(*) as total FROM users WHERE is_active = 1').get().total;
    const users = db.prepare(`SELECT id, email, name, role, avatar_url, bio, created_at, last_login FROM users WHERE is_active = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(limit, offset);
    res.json(createResponse(true, { users, pagination: { current_page: page, total_pages: Math.ceil(total/limit), total_users: total, limit, has_next: page < Math.ceil(total/limit), has_previous: page > 1 } }));
});

app.get('/api/users/:id', (req, res) => {
    const user = db.prepare(`SELECT u.*, up.department, up.grade_level, up.subjects, up.learning_style FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = ? AND u.is_active = 1`).get(req.params.id);
    if (!user) return res.status(404).json(createResponse(false, null, 'User not found'));
    delete user.password_hash;
    res.json(createResponse(true, { user }));
});

app.post('/api/users', (req, res) => {
    const { email, name, password, role } = req.body;
    if (!email || !name || !password) return res.status(400).json(createResponse(false, null, 'Missing fields'));
    if (!isValidEmail(email)) return res.status(400).json(createResponse(false, null, 'Invalid email'));
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) return res.status(409).json(createResponse(false, null, 'Email already registered'));
    const passwordHash = hashPassword(password);
    const result = db.prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?,?,?,?)').run(email, name, passwordHash, role || 'student');
    db.prepare('INSERT INTO user_profiles (user_id) VALUES (?)').run(result.lastInsertRowid);
    const newUser = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(createResponse(true, { user: newUser }, 'User created'));
});

app.put('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    const { name, bio, phone, department, grade_level, learning_style } = req.body;
    if (!db.prepare('SELECT id FROM users WHERE id = ? AND is_active = 1').get(userId)) return res.status(404).json(createResponse(false, null, 'User not found'));
    const updateUser = db.transaction(() => {
        db.prepare(`UPDATE users SET name = COALESCE(?, name), bio = COALESCE(?, bio), phone = COALESCE(?, phone), updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(name, bio, phone, userId);
        db.prepare(`INSERT INTO user_profiles (user_id, department, grade_level, learning_style) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET department = COALESCE(?, department), grade_level = COALESCE(?, grade_level), learning_style = COALESCE(?, learning_style)`).run(userId, department, grade_level, learning_style, department, grade_level, learning_style);
    });
    updateUser();
    const updatedUser = db.prepare(`SELECT u.*, up.department, up.grade_level, up.learning_style FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = ?`).get(userId);
    delete updatedUser.password_hash;
    res.json(createResponse(true, { user: updatedUser }, 'Profile updated'));
});

app.delete('/api/users/:id', (req, res) => {
    const result = db.prepare('UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_active = 1').run(req.params.id);
    if (result.changes === 0) return res.status(404).json(createResponse(false, null, 'User not found'));
    res.json(createResponse(true, null, 'User deactivated'));
});

app.get('/health', (req, res) => {
    const dbTest = db.prepare('SELECT 1').get();
    res.json({ status: dbTest ? 'healthy' : 'unhealthy', service: 'user-service', database: dbTest ? 'connected' : 'disconnected', timestamp: new Date().toISOString(), uptime: process.uptime(), memory_usage: process.memoryUsage().heapUsed });
});

process.on('SIGTERM', () => { db.close(); process.exit(0); });
process.on('SIGINT', () => { db.close(); process.exit(0); });

app.listen(PORT, () => {
    console.log(`👤 User Service running on port ${PORT}`);
});

module.exports = app;