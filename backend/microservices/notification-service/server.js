const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3005;
const dbPath = path.join(__dirname, 'notifications.db');
const db = new Database(dbPath);

db.exec(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    message TEXT,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'notification-service', timestamp: new Date().toISOString() });
});

app.get('/api', (req, res) => {
    const notifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20').all();
    res.json({ success: true, data: notifications });
});

app.post('/api', (req, res) => {
    const { user_id, message, type } = req.body;
    const result = db.prepare('INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)').run(user_id, message, type);
    res.status(201).json({ success: true, id: result.lastInsertRowid });
});

app.listen(PORT, () => {
    console.log(`🔔 Notification Service running on port ${PORT}`);
});
module.exports = app;