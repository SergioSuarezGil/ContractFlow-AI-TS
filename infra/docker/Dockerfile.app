# syntax=docker/dockerfile:1.7
# Build from repository root:
#   docker build -f infra/docker/Dockerfile.app \
#     --build-arg APP_NAME=contracts-api --build-arg APP_PORT=3000 \
#     --build-arg GIT_SHA=$(git rev-parse --short HEAD) .

ARG APP_NAME=contracts-api
ARG APP_PORT=3000
ARG GIT_SHA=unknown
ARG BUILD_TIME=unknown

FROM node:22-alpine AS deps
ARG APP_NAME
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/observability/package.json packages/observability/
COPY packages/events/package.json packages/events/
COPY apps/${APP_NAME}/package.json apps/${APP_NAME}/
RUN pnpm install --frozen-lockfile --filter @contractflow/${APP_NAME}...

FROM deps AS build
ARG APP_NAME
COPY tsconfig.base.json ./
COPY packages/observability packages/observability
COPY packages/events packages/events
COPY contracts contracts
COPY apps/${APP_NAME} apps/${APP_NAME}
RUN if [ -d "apps/${APP_NAME}/assets" ]; then echo "Including app assets"; fi
WORKDIR /repo/packages/observability
RUN pnpm exec tsc -p tsconfig.json
WORKDIR /repo/packages/events
RUN pnpm exec tsc -p tsconfig.json
WORKDIR /repo/apps/${APP_NAME}
RUN pnpm exec nest build \
  && test -f dist/main.js \
  && ls -la dist

FROM node:22-alpine AS runner
ARG APP_NAME
ARG APP_PORT
ARG GIT_SHA=unknown
ARG BUILD_TIME=unknown
WORKDIR /repo
ENV NODE_ENV=production \
    APP_SERVICE_NAME=${APP_NAME} \
    APP_GIT_SHA=${GIT_SHA} \
    APP_BUILD_TIME=${BUILD_TIME}
LABEL org.opencontainers.image.title="contractflow-${APP_NAME}" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.created="${BUILD_TIME}" \
      com.contractflow.service="${APP_NAME}" \
      com.contractflow.git_sha="${GIT_SHA}"
RUN addgroup -S contractflow && adduser -S contractflow -G contractflow
COPY --from=build --chown=contractflow:contractflow /repo/node_modules /repo/node_modules
COPY --from=build --chown=contractflow:contractflow /repo/packages/observability /repo/packages/observability
COPY --from=build --chown=contractflow:contractflow /repo/packages/events /repo/packages/events
COPY --from=build --chown=contractflow:contractflow /repo/contracts /repo/contracts
COPY --from=build --chown=contractflow:contractflow /repo/apps/${APP_NAME}/node_modules /repo/apps/${APP_NAME}/node_modules
COPY --from=build --chown=contractflow:contractflow /repo/apps/${APP_NAME}/package.json /repo/apps/${APP_NAME}/package.json
COPY --from=build --chown=contractflow:contractflow /repo/apps/${APP_NAME}/dist /repo/apps/${APP_NAME}/dist
USER contractflow
WORKDIR /repo/apps/${APP_NAME}
EXPOSE ${APP_PORT}
CMD ["node", "dist/main.js"]
