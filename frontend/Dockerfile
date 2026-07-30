FROM node:22-slim

RUN corepack enable

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Next.js inlines NEXT_PUBLIC_* vars into the client bundle at build time, not
# runtime — Render (and most Docker-based hosts) inject dashboard/render.yaml
# env vars as build args automatically, but only ARGs declared here actually
# reach `pnpm build`.
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
