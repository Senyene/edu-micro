const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.ASSIGNMENT_SERVICE_PORT || 3003;
const dbPath = path.join(__dirname, 'assignments.db');
const db = new Database(dbPath);

db.exec(`CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATETIME,
    max_score INTEGER DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'assignment-service', timestamp: new Date().toISOString() });
});

app.get('/api', (req, res) => {
    const assignments = db.prepare('SELECT * FROM assignments').all();
    res.json({ success: true, data: assignments });
});

app.post('/api', (req, res) => {
    const { course_id, title, description, due_date } = req.body;
    const result = db.prepare('INSERT INTO assignments (course_id, title, description, due_date) VALUES (?,?,?,?)').run(course_id, title, description, due_date);
    res.status(201).json({ success: true, id: result.lastInsertRowid });
});

app.listen(PORT, () => {
    console.log(`📝 Assignment Service running on port ${PORT}`);
});
module.exports = app;