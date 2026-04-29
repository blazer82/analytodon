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

## 🚢 Deployment

For production deployment, build all applications:

```bash
pnpm run build
```

Then deploy the built applications according to your hosting environment.

## 📄 License

GPL-3.0-only
