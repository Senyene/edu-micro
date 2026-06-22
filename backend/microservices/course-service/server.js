const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.COURSE_SERVICE_PORT || 3002;
const dbPath = path.join(__dirname, 'courses.db');
const db = new Database(dbPath);

function initializeDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            instructor_id INTEGER NOT NULL,
            category TEXT,
            difficulty_level TEXT CHECK(difficulty_level IN ('beginner', 'intermediate', 'advanced')),
            duration_hours INTEGER,
            price DECIMAL(10,2) DEFAULT 0.00,
            thumbnail_url TEXT,
            is_published BOOLEAN DEFAULT 0,
            enrollment_count INTEGER DEFAULT 0,
            rating_avg DECIMAL(2,1) DEFAULT 0.0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS modules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            order_index INTEGER NOT NULL,
            duration_minutes INTEGER DEFAULT 0,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS lessons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            module_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT,
            video_url TEXT,
            attachments TEXT,
            duration_minutes INTEGER DEFAULT 0,
            order_index INTEGER NOT NULL,
            is_free_preview BOOLEAN DEFAULT 0,
            FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            course_id INTEGER NOT NULL,
            enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            progress_percent DECIMAL(5,2) DEFAULT 0.00,
            completed_at DATETIME,
            certificate_issued BOOLEAN DEFAULT 0,
            UNIQUE(user_id, course_id)
        );
        CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
        CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
        CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
        CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
        CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id);
        CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);
    `);
    const courseCount = db.prepare('SELECT COUNT(*) as count FROM courses').get();
    if (courseCount.count === 0) {
        seedSampleData();
    }
}

function seedSampleData() {
    const insertCourse = db.prepare('INSERT INTO courses (title, description, instructor_id, category, difficulty_level, duration_hours) VALUES (?,?,?,?,?,?)');
    const insertModule = db.prepare('INSERT INTO modules (course_id, title, description, order_index, duration_minutes) VALUES (?,?,?,?,?)');
    const insertLesson = db.prepare('INSERT INTO lessons (module_id, title, content, order_index, duration_minutes, is_free_preview) VALUES (?,?,?,?,?,?)');
    const seedData = db.transaction(() => {
        const webDevId = insertCourse.run('Full Stack Web Development', 'Learn modern web development from scratch.', 1, 'Programming', 'beginner', 40).lastInsertRowid;
        const module1Id = insertModule.run(webDevId, 'HTML & CSS Fundamentals', 'Learn the building blocks of the web', 1, 120).lastInsertRowid;
        insertLesson.run(module1Id, 'Introduction to HTML', 'Learn about HTML tags and structure...', 1, 30, 1);
        insertLesson.run(module1Id, 'CSS Styling Basics', 'Style your HTML with CSS...', 2, 45, 1);
        insertLesson.run(module1Id, 'Responsive Design', 'Make websites work on all devices...', 3, 45, 0);
        const module2Id = insertModule.run(webDevId, 'JavaScript Essentials', 'Add interactivity to your websites', 2, 180).lastInsertRowid;
        insertLesson.run(module2Id, 'Variables and Data Types', 'Understanding JavaScript basics...', 1, 60, 0);
        insertLesson.run(module2Id, 'Functions and Events', 'Make your pages interactive...', 2, 60, 0);
        insertLesson.run(module2Id, 'DOM Manipulation', 'Dynamically update page content...', 3, 60, 0);
        const devOpsId = insertCourse.run('DevOps Engineering', 'Master CI/CD, Docker, Kubernetes.', 1, 'DevOps', 'advanced', 30).lastInsertRowid;
        const devModule1Id = insertModule.run(devOpsId, 'Container Fundamentals', 'Understand Docker and containerization', 1, 90).lastInsertRowid;
        insertLesson.run(devModule1Id, 'Docker Basics', 'Building and running containers...', 1, 30, 1);
        insertLesson.run(devModule1Id, 'Docker Compose', 'Multi-container applications...', 2, 30, 0);
        insertLesson.run(devModule1Id, 'Container Orchestration', 'Introduction to Kubernetes...', 3, 30, 0);
    });
    seedData();
    console.log('✅ Sample course data seeded');
}

initializeDatabase();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

app.get('/api/courses', (req, res) => {
    const { category, difficulty, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let params = [];
    if (category) { whereClause += ' AND category = ?'; params.push(category); }
    if (difficulty) { whereClause += ' AND difficulty_level = ?'; params.push(difficulty); }
    if (search) { whereClause += ' AND (title LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    const countResult = db.prepare(`SELECT COUNT(*) as total FROM courses ${whereClause}`).get(...params);
    const courses = db.prepare(`SELECT * FROM courses ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
    res.json({ success: true, data: { courses, pagination: { current_page: parseInt(page), total_courses: countResult.total, total_pages: Math.ceil(countResult.total / limit) } } });
});

app.get('/api/courses/:id', (req, res) => {
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
    const modules = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY order_index').all(req.params.id);
    const modulesWithLessons = modules.map(module => {
        const lessons = db.prepare('SELECT * FROM lessons WHERE module_id = ? ORDER BY order_index').all(module.id);
        return { ...module, lessons };
    });
    course.modules = modulesWithLessons;
    res.json({ success: true, data: { course } });
});

app.post('/api/courses/:id/enroll', (req, res) => {
    const courseId = req.params.id;
    const userId = req.body.user_id;
    if (!db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId)) return res.status(404).json({ success: false, error: 'Course not found' });
    if (db.prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?').get(userId, courseId)) return res.status(409).json({ success: false, error: 'Already enrolled' });
    db.prepare('INSERT INTO enrollments (user_id, course_id) VALUES (?,?)').run(userId, courseId);
    db.prepare('UPDATE courses SET enrollment_count = enrollment_count + 1 WHERE id = ?').run(courseId);
    res.status(201).json({ success: true, message: 'Enrolled successfully' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'course-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`📚 Course Service running on port ${PORT}`);
});

module.exports = app;