FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY frontend-vue/package.json frontend-vue/package-lock.json ./frontend-vue/
RUN npm ci --prefix frontend-vue

COPY . .
RUN npm run build


FROM node:20-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY config ./config
COPY data ./data
COPY public ./public
COPY server ./server
COPY --from=builder /app/frontend-vue/dist ./frontend-vue/dist
COPY scripts ./scripts

RUN mkdir -p /app/public/uploads /app/public/uploads-seed \
  && if [ -d /app/public/uploads ]; then cp -a /app/public/uploads/. /app/public/uploads-seed/; fi \
  && chmod +x /app/scripts/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
CMD ["npm", "start"]
