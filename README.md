# Cinema Booking Agent

Cinema management and movie ticket booking system with an AI booking agent.

## Repository Structure

```text
apps/
  cinema-backend/   Existing cinema backend
  cinema-frontend/  Web application
  cinema-mobile/    Mobile application
  cinema-agent/     AI booking agent

packages/            Shared packages when needed
docs/                Project documentation
```

## Current Status

The repository is being organized into a lightweight monorepo-style structure. This restructuring only establishes top-level ownership boundaries; it does not redesign the internal architecture of each application.

Currently runnable:

- Cinema Backend
- PostgreSQL
- Redis

Not initialized yet:

- Cinema Frontend
- Cinema Mobile
- Cinema Agent

## Applications

### Cinema Backend

Existing NestJS backend code is located at `apps/cinema-backend`.

### Cinema Frontend

Reserved for the web application.

### Cinema Mobile

Reserved for the customer mobile application.

### Cinema Agent

Reserved for the AI-powered booking agent application.

## Getting Started

The current local development setup runs PostgreSQL and Redis with Docker Compose, then runs the Cinema Backend locally with npm.

### Prerequisites

Make sure the following tools are available on your machine:

- Git
- Node.js and npm
- Docker with Docker Compose
- Cloudinary development credentials

### 1. Clone the repository

```bash
git clone <repository-url>
cd cinema-booking-agent
```

### 2. Start PostgreSQL and Redis

From the repository root:

```bash
docker compose up -d
```

This starts the current local services:

| Service | Address |
| --- | --- |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

### 3. Configure the backend environment

Move into the backend application:

```bash
cd apps/cinema-backend
```

Create a local `.env` file from the tracked template.

macOS/Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

The development database values in `.env.example` already match the root `docker-compose.yml`.

Before starting the backend, replace the development placeholders for JWT and provide valid Cloudinary credentials:

```env
JWT_ACCESS_SECRET=<your-development-secret>
JWT_REFRESH_SECRET=<your-development-secret>

CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

Do not commit your local `.env` file or real credentials.

> Cloudinary credentials are currently required by backend environment validation. The backend will fail to start if they are missing.

### 4. Install backend dependencies

From `apps/cinema-backend`:

```bash
npm install
```

### 5. Seed development data (optional)

After PostgreSQL is running and the backend environment is configured:

```bash
npm run db:seed
```

This step is optional for starting the application, but it can populate development data used by the existing backend.

### 6. Start the backend

```bash
npm run start:dev
```

The current backend listens on:

```text
http://localhost:3000
```

The current API base path is:

```text
http://localhost:3000/api/v1
```

### 7. Stop local services

When development is finished, run this from the repository root:

```bash
docker compose down
```

## Current Limitations

- Only `apps/cinema-backend` is currently initialized as a runnable application.
- `apps/cinema-frontend`, `apps/cinema-mobile`, and `apps/cinema-agent` are placeholders and do not have runtime setup yet.
- The backend currently uses npm and its own `package-lock.json`; no root workspace package manager has been introduced yet.
- The API prefix is currently implemented as `api/v1` in the backend bootstrap code.
- Local development currently depends on valid Cloudinary credentials.

## Development

Application-specific setup details can live in each application's README as those applications are initialized.
