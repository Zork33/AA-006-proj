FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/backend/package.json packages/backend/
RUN npm ci
COPY packages/backend/ packages/backend/
RUN npm run build -w packages/backend

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/backend/package.json packages/backend/
RUN npm ci --omit=dev
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
EXPOSE 3000
CMD ["node", "packages/backend/dist/index.js"]
