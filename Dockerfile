# Multi-stage build for Node + Python helpers
FROM node:18-alpine AS node-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM python:3.11-slim AS python-deps
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

FROM node:18-alpine AS final
WORKDIR /app
# Install ffmpeg and python3 for the python components
RUN apk add --no-cache ffmpeg python3 py3-pip

COPY --from=node-build /app/dist ./dist
COPY --from=node-build /app/package*.json ./
COPY --from=node-build /app/node_modules ./node_modules
COPY --from=python-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Copy Python source files
COPY src/python ./src/python

EXPOSE 3000 8000
CMD ["node", "dist/node/index.js"]
