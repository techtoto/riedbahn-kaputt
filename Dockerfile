FROM node:slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY ./package.json ./pnpm-lock.yaml ./

FROM base AS deps
RUN --mount=type=cache,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base
COPY --from=deps /app/node_modules /app/node_modules
COPY ./static ./static
COPY ./main.js ./main.js

ENV LISTEN_HOST=0.0.0.0
ENV LISTEN_PORT=80
EXPOSE 80

CMD ["node", "main.js"]