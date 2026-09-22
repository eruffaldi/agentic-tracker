# Multi-stage build: test gate runs inside the image, only the artifact is exported.
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends python3 make && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
RUN python3 tools/build.py build && node --test test/*.test.mjs

FROM scratch AS artifact
COPY --from=build /app/dist/agentic-model-timeline.html /app/dist/agentic-model-timeline.html
COPY --from=build /app/CHANGELOG.data.md /app/CHANGELOG.data.md
