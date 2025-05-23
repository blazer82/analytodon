FROM ubuntu:24.04

WORKDIR /app

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y --no-install-recommends install -y cron curl ca-certificates

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs

RUN npm install -g pnpm@10.5.2

# Remove package lists for smaller image sizes
RUN rm -rf /var/lib/apt/lists/* \
    && which cron \
    && rm -rf /etc/cron.*/*

COPY apps/cli/crontab /app/analytodon-cron
COPY apps/cli/entrypoint.sh /app/entrypoint.sh

COPY package.json /app/package.json
COPY pnpm-lock.yaml /app/pnpm-lock.yaml
COPY pnpm-workspace.yaml /app/pnpm-workspace.yaml

COPY apps/cli/package.json /app/apps/cli/package.json
COPY apps/cli/tsconfig.json /app/apps/cli/tsconfig.json
COPY apps/cli/README.md /app/apps/cli/README.md
COPY apps/cli/bin /app/apps/cli/bin
COPY apps/cli/src /app/apps/cli/src

RUN pnpm install --filter @analytodon/cli

RUN pnpm --filter @analytodon/cli build
RUN pnpm --filter @analytodon/cli prepack

RUN crontab analytodon-cron
RUN chmod +x entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]

# https://manpages.ubuntu.com/manpages/trusty/man8/cron.8.html
# -f | Stay in foreground mode, don't daemonize.
# -L loglevel | Tell  cron  what to log about jobs (errors are logged regardless of this value) as the sum of the following values:
CMD ["cron","-f", "-L", "2"]