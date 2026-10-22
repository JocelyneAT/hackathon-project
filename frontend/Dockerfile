FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend ./
ARG BACKEND_URL=http://backend:8000
ENV BACKEND_URL=${BACKEND_URL} \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    BACKEND_URL=http://backend:8000
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/package-lock.json ./package-lock.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/next.config.ts ./next.config.ts
USER node
EXPOSE 3000
CMD ["npm", "run", "start", "--", "--port", "3000"]
