# EduMicro - Educational Microservices Platform

A lightweight educational platform demonstrating modern SRE and DevOps practices.

## Architecture
- **Frontend**: Vanilla HTML/CSS/JS with dynamic particle background
- **Backend**: Node.js microservices with Express
- **Database**: SQLite (file-based, no external server)
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions

## Microservices
1. **User Service** (port 3001) - User management & profiles
2. **Course Service** (port 3002) - Courses, modules, lessons
3. **Assignment Service** (port 3003) - Assignments
4. **Grade Service** (port 3004) - Grades & feedback
5. **Notification Service** (port 3005) - Notifications

## Quick Start

### Local Development
```bash
# Start all services
docker-compose up --build

# Or run individually (each service in its folder):
npm install && node server.js