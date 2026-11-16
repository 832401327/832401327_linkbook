# syntax=docker/dockerfile:1

FROM node:24-alpine AS client-build
RUN npm install -g pnpm@11.7.0
WORKDIR /app/client
COPY client/package.json client/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY client/ ./
RUN pnpm build

FROM node:24-alpine
RUN npm install -g pnpm@11.7.0
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
COPY server/package.json server/pnpm-lock.yaml ./server/
RUN cd server && pnpm install --prod --frozen-lockfile
COPY server/src ./server/src
COPY --from=client-build /app/client/dist ./client/dist
RUN mkdir -p /app/server/data
VOLUME ["/app/server/data"]
EXPOSE 3000
CMD ["node", "server/src/index.js"]
