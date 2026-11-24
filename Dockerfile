FROM oven/bun:1.4.5-slim AS bun

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN install -d -m 0700 -o node -g node /app/.data
COPY --from=build /app/package.json /app/server.ts ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src ./src
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "--import", "tsx", "server.ts"]
