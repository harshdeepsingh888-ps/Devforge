# DevForge — Developer Operating System

DevForge connects the software engineering lifecycle: **Work Management** $\rightarrow$ **Architecture Decisions** $\rightarrow$ **Code / Commits** $\rightarrow$ **CI/CD** $\rightarrow$ **Deployments** $\rightarrow$ **Incidents** $\rightarrow$ **DORA Metrics**.

---

## 🚀 Quickstart for Developers

### 1. Prerequisites
* Node.js `>= 24`
* Docker / Docker Desktop

### 2. Environment Setup
Copy the environment template:
```bash
cp .env.example apps/api/.env
```

### 3. One-Command Database Setup
Start PostgreSQL container, run migrations, and generate Prisma client:
```bash
npm run db:setup
```

### 4. Start Development Server
```bash
npm run dev:api
```
- **API Base**: `http://localhost:5000`
- **Swagger Documentation**: [`http://localhost:5000/docs`](http://localhost:5000/docs)
- **Health Check**: `http://localhost:5000/health`

---

## 🛠️ Database Management Commands

| Command | Action |
|---|---|
| `npm run db:setup` | Full setup (`db:up` $\rightarrow$ `db:migrate` $\rightarrow$ `db:generate`) |
| `npm run db:up` | Start PostgreSQL container via Docker Compose |
| `npm run db:down` | Stop PostgreSQL container |
| `npm run db:migrate` | Deploy pending Prisma migrations to PostgreSQL |
| `npm run db:generate` | Compile Prisma Client |
| `npm run db:reset` | Reset database and re-apply all migrations |

---

## 🧪 Verification & Testing

```bash
npm run typecheck   # Typecheck entire monorepo
npm test            # Run automated unit and integration tests
npm run build       # Verify production build
```
