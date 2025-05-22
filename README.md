# 📊 Analytodon - Analytics for Mastodon

This is the official repository for the service [www.analytodon.com](https://www.analytodon.com).

Analytodon provides analytics and insights for Mastodon accounts, helping users understand their engagement and growth on the Fediverse.

🤝 Contributions are welcome.

🏠 Self-hosting is explicitly allowed.

## 🏗️ Project Structure

This project is a monorepo using pnpm workspaces containing:

- 🚀 **Backend**: A NestJS application providing the API services (`apps/backend`)
- 💻 **Frontend**: A Remix application for the user interface (`apps/frontend`)
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

3. Configure environment variables:

   - Create `.env` files in both apps/backend and apps/frontend directories
   - See the example env files for required variables

4. Start the development servers:

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

## 🚢 Deployment

For production deployment, build both applications:

```bash
pnpm run build
```

Then deploy the built applications according to your hosting environment.

## 📄 License

GPL-3.0-only
