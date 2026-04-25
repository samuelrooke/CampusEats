FROM node:20-slim AS frontend-build
WORKDIR /app/frontend/CampusEats
COPY frontend/CampusEats/package.json ./
RUN npm install
COPY frontend/CampusEats/ .
RUN npm run build

FROM node:20-slim
RUN apt-get update && apt-get install -y chromium --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/src ./src
COPY --from=frontend-build /app/frontend/CampusEats/dist ./public

EXPOSE 3001
CMD ["node", "src/index.js"]
