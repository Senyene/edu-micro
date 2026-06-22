const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.GRADE_SERVICE_PORT || 3004;
const dbPath = path.join(__dirname, 'grades.db');
const db = new Database(dbPath);

db.exec(`CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    assignment_id INTEGER,
    score INTEGER,
    graded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    feedback TEXT
)`);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'grade-service', timestamp: new Date().toISOString() });
});

app.get('/api', (req, res) => {
    const grades = db.prepare('SELECT * FROM grades').all();
    res.json({ success: true, data: grades });
});

app.post('/api', (req, res) => {
    const { user_id, assignment_id, score, feedback } = req.body;
    const result = db.prepare('INSERT INTO grades (user_id, assignment_id, score, feedback) VALUES (?,?,?,?)').run(user_id, assignment_id, score, feedback);
    res.status(201).json({ success: true, id: result.lastInsertRowid });
});

app.listen(PORT, () => {
    console.log(`📊 Grade Service running on port ${PORT}`);
});
module.exports = app;