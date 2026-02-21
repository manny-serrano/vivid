FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --workspace=@vivid/backend --workspace=@vivid/shared --include-workspace-root

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN npx prisma generate --schema=prisma/schema.prisma
WORKDIR /app/backend
RUN npx tsc

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 vivid
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
USER vivid
EXPOSE 3001
CMD ["node", "dist/index.js"]
