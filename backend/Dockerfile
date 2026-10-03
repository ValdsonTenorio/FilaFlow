FROM node:24-alpine AS base
WORKDIR /app
RUN addgroup -S filaflow && adduser -S filaflow -G filaflow && apk add --no-cache wget
COPY package.json package-lock.json ./

FROM base AS dependencies
RUN npm ci --ignore-scripts

FROM dependencies AS development
COPY . .
RUN npx prisma generate
USER filaflow
EXPOSE 3001
CMD ["npm", "run", "dev"]

FROM dependencies AS build
COPY . .
RUN npx prisma generate && npm run build

FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S filaflow && adduser -S filaflow -G filaflow
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./
USER filaflow
EXPOSE 3001
CMD ["node", "dist/main"]
