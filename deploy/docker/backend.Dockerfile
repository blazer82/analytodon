# Builder
FROM node:22-alpine AS builder

WORKDIR /app

COPY packages/shared-orm /app/packages/shared-orm
COPY apps/backend /app/apps/backend
COPY package.json /app
COPY pnpm-lock.yaml /app
COPY pnpm-workspace.yaml /app

RUN npm install -g pnpm@10.5.2

RUN pnpm install --filter @analytodon/shared-orm
RUN pnpm --filter @analytodon/shared-orm build

RUN pnpm install --filter @analytodon/backend
RUN pnpm --filter @analytodon/backend build

# Runner
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=builder /app/apps/backend/package.json /app/apps/backend/package.json
COPY --from=builder /app/packages/shared-orm/package.json /app/packages/shared-orm/package.json
COPY --from=builder /app/packages/shared-orm/dist /app/packages/shared-orm/dist

RUN npm install -g pnpm@10.5.2
RUN pnpm install --prod --filter @analytodon/shared-orm --filter @analytodon/backend

COPY --from=builder /app/apps/backend/dist /app/apps/backend/dist

RUN addgroup -g 11130 analytodon
RUN adduser -D -H -u 11130 -G analytodon analytodon
RUN chown -R analytodon:analytodon /app

USER analytodon

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

WORKDIR /app/apps/backend
CMD ["node", "dist/main"]
