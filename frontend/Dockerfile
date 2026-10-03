FROM node:24-alpine AS base
WORKDIR /app
RUN addgroup -S filaflow && adduser -S filaflow -G filaflow && apk add --no-cache wget
COPY package.json package-lock.json ./

FROM base AS dependencies
RUN npm ci

FROM dependencies AS development
COPY . .
USER filaflow
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]

FROM dependencies AS build
COPY . .
RUN npm run build

FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S filaflow && adduser -S filaflow -G filaflow
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER filaflow
EXPOSE 3000
CMD ["node", "server.js"]
