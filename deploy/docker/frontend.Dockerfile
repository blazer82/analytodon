# Builder
FROM node:22-alpine AS builder

WORKDIR /app

COPY packages/rest-client /app/packages/rest-client
COPY apps/frontend /app/apps/frontend
COPY package.json /app
COPY pnpm-lock.yaml /app
COPY pnpm-workspace.yaml /app

RUN npm install -g pnpm@10.5.2

RUN pnpm install --filter @analytodon/rest-client
RUN pnpm --filter @analytodon/rest-client build

RUN pnpm install --filter @analytodon/frontend
RUN pnpm --filter @analytodon/frontend build

# Runner
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=builder /app/apps/frontend/package.json /app/apps/frontend/package.json
COPY --from=builder /app/packages/rest-client/package.json /app/packages/rest-client/package.json
COPY --from=builder /app/packages/rest-client/dist /app/packages/rest-client/dist

RUN npm install -g pnpm@10.5.2
RUN pnpm install --prod --filter @analytodon/frontend

COPY --from=builder /app/apps/frontend/build /app/apps/frontend/build

RUN addgroup -g 11130 analytodon
RUN adduser -D -H -u 11130 -G analytodon analytodon
RUN chown -R analytodon:analytodon /app

USER analytodon

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

WORKDIR /app/apps/frontend
CMD ["pnpm", "run", "start"]
