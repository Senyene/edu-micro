# EduMicro – Educational Microservices Platform
A lightweight, production‑ready educational platform built to demonstrate modern **SRE & DevOps** practices. The application is composed of a vanilla JavaScript frontend, an API gateway, and five independent microservices, all deployed on free cloud infrastructure.

## 📋 Table of Contents
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Common Issues & Troubleshooting](#common-issues--troubleshooting)
- [SRE & DevOps Features](#sre--devops-features)
- [License](#license)

## Architecture
EduMicro follows a **microservices architecture** with an **API Gateway** pattern:
```
Browser (GitHub Pages)
        │
        ▼
API Gateway (Render.com)
   ├── /api/auth/* → Authentication (in‑memory JWT)
   ├── /api/users/* → User Service (port 3001)
   ├── /api/courses/* → Course Service (port 3002)
   ├── /api/assignments/* → Assignment Service (port 3003)
   ├── /api/grades/* → Grade Service (port 3004)
   └── /api/notifications/* → Notification Service (port 3005)
```
Each microservice owns its own SQLite database, has health‑check endpoints, and can be deployed independently. The API Gateway handles authentication, rate limiting, and proxy routing.

## Tech Stack
| Layer | Technology |
|-------------|-------------------------------------|
| Frontend | HTML5, CSS3, JavaScript (no framework) |
| Backend | Node.js + Express |
| Databases | SQLite (via `better-sqlite3`) |
| Auth | JSON Web Tokens (JWT) |
| Containers | Docker & Docker Compose |
| CI/CD | GitHub Actions |
| Hosting | Render (backend), GitHub Pages (frontend) |

## Project Structure
```
edu-micro/
├── frontend/
│ ├── index.html # Landing page
│ ├── css/style.css # Global styles
│ ├── js/
│ │ ├── particles.js # Canvas particle animation
│ │ ├── main.js # Landing page logic
│ │ └── auth.js # Authentication & API helper
│ └── pages/
│ ├── login.html
│ ├── register.html
│ ├── profile.html
│ └── dashboard.html
├── backend/
│ ├── api-gateway/
│ │ ├── server.js # API Gateway (port 3000)
│ │ ├── package.json
│ │ └── Dockerfile
│ └── microservices/
│ ├── user-service/ # Port 3001
│ ├── course-service/ # Port 3002
│ ├── assignment-service/ # Port 3003
│ ├── grade-service/ # Port 3004
│ └── notification-service/ # Port 3005
├── docker-compose.yml # Orchestrates all containers
├── .github/workflows/deploy.yml # CI/CD pipeline
└── README.md
```

## Prerequisites
- **Node.js** (v18 or later) – for local development.
- **npm** (comes with Node.js).
- **Git** – for version control.
- **Docker** (optional) – for containerised deployment.
- **Visual Studio Build Tools** (Windows only) – required to compile `better-sqlite3`.
  *Download from [visualstudio.microsoft.com](https://visualstudio.microsoft.com/visual-cpp-build-tools/), select “Desktop development with C++”.*

## Local Development
### 1. Clone the repository
```bash
git clone https://github.com/Senyene/edu-micro.git
cd edu-micro
```
### 2. Frontend (static server)
Serve the `frontend` folder with any static server. Example using Python:
```bash
cd frontend
python3 -m http.server 8080
```
Open `http://localhost:8080` in your browser.
### 3. Backend Services
Each microservice must be started individually. Open a separate terminal for each.
#### **API Gateway** (port 3000)
```bash
cd backend/api-gateway
npm install
node server.js
```
#### **User Service** (port 3001)
```bash
cd backend/microservices/user-service
npm install
node server.js
```
Repeat for the remaining services:
- `course-service` (3002)
- `assignment-service` (3003)
- `grade-service` (3004)
- `notification-service` (3005)
### 4. Verify Local Setup
- Frontend: `http://localhost:8080`
- Gateway health: `curl http://localhost:3000/health`
- Each service health: `curl http://localhost:3001/health` … `3005/health`
The frontend’s `auth.js` already points to `http://localhost:3000/api`. You can register a user via the web interface or with:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"password123"}'
```

## Docker Deployment
A single command starts the entire stack:
```bash
docker-compose up --build
```
- Frontend → `http://localhost` (port 80)
- API Gateway → `http://localhost:3000`
- All microservices will start internally and respond via the gateway.

## Production Deployment
The application is designed to be deployed for **free** using **Render** (backend) and **GitHub Pages** (frontend).
### Backend – Render
1. Push the repository to GitHub.
2. On [Render.com](https://render.com), create a **Web Service** for each component (6 total):
   - `edumicro-api-gateway`
   - `edumicro-user-service`
   - `edumicro-course-service`
   - `edumicro-assignment-service`
   - `edumicro-grade-service`
   - `edumicro-notification-service`
   **Common Settings for all services:**
   - Runtime: **Node**
   - Build Command: `npm install`
   - Start Command: `node server.js`
   **For any service using `better-sqlite3` (user, course, etc.)**, add this environment variable:
   - Key: `npm_config_build_from_source`
   - Value: `true`
   *This forces a native compilation on Render’s Linux environment.*
3. **Important:** After all services are live, update the `SERVICES` object in `backend/api-gateway/server.js` with the real Render URLs:
   ```javascript
   const SERVICES = {
       user: 'https://edumicro-user-service.onrender.com',
       course: 'https://edumicro-course-service.onrender.com',
       assignment: 'https://edumicro-assignment-service.onrender.com',
       grade: 'https://edumicro-grade-service.onrender.com',
       notification: 'https://edumicro-notification-service.onrender.com'
   };
   ```
   Commit and push – Render will automatically redeploy the gateway.
### Frontend – GitHub Pages
1. Update `frontend/js/auth.js` with the production API URL:
   ```javascript
   this.apiUrl = 'https://edumicro-api-gateway.onrender.com/api';
   ```
2. Create a `gh-pages` branch containing **only** the contents of the `frontend` folder at the root.
   ```bash
   git checkout --orphan gh-pages
   git rm -rf .
   cp -r frontend/* .
   rm -rf frontend
   git add .
   git commit -m "Deploy frontend"
   git push origin gh-pages
   ```
3. On GitHub, go to **Settings → Pages**, select **Source: `gh-pages` branch, `/ (root)`**, and save.
   Your site will be live at `https://yourusername.github.io/edu-micro`.

## Common Issues & Troubleshooting
### ❌ `better-sqlite3` fails to install on Windows
```
Error: Could not find any Visual Studio installation to use
```
**Solution:** Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and select the **“Desktop development with C++”** workload.
### ❌ `invalid ELF header` on Render (or any Linux server)
```
Error: ...invalid ELF header
```
**Cause:** The `node_modules` folder containing Windows binaries was pushed to Git.
**Solution:**
1. Ensure `node_modules/` is in `.gitignore`.
2. Run `git rm -r --cached backend/*/node_modules` and commit.
3. On Render, set the environment variable `npm_config_build_from_source=true` to force a clean Linux build.
### ❌ 502 Bad Gateway from API Gateway
```
Failed to load resource: 502 ()
```
**Likely causes:**
- The target microservice is not yet deployed or is stopped. Verify with `curl <service-url>/health`.
- The URL in `SERVICES` object of the API Gateway is incorrect or missing `https://`.
- The proxy `pathRewrite` is misconfigured. Ensure the gateway’s `server.js` uses the correct rewrite:
  ```javascript
  pathRewrite: { '^/api/courses': '/api/courses' }
  ```
- CORS might be blocked – the gateway already enables CORS, but ensure the frontend’s `apiUrl` matches the gateway’s full URL exactly.
### ❌ Dashboard shows “Could not load courses”
- The course service may not be running. Test directly with `curl <course-service-url>/api/courses`.
- The JWT token might be expired – log out and log back in.
- The API Gateway’s proxy is misrouting. Check the gateway logs on Render.
### ❌ Typewriter or particle animation not working
- Ensure `particles.js` and `main.js` are loaded correctly (check browser console for 404s).
- If using GitHub Pages, make sure all files are pushed to the `gh-pages` branch and the base URL is correct.
### ❌ Login/Registration works locally but not in production
- Verify `frontend/js/auth.js` contains the production API URL (not `localhost`).
- Ensure the API Gateway’s `JWT_SECRET` environment variable is set and identical across all services.

## SRE & DevOps Features
| Feature | Implementation |
|----------------------------|--------------------------------------------------------------------------------|
| Health checks | Each service exposes `/health` endpoint (monitored by Render for auto‑recovery) |
| Rate limiting | API Gateway limits auth endpoints to 5 req/15 min |
| Security headers | `helmet` middleware sets HTTP security headers |
| JWT authentication | Stateless auth with token expiry; protected proxy routes |
| Graceful shutdown | Services listen for `SIGTERM` and close DB connections |
| Container resource limits | Docker Compose sets CPU & memory limits per service |
| CI/CD pipeline | GitHub Actions runs tests, builds Docker images, and deploys to GitHub Pages |
| Database per service | Each microservice has its own SQLite file, no shared state |
| Infrastructure as Code | `Dockerfile`, `docker-compose.yml`, and GitHub Actions workflow |

## License
MIT License – feel free to use, modify, and distribute this project for personal, educational, or commercial purposes.

## Acknowledgements
Built as a showcase for modern **SRE/DevOps** skills. The entire stack is free to deploy and maintain.

**Maintainer:** [Udoh Edionsenyene]
**Live Demo:** [https://senyene.github.io/edu-micro](https://senyene.github.io/edu-micro)