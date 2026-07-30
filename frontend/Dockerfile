# Build context for this Dockerfile must be the REPO ROOT, not frontend/ —
# the frontend imports shared TypeScript types from ../shared/types (see
# tsconfig.json's "@shared/*" path), which lives outside this directory.
# With a frontend/-only build context, that directory would never be copied
# in and `pnpm build` would fail resolving @shared/* imports.

FROM node:22-slim

RUN corepack enable

WORKDIR /app

# Install dependencies first for better layer caching.
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/. .
COPY shared /shared

# Next.js inlines NEXT_PUBLIC_* vars into the client bundle at build time, not
# runtime — Render (and most Docker-based hosts) inject dashboard/render.yaml
# env vars as build args automatically, but only ARGs declared here actually
# reach `pnpm build`.
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
