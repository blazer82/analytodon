# Stage 1: Builder
FROM node:22-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.5.2

# Copy package manifests
COPY package.json /app/package.json
COPY pnpm-lock.yaml /app/pnpm-lock.yaml
COPY pnpm-workspace.yaml /app/pnpm-workspace.yaml

COPY apps/cli/package.json /app/apps/cli/package.json
COPY apps/cli/tsconfig.json /app/apps/cli/tsconfig.json
COPY apps/cli/README.md /app/apps/cli/README.md
COPY apps/cli/bin /app/apps/cli/bin
COPY apps/cli/src /app/apps/cli/src

# Install dependencies for the CLI project
RUN pnpm install --filter @analytodon/cli

# Build the CLI project
RUN pnpm --filter @analytodon/cli build
RUN pnpm --filter @analytodon/cli prepack

# Stage 2: Runtime
FROM node:22-slim

# Install cron and ca-certificates.
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y --no-install-recommends install -y cron ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /etc/cron.*/* # Remove default cron jobs from base image

WORKDIR /app

# Create a non-root user and group
RUN groupadd -r analytodon && useradd -r -g analytodon -s /bin/false analytodon

# Copy entrypoint script
COPY apps/cli/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Copy crontab to the cron.d directory. Cron daemon will pick it up.
# The crontab file (apps/cli/crontab) must be modified to include 'analytodon' for each job.
COPY apps/cli/crontab /etc/cron.d/analytodon-cron
# Set correct permissions for the crontab file. It must be owned by root and not be world-writable.
RUN chmod 0644 /etc/cron.d/analytodon-cron \
    && chown root:root /etc/cron.d/analytodon-cron \
    && touch /var/log/cron.log # Ensure cron log file exists

# Copy built application from builder stage
COPY --from=builder --chown=analytodon:analytodon /app/node_modules /app/node_modules
COPY --from=builder --chown=analytodon:analytodon /app/apps/cli/package.json /app/apps/cli/package.json
COPY --from=builder --chown=analytodon:analytodon /app/apps/cli/node_modules /app/apps/cli/node_modules
COPY --from=builder --chown=analytodon:analytodon /app/apps/cli/bin /app/apps/cli/bin
COPY --from=builder --chown=analytodon:analytodon /app/apps/cli/dist /app/apps/cli/dist
COPY --from=builder --chown=analytodon:analytodon /app/apps/cli/oclif.manifest.json /app/apps/cli/oclif.manifest.json

ENV NODE_ENV=production

# RUN chown analytodon:analytodon /app

# Entrypoint runs as root (default user) to set up /etc/environment, then execs CMD.
# Cron daemon (CMD) will run as root.
# Jobs in /etc/cron.d/analytodon-cron will be executed as 'analytodon' as specified in that file.
ENTRYPOINT ["/app/entrypoint.sh"]

# https://manpages.ubuntu.com/manpages/trusty/man8/cron.8.html
# -f | Stay in foreground mode, don't daemonize.
# -L loglevel | Tell  cron  what to log about jobs (errors are logged regardless of this value) as the sum of the following values:
#             1    will log the start of all cron jobs
#             2    will log the end of all cron jobs
#             4    will log all failed job attempts (exit status != 0)
#             8    will log the process number of all cron jobs
CMD ["sh", "-c", "mkfifo /tmp/cron_job_pipe && chmod 666 /tmp/cron_job_pipe && tail -f /tmp/cron_job_pipe & exec cron -f -L 2"]
