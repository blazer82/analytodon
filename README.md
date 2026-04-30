# 📊 Analytodon - Analytics for Mastodon

This is the official repository for the service [www.analytodon.com](https://www.analytodon.com).

Analytodon provides analytics and insights for Mastodon accounts, helping users understand their engagement and growth on the Fediverse.

🤝 Contributions are welcome.

🏠 Self-hosting is explicitly allowed.

## 🏗️ Project Structure

This project is a monorepo using pnpm workspaces containing:

- 🚀 **Backend**: A NestJS application providing the API services (`apps/backend`)
- 💻 **Frontend**: A Remix application for the user interface (`apps/frontend`)
- 🛠️ **CLI**: Command-line tools for data management and maintenance (`apps/cli`)
- 🔌 **REST Client**: Auto-generated TypeScript client for the API (`packages/rest-client`)

## 🛠️ Development

### 📋 Prerequisites

- 📦 Node.js (v20+)
- 🗄️ MongoDB database
- 📚 pnpm v10.5.2 or later (for package management)

### 🚀 Getting Started

1. Clone the repository:

```bash
git clone https://github.com/blazer82/analytodon.git
cd analytodon
```

2. Install dependencies:

```bash
pnpm install
```

3. Start local services:

```bash
pnpm run docker:up
```

This starts:

- **MongoDB** on `localhost:27017`
- **Mailpit** SMTP on `localhost:1025`, Web UI at http://localhost:8025

4. Configure environment variables:
   - Copy `.env.example` to `.env` in `apps/backend`, `apps/frontend`, and `apps/cli`
   - The example files ship with working defaults for local development

5. Seed the development database (optional):

```bash
pnpm run db:seed
```

This creates test users with 90 days of realistic analytics data:

- `dev@analytodon.local` / `password` (account-owner with connected Mastodon account)
- `admin@analytodon.local` / `password` (admin)

To reset and re-seed: `pnpm run db:seed:reset`

6. Start the development servers:

```bash
# Start both frontend and backend in development mode
pnpm run dev

# Or start them individually
pnpm --filter @analytodon/backend run start:dev
pnpm --filter @analytodon/frontend run dev
```

## 📜 Available Scripts

The monorepo includes several useful scripts:

```bash
# Start local services (MongoDB, Mailpit)
pnpm run docker:up

# Stop local services
pnpm run docker:down

# Seed the dev database with test data
pnpm run db:seed

# Reset and re-seed the dev database
pnpm run db:seed:reset

# Build all applications
pnpm run build

# Run linting across all packages
pnpm run lint

# Run tests across all packages
pnpm run test

# Check code formatting
pnpm run prettier:check

# Fix code formatting
pnpm run prettier:write

# Generate API client from OpenAPI spec
pnpm run codegen
```

## 🚀 Backend (NestJS)

The backend provides RESTful APIs for account management, authentication, and analytics processing.

```bash
# Run backend tests
pnpm --filter @analytodon/backend run test

# Run backend in production mode
pnpm --filter @analytodon/backend run start:prod
```

## 💻 Frontend (Remix)

The frontend provides the user interface for interacting with Analytodon.

```bash
# Build the frontend for production
pnpm --filter @analytodon/frontend run build

# Start the frontend in production mode
pnpm --filter @analytodon/frontend run start
```

## 🛠️ CLI (oclif)

The CLI provides command-line tools for data management, maintenance, and automation tasks.

```bash
# Build the CLI
pnpm --filter @analytodon/cli run build

# Run a CLI command
pnpm --filter @analytodon/cli run analytodon-cli [command]

# See available commands
pnpm --filter @analytodon/cli run analytodon-cli help
```

## 🏠 Self-Hosting

Analytodon runs as three Docker containers -- a **backend** API (NestJS), a **frontend** web app (Remix), and a **CLI** cron worker -- plus a **MongoDB** database. The recommended way to self-host is with Docker Compose.

### 📋 Prerequisites

- Docker and Docker Compose
- A reverse proxy (Caddy, nginx, or Traefik) for TLS termination
- An SMTP server or transactional email service (for verification and notification emails)
- A domain name with DNS pointing to your server

### 🔑 Generate Secrets

Generate three secrets before starting. The `ENCRYPTION_KEY` encrypts Mastodon OAuth tokens stored in the database -- it **must** be identical in the backend and CLI containers.

```bash
# ENCRYPTION_KEY — 64-character hex string (32 bytes for AES-256)
openssl rand -hex 32

# JWT_SECRET — used by the backend to sign authentication tokens
openssl rand -base64 48

# SESSION_SECRET — used by the frontend to encrypt session cookies
openssl rand -base64 48
```

> **Warning:** Never change `ENCRYPTION_KEY` after initial setup -- existing Mastodon tokens would become undecryptable.

### 🐳 Docker Compose

Create a `docker-compose.prod.yml` in the repository root:

```yaml
services:
  mongodb:
    image: mongo:8
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: analytodon
      MONGO_INITDB_ROOT_PASSWORD: <db-password>
    volumes:
      - mongodb_data:/data/db

  backend:
    build:
      context: .
      dockerfile: deploy/docker/backend.Dockerfile
    restart: unless-stopped
    ports:
      - "127.0.0.1:3001:3000"
    depends_on:
      - mongodb
    environment:
      DB_CLIENT_URL: mongodb://analytodon:<db-password>@mongodb:27017/analytodon?authSource=admin
      ENCRYPTION_KEY: <your-encryption-key>
      JWT_SECRET: <your-jwt-secret>
      JWT_EXPIRES_IN: 1h
      JWT_REFRESH_TOKEN_EXPIRES_IN: 7d
      FRONTEND_URL: https://<your-domain>
      MASTODON_APP_NAME: Analytodon
      MARKETING_URL: https://<your-domain>
      EMAIL_HOST: <smtp-host>
      EMAIL_PORT: "587"
      EMAIL_USER: <smtp-user>
      EMAIL_PASS: <smtp-password>
      EMAIL_SECURE: "false"
      EMAIL_FROM_NAME: Analytodon
      EMAIL_FROM_ADDRESS: <noreply@your-domain>

  frontend:
    build:
      context: .
      dockerfile: deploy/docker/frontend.Dockerfile
    restart: unless-stopped
    ports:
      - "127.0.0.1:3002:3000"
    depends_on:
      - backend
    environment:
      API_URL: http://backend:3000
      SESSION_SECRET: <your-session-secret>
      MARKETING_URL: https://<your-domain>
      SUPPORT_EMAIL: <your-email>

  cli:
    build:
      context: .
      dockerfile: deploy/docker/cli.Dockerfile
    restart: unless-stopped
    depends_on:
      - mongodb
    environment:
      MONGODB_URI: mongodb://analytodon:<db-password>@mongodb:27017/analytodon?authSource=admin
      MONGODB_DATABASE: analytodon
      ENCRYPTION_KEY: <your-encryption-key>
      APP_URL: https://<your-domain>
      LOG_LEVEL: info

volumes:
  mongodb_data:
```

A few notes:

- **`API_URL`** (frontend) uses Docker-internal networking -- the frontend calls the backend server-side, never from the browser
- Backend and frontend bind to `127.0.0.1` so they are only reachable through the reverse proxy
- The **CLI container** runs a cron daemon in the foreground -- it handles all scheduled data fetching, aggregation, emails, and cleanup automatically
- Set `EMAIL_SECURE` to `"true"` for port 465 (implicit TLS) or `"false"` for port 587 (STARTTLS)

Build and start:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 🔀 Reverse Proxy

Only the **frontend** needs to be publicly accessible. The backend API is called server-side by the frontend (Remix SSR) and by the CLI container, both over Docker's internal network.

Example with [Caddy](https://caddyserver.com/) (automatic HTTPS):

```
your-domain.com {
    reverse_proxy localhost:3002
}
```

nginx, Traefik, or any other reverse proxy works equally well -- just proxy all traffic to the frontend on port 3002.

### 🚀 First Run

1. Start the stack: `docker compose -f docker-compose.prod.yml up -d --build`
2. Verify all containers are running: `docker compose -f docker-compose.prod.yml ps`
3. Open `https://your-domain.com` and create an account
4. Connect a Mastodon account -- the CLI will begin fetching initial stats within one minute

Initial data population can take several hours depending on the account's history. Hourly cron jobs then keep data up to date.

### ⚙️ Configuration

Optional settings you may want to adjust:

| Variable                       | Where              | Description                                                           |
| ------------------------------ | ------------------ | --------------------------------------------------------------------- |
| `DISABLE_NEW_REGISTRATIONS`    | backend + frontend | Set to `true` to close signups after creating your account            |
| `MASTODON_APP_NAME`            | backend            | Name shown to users during Mastodon OAuth (default: `Analytodon`)     |
| `LOG_LEVEL`                    | cli                | Logging verbosity: `debug`, `info`, `warn`, `error` (default: `info`) |
| `JWT_EXPIRES_IN`               | backend            | Access token lifetime (default: `1h`)                                 |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | backend            | Refresh token lifetime (default: `7d`)                                |

### 🔄 Updating

Pull the latest changes and rebuild:

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## 📄 License

GPL-3.0-only
