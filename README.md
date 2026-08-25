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

Prebuilt images are published publicly to the GitHub Container Registry -- no need to build them yourself, and no authentication required to pull:

```
ghcr.io/blazer82/analytodon-backend:latest
ghcr.io/blazer82/analytodon-frontend:latest
ghcr.io/blazer82/analytodon-cli:latest
```

Every image is also tagged with the commit SHA it was built from, so you can pin to an exact version instead of tracking `latest`. Images are currently built for `linux/amd64` only -- on other architectures, see [Building From Source](#-building-from-source).

### 📋 Prerequisites

- Docker and Docker Compose
- A reverse proxy (Caddy, nginx, or Traefik) for TLS termination
- _(Optional)_ An SMTP server or transactional email service for verification and notification emails. Without one, leave `EMAIL_HOST` unset and set `DISABLE_EMAIL_VERIFICATION=true` -- emails are then logged instead of sent and new sign-ups are auto-verified (see [Configuration](#️-configuration))
- A domain name with DNS pointing to your server

### 🔑 Generate Secrets

Generate three secrets into the `.env` file before starting. The `ENCRYPTION_KEY` encrypts Mastodon OAuth tokens stored in the database -- it **must** be identical in the backend and CLI containers

```bash
# ENCRYPTION_KEY — 64-character hex string (32 bytes for AES-256)
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env

# JWT_SECRET — used by the backend to sign authentication tokens
echo "JWT_SECRET=$(openssl rand -base64 48)" >> .env

# SESSION_SECRET — used by the frontend to encrypt session cookies
echo "SESSION_SECRET=$(openssl rand -base64 48)" >> .env
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
    image: ghcr.io/blazer82/analytodon-backend:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:3001:3000"
    depends_on:
      - mongodb
    environment:
      DB_CLIENT_URL: mongodb://analytodon:<db-password>@mongodb:27017/analytodon?authSource=admin
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 1h
      JWT_REFRESH_TOKEN_EXPIRES_IN: 7d
      FRONTEND_URL: https://<your-domain>
      MASTODON_APP_NAME: Analytodon
      MARKETING_URL: https://<your-domain>
      # Email is optional. To run without a mail server, omit the EMAIL_* block
      # below and set DISABLE_EMAIL_VERIFICATION: "true" instead.
      EMAIL_HOST: <smtp-host>
      EMAIL_PORT: "587"
      EMAIL_USER: <smtp-user>
      EMAIL_PASS: <smtp-password>
      EMAIL_SECURE: "false"
      EMAIL_FROM_NAME: Analytodon
      EMAIL_FROM_ADDRESS: <noreply@your-domain>

  frontend:
    image: ghcr.io/blazer82/analytodon-frontend:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:3002:3000"
    depends_on:
      - backend
    environment:
      API_URL: http://backend:3000
      SESSION_SECRET: ${SESSION_SECRET}
      MARKETING_URL: https://<your-domain>
      SUPPORT_EMAIL: <your-email>

  cli:
    image: ghcr.io/blazer82/analytodon-cli:latest
    restart: unless-stopped
    depends_on:
      - mongodb
    environment:
      MONGODB_URI: mongodb://analytodon:<db-password>@mongodb:27017/analytodon?authSource=admin
      MONGODB_DATABASE: analytodon
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
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
- `EMAIL_USER`/`EMAIL_PASS` are only used when both are set -- omit them for relays that accept unauthenticated senders
- Running **without email**: omit the `EMAIL_*` variables and set `DISABLE_EMAIL_VERIFICATION: "true"`. Emails are then logged instead of sent, and new accounts are verified automatically so they aren't stuck on the verification screen

Pull the images and start:

```bash
docker compose -f docker-compose.prod.yml up -d
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

1. Start the stack: `docker compose -f docker-compose.prod.yml up -d`
2. Verify all containers are running: `docker compose -f docker-compose.prod.yml ps`
3. Open `https://your-domain.com` and create an account
4. Connect a Mastodon account -- the CLI will begin fetching initial stats within one minute

Initial data population can take several hours depending on the account's history. Hourly cron jobs then keep data up to date.

### ⚙️ Configuration

Optional settings you may want to adjust:

| Variable                       | Where              | Description                                                               |
| ------------------------------ | ------------------ | ------------------------------------------------------------------------- |
| `DISABLE_NEW_REGISTRATIONS`    | backend + frontend | Set to `true` to close signups after creating your account                |
| `DISABLE_EMAIL_VERIFICATION`   | backend            | Set to `true` to auto-verify new sign-ups (use when running without SMTP) |
| `MASTODON_APP_NAME`            | backend            | Name shown to users during Mastodon OAuth (default: `Analytodon`)         |
| `LOG_LEVEL`                    | cli                | Logging verbosity: `debug`, `info`, `warn`, `error` (default: `info`)     |
| `JWT_EXPIRES_IN`               | backend            | Access token lifetime (default: `1h`)                                     |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | backend            | Refresh token lifetime (default: `7d`)                                    |

### 🔄 Updating

Pull the latest images and restart:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Docker Compose recreates only the containers whose image actually changed. The MongoDB volume is untouched, so your data survives updates.

### 🔨 Building From Source

The published images cover the common case. Build your own if you are running on an architecture other than `amd64`, or if you have modified the code. Replace the `image:` line of each service with a `build:` block:

```yaml
backend:
  build:
    context: .
    dockerfile: deploy/docker/backend.Dockerfile
  restart: unless-stopped
  # ...environment as above
```

The frontend and CLI use `deploy/docker/frontend.Dockerfile` and `deploy/docker/cli.Dockerfile` respectively. Building requires a clone of this repository, since the build context is the repository root:

```bash
git clone https://github.com/blazer82/analytodon.git
cd analytodon
docker compose -f docker-compose.prod.yml up -d --build
```

## 📄 License

GPL-3.0-only
