const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const SERVICES = {
    user: 'https://edumicro-user-service.onrender.com',
    course: 'https://edumicro-course-service.onrender.com',
    assignment: 'https://edumicro-assignment-service.onrender.com',
    grade: 'https://edumicro-grade-service.onrender.com',
    notification: 'https://edumicro-notification-service.onrender.com'
};

app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
}

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'api-gateway', timestamp: new Date().toISOString(), uptime: process.uptime(), memory: process.memoryUsage() });
});

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email' });
    if (password.length < 8) return res.status(400).json({ error: 'Weak password' });
    const user = { id: Date.now().toString(), name: name || 'User', email, createdAt: new Date().toISOString() };
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ message: 'Registration successful', token, user });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
    const user = { id: Date.now().toString(), email, name: email.split('@')[0], lastLogin: new Date().toISOString() };
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Login successful', token, user });
});

// User Service Proxy
app.use('/api/users', authenticateToken, createProxyMiddleware({
    target: SERVICES.user,
    changeOrigin: true,
    pathRewrite: { '^/api/users': '/api/users' }
}));

// Course Service Proxy
app.use('/api/courses', authenticateToken, createProxyMiddleware({
    target: SERVICES.course,
    changeOrigin: true,
    pathRewrite: { '^/api/courses': '/api/courses' }
}));

// Assignment Service Proxy
app.use('/api/assignments', authenticateToken, createProxyMiddleware({
    target: SERVICES.assignment,
    changeOrigin: true,
    pathRewrite: { '^/api/assignments': '/api/assignments' }
}));

// Grade Service Proxy
app.use('/api/grades', authenticateToken, createProxyMiddleware({
    target: SERVICES.grade,
    changeOrigin: true,
    pathRewrite: { '^/api/grades': '/api/grades' }
}));

// Notification Service Proxy
app.use('/api/notifications', authenticateToken, createProxyMiddleware({
    target: SERVICES.notification,
    changeOrigin: true,
    pathRewrite: { '^/api/notifications': '/api/notifications' }
}));

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong' });
});

app.use('*', (req, res) => {
    res.status(404).json({ error: 'Not found', message: `Route ${req.originalUrl} does not exist` });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 API Gateway running on port ${PORT}`);
    });
}

module.exports = app;