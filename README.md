# HORAND Partnership

Web application for creating partnership agreements between co-owners. Allows creating companies/projects, assigning ownership shares, configuring revenue distribution rules, generating and exporting partnership agreements as PDF.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | ASP.NET Core 8 Web API, Entity Framework Core, PostgreSQL 16 |
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| **Auth** | JWT (Access + Refresh tokens), HttpOnly cookies, BCrypt |
| **PDF** | QuestPDF |
| **State** | TanStack Query (server), Zustand (client) |
| **i18n** | next-intl (Ukrainian + English) |
| **Deploy** | Docker, Docker Compose, Nginx |

## Features

- User registration & login (JWT auth)
- Create companies/projects
- Add partners with ownership shares (validated sum <= 100%)
- Revenue distribution rules (3 types: Project, Client Income, Net Profit)
- Partnership agreement generation with PDF export
- E-signature (draw signature on canvas, embed in PDF)
- Role-based access (Owner / Editor)
- Audit log (who changed what and when)
- Bilingual UI (Ukrainian / English)
- Mobile-first responsive design

## Quick Start (Local Development)

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for frontend dev)
- .NET 8 SDK (for backend dev)

### 1. Start Database

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts PostgreSQL on `localhost:5432` with credentials `horand/changeme`.

### 2. Start Backend API

```bash
cd server
dotnet restore
dotnet run --project src/Horand.API
```

The API starts at `http://localhost:5000`. Swagger UI available at `http://localhost:5000/swagger`.

Database migrations run automatically on startup. Seed data is created on first launch.

### 3. Start Frontend

```bash
cd client
npm install
npm run dev
```

The frontend starts at `http://localhost:3000`.

### Test Accounts (Seed Data)

| Email | Password | Role |
|-------|----------|------|
| `demo@horand.com` | `Demo1234!` | Owner of "HORAND Tech" |
| `editor@horand.com` | `Editor1234!` | Editor of "HORAND Tech" |

The seed data includes:
- Company "HORAND Tech" with 3 partners (40%, 35%, 25%)
- Revenue rules for all 3 types
- Draft agreement (v1)

## Production Deployment (Docker)

### 1. Configure Environment

```bash
cp .env.example .env
# Edit .env with your production values (especially JWT_SECRET and POSTGRES_PASSWORD)
```

### 2. Build & Run

```bash
docker compose up -d --build
```

This starts all services:
- **PostgreSQL** on port 5432
- **API** on port 5000
- **Frontend** on port 3000
- **Nginx** on port 80 (reverse proxy)

Access the app at `http://your-server-ip`.

### 3. DigitalOcean Droplet Deployment

1. Create a Droplet (Ubuntu 22.04, min 2GB RAM)
2. Install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. Clone the repository:
   ```bash
   git clone <repo-url> /opt/horand
   cd /opt/horand
   ```
4. Configure environment:
   ```bash
   cp .env.example .env
   nano .env  # Set production values
   ```
5. Run:
   ```bash
   docker compose up -d --build
   ```
6. (Optional) Set up a domain with Nginx and Let's Encrypt.

### Database Migrations

Migrations run automatically when the API starts. To run manually:

```bash
cd server
dotnet ef database update --project src/Horand.Infrastructure --startup-project src/Horand.API
```

### File Storage

By default, uploaded files (partner photos, signatures) are stored locally in `uploads/` directory, mounted as a Docker volume.

To use **DigitalOcean Spaces** (S3-compatible):
1. Set the `DO_SPACES_*` variables in `.env`
2. Implement `SpacesFileStorageService` as an alternative to `LocalFileStorageService`
3. Register it in DI instead of `LocalFileStorageService`

## Running Tests

```bash
cd server
dotnet test
```

Tests cover:
- Share validation (partner shares, revenue rule shares)
- Auth validation (registration, login)
- Company service (CRUD operations)

## Project Structure

```
muhomornya/
├── SPEC.md                    # Full technical specification
├── README.md                  # This file
├── docker-compose.yml         # Production compose
├── docker-compose.dev.yml     # Development compose (DB only)
├── .env.example               # Environment template
├── nginx/
│   └── nginx.conf             # Reverse proxy config
├── server/                    # .NET 8 Backend
│   ├── Horand.sln
│   ├── Dockerfile
│   ├── src/
│   │   ├── Horand.API/        # Controllers, Middleware, DI
│   │   ├── Horand.Application/# DTOs, Services, Validators
│   │   ├── Horand.Domain/     # Entities, Enums
│   │   └── Horand.Infrastructure/ # DbContext, Migrations, PDF
│   └── tests/
│       └── Horand.Tests/      # Unit & Integration tests
└── client/                    # Next.js 14 Frontend
    ├── Dockerfile
    ├── src/
    │   ├── app/[locale]/      # Pages (App Router)
    │   ├── components/        # UI & Feature components
    │   ├── lib/               # API, hooks, stores, validators
    │   ├── messages/          # i18n translations (uk/en)
    │   └── types/             # TypeScript interfaces
    └── public/
```

## API Documentation

Swagger UI is available at `/swagger` when running in Development mode.

Key endpoints:
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/companies` - List companies
- `POST /api/companies` - Create company
- `GET /api/companies/:id/partners` - List partners
- `POST /api/companies/:id/partners` - Add partner
- `GET /api/companies/:id/revenue-rules` - List revenue rules
- `POST /api/companies/:id/agreements` - Generate agreement
- `GET /api/companies/:id/agreements/:aid/pdf` - Download PDF
- `POST /api/companies/:id/agreements/:aid/sign` - E-sign agreement
- `GET /api/companies/:id/audit-log` - View audit log

See [SPEC.md](./SPEC.md) for the complete API specification.
